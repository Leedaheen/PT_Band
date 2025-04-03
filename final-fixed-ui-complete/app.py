from flask import Flask, render_template, request, jsonify
import json, os

app = Flask(__name__)
DATA_FILE = "data.json"

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
    return render_template("index.html", jobs=load_data())

@app.route("/add", methods=["POST"])
def add():
    data = load_data()
    job = request.get_json()
    job["matched_parts"] = {p: None for p in job.get("part", [])}
    job["clicks"] = 0
    job["comments"] = []
    data.append(job)
    save_data(data)
    return jsonify(success=True)

@app.route("/click/<int:index>", methods=["POST"])
def click(index):
    data = load_data()
    if 0 <= index < len(data):
        data[index]["clicks"] = data[index].get("clicks", 0) + 1
        save_data(data)
        return jsonify(success=True, clicks=data[index]["clicks"])
    return jsonify(success=False)

@app.route("/complete/<int:index>", methods=["POST"])
def complete(index):
    data = load_data()
    req = request.get_json()
    password = req.get("password")
    if 0 <= index < len(data):
        is_admin = password == "admin1234"
        is_owner = password == data[index].get("password")
        if is_admin or is_owner:
            for part in data[index].get("matched_parts", {}):
                data[index]["matched_parts"][part] = True
            save_data(data)
            return jsonify(success=True)
    return jsonify(success=False)

@app.route("/comment/<int:index>", methods=["POST"])
def comment(index):
    data = load_data()
    comment = request.get_json().get("comment")
    if 0 <= index < len(data):
        data[index].setdefault("comments", []).append(comment)
        save_data(data)
        return jsonify(success=True)
    return jsonify(success=False)

@app.route("/reset-password/<int:index>", methods=["POST"])
def reset_password(index):
    data = load_data()
    req = request.get_json()
    admin_pw = req.get("admin_password")
    new_pw = req.get("new_password")
    if admin_pw != "admin1234":
        return jsonify(success=False, message="관리자 비밀번호가 일치하지 않습니다.")
    if 0 <= index < len(data):
        data[index]["password"] = new_pw
        save_data(data)
        return jsonify(success=True, message="비밀번호가 초기화되었습니다.")
    return jsonify(success=False, message="글을 찾을 수 없습니다.")

if __name__ == "__main__":
    app.run(debug=True)
