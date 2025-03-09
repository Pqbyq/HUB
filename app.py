from flask import Flask, request, jsonify, render_template, session, g, abort, redirect, url_for, current_app
from werkzeug.security import generate_password_hash
import sqlite3
import os
import logging
from datetime import datetime
import functools

# Import helpers
from db_helpers import get_db, close_db
from auth_helpers import login_required, admin_required
from config import config

# Inicjalizacja aplikacji
app = Flask(__name__, static_folder='static', template_folder='templates')

# Wczytanie konfiguracji
config_name = os.getenv('FLASK_CONFIG') or 'development'
app.config.from_object(config[config_name])

# Konfiguracja logowania
if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = logging.FileHandler('logs/homeHub.log')
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('HomeHub startup')

# Rejestracja funkcji zamykającej bazę danych
app.teardown_appcontext(close_db)

# Inicjalizacja bazy danych
def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
        
        # Sprawdzenie czy istnieje użytkownik admin
        admin = db.execute('SELECT id FROM users WHERE username = ?', ('admin',)).fetchone()
        if admin is None:
            # Utworzenie administratora z hasłem "admin"
            admin_password = generate_password_hash('admin')
            db.execute(
                'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
                ('admin', admin_password, app.config['ADMIN_EMAIL'], 'admin', 
                 datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            )
            db.commit()
            app.logger.info('Created default admin user')

# Komenda do inicjalizacji bazy danych
@app.cli.command('init-db')
def init_db_command():
    init_db()
    print('Baza danych została zainicjalizowana.')

# Załadowanie użytkownika przed każdym żądaniem
@app.before_request
def load_logged_in_user():
    g.user_id = session.get('user_id')
    g.username = session.get('username')
    g.role = session.get('role')

# Strona główna - przekierowanie do dashboardu lub logowania
@app.route('/')
def index():
    if g.user_id:
        return redirect(url_for('dashboard'))
    return redirect(url_for('auth.login'))

# Dashboard
@app.route('/dashboard')
@login_required
def dashboard():
    # Pobieranie preferencji użytkownika
    db = get_db()
    settings = db.execute('SELECT default_city, theme FROM user_settings WHERE user_id = ?',
                          (g.user_id,)).fetchone()
    
    if settings is None:
        # Utwórz domyślne ustawienia
        db.execute(
            'INSERT INTO user_settings (user_id, default_city, theme) VALUES (?, ?, ?)',
            (g.user_id, 'Warsaw', 'light')
        )
        db.commit()
        theme = 'light'
    else:
        theme = settings['theme']
    
    return render_template('dashboard.html', 
                           app_name=app.config['APP_NAME'], 
                           username=g.username,
                           role=g.role,
                           theme=theme)

# Panel administratora
@app.route('/admin')
@admin_required
def admin_panel():
    db = get_db()
    
    # Pobierz liczbę użytkowników
    total_users = db.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    
    # Pobierz liczbę administratorów
    admin_users = db.execute('SELECT COUNT(*) FROM users WHERE role = "admin"').fetchone()[0]
    
    # Pobierz liczbę urządzeń
    device_count = db.execute('SELECT COUNT(*) FROM devices').fetchone()[0]
    
    # Pobierz liczbę logów dostępu
    log_count = db.execute('SELECT COUNT(*) FROM access_logs').fetchone()[0]
    
    # Pobierz listę użytkowników
    users = db.execute('SELECT * FROM users ORDER BY created_at DESC').fetchall()
    
    # Pobierz motyw użytkownika
    settings = db.execute('SELECT theme FROM user_settings WHERE user_id = ?',
                          (g.user_id,)).fetchone()
    theme = settings['theme'] if settings else 'light'
    
    return render_template('admin.html', 
                           app_name=app.config['APP_NAME'], 
                           username=g.username,
                           role=g.role,
                           theme=theme,
                           total_users=total_users,
                           admin_users=admin_users,
                           device_count=device_count,
                           log_count=log_count,
                           users=users)

# Obsługa błędów
@app.errorhandler(403)
def forbidden(e):
    return render_template('error.html', error='Brak uprawnień do tej strony', 
                          app_name=app.config['APP_NAME']), 403

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error='Strona nie została znaleziona', 
                          app_name=app.config['APP_NAME']), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', error='Błąd serwera', 
                          app_name=app.config['APP_NAME']), 500

# Inicjalizacja bazy przy pierwszym uruchomieniu
with app.app_context():
    if not os.path.exists(app.config['DATABASE']):
        init_db()
        app.logger.info("Inicjalizacja bazy danych przy pierwszym uruchomieniu")

# Importy blueprintów na końcu, aby uniknąć cyklicznych importów
from routes.network import network_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.weather import weather_bp
from routes.file_sharing import file_sharing_bp  # Dodaj import blueprintu do udostępniania plików

# Rejestracja blueprintów
app.register_blueprint(network_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(weather_bp)
app.register_blueprint(file_sharing_bp)  # Zarejestruj blueprint do udostępniania plików

# Uruchomienie aplikacji
if __name__ == '__main__':
    app.run(host=app.config['HOST'], port=app.config['PORT'], debug=app.config['DEBUG'])