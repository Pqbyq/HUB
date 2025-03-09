import os
from datetime import timedelta

# Podstawowa konfiguracja
class Config:
    # Sekret do szyfrowania sesji - w produkcji powinien być wczytywany ze zmiennej środowiskowej
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)
    WEATHER_API_KEY = '0d05be65b828fe95f3be9a4700122799'
    
    # Konfiguracja bazy danych
    DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'homeHub.db')
    
    # Konfiguracja sesji
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = False  # Ustaw na True w produkcji z HTTPS
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)
    
    # Konfiguracja API
    WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather'
    
    # Ustawienia sieciowe
    HOST = '0.0.0.0'
    PORT = 5000
    DEBUG = False
    
    # Ustawienia aplikacji
    APP_NAME = 'Domowy Hub'
    ADMIN_EMAIL = 'admin@localdomain.lan'
    
    # Strefa czasowa
    TIMEZONE = 'Europe/Warsaw'

# Konfiguracja deweloperska
class DevelopmentConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    
# Konfiguracja produkcyjna
class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True  # Wymaga HTTPS
    
    # W środowisku produkcyjnym, SECRET_KEY powinien być ustawiony przez zmienną środowiskową
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Konfiguracja logowania produkcyjnego
        import logging
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler('homeHub.log', 
                                         maxBytes=10485760, 
                                         backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('HomeHub startup')

# Konfiguracja testowa
class TestingConfig(Config):
    TESTING = True
    DATABASE = ':memory:'  # Używa bazy danych w pamięci

# Słownik dostępnych konfiguracji
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}