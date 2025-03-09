from flask import Blueprint, request, jsonify, render_template, current_app, send_file, abort, g, send_from_directory
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime, timedelta
import mimetypes
import hashlib
import shutil

# Funkcja do importowania get_db bez cyklicznych importów
def get_db():
    from app import get_db as app_get_db
    return app_get_db()

# Funkcja do importowania dekoratorów bez cyklicznych importów
def login_required(f):
    from auth_helpers import login_required as auth_login_required
    return auth_login_required(f)

# Tworzenie blueprintu dla udostępniania plików
file_sharing_bp = Blueprint('file_sharing', __name__)

# Katalog bazowy dla udostępnianych plików
BASE_SHARE_DIR = os.path.join(os.path.expanduser('~'), 'HomeHubShared')
os.makedirs(BASE_SHARE_DIR, exist_ok=True)

def generate_secure_link():
    """Generowanie bezpiecznego, unikalnego linku do udostępnienia"""
    return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:16]

def init_file_sharing_tables():
    """Inicjalizacja tabel dla udostępniania plików"""
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS shared_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            is_directory BOOLEAN DEFAULT 0,
            shared_link TEXT UNIQUE,
            link_expiration DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME,
            access_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    db.commit()

# Route dla strony udostępniania plików
@file_sharing_bp.route('/file-sharing')
@login_required
def file_sharing_page():
    """Strona główna udostępniania plików"""
    # Pobierz motyw użytkownika
    db = get_db()
    settings = db.execute('SELECT theme FROM user_settings WHERE user_id = ?',
                          (g.user_id,)).fetchone()
    theme = settings['theme'] if settings else 'light'
    
    return render_template('file_sharing.html', 
                           app_name=current_app.config['APP_NAME'], 
                           username=g.username,
                           role=g.role,
                           theme=theme)

# API - lista plików
@file_sharing_bp.route('/api/files/list', methods=['GET'])
@login_required
def list_files():
    """Lista plików w określonym katalogu"""
    # Inicjalizacja tabel
    init_file_sharing_tables()
    
    path = request.args.get('path', BASE_SHARE_DIR)
    
    try:
        # Sprawdź uprawnienia użytkownika
        if not os.path.commonprefix([os.path.realpath(path), BASE_SHARE_DIR]) == BASE_SHARE_DIR:
            return jsonify({'error': 'Nieprawidłowa ścieżka'}), 403
        
        # Bezpieczne listowanie plików
        files = []
        for item in os.scandir(path):
            try:
                file_info = {
                    'name': item.name,
                    'is_dir': item.is_dir(),
                    'size': item.stat().st_size if not item.is_dir() else 0,
                    'path': item.path,
                    'modified': datetime.fromtimestamp(item.stat().st_mtime).isoformat()
                }
                files.append(file_info)
            except PermissionError:
                # Ignoruj pliki, do których nie masz dostępu
                continue
        
        return jsonify(sorted(files, key=lambda x: (not x['is_dir'], x['name'])))
    except Exception as e:
        current_app.logger.error(f"Błąd listowania plików: {str(e)}")
        return jsonify({'error': 'Nie udało się wyświetlić plików'}), 500

# API - przesyłanie pliku
@file_sharing_bp.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file():
    """Przesyłanie pliku"""
    # Inicjalizacja tabel
    init_file_sharing_tables()
    
    try:
        # Sprawdź, czy plik został przesłany
        if 'file' not in request.files:
            return jsonify({'error': 'Brak pliku'}), 400
        
        file = request.files['file']
        
        # Sprawdź, czy wybrano plik
        if file.filename == '':
            return jsonify({'error': 'Nie wybrano pliku'}), 400
        
        # Bezpieczna nazwa pliku
        filename = secure_filename(file.filename)
        
        # Określ ścieżkę docelową
        destination_path = os.path.join(BASE_SHARE_DIR, filename)
        
        # Sprawdź, czy plik już istnieje
        counter = 1
        while os.path.exists(destination_path):
            name, ext = os.path.splitext(filename)
            destination_path = os.path.join(BASE_SHARE_DIR, f"{name}_{counter}{ext}")
            counter += 1
        
        # Zapisz plik
        file.save(destination_path)
        
        # Dodaj wpis do bazy danych
        db = get_db()
        db.execute(
            'INSERT INTO shared_files (user_id, file_path, filename, file_size, is_directory) VALUES (?, ?, ?, ?, ?)',
            (g.user_id, destination_path, os.path.basename(destination_path), 
             os.path.getsize(destination_path), 0)
        )
        db.commit()
        
        return jsonify({
            'message': 'Plik przesłany pomyślnie', 
            'filename': os.path.basename(destination_path)
        }), 201
    except Exception as e:
        current_app.logger.error(f"Błąd przesyłania pliku: {str(e)}")
        return jsonify({'error': 'Nie udało się przesłać pliku'}), 500

# API - tworzenie folderu
@file_sharing_bp.route('/api/files/create-folder', methods=['POST'])
@login_required
def create_folder():
    """Tworzenie nowego folderu"""
    # Inicjalizacja tabel
    init_file_sharing_tables()
    
    try:
        # Pobierz ścieżkę rodzica, jeśli została podana
        parent_path = request.args.get('path', BASE_SHARE_DIR)
        
        folder_name = request.json.get('name')
        if not folder_name:
            return jsonify({'error': 'Nazwa folderu jest wymagana'}), 400
        # Bezpieczna nazwa folderu
        safe_folder_name = secure_filename(folder_name)
        
        # Określ ścieżkę docelową
        destination_path = os.path.join(BASE_SHARE_DIR, safe_folder_name)
        
        # Sprawdź, czy folder już istnieje
        counter = 1
        original_path = destination_path
        while os.path.exists(destination_path):
            destination_path = f"{original_path}_{counter}"
            counter += 1
        
        # Utwórz folder
        os.makedirs(destination_path, exist_ok=False)
        
        # Dodaj wpis do bazy danych
        db = get_db()
        db.execute(
            'INSERT INTO shared_files (user_id, file_path, filename, is_directory) VALUES (?, ?, ?, ?)',
            (g.user_id, destination_path, os.path.basename(destination_path), 1)
        )
        db.commit()
        
        return jsonify({
            'message': 'Folder utworzony pomyślnie', 
            'folder': os.path.basename(destination_path)
        }), 201
    except Exception as e:
        current_app.logger.error(f"Błąd tworzenia folderu: {str(e)}")
        return jsonify({'error': 'Nie udało się utworzyć folderu'}), 500

# API - usuwanie pliku lub folderu
@file_sharing_bp.route('/api/files/delete', methods=['POST'])
@login_required
def delete_file():
    """Usuwanie pliku lub folderu"""
    try:
        path = request.json.get('path')
        if not path:
            return jsonify({'error': 'Ścieżka pliku jest wymagana'}), 400
        
        # Sprawdź, czy ścieżka jest w katalogu udostępnionym
        full_path = os.path.normpath(path)
        if not os.path.commonprefix([full_path, BASE_SHARE_DIR]) == BASE_SHARE_DIR:
            return jsonify({'error': 'Nieprawidłowa ścieżka'}), 403
        
        # Usuń plik lub folder
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        
        # Usuń wpis z bazy danych
        db = get_db()
        db.execute('DELETE FROM shared_files WHERE file_path = ?', (full_path,))
        db.commit()
        
        return jsonify({'message': 'Plik/folder usunięty pomyślnie'}), 200
    except Exception as e:
        current_app.logger.error(f"Błąd usuwania pliku: {str(e)}")
        return jsonify({'error': 'Nie udało się usunąć pliku'}), 500

# API - pobieranie pliku
@file_sharing_bp.route('/api/files/download', methods=['GET'])
@login_required
def download_file():
    """Pobieranie pliku"""
    try:
        path = request.args.get('path')
        if not path:
            return jsonify({'error': 'Ścieżka pliku jest wymagana'}), 400
        
        # Sprawdź, czy ścieżka jest w katalogu udostępnionym
        full_path = os.path.normpath(path)
        if not os.path.commonprefix([full_path, BASE_SHARE_DIR]) == BASE_SHARE_DIR:
            return jsonify({'error': 'Nieprawidłowa ścieżka'}), 403
        
        # Sprawdź, czy plik istnieje
        if not os.path.exists(full_path):
            return jsonify({'error': 'Plik nie istnieje'}), 404
        
        # Pobierz katalog i nazwę pliku
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        
        return send_from_directory(directory, filename, as_attachment=True)
    except Exception as e:
        current_app.logger.error(f"Błąd pobierania pliku: {str(e)}")
        return jsonify({'error': 'Nie udało się pobrać pliku'}), 500

# API - generowanie linku do udostępnienia
@file_sharing_bp.route('/api/files/generate-share-link', methods=['POST'])
@login_required
def generate_share_link():
    """Generowanie linku do udostępnienia"""
    try:
        path = request.json.get('path')
        if not path:
            return jsonify({'error': 'Ścieżka pliku jest wymagana'}), 400
        
        # Sprawdź, czy ścieżka jest w katalogu udostępnionym
        full_path = os.path.normpath(path)
        if not os.path.commonprefix([full_path, BASE_SHARE_DIR]) == BASE_SHARE_DIR:
            return jsonify({'error': 'Nieprawidłowa ścieżka'}), 403
        
        # Wygeneruj unikalny link
        share_link = generate_secure_link()
        
        # Zapisz informacje o udostępnieniu w bazie danych
        db = get_db()
        db.execute(
            'INSERT INTO shared_files (user_id, file_path, filename, shared_link, link_expiration) VALUES (?, ?, ?, ?, ?)',
            (g.user_id, full_path, os.path.basename(full_path), share_link, 
             datetime.now() + timedelta(days=7))  # Link ważny przez 7 dni
        )
        db.commit()
        
        # Zwróć link do udostępnienia
        return jsonify({
            'share_link': share_link,
            'expiration': (datetime.now() + timedelta(days=7)).isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Błąd generowania linku udostępniającego: {str(e)}")
        return jsonify({'error': 'Nie udało się wygenerować linku'}), 500