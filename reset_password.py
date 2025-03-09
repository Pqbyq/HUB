import sqlite3
from werkzeug.security import generate_password_hash

# Połączenie z bazą danych
conn = sqlite3.connect('homeHub.db')
cursor = conn.cursor()

# Generowanie hashu dla hasła "admin"
hashed_password = generate_password_hash('admin')

# Aktualizacja hasła administratora
cursor.execute('UPDATE users SET password = ? WHERE username = ?', (hashed_password, 'admin'))

# Jeśli użytkownika admin nie ma, utwórz go
cursor.execute('INSERT OR IGNORE INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
             ('admin', hashed_password, 'admin@localdomain.lan', 'admin'))

# Zapisanie zmian
conn.commit()
conn.close()

print("Hasło administratora zostało zresetowane na 'admin'")