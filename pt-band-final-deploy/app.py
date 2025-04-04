# === app.py ===
from flask import Flask, render_template, request, jsonify, session
import json, os, time, datetime
from hashlib import sha256

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

# === 데이터 로딩 및 저장 ===
def load_data():
    if not os.path.exists(DATA_FILE): return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# === 정렬 기준 ===
def sort_key(job):
    pinned = job.get("pinned", False)
    if isinstance(pinned, str):
        pinned = pinned.lower() == "true"
    created = job.get("created_at", 0)
    if isinstance(created, str):
        try:
            created = datetime.datetime.fromisoformat(created).timestamp()
        except: created = 0
    return (pinned, created)

@app.template_filter('datetimeformat')
def datetimeformat(value, format='%Y-%m-%d %H:%M'):
    try:
        if isinstance(value, (int, float)):
            return time.strftime(format, time.localtime(value))
        elif isinstance(value, str):
            dt = datetime.datetime.fromisoformat(value)
            return dt.strftime(format)
    except: return value

@app.route("/")
def index():
    jobs = load_data()
    jobs.sort(key=sort_key, reverse=True)
    emoji_map = {
        "보컬(남)": "🎤", "보컬(여)": "🎤", "드럼": "🥁",
        "기타": "🎸", "베이스": "🎸", "키보드": "🎹", "기타 파트": "🎶"
    }
    locations = sorted(set(job.get('location', '') for job in jobs if job.get('location')))
    return render_template("index.html", jobs=jobs, emoji_map=emoji_map, locations=locations)

@app.route("/add", methods=["POST"])
def add_job():
    item = request.get_json()
    if not item: return jsonify(success=False, message="No data")
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
    if index >= len(data): return jsonify(success=False)
    input_pw = sha256(req["password"].encode()).hexdigest()
    is_admin = req["password"] == "admin1234"
    if is_admin or input_pw == data[index]["password"]:
        return jsonify(success=True, job=data[index])
    return jsonify(success=False)

@app.route("/update/<int:index>", methods=["POST"])
def update(index):
    req = request.get_json()
    data = load_data()
    if index >= len(data): return jsonify(success=False)
    pw_hash = sha256(req["password"].encode()).hexdigest()
    is_admin = req["password"] == "admin1234"
    if not is_admin and pw_hash != data[index]["password"]:
        return jsonify(success=False, message="비밀번호 불일치")
    data[index].update({
        "team": req["team"], "location": req["location"],
        "type": req["type"], "age": req.get("age", ""),
        "intro": req["intro"],
        "matched_parts": {p: True for p in req.get("parts", [])},
        "updated_at": int(time.time()) if is_admin else data[index].get("updated_at"),
        "pinned": True if is_admin and req.get("pinned") == "true" else False
    })
    save_data(data)
    return jsonify(success=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
