from flask import Blueprint, request, jsonify, current_app, session
import requests

# Funkcja do importowania get_db bez cyklicznych importów
def get_db():
    from app import get_db as app_get_db
    return app_get_db()

# Funkcja do importowania login_required bez cyklicznych importów
def login_required(f):
    from auth_helpers import login_required as auth_login_required
    return auth_login_required(f)

# Tworzenie blueprintu dla tras związanych z pogodą
weather_bp = Blueprint('weather', __name__)

# API - pobieranie danych pogodowych
@weather_bp.route('/api/weather', methods=['GET'])
@login_required
def get_weather():
    # Jeśli podano miasto w parametrach, użyj go
    city = request.args.get('city')
    
    # Jeśli nie podano miasta, pobierz domyślne z ustawień użytkownika
    if not city:
        db = get_db()
        settings = db.execute('SELECT default_city FROM user_settings WHERE user_id = ?', 
                             (session['user_id'],)).fetchone()
        
        if settings and settings['default_city']:
            city = settings['default_city']
        else:
            city = 'Warsaw'  # Domyślna wartość jeśli nie ma ustawień
    
    try:
        # Wywołanie API pogodowego
        api_key = current_app.config['WEATHER_API_KEY']
        url = f"{current_app.config['WEATHER_API_URL']}?q={city}&appid={api_key}&units=metric&lang=pl"
        
        response = requests.get(url)
        if response.status_code != 200:
            current_app.logger.error(f"Błąd API pogody: {response.status_code} - {response.text}")
            return jsonify({'error': 'Nie udało się pobrać danych pogodowych'}), 500
            
        data = response.json()
        
        # Przekształcenie danych do naszego formatu
        weather_data = {
            'city': city,
            'temperature': round(data['main']['temp'], 1),
            'condition': data['weather'][0]['description'],
            'humidity': data['main']['humidity'],
            'wind_speed': round(data['wind']['speed'] * 3.6, 1),  # Konwersja z m/s na km/h
            'pressure': data['main']['pressure'],
            'icon': data['weather'][0]['icon']  # Kod ikony pogodowej
        }
        
        return jsonify(weather_data)
    except Exception as e:
        current_app.logger.error(f"Błąd podczas pobierania danych pogodowych: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas pobierania danych pogodowych'}), 500

@weather_bp.route('/api/cities/search', methods=['GET'])
@login_required
def search_cities():
    query = request.args.get('q', '')
    current_app.logger.info(f"Wyszukiwanie miasta: {query}")
    
    if len(query) < 3:
        return jsonify({'error': 'Wpisz co najmniej 3 znaki'}), 400
    
    try:
        # Wywołanie API OpenWeatherMap do wyszukiwania miast
        api_key = current_app.config['WEATHER_API_KEY']
        url = f"https://api.openweathermap.org/geo/1.0/direct?q={query}&limit=5&appid={api_key}"
        current_app.logger.info(f"URL zapytania: {url}")
        
        response = requests.get(url)
        current_app.logger.info(f"Kod odpowiedzi: {response.status_code}")
        
        if response.status_code != 200:
            current_app.logger.error(f"Błąd API wyszukiwania: {response.status_code} - {response.text}")
            return jsonify({'error': 'Nie udało się wyszukać miast'}), 500
        
        cities = response.json()
        current_app.logger.info(f"Otrzymane dane: {cities}")
        
        results = [{'name': city['name'], 'country': city['country']} for city in cities]
        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Błąd podczas wyszukiwania miast: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas wyszukiwania miast'}), 500