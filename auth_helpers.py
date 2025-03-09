# auth_helpers.py
from flask import redirect, url_for, session, g, abort
import functools

# Dekorator wymagający zalogowania
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return view(**kwargs)
    return wrapped_view

# Dekorator wymagający uprawnień administratora
def admin_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        
        if g.role != 'admin':
            abort(403)  # Brak uprawnień
            
        return view(**kwargs)
    return wrapped_view