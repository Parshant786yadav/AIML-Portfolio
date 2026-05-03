import os
import json
import re
import sqlite3
import hashlib
import secrets
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ADMIN_USER = "parshant"
ADMIN_PASS = "Admin@2026"
DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CONTENT_FILE  = os.path.join(DATA_DIR, "content.json")
DB_PATH       = os.path.join(DATA_DIR, "users.db")
DOCUMIND_API_KEY = os.environ.get("DOCUMIND_API_KEY", "")
DOCUMIND_API_URL = "https://documind.parshantyadav.com/api/v1/chat"

admin_sessions = set()
user_sessions  = {}        # token -> user_id


def ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    ensure_dir()
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                slug          TEXT UNIQUE NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_content (
                user_id    INTEGER PRIMARY KEY,
                content    TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_slug  TEXT NOT NULL,
                name       TEXT NOT NULL,
                email      TEXT NOT NULL,
                message    TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def make_slug(email):
    base = re.sub(r"[^a-z0-9]", "", email.split("@")[0].lower()) or "user"
    slug = base
    i = 1
    with get_db() as conn:
        while conn.execute("SELECT id FROM users WHERE slug=?", (slug,)).fetchone():
            slug = f"{base}{i}"
            i += 1
    return slug


def get_user_id(token):
    return user_sessions.get(token)


# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/healthz")
def healthz():
    return jsonify({"status": "ok"})


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASS:
        token = secrets.token_hex(32)
        admin_sessions.add(token)
        return jsonify({"token": token})
    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/api/admin/content", methods=["GET"])
def get_admin_content():
    ensure_dir()
    try:
        if not os.path.exists(CONTENT_FILE):
            return jsonify({})
        with open(CONTENT_FILE, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    except Exception:
        return jsonify({})


@app.route("/api/admin/content", methods=["POST"])
def save_admin_content():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or token not in admin_sessions:
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
    admin_sessions.discard(token)
    return jsonify({"ok": True})


# ── Users ─────────────────────────────────────────────────────────────────────

@app.route("/api/users/register", methods=["POST"])
def user_register():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or "@" not in email:
        return jsonify({"error": "Valid email required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    slug = make_slug(email)
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (email, password_hash, slug) VALUES (?,?,?)",
                (email, hash_password(password), slug),
            )
    except Exception:
        return jsonify({"error": "Email already registered"}), 409
    with get_db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    token = secrets.token_hex(32)
    user_sessions[token] = row["id"]
    return jsonify({"token": token, "slug": slug, "email": email})


@app.route("/api/users/login", methods=["POST"])
def user_login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email=? AND password_hash=?",
            (email, hash_password(password)),
        ).fetchone()
    if not row:
        return jsonify({"error": "Invalid credentials"}), 401
    token = secrets.token_hex(32)
    user_sessions[token] = row["id"]
    return jsonify({"token": token, "slug": row["slug"], "email": email})


@app.route("/api/users/logout", methods=["POST"])
def user_logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_sessions.pop(token, None)
    return jsonify({"ok": True})


@app.route("/api/users/me", methods=["GET"])
def user_me():
    token   = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = get_user_id(token)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    with get_db() as conn:
        row = conn.execute("SELECT email, slug FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"email": row["email"], "slug": row["slug"]})


@app.route("/api/users/content/<slug>", methods=["GET"])
def get_user_content(slug):
    with get_db() as conn:
        row = conn.execute(
            "SELECT uc.content FROM user_content uc JOIN users u ON uc.user_id=u.id WHERE u.slug=?",
            (slug,),
        ).fetchone()
    if not row:
        try:
            if os.path.exists(CONTENT_FILE):
                with open(CONTENT_FILE, "r", encoding="utf-8") as f:
                    return jsonify(json.load(f))
        except Exception:
            pass
        return jsonify({})
    return jsonify(json.loads(row["content"]))


@app.route("/api/users/content", methods=["POST"])
def save_user_content():
    token   = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = get_user_id(token)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    content = request.get_json(silent=True) or {}
    with get_db() as conn:
        conn.execute(
            """INSERT INTO user_content (user_id, content, updated_at)
               VALUES (?,?,CURRENT_TIMESTAMP)
               ON CONFLICT(user_id) DO UPDATE SET
                 content=excluded.content, updated_at=excluded.updated_at""",
            (user_id, json.dumps(content, ensure_ascii=False)),
        )
    with get_db() as conn:
        slug = conn.execute("SELECT slug FROM users WHERE id=?", (user_id,)).fetchone()["slug"]
    return jsonify({"ok": True, "slug": slug})


# ── User Contact Submissions ──────────────────────────────────────────────────

@app.route("/api/users/contact/<slug>", methods=["POST"])
def submit_user_contact(slug):
    data    = request.get_json(silent=True) or {}
    name    = (data.get("name")    or "").strip()
    email   = (data.get("email")   or "").strip()
    message = (data.get("message") or "").strip()
    if not name or not email or not message:
        return jsonify({"error": "All fields required"}), 400
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE slug=?", (slug,)).fetchone()
        if not user:
            return jsonify({"error": "Portfolio not found"}), 404
        conn.execute(
            "INSERT INTO contact_submissions (user_slug, name, email, message) VALUES (?,?,?,?)",
            (slug, name, email, message),
        )
    return jsonify({"ok": True})


@app.route("/api/users/contacts", methods=["GET"])
def get_user_contacts():
    token   = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = get_user_id(token)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    with get_db() as conn:
        row  = conn.execute("SELECT slug FROM users WHERE id=?", (user_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        rows = conn.execute(
            "SELECT id, name, email, message, created_at FROM contact_submissions "
            "WHERE user_slug=? ORDER BY created_at DESC",
            (row["slug"],),
        ).fetchall()
    return jsonify([dict(r) for r in rows])


# ── Chat ──────────────────────────────────────────────────────────────────────

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


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
