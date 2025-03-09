from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session, g, current_app, abort
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Funkcja do importowania get_db bez cyklicznych importów
def get_db():
    from app import get_db as app_get_db
    return app_get_db()

# Funkcja do importowania dekoratorów bez cyklicznych importów
def login_required(f):
    from auth_helpers import login_required as auth_login_required
    return auth_login_required(f)

def admin_required(f):
    from auth_helpers import admin_required as auth_admin_required
    return auth_admin_required(f)

# Tworzenie blueprintu dla tras użytkowników
user_bp = Blueprint('user', __name__)

# API - tworzenie nowego użytkownika
@user_bp.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    if request.content_type == 'application/json':
        data = request.get_json()
    else:
        data = request.form
    
    if not data or not 'username' in data or not 'password' in data or not 'email' in data:
        return jsonify({'error': 'Niepełne dane'}), 400
    
    username = data['username']
    password = data['password']
    email = data['email']
    role = data.get('role', 'user')  # Domyślnie zwykły użytkownik
    
    db = get_db()
    
    # Sprawdzenie czy użytkownik już istnieje
    if db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone() is not None:
        return jsonify({'error': 'Użytkownik już istnieje'}), 400
    
    # Utworzenie nowego użytkownika
    hashed_password = generate_password_hash(password)
    
    try:
        db.execute(
            'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
            (username, hashed_password, email, role, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        )
        db.commit()
        
        current_app.logger.info(f"Utworzono nowego użytkownika: {username} (role: {role})")
        
        # Jeśli dane przesłane przez formularz, przekieruj na stronę admina
        if request.content_type != 'application/json':
            return redirect(url_for('admin_panel'))
            
        return jsonify({'success': True, 'message': 'Użytkownik utworzony pomyślnie'}), 201
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas tworzenia użytkownika: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas tworzenia użytkownika'}), 500

# API - aktualizacja użytkownika
@user_bp.route('/api/users/<int:user_id>', methods=['PUT', 'POST'])
@admin_required
def update_user(user_id):
    if request.content_type == 'application/json':
        data = request.get_json()
    else:
        data = request.form
    
    if not data:
        return jsonify({'error': 'Brak danych do aktualizacji'}), 400
    
    db = get_db()
    
    # Sprawdzenie czy użytkownik istnieje
    if db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone() is None:
        return jsonify({'error': 'Użytkownik nie istnieje'}), 404
    
    # Aktualizacja danych
    try:
        # Przygotowanie zapytania aktualizacji
        update_fields = []
        update_values = []
        
        if 'username' in data:
            update_fields.append('username = ?')
            update_values.append(data['username'])
        
        if 'email' in data:
            update_fields.append('email = ?')
            update_values.append(data['email'])
        
        if 'role' in data:
            update_fields.append('role = ?')
            update_values.append(data['role'])
        
        if 'password' in data and data['password']:
            update_fields.append('password = ?')
            update_values.append(generate_password_hash(data['password']))
        
        if not update_fields:
            return jsonify({'error': 'Brak danych do aktualizacji'}), 400
        
        # Dodanie user_id do wartości
        update_values.append(user_id)
        
        # Wykonanie zapytania
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        db.execute(query, update_values)
        db.commit()
        
        current_app.logger.info(f"Zaktualizowano użytkownika ID: {user_id}")
        
        # Jeśli dane przesłane przez formularz, przekieruj na stronę admina
        if request.content_type != 'application/json':
            return redirect(url_for('admin_panel'))
            
        return jsonify({'success': True, 'message': 'Użytkownik zaktualizowany pomyślnie'}), 200
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas aktualizacji użytkownika: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas aktualizacji użytkownika'}), 500

# API - usuwanie użytkownika
@user_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    db = get_db()
    
    # Nie można usunąć własnego konta
    if user_id == session['user_id']:
        return jsonify({'error': 'Nie możesz usunąć własnego konta'}), 400
    
    # Sprawdzenie czy użytkownik istnieje
    if db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone() is None:
        return jsonify({'error': 'Użytkownik nie istnieje'}), 404
    
    try:
        db.execute('DELETE FROM users WHERE id = ?', (user_id,))
        db.commit()
        
        current_app.logger.info(f"Usunięto użytkownika ID: {user_id}")
        return jsonify({'success': True, 'message': 'Użytkownik usunięty pomyślnie'}), 200
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas usuwania użytkownika: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas usuwania użytkownika'}), 500

# Obsługa usuwania użytkownika przez formularz
@user_bp.route('/admin/delete/<int:user_id>', methods=['POST'])
@admin_required
def delete_user_form(user_id):
    db = get_db()
    
    # Nie można usunąć własnego konta
    if user_id == session['user_id']:
        return redirect(url_for('admin_panel'))
    
    # Sprawdzenie czy użytkownik istnieje
    if db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone() is None:
        return redirect(url_for('admin_panel'))
    
    try:
        db.execute('DELETE FROM users WHERE id = ?', (user_id,))
        db.commit()
        
        current_app.logger.info(f"Usunięto użytkownika ID: {user_id}")
        return redirect(url_for('admin_panel'))
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas usuwania użytkownika: {str(e)}")
        return redirect(url_for('admin_panel'))

# API - zmiana hasła
@user_bp.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    if request.content_type == 'application/json':
        data = request.get_json()
    else:
        data = request.form
    
    if not data or not 'current_password' in data or not 'new_password' in data:
        return jsonify({'error': 'Niepełne dane'}), 400
    
    current_password = data['current_password']
    new_password = data['new_password']
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    
    if not check_password_hash(user['password'], current_password):
        return jsonify({'error': 'Aktualne hasło jest nieprawidłowe'}), 400
    
    try:
        hashed_password = generate_password_hash(new_password)
        
        db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            (hashed_password, session['user_id'])
        )
        db.commit()
        
        current_app.logger.info(f"Zmieniono hasło użytkownika ID: {session['user_id']}")
        
        # Jeśli dane przesłane przez formularz, przekieruj na dashboard
        if request.content_type != 'application/json':
            return redirect(url_for('dashboard'))
            
        return jsonify({'success': True, 'message': 'Hasło zostało zmienione pomyślnie'}), 200
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas zmiany hasła: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas zmiany hasła'}), 500

# Pobieranie ustawień użytkownika
@user_bp.route('/api/user/settings', methods=['GET'])
@login_required
def get_user_settings():
    db = get_db()
    settings = db.execute('SELECT * FROM user_settings WHERE user_id = ?', 
                         (session['user_id'],)).fetchone()
    
    # Jeśli użytkownik nie ma zapisanych ustawień, utwórz domyślne
    if settings is None:
        db.execute(
            'INSERT INTO user_settings (user_id, default_city) VALUES (?, ?)',
            (session['user_id'], 'Warsaw')
        )
        db.commit()
        settings = {'default_city': 'Warsaw'}
    else:
        settings = dict(settings)
    
    return jsonify(settings)

# Aktualizacja ustawień użytkownika
@user_bp.route('/api/user/settings', methods=['PUT', 'POST'])
@login_required
def update_user_settings():
    db = get_db()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Brak danych do aktualizacji'}), 400
    
    # Sprawdź czy użytkownik ma już ustawienia
    settings = db.execute('SELECT 1 FROM user_settings WHERE user_id = ?', 
                         (session['user_id'],)).fetchone()
    
    try:
        if settings is None:
            # Utwórz nowe ustawienia
            db.execute(
                'INSERT INTO user_settings (user_id, default_city, theme) VALUES (?, ?, ?)',
                (session['user_id'], data.get('default_city', 'Warsaw'), data.get('theme', 'light'))
            )
        else:
            # Aktualizuj istniejące ustawienia
            if 'default_city' in data:
                db.execute(
                    'UPDATE user_settings SET default_city = ? WHERE user_id = ?',
                    (data['default_city'], session['user_id'])
                )
            
            if 'theme' in data:
                db.execute(
                    'UPDATE user_settings SET theme = ? WHERE user_id = ?',
                    (data['theme'], session['user_id'])
                )
        
        db.commit()
        return jsonify({'success': True, 'message': 'Ustawienia zaktualizowane'})
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Błąd podczas aktualizacji ustawień: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas zapisywania ustawień'}), 500