/**
 * admin.js - Skrypt do obsługi panelu administratora
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicjalizacja modali
    initModals();
    
    // Obsługa przycisku dodawania użytkownika
    document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);
    
    // Obsługa przycisków edycji użytkownika
    document.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.id;
            const username = this.dataset.username;
            const email = this.dataset.email;
            const role = this.dataset.role;
            
            showEditUserModal(userId, username, email, role);
        });
    });
    
    // Obsługa przycisków usuwania użytkownika
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.id;
            const username = this.dataset.username;
            
            showDeleteConfirmation(userId, username);
        });
    });
    
    // Obsługa formularza użytkownika
    document.getElementById('user-form').addEventListener('submit', handleUserForm);
    
    // Obsługa formularza usuwania
    document.getElementById('delete-form').addEventListener('submit', handleDeleteForm);
});

/**
 * Inicjalizacja modali
 */
function initModals() {
    // Modal użytkownika
    const userModal = document.getElementById('user-modal');
    const closeUserModal = document.getElementById('close-modal');
    const cancelUserBtn = document.getElementById('cancel-btn');
    
    closeUserModal.addEventListener('click', () => {
        userModal.classList.remove('show');
    });
    
    cancelUserBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userModal.classList.remove('show');
    });
    
    // Modal usuwania
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    
    closeDeleteModal.addEventListener('click', () => {
        deleteModal.classList.remove('show');
    });
    
    cancelDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        deleteModal.classList.remove('show');
    });
    
    // Zamykanie modali przy kliknięciu poza zawartością
    window.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.classList.remove('show');
        }
        if (e.target === deleteModal) {
            deleteModal.classList.remove('show');
        }
    });
    
    // Obsługa klawisza Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            userModal.classList.remove('show');
            deleteModal.classList.remove('show');
        }
    });
}

/**
 * Pokazanie modalu dodawania użytkownika
 */
function showAddUserModal() {
    // Resetowanie formularza
    const form = document.getElementById('user-form');
    form.reset();
    
    // Ustawienie akcji formularza
    form.action = '/api/users';
    form.method = 'post';
    document.getElementById('form-action').value = 'create';
    document.getElementById('user-id').value = '';
    
    // Aktualizacja tytułu
    document.getElementById('modal-title').textContent = 'Dodaj Nowego Użytkownika';
    
    // Pole hasła jest wymagane przy tworzeniu
    document.getElementById('password').required = true;
    document.getElementById('password-hint').textContent = 'Minimalna długość: 8 znaków';
    
    // Wyświetlenie modalu
    document.getElementById('user-modal').classList.add('show');
}

/**
 * Pokazanie modalu edycji użytkownika
 * @param {string} userId - ID użytkownika
 * @param {string} username - Nazwa użytkownika
 * @param {string} email - Email użytkownika
 * @param {string} role - Rola użytkownika
 */
function showEditUserModal(userId, username, email, role) {
    // Ustawienie wartości formularza
    const form = document.getElementById('user-form');
    form.reset();
    
    document.getElementById('username').value = username;
    document.getElementById('email').value = email;
    document.getElementById('role').value = role;
    
    // Ustawienie akcji formularza
    form.action = `/api/users/${userId}`;
    form.method = 'post';
    document.getElementById('form-action').value = 'update';
    document.getElementById('user-id').value = userId;
    
    // Aktualizacja tytułu
    document.getElementById('modal-title').textContent = 'Edytuj Użytkownika';
    
    // Pole hasła nie jest wymagane przy edycji
    document.getElementById('password').required = false;
    document.getElementById('password-hint').textContent = 'Pozostaw puste, aby nie zmieniać';
    
    // Wyświetlenie modalu
    document.getElementById('user-modal').classList.add('show');
}

/**
 * Pokazanie potwierdzenia usunięcia użytkownika
 * @param {string} userId - ID użytkownika
 * @param {string} username - Nazwa użytkownika
 */
function showDeleteConfirmation(userId, username) {
    // Ustawienie tekstu potwierdzenia
    document.getElementById('delete-username').textContent = username;
    
    // Ustawienie akcji formularza
    const form = document.getElementById('delete-form');
    form.action = `/admin/delete/${userId}`;
    
    // Dodanie animacji trzęsienia do nazwy użytkownika
    const usernameSpan = document.getElementById('delete-username');
    usernameSpan.classList.add('shake');
    
    // Usunięcie klasy po zakończeniu animacji
    setTimeout(() => {
        usernameSpan.classList.remove('shake');
    }, 500);
    
    // Wyświetlenie modalu
    document.getElementById('delete-modal').classList.add('show');
}

/**
 * Obsługa formularza użytkownika
 * @param {Event} event - Zdarzenie przesłania formularza
 */
function handleUserForm(event) {
    // Walidacja formularza
    const form = event.target;
    const password = document.getElementById('password').value;
    
    if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    
    // Przy tworzeniu, sprawdź czy hasło ma wymaganą długość
    if (document.getElementById('form-action').value === 'create' && password.length < 8) {
        event.preventDefault();
        alert('Hasło musi mieć co najmniej 8 znaków.');
        return false;
    }
    
    // Przy edycji, jeśli podano hasło, sprawdź jego długość
    if (document.getElementById('form-action').value === 'update' && password && password.length < 8) {
        event.preventDefault();
        alert('Hasło musi mieć co najmniej 8 znaków.');
        return false;
    }
    
    // Formularz przechodzi walidację, możemy go wysłać
    // Dodanie wskaźnika ładowania
    showLoading();
    
    // Jeśli używamy API, możemy wysłać dane asynchronicznie
    if (false) {  // Zmieniamy na true, gdy chcemy użyć API zamiast standardowego formularza
        event.preventDefault();
        
        const formData = new FormData(form);
        const formAction = document.getElementById('form-action').value;
        const userId = document.getElementById('user-id').value;
        
        // Konwersja FormData na obiekt
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Wywołanie odpowiedniej metody API
        let apiPromise;
        
        if (formAction === 'create') {
            apiPromise = api.createUser(data);
        } else {
            apiPromise = api.updateUser(userId, data);
        }
        
        apiPromise
            .then(response => {
                hideLoading();
                showSuccess(response.message);
                document.getElementById('user-modal').classList.remove('show');
                
                // Odświeżenie strony po krótkim opóźnieniu
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            })
            .catch(error => {
                hideLoading();
                showError(error.message || 'Wystąpił błąd podczas zapisywania danych.');
            });
    }
    
    return true;
}

/**
 * Obsługa formularza usuwania
 * @param {Event} event - Zdarzenie przesłania formularza
 */
function handleDeleteForm(event) {
    // Pokazanie wskaźnika ładowania
    showLoading();
    
    // Jeśli używamy API, możemy wysłać dane asynchronicznie
    if (false) {  // Zmieniamy na true, gdy chcemy użyć API zamiast standardowego formularza
        event.preventDefault();
        
        const userId = document.getElementById('delete-form').action.split('/').pop();
        
        api.deleteUser(userId)
            .then(response => {
                hideLoading();
                showSuccess(response.message);
                document.getElementById('delete-modal').classList.remove('show');
                
                // Odświeżenie strony po krótkim opóźnieniu
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            })
            .catch(error => {
                hideLoading();
                showError(error.message || 'Wystąpił błąd podczas usuwania użytkownika.');
            });
    }
    
    return true;
}

/**
 * Pokazanie wskaźnika ładowania
 */
function showLoading() {
    // Sprawdzenie czy wskaźnik ładowania już istnieje
    if (document.getElementById('loading-overlay')) {
        return;
    }
    
    // Tworzenie wskaźnika ładowania
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '2000';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-indicator';
    
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
}

/**
 * Ukrycie wskaźnika ładowania
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
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