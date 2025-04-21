import os
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

# 관리자 암호 로드 (환경변수 없으면 'admin1234' 기본값)
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin1234")

@app.route("/")
def index():
    resp = supabase.from_("jobs").select("*").order("pinned", desc=True).order("created_at", desc=True).execute()
    jobs = resp.data or []
    locations = sorted({job.get("region", "경기도 > 평택시") for job in jobs})
    types = ["전체", "구인", "구직"]
    parts = sorted({p for job in jobs for p in job.get("part", [])})
    return render_template("index.html", jobs=jobs, locations=locations, types=types, parts=parts)

@app.route("/add", methods=["POST"])
def add_job():
    item = request.get_json() or {}
    if not item:
        return jsonify(success=False, message="No data provided"), 400

    item["password"] = generate_password_hash(item.get("password", ""))
    item.update({
        "created_at": datetime.datetime.utcnow().isoformat(),
        "clicks": 0,
        "matched_parts": [],
        "is_matched": False,
        "pinned": False
    })

    resp = supabase.from_("jobs").insert([item]).execute()
    if not resp.data:
        return jsonify(success=False, message="등록 실패"), 500
    return jsonify(success=True)

@app.route("/click/<int:job_id>", methods=["POST"])
def click(job_id):
    clicked = session.setdefault('clicked', [])
    if str(job_id) in clicked:
        return jsonify(success=True)

    resp = supabase.from_("jobs").update({"clicks": supabase.postgrest.raw("clicks + 1")} ).eq("id", job_id).execute()
    if not resp.data:
        return jsonify(success=False, message="조회수 업데이트 실패"), 500

    clicked.append(str(job_id))
    session['clicked'] = clicked
    return jsonify(success=True)

@app.route("/verify-password/<int:job_id>", methods=["POST"])
def verify_password(job_id):
    req = request.get_json() or {}
    pw = req.get("password", "").strip()
    
    # (디버그) 입력값과 DB 해시 찍어보기
    print(f"[DEBUG] 입력비번: '{pw}', DB에저장된해시: '{job.get('password')}'")

    # 1) 일반 사용자 비번 해시 체크
    if check_password_hash(job.get("password", ""), pw):
        return jsonify(success=True, job=job)
    # 2) 관리자 비번 체크
    if pw == ADMIN_PASSWORD:
        return jsonify(success=True, job=job)

    resp = supabase.from_("jobs").select("*").eq("id", job_id).single().execute()
    job = resp.data
    if not job:
        return jsonify(success=False, message="잘못된 데이터입니다."), 404

    # 관리자 비번 체크
    if pw == ADMIN_PASSWORD:
        return jsonify(success=True, job=job)

    # 일반 비번 체크
    if check_password_hash(job.get("password", ""), pw):
        return jsonify(success=True, job=job)

    return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

@app.route("/update/<int:job_id>", methods=["POST"])
def update(job_id):
    req = request.get_json() or {}
    pw = req.get("password", "").strip()

    resp = supabase.from_("jobs").select("*").eq("id", job_id).single().execute()
    job = resp.data
    if not job:
        return jsonify(success=False, message="잘못된 데이터입니다."), 404

    is_admin = (pw == ADMIN_PASSWORD)
    # 비밀번호 검증
    if not is_admin and not check_password_hash(job.get("password", ""), pw):
        return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

    parts = req.get("parts", [])
    updates = {
        "matched_parts": parts,
        "is_matched": len(parts) == len(job.get("part", [])),
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    for key in ["team", "location", "type", "age", "region", "intro"]:
        if key in req:
            updates[key] = req[key]
    if is_admin and "pinned" in req:
        updates["pinned"] = req["pinned"]

    upd = supabase.from_("jobs").update(updates).eq("id", job_id).execute()
    if not upd.data:
        return jsonify(success=False, message="수정 실패"), 500

    return jsonify(success=True, message="수정이 완료되었습니다.")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
