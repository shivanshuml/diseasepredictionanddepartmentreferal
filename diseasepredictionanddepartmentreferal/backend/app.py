from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import re
from difflib import get_close_matches
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import timedelta

# ================= APP CONFIG =================
app = Flask(__name__)

CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Authorization", "Content-Type"]
)

# ================= JWT CONFIG =================
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)
jwt = JWTManager(app)

# ================= ML MODEL =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "disease_model.pkl")
CSV_PATH = os.path.join(BASE_DIR, "Final_Augmented_dataset_Diseases_and_Symptoms.csv")

model = joblib.load(MODEL_PATH)
df = pd.read_csv(CSV_PATH, nrows=40000)
DB_PATH = os.path.join(BASE_DIR, "appointments.db")


symptom_list = df.columns.tolist()
symptom_list.remove("diseases")

# ================= SYNONYMS =================
symptom_synonyms = {
    "can't sleep": "insomnia",
    "sleepless": "insomnia",
    "dizzy": "dizziness",
    "lightheaded": "dizziness",
    "tight chest": "chest tightness",
    "chest pain": "chest tightness",
    "feel tired": "fatigue",
    "loss of energy": "fatigue",
    "throwing up": "vomiting",
    "feel sick": "nausea",
    "feverish": "fever",
    "high temperature": "fever",
}

# ================= DEPARTMENTS =================
disease_to_department = {
    "asthma": "Pulmonology",
    "bronchitis": "Pulmonology",
    "pneumonia": "Pulmonology",
    "arthritis": "Orthopedics",
    "osteoarthritis": "Orthopedics",
    "cervical spondylosis": "Orthopedics",
    "diabetes": "Endocrinology",
    "hypertension": "Cardiology",
    "coronary artery disease": "Cardiology",
    "depression": "Psychiatry",
    "panic disorder": "Psychiatry",
    "migraine": "Neurology",
    "epilepsy": "Neurology",
    "cystitis": "Urology",
    "urinary tract infection": "Urology",
    "dermatitis": "Dermatology",
    "eczema": "Dermatology",
}

department_doctors = {
    "Cardiology": ["Dr. Mehta", "Dr. Reddy", "Dr. Kapoor"],
    "Pulmonology": ["Dr. Verma", "Dr. Joshi"],
    "Neurology": ["Dr. Iyer", "Dr. Bansal"],
    "Orthopedics": ["Dr. Malhotra", "Dr. Tiwari", "Dr. Ghosh"],
    "Psychiatry": ["Dr. Ahuja", "Dr. Sinha", "Dr. Bhagat"],
    "Dermatology": ["Dr. Kaur", "Dr. Khan"],
    "Endocrinology": ["Dr. Nair", "Dr. Banerjee"],
    "General Medicine": ["Dr. Pandey", "Dr. Thakur"],
    "Urology": ["Dr. Sharma", "Dr. Chauhan"],
}

# ================= HELPERS =================
def text_to_symptom_vector(text, symptoms):
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)

    for phrase, standard in symptom_synonyms.items():
        if phrase in text:
            text += f" {standard}"

    matched = set()
    for s in symptoms:
        clean = s.lower().replace("_", " ")
        if clean in text or get_close_matches(clean, [text], n=1, cutoff=0.85):
            matched.add(s)

    vector = [1 if s in matched else 0 for s in symptoms]
    return np.array(vector).reshape(1, -1), matched


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            disease TEXT,
            department TEXT,
            doctor TEXT,
            date TEXT,
            time_slot TEXT
        )
    """)

    conn.commit()
    conn.close()

# ================= AUTH =================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')",
            (data["username"], generate_password_hash(data["password"]))
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Signup successful"}), 200

    except sqlite3.IntegrityError:
        return jsonify({"message": "User already exists"}), 400


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT password, role FROM users WHERE username=?",
        (data["username"],)
    )
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user[0], data["password"]):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(
        identity=data["username"],
        additional_claims={"role": user[1]}
    )

    return jsonify({"access_token": access_token}), 200

# ================= PREDICT =================
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    vector, matched = text_to_symptom_vector(data.get("symptoms", ""), symptom_list)

    if not matched:
        return jsonify({
            "disease": "General checkup recommended",
            "department": "General Medicine",
            "doctors": department_doctors["General Medicine"]
        })

    disease = model.predict(vector)[0]
    department = disease_to_department.get(disease.lower(), "General Medicine")

    return jsonify({
        "disease": disease,
        "department": department,
        "doctors": department_doctors.get(department, [])
    })

# ================= BOOK APPOINTMENT =================
@app.route("/book_appointment", methods=["POST"])
@jwt_required()
def book_appointment():
    username = get_jwt_identity()
    data = request.get_json()

    required = ["disease", "department", "doctor", "date", "time_slot"]
    for field in required:
        if not data.get(field):
            return jsonify({"message": f"Missing {field}"}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 1 FROM appointments
        WHERE doctor=? AND date=? AND time_slot=?
    """, (data["doctor"], data["date"], data["time_slot"]))

    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "Slot already booked"}), 409

    cursor.execute("""
        INSERT INTO appointments
        (username, disease, department, doctor, date, time_slot)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        username,
        data["disease"],
        data["department"],
        data["doctor"],
        data["date"],
        data["time_slot"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Appointment booked successfully"}), 200

# ================= USER APPOINTMENTS =================
@app.route("/appointments", methods=["GET"])
@jwt_required()
def appointments():
    username = get_jwt_identity()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, disease, department, doctor, date, time_slot
        FROM appointments
        WHERE username=?
        ORDER BY date DESC
    """, (username,))

    rows = cursor.fetchall()
    conn.close()

    return jsonify({
        "appointments": [
            {
                "id": r[0],
                "disease": r[1],
                "department": r[2],
                "doctor": r[3],
                "date": r[4],
                "time_slot": r[5]
            } for r in rows
        ]
    }), 200


# ================= BOOKED SLOTS =================
@app.route("/booked_slots", methods=["GET"])
def booked_slots():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT time_slot FROM appointments WHERE doctor=? AND date=?",
        (request.args.get("doctor"), request.args.get("date"))
    )

    slots = [s[0] for s in cursor.fetchall()]
    conn.close()
    return jsonify({"booked_slots": slots})

# ================= ADMIN =================
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT password, role FROM users WHERE username=?",
        (data["username"],)
    )
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"message": "Invalid credentials"}), 401

    if user[1] != "admin":
        return jsonify({"message": "Admin access only"}), 403

    if not check_password_hash(user[0], data["password"]):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(
        identity=data["username"],
        additional_claims={"role": "admin"}
    )

    return jsonify({"token": access_token}), 200

@app.route("/admin/appointments", methods=["GET"])
@jwt_required()
def admin_appointments():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT username, disease, department, doctor, date, time_slot
        FROM appointments
        ORDER BY date DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify({
        "appointments": [
            {
                "username": r[0],
                "disease": r[1],
                "department": r[2],
                "doctor": r[3],
                "date": r[4],
                "time_slot": r[5]
            } for r in rows
        ]
    })
# ================= CANCEL APPOINTMENT =================
@app.route("/cancel_appointment/<int:appointment_id>", methods=["DELETE"])
@jwt_required()
def cancel_appointment(appointment_id):
    username = get_jwt_identity()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM appointments
        WHERE id=? AND username=?
    """, (appointment_id, username))

    conn.commit()
    conn.close()

    return jsonify({"message": "Appointment cancelled"}), 200




# ================= MAIN =================
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)


