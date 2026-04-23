import os
import json
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql
import pymysql.cursors

app = Flask(__name__)
app.secret_key = os.urandom(24)

def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='secret',
        database='smartverbs_db',
        cursorclass=pymysql.cursors.DictCursor
    )

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('username') != 'root':
            return jsonify({"error": "Accès refusé. Privilèges administrateur requis."}), 403
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Non connecté"}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT stats_json FROM users WHERE id = %s", (session['user_id'],))
            user = cursor.fetchone()
            stats_json = user['stats_json'] if user and user['stats_json'] else 'null'
    finally:
        conn.close()
        
    return render_template('index.html', 
                           username=session.get('username'), 
                           is_admin=(session.get('username') == 'root'),
                           stats_json=stats_json)

@app.route('/admin')
def admin():
    if session.get('username') != 'root':
        return "Accès refusé. Vous devez être connecté en tant que 'root' pour accéder à cette page.", 403
    return render_template('admin.html')

@app.route('/admin/users')
def admin_users():
    if session.get('username') != 'root':
        return "Accès refusé. Vous devez être connecté en tant que 'root' pour accéder à cette page.", 403
    return render_template('admin_users.html')

# --- AUTH API ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Nom d'utilisateur et mot de passe requis"}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({"error": "Ce nom d'utilisateur existe déjà"}), 400
                
            hashed_password = generate_password_hash(password)
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", 
                         (username, hashed_password))
            conn.commit()
            
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            session['user_id'] = user['id']
            session['username'] = username
            
        return jsonify({"success": True, "username": username, "is_admin": username == 'root'})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            
            if user and check_password_hash(user['password_hash'], password):
                session['user_id'] = user['id']
                session['username'] = username
                return jsonify({
                    "success": True, 
                    "username": username,
                    "stats_json": user['stats_json'],
                    "is_admin": username == 'root'
                })
            else:
                return jsonify({"error": "Identifiants incorrects"}), 401
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return jsonify({"success": True})

@app.route('/api/status', methods=['GET'])
def status():
    if 'user_id' in session:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT stats_json FROM users WHERE id = %s", (session['user_id'],))
                user = cursor.fetchone()
                return jsonify({
                    "logged_in": True, 
                    "username": session['username'],
                    "stats_json": user['stats_json'] if user else None,
                    "is_admin": session['username'] == 'root'
                })
        finally:
            conn.close()
    return jsonify({"logged_in": False})

@app.route('/api/user/password', methods=['PUT'])
@login_required
def change_password():
    data = request.json
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({"error": "Nouveau mot de passe requis"}), 400
    
    hashed_password = generate_password_hash(new_password)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", 
                           (hashed_password, session['user_id']))
            conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

@app.route('/api/save', methods=['POST'])
@login_required
def save():
    data = request.json
    stats_json = json.dumps(data)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET stats_json = %s WHERE id = %s", 
                         (stats_json, session['user_id']))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- VERBS API ---

@app.route('/api/verbs', methods=['GET'])
def get_verbs():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM verbs ORDER BY fr")
            verbs = cursor.fetchall()
            for v in verbs:
                v['pastAlt'] = v.pop('past_alt')
                v['participleAlt'] = v.pop('participle_alt')
            return jsonify(verbs)
    finally:
        conn.close()

@app.route('/api/admin/verbs', methods=['POST'])
@admin_required
def add_verb():
    data = request.json
    required_fields = ['fr', 'base', 'past', 'participle']
    for f in required_fields:
        if not data.get(f):
            return jsonify({"error": f"Le champ {f} est requis."}), 400
            
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO verbs (fr, base, past, participle, past_alt, participle_alt)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (data['fr'], data['base'], data['past'], data['participle'], 
                  data.get('pastAlt'), data.get('participleAlt')))
            conn.commit()
            return jsonify({"success": True, "id": cursor.lastrowid})
    except pymysql.err.IntegrityError:
        return jsonify({"error": "Ce verbe (traduction française) existe déjà."}), 400
    finally:
        conn.close()

@app.route('/api/admin/verbs/<int:verb_id>', methods=['PUT'])
@admin_required
def update_verb(verb_id):
    data = request.json
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE verbs 
                SET fr=%s, base=%s, past=%s, participle=%s, past_alt=%s, participle_alt=%s
                WHERE id=%s
            """, (data.get('fr'), data.get('base'), data.get('past'), data.get('participle'), 
                  data.get('pastAlt'), data.get('participleAlt'), verb_id))
            conn.commit()
            return jsonify({"success": True})
    except pymysql.err.IntegrityError:
        return jsonify({"error": "Ce verbe (traduction française) existe déjà."}), 400
    finally:
        conn.close()

@app.route('/api/admin/verbs/<int:verb_id>', methods=['DELETE'])
@admin_required
def delete_verb(verb_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM verbs WHERE id=%s", (verb_id,))
            conn.commit()
            return jsonify({"success": True})
    finally:
        conn.close()

# --- USERS API ---

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, username FROM users WHERE username != 'root' ORDER BY id DESC")
            users = cursor.fetchall()
            return jsonify(users)
    finally:
        conn.close()

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if user is root
            cursor.execute("SELECT username FROM users WHERE id=%s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "Utilisateur non trouvé"}), 404
            if user['username'] == 'root':
                return jsonify({"error": "Impossible de supprimer l'utilisateur root"}), 403
                
            cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))
            conn.commit()
            return jsonify({"success": True})
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

