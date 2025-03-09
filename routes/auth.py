from flask import Blueprint, request, render_template, redirect, url_for, session, current_app, g
from werkzeug.security import check_password_hash
from datetime import datetime

# Funkcja do importowania get_db bez cyklicznych importów
def get_db():
    from app import get_db as app_get_db
    return app_get_db()

# Tworzenie blueprintu dla tras uwierzytelniania
auth_bp = Blueprint('auth', __name__)

# Strona logowania
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    theme = 'light'  # Domyślny motyw
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        current_app.logger.info(f"Próba logowania użytkownika: {username}")
        
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if user is None:
            error = 'Nieprawidłowa nazwa użytkownika lub hasło.'
            current_app.logger.warning(f"Nieudane logowanie: użytkownik {username} nie istnieje")
        elif not check_password_hash(user['password'], password):
            error = 'Nieprawidłowa nazwa użytkownika lub hasło.'
            current_app.logger.warning(f"Nieudane logowanie: nieprawidłowe hasło dla {username}")
        else:
            # Zapisanie informacji o zalogowaniu w sesji
            session.clear()
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            
            # Zapisanie informacji o ostatnim logowaniu
            db.execute(
                'UPDATE users SET last_login = ? WHERE id = ?',
                (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), user['id'])
            )
            
            # Zapisanie logu dostępu
            db.execute(
                'INSERT INTO access_logs (user_id, ip_address, action, timestamp, success) VALUES (?, ?, ?, ?, ?)',
                (user['id'], request.remote_addr, 'login', datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 1)
            )
            
            db.commit()
            
            current_app.logger.info(f"Użytkownik {username} zalogowany pomyślnie")
            return redirect(url_for('dashboard'))
    
    return render_template('login.html', error=error, app_name=current_app.config['APP_NAME'], theme=theme)

# Wylogowanie
@auth_bp.route('/logout')
def logout():
    if 'user_id' in session:
        # Zapisanie logu wylogowania
        db = get_db()
        db.execute(
            'INSERT INTO access_logs (user_id, ip_address, action, timestamp, success) VALUES (?, ?, ?, ?, ?)',
            (session['user_id'], request.remote_addr, 'logout', datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 1)
        )
        db.commit()
        
        session.clear()
        current_app.logger.info("Użytkownik wylogowany")
    
    return redirect(url_for('auth.login'))