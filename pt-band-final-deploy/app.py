from flask import Flask, render_template, request, jsonify, session
import json, os, time, datetime
from hashlib import sha256

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # 반드시 안전한 비밀키로 변경하세요.
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def sort_key(job):
    # pinned 값을 boolean으로 변환
    pinned = job.get("pinned", False)
    if isinstance(pinned, str):
        pinned = pinned.lower() == "true"
    # created_at 값을 타임스탬프로 변환 (ISO 8601 문자열 또는 int로 저장됨)
    created = job.get("created_at", 0)
    if isinstance(created, str):
        try:
            created = datetime.datetime.fromisoformat(created).timestamp()
        except Exception:
            created = 0
    return (pinned, created)

@app.route("/")
def index():
    jobs = load_data()  # jobs 변수를 여기서 정의
    # pinned 상태와 created_at 기준 내림차순 정렬 (최신 및 상단 고정 글이 위쪽에 오도록)
    jobs.sort(key=sort_key, reverse=True)
    return render_template("index.html", jobs=jobs)

@app.route("/add", methods=["POST"])
def add_job():
    item = request.get_json()
    if not item:
        return jsonify(success=False, message="No data provided")
    data = load_data()
    item["clicks"] = 0
    item["matched_parts"] = {}
    item["password"] = sha256(item["password"].encode()).hexdigest()
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
    input_pw = sha256(req["password"].encode()).hexdigest()
    is_admin = req["password"] == "admin1234"
    if is_admin or input_pw == data[index]["password"]:
        return jsonify(success=True, job=data[index])
    return jsonify(success=False)

@app.route("/update/<int:index>", methods=["POST"])
def update(index):
    req = request.get_json()
    data = load_data()
    if index >= len(data):
        return jsonify(success=False)
    pw_hash = sha256(req["password"].encode()).hexdigest()
    is_admin = req["password"] == "admin1234"
    if not is_admin and pw_hash != data[index]["password"]:
        return jsonify(success=False, message="비밀번호 불일치")
    data[index]["team"] = req["team"]
    data[index]["location"] = req["location"]
    data[index]["type"] = req["type"]
    data[index]["age"] = req.get("age", "")
    data[index]["intro"] = req["intro"]
    matched = {}
    for part in req.get("parts", []):
        matched[part] = True
    data[index]["matched_parts"] = matched
    if is_admin:
        data[index]["pinned"] = True if req.get("pinned") == "true" else False
        data[index]["updated_at"] = int(time.time())
    save_data(data)
    return jsonify(success=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
