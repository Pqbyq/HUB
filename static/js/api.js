/**
 * api.js - Klient API dla aplikacji Domowy Hub
 * Zawiera funkcje do komunikacji z backendem
 */

// Klasa obsługująca połączenia z backendem
class HomeHubAPI {
    /**
     * Inicjalizacja klienta API
     * @param {string} baseUrl - Bazowy URL API (domyślnie aktualny host)
     */
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Ustawienie nagłówków dla zapytań
     * @returns {Object} - Obiekt z nagłówkami HTTP
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * Generyczna metoda do wykonywania zapytań
     * @param {string} endpoint - Ścieżka API
     * @param {string} method - Metoda HTTP (GET, POST, PUT, DELETE)
     * @param {Object} data - Dane do wysłania (dla POST, PUT)
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async request(endpoint, method = 'GET', data = null) {
        console.log(`Making API request to: ${endpoint}`);
        const url = `${this.baseUrl}/${endpoint}`;
        
        const options = {
            method,
            headers: this.getHeaders(),
            credentials: 'same-origin',
        };
    
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
    
        try {
            const response = await fetch(url, options);
            
            console.log(`Response status: ${response.status}`);
            
            // Obsługa różnych statusów
            if (response.status === 404) {
                console.error(`Endpoint not found: ${url}`);
                throw new Error(`Nie znaleziono zasobu: ${endpoint}`);
            }
            
            if (response.status === 500) {
                console.error(`Błąd serwera: ${url}`);
                throw new Error(`Wystąpił błąd serwera podczas przetwarzania żądania`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log(`Content-Type: ${contentType}`);
    
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                    console.error('API Error Response:', data);
                    throw new Error(data.error || `Błąd HTTP: ${response.status}`);
                }
                
                console.log('Received data:', data);
                return data;
            } else {
                const text = await response.text();
                console.error('Non-JSON Response:', text);
                
                if (!response.ok) {
                    throw new Error(text || `Błąd HTTP: ${response.status}`);
                }
                
                return { success: true };
            }
        } catch (error) {
            console.error('API request failed:', error);
            console.error('Endpoint:', endpoint);
            console.error('Error details:', error.message, error.stack);
            throw error;
        }
    }

    /**
     * Pobranie danych pogodowych
     * @param {string} city - Nazwa miasta (opcjonalna)
     * @returns {Promise} - Obietnica z danymi pogodowymi
     */
    async getWeather(city) {
        console.log('Requesting weather for city:', city);
        const endpoint = city 
            ? `api/weather?city=${encodeURIComponent(city)}`
            : 'api/weather';
        return await this.request(endpoint);
    }

    /**
     * Pobranie statusu sieci
     * @returns {Promise} - Obietnica z danymi o sieci
     */
    async getNetworkStatus() {
        console.log('Requesting network status...');
        try {
            const data = await this.request('network/api/network');
            console.log('Network status received:', data);
            return data;
        } catch (error) {
            console.error('Error fetching network status:', error);
            throw error;
        }
    }

    /**
     * Pobieranie listy użytkowników (tylko admin)
     * @returns {Promise} - Obietnica z listą użytkowników
     */
    async getUsers() {
        return await this.request('users');
    }

    /**
     * Utworzenie nowego użytkownika (tylko admin)
     * @param {Object} userData - Dane nowego użytkownika
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async createUser(userData) {
        return await this.request('users', 'POST', userData);
    }

    /**
     * Aktualizacja danych użytkownika (tylko admin)
     * @param {number} userId - ID użytkownika
     * @param {Object} userData - Nowe dane użytkownika
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async updateUser(userId, userData) {
        return await this.request(`users/${userId}`, 'PUT', userData);
    }

    /**
     * Usunięcie użytkownika (tylko admin)
     * @param {number} userId - ID użytkownika do usunięcia
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async deleteUser(userId) {
        return await this.request(`users/${userId}`, 'DELETE');
    }

    /**
     * Zmiana hasła użytkownika
     * @param {string} currentPassword - Aktualne hasło
     * @param {string} newPassword - Nowe hasło
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async changePassword(currentPassword, newPassword) {
        return await this.request('change-password', 'POST', {
            current_password: currentPassword,
            new_password: newPassword
        });
    }

    /**
     * Pobranie listy urządzeń w sieci
     * @returns {Promise} - Obietnica z listą urządzeń
     */
    async getDevices() {
        return await this.request('devices');
    }
    
    /**
     * Pobranie ustawień użytkownika
     * @returns {Promise} - Obietnica z ustawieniami
     */
    async getUserSettings() {
        return await this.request('user/settings');
    }
    
    /**
     * Aktualizacja ustawień użytkownika
     * @param {Object} settings - Nowe ustawienia
     * @returns {Promise} - Obietnica z odpowiedzią
     */
    async updateUserSettings(settings) {
        return await this.request('user/settings', 'POST', settings);
    }
    
    /**
     * Wyszukiwanie miast
     * @param {string} query - Fraza wyszukiwania
     * @returns {Promise} - Obietnica z wynikami
     */
    async searchCities(query) {
        return await this.request(`cities/search?q=${encodeURIComponent(query)}`);
    }
}

// Eksport instancji
const api = new HomeHubAPI();