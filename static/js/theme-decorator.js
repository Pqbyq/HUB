/**
 * Wykrywanie i obsługa preferencji motywu ciemnego/jasnego
 */
document.addEventListener('DOMContentLoaded', function() {
    // Wykrywanie preferencji systemowych
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Jeśli jesteśmy na stronie logowania (brak przełącznika), ustaw tryb ciemny
    if (prefersDark && !document.getElementById('theme-checkbox')) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Dla trybu ciemnego, dostosuj kontrast tekstu na stronie logowania
    const checkTheme = () => {
        if (document.documentElement.getAttribute('data-theme') === 'dark' && 
            document.querySelector('.login-container')) {
            document.querySelectorAll('.login-container input, .login-container label, .login-container h1, .login-container p')
                .forEach(el => {
                    el.style.color = getComputedStyle(document.documentElement)
                        .getPropertyValue('--text-color');
                });
        }
    };
    
    checkTheme();
    
    // Sprawdzaj co 100ms przez pierwsze 1000ms (na wypadek opóźnień w ładowaniu)
    let checkCount = 0;
    const interval = setInterval(() => {
        checkTheme();
        checkCount++;
        if (checkCount >= 10) clearInterval(interval);
    }, 100);
});