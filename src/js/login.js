import {postApi} from "./api.js";
import {alertLoading, alertMessage} from "./alerts.js";
import {loadTheme} from "./theme.js";

const nav = document.querySelector('nav');
const footer = document.querySelector('footer');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const eyePasswordButton = document.getElementById('eye-password-button')
const loginSubmitButton = document.getElementById('login-submit-button');
const recoveryButton = document.getElementById('recovery-button');

const recoveryUsernameInput = document.getElementById('recovery-username');
const recoverySubmitButton = document.getElementById('recovery-submit-button');
const loginButton = document.getElementById('login-button');

let hash = window.location.hash || '#login';

const scrollPage = () => {
    hash = window.location.hash || '#login';
    window.location.hash = hash;
    nav.classList.add('hide');
    footer.classList.add('hide');
    window.scrollTo({
        left: hash === '#recovery' ? window.innerWidth * 2 : 0, behavior: 'smooth'
    });
};

window.addEventListener('hashchange', () => {
    scrollPage();
});

window.addEventListener('resize', () => {
    scrollPage();
})

eyePasswordButton.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyePasswordButton.innerHTML = "<i class='bi bi-eye-slash'></i>";
    } else {
        passwordInput.type = 'password';
        eyePasswordButton.innerHTML = "<i class='bi bi-eye'></i>";
    }
});

loginSubmitButton.addEventListener('click', async () => {
    loginSubmitButton.disabled = true;
    if (usernameInput.value === '') {
        alertMessage('Faltan campos', 'Por favor completa todos los campos', 'info', 1500).then(() => {
            window.location.hash = '#login';
            loginSubmitButton.disabled = false;
        });
        return;
    }
    alertLoading('Iniciando sesión', 'Por favor, espera mientras se verifica tu información.');
    const data = {
        usuario: usernameInput.value, contrasena: passwordInput.value
    }
    const response = await postApi('login/user', data);
    if (response.success) {
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + (60 * 60 * 1000));
        document.cookie = `token=${response.data.token}; expires=${expirationDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
        alertMessage('!Bienvenido!', response.message, 'success', 1500).then(() => {
            window.location.href = 'src/html/dashboard.html';
        });
    } else {
        alertMessage(response.message, response.error, 'error', 3000).then(() => {
            window.location.hash = '#login';
            loginSubmitButton.disabled = false;
        });
    }
})

recoveryButton.addEventListener('click', () => {
    window.location.hash = '#recovery';
    recoveryUsernameInput.disabled = false;
    recoverySubmitButton.disabled = false;
    loginButton.disabled = false;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    loginSubmitButton.disabled = true;
});

recoverySubmitButton.addEventListener('click', async () => {
    recoverySubmitButton.disabled = true;
    if (recoveryUsernameInput.value === '') {
        alertMessage('Faltan campos', 'Por favor completa todos los campos', 'info', 1500).then(() => {
            window.location.hash = '#recovery';
            recoverySubmitButton.disabled = false;
        });
        return;
    }
    alertLoading('Enviando correo', 'Por favor, espera mientras se procesa tu solicitud.');
    const response = await postApi(`login/user/reset/password/${recoveryUsernameInput.value}`);
    if (response.success) {
        alertMessage('¡Correo enviado!', response.message, 'success', 1500).then(() => {
            window.location.hash = '#login';
        });
    } else {
        alertMessage(response.message, response.error, 'error', 3000).then(() => {
            window.location.hash = '#recovery';
            recoverySubmitButton.disabled = false;
        })
    }
});

loginButton.addEventListener('click', () => {
    window.location.hash = '#login';
    recoveryUsernameInput.disabled = true;
    recoverySubmitButton.disabled = true;
    loginButton.disabled = true;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    loginSubmitButton.disabled = false;
});

nav.addEventListener('animationend', (event) => {
    if (hash === '#recovery') {
        nav.style.justifyContent = 'flex-end';
        footer.style.justifyContent = 'flex-end';
    } else {
        nav.style.justifyContent = 'flex-start';
        footer.style.justifyContent = 'flex-start';
    }
    if (event.animationName === 'hide') {
        nav.classList.add('show');
        footer.classList.add('show');
        usernameInput.value = '';
        passwordInput.value = '';
        recoveryUsernameInput.value = '';
    } else if (event.animationName === 'show') {
        nav.classList.remove('hide');
        footer.classList.remove('hide');
        nav.classList.remove('show');
        footer.classList.remove('show');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (hash === '#login') {
            loginSubmitButton.click();
            loginSubmitButton.disabled = true;
        } else if (hash === '#recovery') {
            recoverySubmitButton.click();
            recoverySubmitButton.disabled = true;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    scrollPage();
    loadTheme();
});