# db_helpers.py
from flask import g
import sqlite3

# Funkcja do pobierania połączenia z bazą danych
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        from flask import current_app
        db = g._database = sqlite3.connect(current_app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

# Funkcja do zamykania połączenia
def close_db(e=None):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()