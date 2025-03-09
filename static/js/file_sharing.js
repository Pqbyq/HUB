document.addEventListener('DOMContentLoaded', function() {
    const fileList = document.getElementById('file-list-body');
    const uploadModal = document.getElementById('upload-modal');
    const createFolderModal = document.getElementById('create-folder-modal');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const uploadForm = document.getElementById('upload-form');
    const createFolderForm = document.getElementById('create-folder-form');
    const currentPathDisplay = document.getElementById('current-path');

    // Aktualny katalog
    let currentPath = '/HomeHubShared';

    // Funkcje pomocnicze
    function closeModal(modal) {
        modal.classList.remove('show');
    }

    function showModal(modal) {
        modal.classList.add('show');
    }

    function showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        
        const content = document.querySelector('.content');
        content.insertBefore(alert, content.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    function showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.textContent = message;
        
        const content = document.querySelector('.content');
        content.insertBefore(alert, content.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Ładowanie plików
    async function loadFiles(path = '/HomeHubShared') {
        try {
            // Aktualizacja bieżącej ścieżki
            currentPath = path;
            
            // Aktualizacja wyświetlanej ścieżki
            currentPathDisplay.textContent = path;

            const response = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
            
            if (!response.ok) {
                throw new Error('Nie udało się załadować plików');
            }
            
            const files = await response.json();
            
            // Wyczyść aktualną listę plików
            fileList.innerHTML = '';
            
            // Dodaj przycisk powrotu, jeśli nie jesteśmy w katalogu głównym
            if (path !== '/HomeHubShared') {
                const parentDir = path.split('/').slice(0, -1).join('/');
                const parentRow = document.createElement('tr');
                parentRow.classList.add('parent-directory');
                parentRow.innerHTML = `
                    <td colspan="4">
                        <button class="btn btn-link parent-dir-btn" data-path="${parentDir}">
                            <i class="icon">📁</i> Wróć do katalogu nadrzędnego
                        </button>
                    </td>
                `;
                fileList.appendChild(parentRow);
            }
            
            // Dodaj pliki do listy
            files.forEach(file => {
                const row = document.createElement('tr');
                
                // Ikona i nazwa pliku
                const nameCell = document.createElement('td');
                const icon = file.is_dir ? '📁' : '📄';
                const nameSpan = document.createElement('span');
                nameSpan.innerHTML = `${icon} ${file.name}`;
                
                // Dodaj obsługę kliknięcia dla katalogów
                if (file.is_dir) {
                    nameSpan.classList.add('directory-name');
                    nameSpan.style.cursor = 'pointer';
                    nameSpan.addEventListener('click', () => {
                        loadFiles(file.path);
                    });
                }
                
                nameCell.appendChild(nameSpan);
                
                // Rozmiar pliku
                const sizeCell = document.createElement('td');
                sizeCell.textContent = file.is_dir ? '-' : formatFileSize(file.size);
                
                // Data modyfikacji
                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(file.modified).toLocaleString();
                
                // Komórka akcji
                const actionsCell = document.createElement('td');
                actionsCell.innerHTML = `
                    <div class="file-actions-btn">
                        ${!file.is_dir ? `
                        <button class="btn btn-primary btn-sm download-btn" data-path="${file.path}">
                            Pobierz
                        </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm delete-btn" data-path="${file.path}">
                            Usuń
                        </button>
                    </div>
                `;
                
                row.appendChild(nameCell);
                row.appendChild(sizeCell);
                row.appendChild(dateCell);
                row.appendChild(actionsCell);
                
                fileList.appendChild(row);
            });
            
            // Dodaj obsługę przycisków
            attachFileActions();
            attachParentDirButtons();
        } catch (error) {
            console.error('Błąd podczas ładowania plików:', error);
            showError('Nie udało się załadować plików');
        }
    }

    // Obsługa powrotu do katalogu nadrzędnego
    function attachParentDirButtons() {
        document.querySelectorAll('.parent-dir-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const parentPath = this.dataset.path;
                loadFiles(parentPath);
            });
        });
    }

    // Obsługa akcji na plikach
    function attachFileActions() {
        // Pobieranie pliku
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const path = this.dataset.path;
                try {
                    const response = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`);
                    const blob = await response.blob();
                    const filename = path.split('/').pop();
                    
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Błąd pobierania pliku:', error);
                    showError('Nie udało się pobrać pliku');
                }
            });
        });

        // Usuwanie pliku/folderu
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const path = this.dataset.path;
                
                if (!confirm('Czy na pewno chcesz usunąć ten plik/folder?')) return;
                
                try {
                    const response = await fetch('/api/files/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ path })
                    });
                    
                    if (response.ok) {
                        // Odśwież listę plików w bieżącym katalogu
                        loadFiles(currentPath);
                        showSuccess('Plik/folder został usunięty');
                    } else {
                        const error = await response.json();
                        showError(error.error || 'Nie udało się usunąć pliku');
                    }
                } catch (error) {
                    console.error('Błąd usuwania pliku:', error);
                    showError('Nie udało się usunąć pliku');
                }
            });
        });
    }

    // Obsługa przesyłania pliku
    uploadFileBtn.addEventListener('click', () => {
        showModal(uploadModal);
    });

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            showError('Wybierz plik do przesłania');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                closeModal(uploadModal);
                fileInput.value = '';
                loadFiles(currentPath);
                showSuccess('Plik został przesłany');
            } else {
                const error = await response.json();
                showError(error.error || 'Nie udało się przesłać pliku');
            }
        } catch (error) {
            console.error('Błąd przesyłania pliku:', error);
            showError('Nie udało się przesłać pliku');
        }
    });

    // Obsługa tworzenia folderu
    createFolderBtn.addEventListener('click', () => {
        showModal(createFolderModal);
    });

    createFolderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const folderNameInput = document.getElementById('folder-name');
        const folderName = folderNameInput.value.trim();
        
        if (!folderName) {
            showError('Podaj nazwę folderu');
            return;
        }
        
        try {
            const response = await fetch(`/api/files/create-folder?path=${encodeURIComponent(currentPath)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: folderName })
            });
            
            if (response.ok) {
                closeModal(createFolderModal);
                folderNameInput.value = '';
                loadFiles(currentPath);
                showSuccess('Folder został utworzony');
            } else {
                const error = await response.json();
                showError(error.error || 'Nie udało się utworzyć folderu');
            }
        } catch (error) {
            console.error('Błąd tworzenia folderu:', error);
            showError('Nie udało się utworzyć folderu');
        }
    });

    // Zamykanie modali
    document.getElementById('close-upload-modal').addEventListener('click', () => closeModal(uploadModal));
    document.getElementById('cancel-upload-btn').addEventListener('click', () => closeModal(uploadModal));
    document.getElementById('close-folder-modal').addEventListener('click', () => closeModal(createFolderModal));
    document.getElementById('cancel-folder-btn').addEventListener('click', () => closeModal(createFolderModal));

    // Załaduj pliki przy inicjalizacji strony
    loadFiles();
});