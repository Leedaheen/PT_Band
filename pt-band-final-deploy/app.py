import os
import datetime
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client, Client

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "replace-with-your-secret")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    item = request.get_json(force=True) or {}
    if not item:
        return jsonify(success=False, message="No data provided"), 400

    item["password"] = generate_password_hash(item.get("password", ""))
    item.update({
        "created_at": datetime.datetime.utcnow().isoformat(),
        "clicks": 0,
        "matched_parts": [],
        "is_matched": False,
        "pinned": item.get("pinned", False)
    })

    resp = supabase.from_("jobs").insert([item]).execute()
    if not resp.data:
        return jsonify(success=False, message="등록 실패"), 500
    return jsonify(success=True)

####### 게시물 삭제 항목

@app.route("/api/delete/<int:job_id>", methods=["DELETE"])
def delete_job(job_id):
    req = request.get_json(force=True) or {}
    pw  = req.get("password", "").strip()
    # 관리자 비밀번호만 허용
    if pw != ADMIN_PASSWORD:
        return jsonify(success=False, message="권한이 없습니다."), 403

    resp = supabase.from_("jobs").delete().eq("id", job_id).execute()
    # supabase-python 최신 버전에서는 resp.error 대신 resp.get("error") 를 쓸 수도 있습니다.
    if getattr(resp, "error", None) or not getattr(resp, "data", None):
        return jsonify(success=False, message="삭제에 실패했습니다."), 500

    return jsonify(success=True)



####### 클릭 카운팅

@app.route("/click/<int:job_id>", methods=["POST"])
def click(job_id):
    clicked = session.setdefault('clicked', [])
    # 이미 클릭한 세션이면 곧바로 성공 리턴
    if str(job_id) in clicked:
        return jsonify(success=True)

    try:
        # 1) 현재 clicks 가져오기
        resp = supabase.from_("jobs") \
            .select("clicks") \
            .eq("id", job_id) \
            .single() \
            .execute()
        current = (resp.data or {}).get("clicks", 0) or 0

        # 2) clicks + 1 업데이트
        supabase.from_("jobs") \
            .update({"clicks": current + 1}) \
            .eq("id", job_id) \
            .execute()

        # 3) 세션에 기록 후 성공 리턴
        clicked.append(str(job_id))
        session['clicked'] = clicked
        return jsonify(success=True)

    except Exception as e:
        # 에러 로깅 및 실패 응답
        import traceback; traceback.print_exc()
        return jsonify(success=False, message="조회수 업데이트 실패"), 500


# 비밀번호 검증 엔드포인트 (API 및 기존 경로 모두 지원)
@app.route("/api/verify-password/<int:job_id>", methods=["POST"])
@app.route("/verify-password/<int:job_id>", methods=["POST"])
def verify_password(job_id):
    try:
        req = request.get_json(force=True)
        pw = req.get("password", "").strip()

        if job_id == 0:
            is_admin = (pw == ADMIN_PASSWORD)
            return jsonify(success=True, is_admin=is_admin)

        resp = supabase.from_("jobs").select("*").eq("id", job_id).single().execute()
        job = resp.data
        if not job:
            return jsonify(success=False, message="잘못된 데이터입니다."), 404

        # 사용자 비밀번호 확인
        if check_password_hash(job.get("password", ""), pw):
            return jsonify(success=True, job=job, is_admin=False)

        # 관리자 비밀번호 확인
        if pw == ADMIN_PASSWORD:
            return jsonify(success=True, job=job, is_admin=True)

        return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify(success=False, message=f"서버 오류: {str(e)}"), 500

@app.route("/api/update/<int:job_id>", methods=["PATCH"])
def update_job(job_id):
    try:
        req = request.get_json(force=True) or {}
        pw = req.get("password", "").strip()

        resp = supabase.from_("jobs").select("*").eq("id", job_id).single().execute()
        job = resp.data
        if not job:
            return jsonify(success=False, message="잘못된 데이터입니다."), 404

    # 인증
        is_admin = (pw == ADMIN_PASSWORD)
        if not is_admin and not check_password_hash(job.get("password", ""), pw):
            return jsonify(success=False, message="비밀번호가 일치하지 않습니다."), 403

    # 1) 체크된 matched_parts 배열 (클라이언트에서 넘어온 매칭된 파트)
        matched = req.get("matched_parts", [])

    # 2) 원본 part 값을 Python 리스트로 파싱
        parts_src = job.get("part", [])
        if isinstance(parts_src, str):
            try:
                parts = json.loads(parts_src)
            except Exception:
                # 만약 JSON 형태가 아니면 단순 문자열 분할
                parts = [p.strip() for p in parts_src.strip("[]").split(",") if p.strip()]
        else:
            parts = parts_src

    # 3) is_matched 결정
      
        updates = {
            "matched_parts": matched,
            "is_matched":    len(matched) == len(parts),
            "updated_at":    datetime.datetime.utcnow().isoformat()
        }

    # 나머지 필드 업데이트
        for key in ["team", "nickname", "age", "region", "location", "fee", "contact", "intro"]:
            if key in req:
                updates[key] = req[key]
        if is_admin and "pinned" in req:
            updates["pinned"] = req["pinned"]
    # DB 반영
        upd = supabase.from_("jobs").update(updates).eq("id", job_id).execute()
        if not upd.data:
            return jsonify(success=False, message="수정 실패"), 500

        return jsonify(success=True, message="수정이 완료되었습니다.")

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify(success=False, message=f"서버 오류: {str(e)}"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
