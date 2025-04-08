from flask import Flask, render_template, request, jsonify, session
import json, os, time, datetime
from werkzeug.security import generate_password_hash, check_password_hash
import firebase_admin
from firebase_admin import credentials, db

# Firebase Admin SDK 초기화
cred = credentials.Certificate('C:\\Users\\windows11pro\\OneDrive\\바탕 화면\\ETC\\Programing\\firebase key.json')  # 백슬래시 두 번 사용
  # 다운로드한 서비스 계정 키 파일 경로

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://ptband-a27fb-default-rtdb.asia-southeast1.firebasedatabase.app/'  # Firebase Realtime Database URL
})

app = Flask(__name__)
app.secret_key = 'dl9ek1gmls032601086541230'
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

# 데이터 로드 함수


# Firebase에서 데이터 읽기
def load_data():
    ref = db.reference('jobs')  # 'jobs'라는 경로에서 데이터를 읽어옵니다.
    jobs = ref.get()  # 데이터를 가져옴
    return jobs if jobs else []  # 데이터가 없으면 빈 리스트 반환


# 데이터 저장 함수
# Firebase에 데이터 저장
def save_data(data):
    ref = db.reference('jobs')  # 'jobs'라는 경로에 데이터를 저장
    ref.set(data)  # 전체 데이터를 덮어쓰기를 합니다. (수정 시에는 더 정교한 방법 사용 가능)


# 타임스탬프 포맷 필터 (ISO 형식 및 정수형 처리)
@app.template_filter('datetimeformat')
def format_datetime(value, format='%Y-%m-%d %H:%M'):
    try:
        if isinstance(value, str):
            value = datetime.datetime.fromisoformat(value)
        elif isinstance(value, int):  # 타임스탬프가 int일 경우 처리
            value = datetime.datetime.fromtimestamp(value)
        return value.strftime(format) if isinstance(value, datetime.datetime) else value
    except Exception:
        return value

# 구인/구직 항목 정렬 함수
def sort_key(job):
    pinned = job.get("pinned", False)
    if isinstance(pinned, str):
        pinned = pinned.lower() == "true"
    updated = job.get("updated_at") or job.get("created_at", 0)
    if isinstance(updated, str):
        try:
            updated = datetime.datetime.fromisoformat(updated).timestamp()
        except Exception:
            updated = 0
    return (pinned, updated)

@app.route("/")
def index():
    jobs = load_data()
    jobs.sort(key=sort_key, reverse=True)
    locations = sorted(set(job.get("region", "경기도 > 평택시") for job in jobs))
    types = ["전체", "구인", "구직"]
    parts = sorted(set(part for job in jobs for part in job.get("part", [])))
    return render_template("index.html", jobs=jobs, locations=locations, types=types, parts=parts)


@app.route("/add", methods=["POST"])
def add_job():
    item = request.get_json()
    if not item:
        return jsonify(success=False, message="No data provided")
    
    # 평문 비밀번호를 PBKDF2 방식으로 해시화
    item["password"] = generate_password_hash(item["password"])
    
    # 나머지 작업
    data = load_data()  # 기존 데이터 읽기
    item["clicks"] = 0
    item["matched_parts"] = {}
    item["created_at"] = int(time.time())
    item["pinned"] = False
    data.append(item)  # 새로운 항목 추가

    # Firebase에 저장
    save_data(data)
    return jsonify(success=True)


@app.route("/click/<int:index>", methods=["POST"])
def click(index):
    if 'clicked' not in session:
        session['clicked'] = {}
    clicked = session['clicked']
    if str(index) in clicked:
        return jsonify(success=True)
    
    data = load_data()
    if 0 <= index < len(data):
        data[index]["clicks"] = data[index].get("clicks", 0) + 1
        save_data(data)
        clicked[str(index)] = True
        session['clicked'] = clicked
        return jsonify(success=True)
    return jsonify(success=False)



@app.route("/verify-password/<int:index>", methods=["POST"])
def verify_password(index):
    req = request.get_json()
    data = load_data()

    if index >= len(data):
        return jsonify(success=False, message="잘못된 데이터입니다.")

    input_pw = req["password"]  # 사용자가 입력한 비밀번호

    # 관리자 비밀번호 확인 (관리자 비밀번호는 평문으로 비교)
    is_admin = input_pw == "admin1234"
    if is_admin:
        # 관리자라면 상단 고정 상태 변경
        data[index]["pinned"] = not data[index].get("pinned", False)  # 상단 고정 상태 토글
        save_data(data)  # Firebase에 데이터 저장
        return jsonify(success=True, job=data[index])

    # 저장된 비밀번호와 입력된 비밀번호를 해시로 비교
    if check_password_hash(data[index]["password"], input_pw):
        return jsonify(success=True, job=data[index])

    return jsonify(success=False, message="비밀번호가 일치하지 않습니다.")



# 기존 데이터를 업데이트하여 새로운 해시값으로 저장하는 코드
def update_password_hash():
    data = load_data()
    
    for job in data:
        if len(job["password"]) == 64:  # MD5 해시 체크 (예: 길이가 64인 값)
            # MD5 해시를 PBKDF2 방식으로 업데이트
            job["password"] = generate_password_hash(job["password"])
    
    save_data(data)
    print("비밀번호 해시가 새 방식으로 업데이트되었습니다.")


@app.route("/update/<int:index>", methods=["POST"])
def update(index):
    req = request.get_json()
    data = load_data()

    if index >= len(data):
        return jsonify(success=False, message="잘못된 데이터입니다.")

    input_pw = req["password"]
    
    is_admin = input_pw == "admin1234"
    if is_admin:
        return jsonify(success=True, message="관리자 권한으로 수정 가능합니다.")
    
    if not check_password_hash(data[index]["password"], input_pw):
        return jsonify(success=False, message="비밀번호가 일치하지 않습니다.")

    data[index]["team"] = req["team"]
    data[index]["location"] = req["location"]
    data[index]["type"] = req["type"]
    data[index]["age"] = req.get("age", "")
    data[index]["intro"] = req["intro"]
    data[index]["region"] = req.get("region", "경기도 > 평택시")
    data[index]["updated_at"] = int(time.time())

    matched = {part: True for part in req.get("parts", [])}
    data[index]["matched_parts"] = matched

    if is_admin:
        data[index]["pinned"] = True if req.get("pinned") == "true" else False

    # Firebase에 저장
    save_data(data)
    return jsonify(success=True, message="수정이 완료되었습니다.")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
