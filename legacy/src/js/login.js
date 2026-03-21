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

const recoverySection = document.querySelector('.recovery-form');
const recoveryEmailInput = document.getElementById('recovery-email');
const recoverySubmitButton = document.getElementById('recovery-submit-button');
const recoveryBackButton = document.getElementById('recovery-back-button');

const resetSection = document.querySelector('.reset-form');
const resetCodeInput = document.getElementById('reset-code');
const resetPasswordInput = document.getElementById('reset-password');
const resetSubmitButton = document.getElementById('reset-submit-button');
const resetBackButton = document.getElementById('reset-back-button');

const loginControls = [usernameInput, passwordInput, loginSubmitButton];
const recoveryControls = [recoveryEmailInput, recoverySubmitButton, recoveryBackButton];
const resetControls = [resetCodeInput, resetPasswordInput, resetSubmitButton, resetBackButton];

const clearInputs = () => {
    usernameInput.value = '';
    passwordInput.value = '';
    recoveryEmailInput.value = '';
    resetCodeInput.value = '';
    resetPasswordInput.value = '';
};

const setDisabled = (controls, disabled) => {
    controls.forEach((control) => {
        control.disabled = disabled;
    });
};

const setLoginMode = () => {
    clearInputs();
    setDisabled(loginControls, false);
    setDisabled(recoveryControls, true);
    setDisabled(resetControls, true);
};

const setRecoveryMode = () => {
    clearInputs();
    setDisabled(loginControls, true);
    setDisabled(recoveryControls, false);
    setDisabled(resetControls, true);
};

const setResetMode = () => {
    clearInputs();
    setDisabled(loginControls, true);
    setDisabled(recoveryControls, true);
    setDisabled(resetControls, false);
};

const validHashes = ['#login', '#recovery', '#reset'];
let hash = validHashes.includes(window.location.hash) ? window.location.hash : '#login';
let saveEmail;

const scrollPage = () => {
    nav.classList.add('hide');
    footer.classList.add('hide');
    window.scrollTo({
        left: hash === '#recovery' || hash === '#reset' ? window.innerWidth * 2 : 0, behavior: 'smooth'
    });
};

const syncStateFromHash = () => {
    hash = validHashes.includes(window.location.hash) ? window.location.hash : '#login';

    if (window.location.hash !== hash) {
        window.location.hash = hash;
        return;
    }

    if (hash === '#login') {
        setLoginMode();
        recoverySection.classList.remove('visually-hidden');
        resetSection.classList.add('visually-hidden');
    } else if (hash === '#recovery') {
        setRecoveryMode();
        recoverySection.classList.remove('visually-hidden');
        resetSection.classList.add('visually-hidden');
    } else {
        setResetMode();
        recoverySection.classList.add('visually-hidden');
        resetSection.classList.remove('visually-hidden');
    }

    scrollPage();
};

window.addEventListener('hashchange', () => {
    syncStateFromHash();
});

window.addEventListener('pageshow', () => {
    syncStateFromHash();
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
    setDisabled([loginSubmitButton], true);
    if (usernameInput.value === '') {
        alertMessage('Faltan campos', 'Por favor completa todos los campos', 'info', 1500).then(() => {
            window.location.hash = '#login';
            setDisabled([loginSubmitButton], false);
        });
        return;
    }
    alertLoading('Iniciando sesión', 'Por favor, espera mientras se verifica tu información.');
    const data = {
        usuario: usernameInput.value, contrasena: passwordInput.value
    }
    const response = await postApi('users/login', data);
    if (response.success) {
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + (3 * 60 * 60 * 1000));
        document.cookie = `token=${response.token}; expires=${expirationDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
        alertMessage('!Bienvenido!', response.message, 'success', 1500).then(() => {
            window.location.href = 'src/html/dashboard.html';
        });
    } else {
        alertMessage(response.message, response.error, 'error', 3000).then(() => {
            window.location.hash = '#login';
            setDisabled([loginSubmitButton], false);
        });
    }
})

recoveryButton.addEventListener('click', () => {
    window.location.hash = '#recovery';
});

recoverySubmitButton.addEventListener('click', async () => {
    setDisabled([recoverySubmitButton], true);
    if (recoveryEmailInput.value === '') {
        alertMessage('Faltan campos', 'Por favor completa todos los campos', 'info', 1500).then(() => {
            window.location.hash = '#recovery';
            setDisabled([recoverySubmitButton], false);
        });
        return;
    }
    alertLoading('Enviando correo', 'Por favor, espera mientras se procesa tu solicitud.');
    const response = await postApi(`users/forgot-password/${recoveryEmailInput.value}`);
    if (response.success) {
        saveEmail = recoveryEmailInput.value;
        recoverySection.classList.add('visually-hidden');
        resetSection.classList.remove('visually-hidden');
        alertMessage('¡Correo enviado!', response.message, 'success', 1500).then(() => {
            window.location.hash = '#reset';
        });
    } else {
        alertMessage(response.message, response.error, 'error', 3000).then(() => {
            window.location.hash = '#recovery';
            setDisabled([recoverySubmitButton], false);
        })
    }
});

recoveryBackButton.addEventListener('click', () => {
    window.location.hash = '#login';
});

resetSubmitButton.addEventListener('click', async () => {
    setDisabled([resetSubmitButton], true);
    if (resetCodeInput.value === '' || resetPasswordInput.value === '') {
        alertMessage('Faltan campos', 'Por favor completa todos los campos', 'info', 1500).then(() => {
            window.location.hash = '#recovery';
            setDisabled([resetSubmitButton], false);
        });
        return;
    }
    alertLoading('Restableciendo contraseña', 'Por favor, espera mientras se procesa tu solicitud.');
    const data = {
        codigo: resetCodeInput.value, contrasena: resetPasswordInput.value
    }
    const response = await postApi(`users/reset-password/${saveEmail}`, data);
    if (response.success) {
        resetSection.classList.add('visually-hidden');
        recoverySection.classList.remove('visually-hidden');
        alertMessage('¡Contraseña restablecida!', response.message, 'success', 1500).then(() => {
            window.location.hash = '#recovery';
        });
    } else {
        alertMessage(response.message, response.error, 'error', 3000).then(() => {
            window.location.hash = '#recovery';
            setDisabled([resetSubmitButton], false);
        })
    }
});

resetBackButton.addEventListener('click', () => {
    window.location.hash = '#login';
});

nav.addEventListener('animationend', (event) => {
    if (hash === '#recovery' || hash === '#reset') {
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
        recoveryEmailInput.value = '';
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
            setDisabled([loginSubmitButton], true);
        } else if (hash === '#recovery') {
            recoverySubmitButton.click();
            setDisabled([recoverySubmitButton], true);
        } else if (hash === '#reset') {
            resetSubmitButton.click();
            setDisabled([resetSubmitButton], true);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    syncStateFromHash();
    loadTheme();
});