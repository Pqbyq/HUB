-- schema.sql
-- Schemat bazy danych dla domowego huba

-- Tabela użytkowników
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',  -- 'admin' lub 'user'
    created_at TEXT NOT NULL,
    last_login TEXT
);

-- Tabela urządzeń w sieci
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    device_type TEXT,
    ip_address TEXT,
    last_seen TEXT,
    status TEXT DEFAULT 'active',
    owner_id INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users (id)
);

-- Tabela ustawień użytkowników
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    default_city TEXT DEFAULT 'Warsaw',
    dashboard_layout TEXT,  -- JSON format przechowujący układ widżetów
    theme TEXT DEFAULT 'light',
    notifications_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Tabela logów dostępu
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    success INTEGER NOT NULL,  -- 0 = niepowodzenie, 1 = powodzenie
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Tabela powiadomień
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',  -- 'info', 'warning', 'error', 'success'
    created_at TEXT NOT NULL,
    read INTEGER DEFAULT 0,  -- 0 = nieprzeczytane, 1 = przeczytane
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Tabela plików udostępnianych
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
);

-- Tabela uprawnień do plików
CREATE TABLE IF NOT EXISTS file_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    can_read BOOLEAN DEFAULT 1,
    can_write BOOLEAN DEFAULT 0,
    can_delete BOOLEAN DEFAULT 0,
    FOREIGN KEY (file_id) REFERENCES shared_files (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);