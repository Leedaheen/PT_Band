
from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__)

# 가상 데이터 저장용 JSON 파일
DATA_FILE = "data.json"

# 초기 데이터 로딩
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
    jobs = load_data()
    data = request.json
    data["clicks"] = 0
    data["matched_parts"] = {}
    jobs.append(data)
    save_data(jobs)
    return jsonify(success=True)

@app.route("/click/<int:index>", methods=["POST"])
def click_job(index):
    jobs = load_data()
    if 0 <= index < len(jobs):
        jobs[index]["clicks"] = jobs[index].get("clicks", 0) + 1
        save_data(jobs)
        return jsonify(success=True)
    return jsonify(success=False, message="Invalid index")

if __name__ == "__main__":
    # Render 배포 시 포트 바인딩 필수
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
