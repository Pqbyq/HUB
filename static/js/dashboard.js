/**
 * dashboard.js - Skrypt do obsługi strony głównej domowego huba
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicjalizacja strony
    initDashboard();

    // Aktualizacja zegara co sekundę
    updateTime();
    setInterval(updateTime, 1000);
    
    // Aktualizacja danych co 30 minut
    setInterval(updateWeatherWidget, 30 * 60 * 1000);
    
    // Aktualizacja danych sieciowych co 5 minut
    setInterval(updateNetworkWidget, 5 * 60 * 1000);
    
    // Dodanie obsługi przycisku odświeżania danych sieci
    document.getElementById('refresh-network').addEventListener('click', function() {
        updateNetworkWidget();
    });
    
    // Obsługa zmiany lokalizacji
    document.getElementById('change-location-btn').addEventListener('click', showLocationModal);
    document.getElementById('close-location-modal').addEventListener('click', hideLocationModal);
    document.getElementById('cancel-location-btn').addEventListener('click', hideLocationModal);
    document.getElementById('search-city-btn').addEventListener('click', searchCities);
    
    // Obsługa wyszukiwania po naciśnięciu Enter
    document.getElementById('city-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCities();
        }
    });
    
    // Zamykanie modalu po kliknięciu poza nim
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('location-modal');
        if (e.target === modal) {
            hideLocationModal();
        }
    });
    
    // Obsługa klawisza Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideLocationModal();
        }
    });
});

/**
 * Inicjalizacja dashboardu
 */
async function initDashboard() {
    try {
        // Pobierz ustawienia użytkownika
        const settings = await getUserSettings();
        
        // Aktualizuj wyświetlaną lokalizację
        if (settings.default_city) {
            document.getElementById('current-city').textContent = settings.default_city;
        }
        
        // Pobieranie danych
        await Promise.all([
            updateWeatherWidget(),
            updateNetworkWidget()
        ]);
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Wystąpił błąd podczas ładowania danych. Odśwież stronę, aby spróbować ponownie.');
    }
}

/**
 * Aktualizacja wszystkich danych na dashboardzie
 */
async function updateDashboardData() {
    try {
        await Promise.all([
            updateWeatherWidget(),
            updateNetworkWidget()
        ]);
    } catch (error) {
        console.error('Error updating dashboard data:', error);
    }
}

/**
 * Aktualizacja zegara
 */
function updateTime() {
    const now = new Date();
    
    const timeString = now.toLocaleTimeString('pl-PL');
    const dateString = now.toLocaleDateString('pl-PL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

/**
 * Pobieranie ustawień użytkownika
 * @returns {Promise<Object>} - Obiekt z ustawieniami
 */
async function getUserSettings() {
    try {
        const response = await fetch('/api/user/settings');
        if (!response.ok) {
            throw new Error('Nie udało się pobrać ustawień');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return { default_city: 'Warsaw' };
    }
}

/**
 * Zapisywanie nowej domyślnej lokalizacji
 * @param {string} city - Nazwa miasta
 * @returns {Promise<Object>} - Odpowiedź serwera
 */
async function updateDefaultCity(city) {
    try {
        const response = await fetch('/api/user/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ default_city: city })
        });
        
        if (!response.ok) {
            throw new Error('Nie udało się zapisać ustawień');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating default city:', error);
        showError('Nie udało się zapisać lokalizacji');
    }
}

/**
 * Aktualizacja danych pogodowych
 * @param {string} city - Opcjonalna nazwa miasta
 */
async function updateWeatherWidget(city) {
    const weatherWidget = document.getElementById('weather-widget');
    
    try {
        // Ustawienie stanu ładowania
        weatherWidget.classList.add('widget-loading');
        
        // Pobranie danych pogodowych
        console.log('Fetching weather data...', city);
        const weatherData = city 
            ? await api.getWeather(city) 
            : await api.getWeather();
        
        console.log('Weather data received:', weatherData);
        
        // Aktualizacja nazwy miasta w widgecie
        document.getElementById('current-city').textContent = weatherData.city;
        
        // Aktualizacja widżetu
        document.querySelector('.weather-condition').textContent = weatherData.condition;
        document.querySelector('.weather-temp').textContent = `${weatherData.temperature}°C`;
        
        // Aktualizacja ikony
        if (weatherData.icon) {
            // Użyj ikony z OpenWeatherMap
            const iconElement = document.querySelector('.weather-icon');
            iconElement.innerHTML = `<img src="https://openweathermap.org/img/wn/${weatherData.icon}@2x.png" alt="${weatherData.condition}">`;
        } else {
            // Lub użyj emoji jako fallbacku
            const weatherIcon = getWeatherIcon(weatherData.condition);
            document.querySelector('.weather-icon').textContent = weatherIcon;
        }
        
        // Aktualizacja szczegółów
        const weatherItems = document.querySelectorAll('.weather-item');
        weatherItems[0].querySelector('.weather-item-value').textContent = `${weatherData.humidity}%`;
        weatherItems[1].querySelector('.weather-item-value').textContent = `${weatherData.wind_speed} km/h`;
        weatherItems[2].querySelector('.weather-item-value').textContent = `${weatherData.pressure} hPa`;
        
        // Zakończenie ładowania
        weatherWidget.classList.remove('widget-loading');
    } catch (error) {
        console.error('Error updating weather widget:', error);
        // Log more detailed error information
        console.error('Error details:', error.message, error.stack);
        weatherWidget.classList.remove('widget-loading');
    }
}

/**
 * Aktualizacja danych o sieci
 */
async function updateNetworkWidget() {
    const networkWidget = document.getElementById('network-widget');
    
    try {
        // Ustawienie stanu ładowania
        networkWidget.classList.add('widget-loading');
        
        // Dodaj szczegółowe logowanie
        console.log('Attempting to fetch network status...');
        
        // Pobranie danych o sieci
        const networkData = await api.getNetworkStatus();
        
        // Więcej logowania
        console.log('Network data received:', networkData);
        
        // Sprawdzenie, czy dane są prawidłowe
        if (!networkData) {
            console.error('Received empty network data');
            throw new Error('Brak danych o sieci');
        }
        
        // Aktualizacja widżetu
        const downloadSpeedElem = document.getElementById('download-speed');
        const uploadSpeedElem = document.getElementById('upload-speed');
        const connectedDevicesElem = document.getElementById('connected-devices');
        const statusElem = document.getElementById('connection-status');
        
        // Sprawdzenie, czy elementy istnieją
        if (!downloadSpeedElem || !uploadSpeedElem || !connectedDevicesElem || !statusElem) {
            console.error('One or more network widget elements not found');
            throw new Error('Nie znaleziono elementów widżetu sieci');
        }
        
        // Bezpieczna aktualizacja danych
        downloadSpeedElem.textContent = `${networkData.download_speed || '--'} Mbps`;
        uploadSpeedElem.textContent = `${networkData.upload_speed || '--'} Mbps`;
        connectedDevicesElem.textContent = networkData.connected_devices || '--';
        
        statusElem.textContent = networkData.status || 'Nieznany';
        
        // Kolorowanie statusu
        if (networkData.status === 'ONLINE') {
            statusElem.style.color = 'var(--success-color)';
        } else {
            statusElem.style.color = 'var(--error-color)';
        }
        
        // Zakończenie ładowania
        networkWidget.classList.remove('widget-loading');
    } catch (error) {
        console.error('Błąd podczas aktualizacji widżetu sieci:', error);
        
        // Wyświetl szczegółowe informacje o błędzie
        if (error.response) {
            // Błąd z odpowiedzi serwera
            console.error('Odpowiedź serwera:', error.response);
        }
        
        // Przywróć domyślne wartości
        document.getElementById('download-speed').textContent = '--';
        document.getElementById('upload-speed').textContent = '--';
        document.getElementById('connected-devices').textContent = '--';
        document.getElementById('connection-status').textContent = 'Błąd';
        
        networkWidget.classList.remove('widget-loading');
    }
}

/**
 * Wybór ikony pogodowej na podstawie warunków
 * @param {string} condition - Warunki pogodowe
 * @returns {string} - Emoji odpowiadające pogodzie
 */
function getWeatherIcon(condition) {
    condition = condition.toLowerCase();
    
    if (condition.includes('słońce') || condition.includes('pogodnie')) {
        return '☀️';
    } else if (condition.includes('chmury') || condition.includes('zachmurzenie')) {
        return '⛅';
    } else if (condition.includes('deszcz')) {
        return '🌧️';
    } else if (condition.includes('burza')) {
        return '⛈️';
    } else if (condition.includes('śnieg')) {
        return '❄️';
    } else if (condition.includes('mgła')) {
        return '🌫️';
    } else {
        return '🌤️';
    }
}

/**
 * Pokazanie modalu zmiany lokalizacji
 */
function showLocationModal() {
    document.getElementById('location-modal').classList.add('show');
    document.getElementById('city-search').focus();
}

/**
 * Ukrycie modalu zmiany lokalizacji
 */
function hideLocationModal() {
    document.getElementById('location-modal').classList.remove('show');
    document.getElementById('city-results').innerHTML = '';
    document.getElementById('city-search').value = '';
}

/**
 * Wyszukiwanie miast
 */
async function searchCities() {
    const query = document.getElementById('city-search').value.trim();
    const resultsContainer = document.getElementById('city-results');
    
    if (query.length < 3) {
        resultsContainer.innerHTML = '<div class="alert alert-warning">Wpisz co najmniej 3 znaki</div>';
        return;
    }
    
    try {
        resultsContainer.innerHTML = '<div class="loading-indicator"></div>';
        
        const response = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Nie udało się wyszukać miast');
        }
        
        const cities = await response.json();
        
        if (cities.length === 0) {
            resultsContainer.innerHTML = '<div class="alert alert-info">Nie znaleziono miast</div>';
            return;
        }
        
        let html = '';
        cities.forEach(city => {
            html += `
                <div class="city-item" data-city="${city.name}">
                    <span class="city-name">${city.name}</span>
                    <span class="city-country">${city.country}</span>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
        
        // Dodaj obsługę kliknięcia na wyniki
        document.querySelectorAll('.city-item').forEach(item => {
            item.addEventListener('click', function() {
                const cityName = this.dataset.city;
                selectCity(cityName);
            });
        });
    } catch (error) {
        console.error('Error searching cities:', error);
        resultsContainer.innerHTML = '<div class="alert alert-error">Błąd podczas wyszukiwania</div>';
    }
}

/**
 * Wybór miasta
 * @param {string} cityName - Nazwa wybranego miasta
 */
async function selectCity(cityName) {
    // Aktualizuj widżet
    document.getElementById('current-city').textContent = cityName;
    
    // Zamknij modal
    hideLocationModal();
    
    // Zapisz ustawienie
    await updateDefaultCity(cityName);
    
    // Odśwież dane pogodowe dla nowego miasta
    await updateWeatherWidget(cityName);
    
    // Pokaż potwierdzenie
    showSuccess(`Zmieniono lokalizację na: ${cityName}`);
}

/**
 * Wyświetlanie komunikatu o błędzie
 * @param {string} message - Treść komunikatu
 */
function showError(message) {
    // Tworzenie elementu alertu
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.textContent = message;
    
    // Dodanie do DOM
    const content = document.querySelector('.content');
    content.insertBefore(alert, content.firstChild);
    
    // Usunięcie alertu po 5 sekundach
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Wyświetlanie komunikatu o sukcesie
 * @param {string} message - Treść komunikatu
 */
function showSuccess(message) {
    // Tworzenie elementu alertu
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    
    // Dodanie do DOM
    const content = document.querySelector('.content');
    content.insertBefore(alert, content.firstChild);
    
    // Usunięcie alertu po 5 sekundach
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
// Generowanie kalendarza
function generateCalendar() {
    const now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    
    // Funkcja generująca miesiąc
    function generateMonth(month, year) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Dzień tygodnia dla pierwszego dnia miesiąca (0 = niedziela, 1 = poniedziałek, itd.)
        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Przekształć na poniedziałek = 0
        
        // Ustawienie tytułu miesiąca
        document.getElementById('currentMonth').textContent = 
            firstDay.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
        
        const calendarBody = document.getElementById('calendarBody');
        calendarBody.innerHTML = '';
        
        // Tworzenie wierszy kalendarza
        let date = 1;
        for (let i = 0; i < 6; i++) {
            // Przerwij jeśli już wygenerowaliśmy wszystkie dni
            if (date > daysInMonth) break;
            
            const row = document.createElement('tr');
            
            // Tworzenie komórek w wierszu
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                
                if (i === 0 && j < firstDayOfWeek) {
                    // Puste komórki przed pierwszym dniem miesiąca
                    // Możemy tu też wstawić dni z poprzedniego miesiąca
                    const prevMonth = new Date(year, month, 0);
                    const prevMonthDays = prevMonth.getDate();
                    const prevMonthDay = prevMonthDays - (firstDayOfWeek - j - 1);
                    
                    cell.textContent = prevMonthDay;
                    cell.className = 'day other-month';
                } else if (date > daysInMonth) {
                    // Dni z następnego miesiąca
                    const nextMonthDay = date - daysInMonth;
                    cell.textContent = nextMonthDay;
                    cell.className = 'day other-month';
                    date++;
                } else {
                    // Bieżący miesiąc
                    cell.textContent = date;
                    cell.className = 'day';
                    
                    // Oznaczenie dzisiejszego dnia
                    if (date === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                        cell.classList.add('today');
                    }
                    
                    date++;
                }
                
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
        }
    }
    
    // Generowanie początkowego miesiąca
    generateMonth(currentMonth, currentYear);
    
    // Obsługa przycisków nawigacji
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateMonth(currentMonth, currentYear);
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateMonth(currentMonth, currentYear);
    });
}

// Wywołaj generowanie kalendarza po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    // ...istniejące wywołania...
    
    // Dodaj generowanie kalendarza
    generateCalendar();
});