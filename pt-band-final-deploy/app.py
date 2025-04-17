import os
import time
import datetime
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client, Client

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "replace-with-your-secret")

# Supabase 클라이언트 초기화
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Jinja2용 날짜 포맷 필터
@app.template_filter('datetimeformat')
def format_datetime(value, format='%Y-%m-%d %H:%M'):
    try:
        if isinstance(value, str):
            value = datetime.datetime.fromisoformat(value)
        elif isinstance(value, (int, float)):
            value = datetime.datetime.fromtimestamp(value)
        return value.strftime(format)
    except Exception:
        return value

# 메인 페이지: jobs 테이블 조회
@app.route("/")
def index():
    resp = supabase.from_("jobs")\
        .select("*")\
        .order("pinned", desc=True)\
        .order("created_at", desc=True)\
        .execute()
    jobs = resp.data or []
    locations = sorted({job.get("region", "경기도 > 평택시") for job in jobs})
    types = ["전체", "구인", "구직"]
    parts = sorted({p for job in jobs for p in job.get("part", [])})
    return render_template("index.html",
                           jobs=jobs,
                           locations=locations,
                           types=types,
                           parts=parts)

# 새 글 등록
@app.route("/add", methods=["POST"])
def add_job():
    item = request.get_json()
    if not item:
        return jsonify(success=False, message="No data provided"), 400

    # 비밀번호 해시화
    item["password"] = generate_password_hash(item["password"])
    item.update({
        "created_at": datetime.datetime.utcnow().isoformat(),
        "clicks": 0,
        "matched_parts": [],
        "is_matched": False,
        "pinned": False
    })

    resp = supabase.from_("jobs")\
        .insert([item])\
        .execute() 
    if resp.error:
        return jsonify(success=False, message=resp.error.message), 500
    return jsonify(success=True)

# 연락처 클릭(조회수 증가)
@app.route("/click/<int:job_id>", methods=["POST"])
def click(job_id):
    clicked = session.setdefault('clicked', [])
    if str(job_id) in clicked:
        return jsonify(success=True)

    # clicks 컬럼을 +1
    resp = supabase.from_("jobs")\
        .update({"clicks": supabase.postgrest.raw("clicks + 1")})\
        .eq("id", job_id)\
        .execute()
    if resp.error:
        return jsonify(success=False, message=resp.error.message), 500

    clicked.append(str(job_id))
    session['clicked'] = clicked
    return jsonify(success=True)

# 비밀번호 검증 및 관리자 핀 토글
@app.route("/verify-password/<int:job_id>", methods=["POST"])
def verify_password(job_id):
    req = request.get_json()
    pw = req.get("password")

    # 해당 글 조회
    resp = supabase.from_("jobs")\
        .select("*")\
        .eq("id", job_id)\
        .single()\
        .execute()
    if resp.error or not resp.data:
        return jsonify(success=False, message="잘못된 데이터입니다."), 404
    job = resp.data

    # 관리자 비번 (환경변수 ADMIN_PASSWORD) 체크
    if pw == os.environ.get("ADMIN_PASSWORD"):
        new_pinned = not job.get("pinned", False)
        supabase.from_("jobs")\
            .update({"pinned": new_pinned})\
            .eq("id", job_id)\
            .execute()
        job["pinned"] = new_pinned
        return jsonify(success=True, job=job)

    # 일반 사용자 비번 체크
    if check_password_hash(job["password"], pw):
        return jsonify(success=True, job=job)

    return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

# 글 수정 및 매칭 상태 업데이트
@app.route("/update/<int:job_id>", methods=["POST"])
def update(job_id):
    req = request.get_json()
    pw = req.get("password")

    # 기존 데이터 조회
    resp = supabase.from_("jobs")\
        .select("*")\
        .eq("id", job_id)\
        .single()\
        .execute()
    if resp.error or not resp.data:
        return jsonify(success=False, message="잘못된 데이터입니다."), 404
    job = resp.data

    is_admin = pw == os.environ.get("ADMIN_PASSWORD")
    if not is_admin and not check_password_hash(job["password"], pw):
        return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

    parts = req.get("parts", [])
    updates = {
        "team": req.get("team"),
        "location": req.get("location"),
        "type": req.get("type"),
        "age": req.get("age"),
        "intro": req.get("intro"),
        "region": req.get("region"),
        "updated_at": datetime.datetime.utcnow().isoformat(),
        "matched_parts": parts,
        "is_matched": len(parts) == len(job.get("part", []))
    }
    if is_admin:
        updates["pinned"] = req.get("pinned") == "true"

    upd = supabase.from_("jobs")\
        .update(updates)\
        .eq("id", job_id)\
        .execute()
    if upd.error:
        return jsonify(success=False, message=upd.error.message), 500

    return jsonify(success=True, message="수정이 완료되었습니다.")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
