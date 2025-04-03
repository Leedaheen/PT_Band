from flask import Flask, render_template, request, jsonify
import json
import os

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
    data = load_data()
    return render_template("index.html", jobs=data)

@app.route("/add", methods=["POST"])
def add():
    data = load_data()
    new_entry = request.get_json()
    new_entry["matched_parts"] = {p: None for p in new_entry.get("part", [])}
    new_entry["clicks"] = 0
    data.append(new_entry)
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

if __name__ == "__main__":
    app.run(debug=True)
