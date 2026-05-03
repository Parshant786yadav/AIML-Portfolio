import os
import json
import secrets
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ADMIN_USER = "parshant"
ADMIN_PASS = "Admin@2026"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CONTENT_FILE = os.path.join(DATA_DIR, "content.json")
DOCUMIND_API_KEY = os.environ.get("DOCUMIND_API_KEY", "")
DOCUMIND_API_URL = "https://documind.parshantyadav.com/api/v1/chat"

sessions = set()


def ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


@app.route("/api/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASS:
        token = secrets.token_hex(32)
        sessions.add(token)
        return jsonify({"token": token})
    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/api/admin/content", methods=["GET"])
def get_content():
    ensure_dir()
    try:
        if not os.path.exists(CONTENT_FILE):
            return jsonify({})
        with open(CONTENT_FILE, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    except Exception:
        return jsonify({})


@app.route("/api/admin/content", methods=["POST"])
def save_content():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or token not in sessions:
        return jsonify({"error": "Unauthorized"}), 401
    ensure_dir()
    try:
        payload = request.get_json(silent=True) or {}
        with open(CONTENT_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"error": "Save failed"}), 500


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    sessions.discard(token)
    return jsonify({"ok": True})


@app.route("/api/chat", methods=["POST"])
def chat():
    if not DOCUMIND_API_KEY:
        return jsonify({"error": "Chat service not configured"}), 503
    try:
        resp = requests.post(
            DOCUMIND_API_URL,
            headers={
                "Authorization": f"Bearer {DOCUMIND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=request.get_json(silent=True) or {},
            timeout=30,
        )
        try:
            data = resp.json()
        except Exception:
            data = {"reply": resp.text}
        return jsonify(data), resp.status_code
    except Exception:
        return jsonify({"error": "Failed to reach chat service"}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
