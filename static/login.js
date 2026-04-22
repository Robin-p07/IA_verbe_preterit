document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const authUsername = document.getElementById('auth-username');
    const authPassword = document.getElementById('auth-password');
    const registerBtn = document.getElementById('register-btn');
    const authError = document.getElementById('auth-error');

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = authUsername.value.trim();
        const password = authPassword.value;
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({username, password})
            });
            const data = await res.json();
            
            if (data.success) {
                window.location.href = '/';
            } else {
                authError.textContent = data.error || "Identifiants incorrects";
                authError.style.display = 'block';
            }
        } catch(e) {
            authError.textContent = "Erreur de connexion";
            authError.style.display = 'block';
        }
    });

    registerBtn.addEventListener('click', async () => {
        const username = authUsername.value.trim();
        const password = authPassword.value;
        if (!username || !password) {
            authError.textContent = "Veuillez remplir les champs.";
            authError.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({username, password})
            });
            const data = await res.json();
            
            if (data.success) {
                window.location.href = '/';
            } else {
                authError.textContent = data.error || "Erreur lors de l'inscription";
                authError.style.display = 'block';
            }
        } catch(e) {
            authError.textContent = "Erreur de création de compte";
            authError.style.display = 'block';
        }
    });

    // Theme Management
    const themeToggle = document.getElementById('theme-toggle');
    const initTheme = () => {
        const savedTheme = localStorage.getItem('smartVerbsTheme') || 'light';
        themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    };
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('smartVerbsTheme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
    initTheme();
});
