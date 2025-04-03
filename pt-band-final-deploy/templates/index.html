from flask import Flask, render_template, request, jsonify
import json, os
from hashlib import sha256

app = Flask(__name__)
# `data.json` 파일의 경로를 `app.py` 파일과 동일한 경로로 설정
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    jobs = load_data()
    return render_template("index.html", jobs=jobs)

@app.route("/add", methods=["POST"])
def add_job():
    try:
        # JSON 데이터 받기
        item = request.get_json()
        print(f"Received item: {item}")  # 요청 데이터 확인 (디버깅용)

        if not item:
            return jsonify(success=False, message="No data provided")
        
        # 데이터 처리
        data = load_data()
        item["clicks"] = 0
        item["matched_parts"] = {}
        item["password"] = sha256(item["password"].encode()).hexdigest()
        
        # 데이터 추가 및 저장
        data.append(item)
        save_data(data)
        
        return jsonify(success=True)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify(success=False, message="An error occurred")

@app.route("/click/<int:index>", methods=["POST"])
def click(index):
    data = load_data()
    if 0 <= index < len(data):
        data[index]["clicks"] = data[index].get("clicks", 0) + 1
        save_data(data)
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

    # 업데이트 항목
    data[index]["team"] = req["team"]
    data[index]["location"] = req["location"]
    data[index]["type"] = req["type"]
    data[index]["intro"] = req["intro"]
    matched = {}
    for part in req.get("parts", []):
        matched[part] = True
    data[index]["matched_parts"] = matched
    save_data(data)
    return jsonify(success=True)

if __name__ == "__main__":
    app.run(debug=True)
