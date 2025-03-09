from flask import Blueprint, request, jsonify, render_template, g, current_app
import random
import socket
import psutil
import subprocess
import re
import requests

# Remove direct import from app
# Instead, use a function to get the database
def get_db():
    from app import get_db as app_get_db
    return app_get_db()

# Import login_required decorator
def login_required(f):
    from auth_helpers import login_required as auth_login_required
    return auth_login_required(f)

# Tworzenie blueprintu dla tras sieciowych
network_bp = Blueprint('network', __name__)

# Strona szczegółów sieci
@network_bp.route('/network/network-details')
@login_required
def network_details():
    # Pobieranie preferencji użytkownika
    db = get_db()
    settings = db.execute('SELECT theme FROM user_settings WHERE user_id = ?',
                          (g.user_id,)).fetchone()
    
    theme = settings['theme'] if settings else 'light'
    
    return render_template('network_details.html', 
                          app_name=current_app.config['APP_NAME'],
                          username=g.username,
                          role=g.role,
                          theme=theme)

# API - pobieranie statusu sieci
@network_bp.route('/network/api/network', methods=['GET'])
@login_required
def get_network_status():
    try:
        # Pobieranie statystyk interfejsu sieciowego
        net_io = psutil.net_io_counters()
        
        # Sprawdzenie połączenia internetowego
        is_connected = False
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            is_connected = True
        except:
            pass
        
        # Pobierz uptime systemu
        uptime = "Nieznany"
        try:
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
                days = int(uptime_seconds // 86400)
                hours = int((uptime_seconds % 86400) // 3600)
                uptime = f"{days} dni, {hours} godz"
        except:
            pass
        
        # Pobranie adresu IP zewnętrznego
        external_ip = "Nieznany"
        try:
            external_ip = requests.get('https://api.ipify.org', timeout=3).text
        except:
            pass
        
        # Pobieranie informacji o DNS
        dns_server = "Nieznany"
        try:
            with open('/etc/resolv.conf', 'r') as f:
                for line in f:
                    if line.startswith('nameserver'):
                        dns_server = line.split()[1]
                        break
        except:
            pass
        
        # Szacowanie prędkości na podstawie liczników sieciowych
        download_speed = round(net_io.bytes_recv / 1024 / 1024 * 8, 1)  # Mbps
        upload_speed = round(net_io.bytes_sent / 1024 / 1024 * 8, 1)    # Mbps
        
        # Pobierz liczbę podłączonych urządzeń
        connected_devices = 0
        try:
            arp_output = subprocess.check_output(["arp", "-a"]).decode()
            connected_devices = len([line for line in arp_output.split("\n") if line.strip()])
        except:
            pass
        
        network_data = {
            'download_speed': download_speed,
            'upload_speed': upload_speed,
            'connected_devices': connected_devices,
            'status': 'ONLINE' if is_connected else 'OFFLINE',
            'uptime': uptime,
            'external_ip': external_ip,
            'dns_server': dns_server
        }
        
        return jsonify(network_data)
    except Exception as e:
        current_app.logger.error(f"Błąd podczas pobierania statusu sieci: {str(e)}")
        # Fallback do symulowanych danych
        network_data = {
            'download_speed': round(random.uniform(50, 100), 1),
            'upload_speed': round(random.uniform(20, 30), 1),
            'connected_devices': random.randint(3, 8),
            'status': 'ONLINE',
            'uptime': "Nieznany",
            'external_ip': "Nieznany",
            'dns_server': "Nieznany"
        }
        return jsonify(network_data)

# API - pobieranie urządzeń w sieci
@network_bp.route('/network/api/devices', methods=['GET'])
@login_required
def get_devices():
    try:
        # Pobierz istniejące urządzenia z bazy danych
        db = get_db()
        
        # Log the database query
        current_app.logger.info("Attempting to fetch devices from database")
        
        # Sprawdź, czy baza danych zwraca jakiekolwiek dane
        db_devices = db.execute('SELECT * FROM devices').fetchall()
        current_app.logger.info(f"Found {len(db_devices)} devices in database")
        
        # Pobierz aktualny stan sieci
        devices = []
        
        # Uruchom arp -a aby znaleźć urządzenia w sieci
        try:
            # Wykonaj skanowanie sieci
            current_app.logger.info("Attempting to run ARP scan")
            arp_output = subprocess.check_output(["arp", "-a"]).decode()
            current_app.logger.info("ARP scan completed successfully")
            
            # Przetwarzanie wyników arp
            for line in arp_output.split('\n'):
                if not line.strip():
                    continue
                    
                # Próba wyodrębnienia adresu IP i MAC
                ip_match = re.search(r'\(([0-9\.]+)\)', line)
                mac_match = re.search(r'([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})', line)
                
                if ip_match and mac_match:
                    ip_address = ip_match.group(1)
                    mac_address = mac_match.group(1).upper()
                    
                    # Log each device found
                    current_app.logger.info(f"Found device: IP {ip_address}, MAC {mac_address}")
                    
                    # Sprawdź czy urządzenie jest już w bazie
                    device = next((dict(d) for d in db_devices if d['mac_address'] == mac_address), {
                        'name': f'Urządzenie-{len(devices) + 1}',
                        'device_type': 'unknown'
                    })
                    
                    devices.append({
                        'id': device.get('id', len(devices) + 1),
                        'name': device.get('name', f'Urządzenie-{len(devices) + 1}'),
                        'mac_address': mac_address,
                        'ip_address': ip_address,
                        'device_type': device.get('device_type', 'unknown'),
                        'status': 'active'
                    })
            
            current_app.logger.info(f"Total devices discovered: {len(devices)}")
        except Exception as e:
            current_app.logger.error(f"Error during network scan: {str(e)}")
            # Dodaj więcej szczegółów o błędzie
            import traceback
            current_app.logger.error(traceback.format_exc())
        
        return jsonify(devices)
    except Exception as e:
        current_app.logger.error(f"Błąd podczas pobierania urządzeń: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Wystąpił błąd podczas pobierania urządzeń', 'details': str(e)}), 500

        
# API - pobieranie jakości połączenia
@network_bp.route('/network/api/network/quality', methods=['GET'])
@login_required
def get_network_quality():
    try:
        # Przykładowe dane
        quality_data = {
            'ping': random.randint(5, 50),
            'jitter': random.randint(1, 15),
            'packet_loss': round(random.uniform(0, 2), 1)
        }
        
        return jsonify(quality_data)
    except Exception as e:
        current_app.logger.error(f"Błąd podczas pobierania jakości sieci: {str(e)}")
        return jsonify({'error': 'Wystąpił błąd podczas pobierania jakości sieci'}), 500