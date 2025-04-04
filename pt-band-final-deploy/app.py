from flask import Flask, render_template, request, jsonify, session
import json, os, time, datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

# 데이터 로드 함수
def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# 데이터 저장 함수
def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

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
    data = load_data()
    
    # 비밀번호 암호화 (werkzeug.security 사용)
    hashed_pw = generate_password_hash(item["password"])
    
    item["clicks"] = 0
    item["matched_parts"] = {}
    item["password"] = hashed_pw  # 해시된 비밀번호 저장
    item["created_at"] = int(time.time())
    item["pinned"] = False
    data.append(item)
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
        return jsonify(success=False)
    
    # werkzeug.security로 비밀번호 검증
    input_pw = req["password"]
    stored_pw = data[index]["password"]
    
    if check_password_hash(stored_pw, input_pw):  # 입력 비밀번호가 저장된 비밀번호와 일치하는지 확인
        return jsonify(success=True, job=data[index])
    return jsonify(success=False)

@app.route("/update/<int:index>", methods=["POST"])
def update(index):
    req = request.get_json()
    data = load_data()
    if index >= len(data):
        return jsonify(success=False)
    
    # 비밀번호 검증 (werkzeug.security 사용)
    input_pw = req["password"]
    stored_pw = data[index]["password"]
    
    if not check_password_hash(stored_pw, input_pw):
        return jsonify(success=False, message="비밀번호 불일치")
    
    # 업데이트된 내용 적용
    data[index]["team"] = req["team"]
    data[index]["location"] = req["location"]
    data[index]["type"] = req["type"]
    data[index]["age"] = req.get("age", "")
    data[index]["intro"] = req["intro"]
    data[index]["region"] = req.get("region", "경기도 > 평택시")
    data[index]["updated_at"] = int(time.time())

    # 파트 매칭 업데이트
    matched = {part: True for part in req.get("parts", [])}
    data[index]["matched_parts"] = matched

    save_data(data)
    return jsonify(success=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
