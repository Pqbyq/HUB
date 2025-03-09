/**
 * network.js - Skrypt do obsługi strony szczegółów sieci
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicjalizacja strony
    initNetworkPage();
    
    // Dodaj odświeżanie co 10 sekund
    setInterval(updateNetworkData, 10000);
    
    // Obsługa przycisku odświeżania
    document.getElementById('refresh-network-status').addEventListener('click', updateNetworkData);
});

/**
 * Inicjalizacja strony sieciowej
 */
async function initNetworkPage() {
    try {
        await updateNetworkData();
        await loadDevices();
        await checkConnectionQuality();
        console.log('Network page initialized successfully');
    } catch (error) {
        console.error('Error initializing network page:', error);
        showError('Wystąpił błąd podczas ładowania danych. Odśwież stronę, aby spróbować ponownie.');
    }
}

/**
 * Aktualizacja danych sieciowych
 */
async function updateNetworkData() {
    try {
        // W rzeczywistej aplikacji używamy API
        const data = await fetch('/network/api/network').then(res => res.json());
        
        // Aktualizacja statusu połączenia
        document.getElementById('connection-status').textContent = data.status;
        document.getElementById('uptime').textContent = data.uptime || 'Nieznany';
        document.getElementById('external-ip').textContent = data.external_ip || 'Nieznany';
        document.getElementById('dns-server').textContent = data.dns_server || 'Nieznany';
        
        // Aktualizacja prędkości
        document.getElementById('download-speed').textContent = `${data.download_speed} Mbps`;
        document.getElementById('upload-speed').textContent = `${data.upload_speed} Mbps`;
        
        // Kolorowanie statusu
        const statusElem = document.getElementById('connection-status');
        if (data.status === 'ONLINE') {
            statusElem.style.color = 'var(--success-color)';
        } else {
            statusElem.style.color = 'var(--error-color)';
        }
    } catch (error) {
        console.error('Error updating network data:', error);
    }
}

/**
 * Ładowanie listy urządzeń
 */
async function loadDevices() {
    try {
        console.log('Attempting to fetch network devices...');
        
        // W rzeczywistej aplikacji używamy API
        const devices = await fetch('/network/api/devices').then(res => {
            if (!res.ok) {
                // Log non-200 responses
                console.error(`HTTP error! status: ${res.status}`);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        });
        
        console.log('Received devices:', devices);
        
        // Aktualizacja licznika urządzeń
        document.getElementById('device-count').textContent = `Znaleziono ${devices.length} urządzeń`;
        
        // Budowanie tabeli urządzeń
        const tbody = document.querySelector('#devices-table tbody');
        tbody.innerHTML = '';
        
        devices.forEach(device => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = device.name;
            
            const ipCell = document.createElement('td');
            ipCell.textContent = device.ip_address;
            
            const macCell = document.createElement('td');
            macCell.textContent = device.mac_address;
            
            const statusCell = document.createElement('td');
            statusCell.textContent = device.status === 'active' ? 'Aktywne' : 'Nieaktywne';
            statusCell.style.color = device.status === 'active' ? 'var(--success-color)' : 'var(--text-light)';
            
            row.appendChild(nameCell);
            row.appendChild(ipCell);
            row.appendChild(macCell);
            row.appendChild(statusCell);
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading devices:', error);
        document.getElementById('device-count').textContent = 'Nie można załadować urządzeń';
        
        // Opcjonalnie: wyświetl więcej szczegółów błędu
        if (error.response) {
            console.error('Server response:', error.response);
        }
    }
}

/**
 * Sprawdzanie jakości połączenia (ping, jitter, packet loss)
 */
async function checkConnectionQuality() {
    try {
        // W rzeczywistej aplikacji używamy API
        const quality = await fetch('/api/network/quality').then(res => res.json())
            .catch(() => ({ 
                ping: Math.floor(Math.random() * 50) + 5, 
                jitter: Math.floor(Math.random() * 10),
                packet_loss: (Math.random() * 2).toFixed(1)
            }));
        
        // Aktualizacja danych
        document.getElementById('ping-value').textContent = `${quality.ping} ms`;
        document.getElementById('jitter-value').textContent = `${quality.jitter} ms`;
        document.getElementById('packet-loss').textContent = `${quality.packet_loss}%`;
        
        // Kolorowanie wartości
        colorQualityValue('ping-value', quality.ping, 50, 100);
        colorQualityValue('jitter-value', quality.jitter, 10, 20);
        colorQualityValue('packet-loss', parseFloat(quality.packet_loss), 1, 2);
    } catch (error) {
        console.error('Error checking connection quality:', error);
    }
}

/**
 * Kolorowanie wartości jakości połączenia
 */
function colorQualityValue(elementId, value, warnThreshold, errorThreshold) {
    const element = document.getElementById(elementId);
    
    if (value < warnThreshold) {
        element.style.color = 'var(--success-color)';
    } else if (value < errorThreshold) {
        element.style.color = 'var(--warning-color)';
    } else {
        element.style.color = 'var(--error-color)';
    }
}

/**
 * Wyświetlanie komunikatu o błędzie
 */
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.textContent = message;
    
    document.querySelector('.page-header').after(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}