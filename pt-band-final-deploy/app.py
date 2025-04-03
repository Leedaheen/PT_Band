
from flask import Flask, render_template, request, jsonify
import json, os, hashlib
from datetime import datetime

app = Flask(__name__)
DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

@app.route('/')
def index():
    jobs = load_data()
    return render_template('index.html', jobs=jobs)

@app.route('/add', methods=['POST'])
def add():
    data = load_data()
    form = request.json
    new_job = {
        "type": form.get("type"),
        "team": form.get("team", ""),
        "nickname": form.get("nickname", ""),
        "location": form.get("location", ""),
        "age": form.get("age", ""),
        "fee": form.get("fee", ""),
        "contact": form.get("contact", ""),
        "intro": form.get("intro", ""),
        "password": hash_pw(form.get("password")),
        "part": form.get("part", []),
        "matched_parts": {},
        "clicks": 0,
        "created": datetime.now().isoformat()
    }
    data.append(new_job)
    save_data(data)
    return jsonify(success=True)

@app.route('/verify-password/<int:index>', methods=['POST'])
def verify_password(index):
    data = load_data()
    pw = request.json.get('password')
    if index >= len(data):
        return jsonify(success=False)
    job = data[index]
    if pw == 'admin1234' or job.get('password') == hash_pw(pw):
        return jsonify(success=True, job=job)
    return jsonify(success=False)

@app.route('/update/<int:index>', methods=['POST'])
def update(index):
    data = load_data()
    form = request.json
    if index >= len(data):
        return jsonify(success=False)
    job = data[index]
    pw = form.get('password')
    if pw != 'admin1234' and job.get('password') != hash_pw(pw):
        return jsonify(success=False)
    job['team'] = form.get('team')
    job['location'] = form.get('location')
    job['type'] = form.get('type')
    job['intro'] = form.get('intro')
    job['age'] = form.get('age')
    job['fee'] = form.get('fee')
    job['matched_parts'] = {p: True for p in form.get('parts', [])}
    save_data(data)
    return jsonify(success=True)

@app.route('/click/<int:index>', methods=['POST'])
def click(index):
    data = load_data()
    if index >= len(data):
        return jsonify(success=False)
    data[index]['clicks'] = data[index].get('clicks', 0) + 1
    save_data(data)
    return jsonify(success=True)

if __name__ == '__main__':
    app.run(debug=True)
