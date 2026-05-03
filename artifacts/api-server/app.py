import os
import json
import re
import psycopg2
import psycopg2.extras
import hashlib
import secrets
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ADMIN_USER       = "parshant"
ADMIN_PASS       = "Admin@2026"
DATA_DIR         = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CONTENT_FILE     = os.path.join(DATA_DIR, "content.json")
DATABASE_URL     = os.environ.get("SUPABASE_URL", "")
DOCUMIND_API_KEY = os.environ.get("DOCUMIND_API_KEY", "")
DOCUMIND_API_URL = "https://documind.parshantyadav.com/api/v1/chat"

admin_sessions = set()
user_sessions  = {}   # token -> user_id


def ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def init_db():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            slug          TEXT UNIQUE NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_content (
            user_id    INTEGER PRIMARY KEY,
            content    TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id         SERIAL PRIMARY KEY,
            user_slug  TEXT NOT NULL,
            name       TEXT NOT NULL,
            email      TEXT NOT NULL,
            message    TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER,
            user_slug  TEXT,
            user_email TEXT,
            event_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


def log_activity(user_id, user_slug, user_email, event_type):
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "INSERT INTO activity_log (user_id, user_slug, user_email, event_type) VALUES (%s, %s, %s, %s)",
            (user_id, user_slug, user_email, event_type),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        pass


def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def make_slug(email):
    base = re.sub(r"[^a-z0-9]", "", email.split("@")[0].lower()) or "user"
    slug = base
    i    = 1
    conn = get_db()
    cur  = conn.cursor()
    while True:
        cur.execute("SELECT id FROM users WHERE slug=%s", (slug,))
        if not cur.fetchone():
            break
        slug = f"{base}{i}"
        i   += 1
    cur.close()
    conn.close()
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
    email    = (data.get("email")    or "").strip().lower()
    password =  data.get("password") or ""
    if not email or "@" not in email:
        return jsonify({"error": "Valid email required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    slug = make_slug(email)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (email, password_hash, slug) VALUES (%s, %s, %s) RETURNING id",
            (email, hash_password(password), slug),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        return jsonify({"error": "Email already registered"}), 409
    log_activity(new_id, slug, email, 'register')
    token = secrets.token_hex(32)
    user_sessions[token] = new_id
    return jsonify({"token": token, "slug": slug, "email": email})


@app.route("/api/users/login", methods=["POST"])
def user_login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip().lower()
    password =  data.get("password") or ""
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT * FROM users WHERE email=%s AND password_hash=%s",
        (email, hash_password(password)),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Invalid credentials"}), 401
    token = secrets.token_hex(32)
    user_sessions[token] = row["id"]
    log_activity(row["id"], row["slug"], email, 'login')
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
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT email, slug FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"email": row["email"], "slug": row["slug"]})


@app.route("/api/users/content/<slug>", methods=["GET"])
def get_user_content(slug):
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT uc.content FROM user_content uc JOIN users u ON uc.user_id=u.id WHERE u.slug=%s",
        (slug,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
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
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        """INSERT INTO user_content (user_id, content, updated_at)
           VALUES (%s, %s, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET
             content    = EXCLUDED.content,
             updated_at = EXCLUDED.updated_at""",
        (user_id, json.dumps(content, ensure_ascii=False)),
    )
    conn.commit()
    cur2 = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur2.execute("SELECT slug, email FROM users WHERE id=%s", (user_id,))
    slug_row = cur2.fetchone()
    cur.close()
    cur2.close()
    conn.close()
    log_activity(user_id, slug_row["slug"], slug_row["email"], 'edit')
    return jsonify({"ok": True, "slug": slug_row["slug"]})


# ── User Contact Submissions ──────────────────────────────────────────────────

@app.route("/api/users/contact/<slug>", methods=["POST"])
def submit_user_contact(slug):
    data    = request.get_json(silent=True) or {}
    name    = (data.get("name")    or "").strip()
    email   = (data.get("email")   or "").strip()
    message = (data.get("message") or "").strip()
    if not name or not email or not message:
        return jsonify({"error": "All fields required"}), 400
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id FROM users WHERE slug=%s", (slug,))
    user = cur.fetchone()
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "Portfolio not found"}), 404
    cur.execute(
        "INSERT INTO contact_submissions (user_slug, name, email, message) VALUES (%s, %s, %s, %s)",
        (slug, name, email, message),
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/users/contacts", methods=["GET"])
def get_user_contacts():
    token   = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = get_user_id(token)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT slug FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({"error": "Not found"}), 404
    cur.execute(
        """SELECT id, name, email, message,
                  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
           FROM contact_submissions
           WHERE user_slug=%s ORDER BY created_at DESC""",
        (row["slug"],),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── Admin Database Overview ───────────────────────────────────────────────────

@app.route("/api/admin/db/users", methods=["GET"])
def admin_db_users():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or token not in admin_sessions:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT u.id, u.email, u.slug,
               to_char(u.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
               COUNT(DISTINCT al_e.id)                          AS edit_count,
               to_char(MAX(al_e.created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS last_edit,
               COUNT(DISTINCT al_l.id)                          AS login_count,
               to_char(MAX(al_l.created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS last_login,
               COUNT(DISTINCT cs.id)                            AS contact_count
        FROM users u
        LEFT JOIN activity_log al_e ON al_e.user_id = u.id AND al_e.event_type = 'edit'
        LEFT JOIN activity_log al_l ON al_l.user_id = u.id AND al_l.event_type = 'login'
        LEFT JOIN contact_submissions cs ON cs.user_slug = u.slug
        GROUP BY u.id, u.email, u.slug, u.created_at
        ORDER BY u.created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/db/contacts", methods=["GET"])
def admin_db_contacts():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or token not in admin_sessions:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, user_slug, name, email, message,
               to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM contact_submissions ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/db/activity", methods=["GET"])
def admin_db_activity():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or token not in admin_sessions:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, user_slug, user_email, event_type,
               to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM activity_log ORDER BY created_at DESC LIMIT 300
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
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
