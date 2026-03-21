import {alertConfirm, alertLoading, alertMessage, alertToast} from "./alerts.js";
import {changeTheme} from "./theme.js";
import {patchApi, putApi} from "./api.js";
import {deleteCookie, token, currentSession} from "./dashboard.js";
import {validateEmail, validatePasswordLength} from "./validations.js";

let switchTeme = null;

let formUser = null;
let profile = null;
let pencilBtn = null;
let user = null;
let name = null;
let firstSurname = null;
let secondSurname = null;
let email = null;
let role = null;
let oldPassword = null;
let newPassword = null;
let viewPasswordBtn = null;

let cancelBtn = null;
let editBtn = null;
let saveBtn = null;
let profileCancelBtn = null;

let profilesPic = null;

let formPassword = null;

let cancelPasswordBtn = null;
let editPasswordBtn = null;
let savePasswordBtn = null;

const disableInputs = (disabled) => {
    user.disabled = disabled;
    name.disabled = disabled;
    firstSurname.disabled = disabled;
    secondSurname.disabled = disabled;
    email.disabled = disabled;
    saveBtn.disabled = disabled;
};

const disableInputPassword = (disabled) => {
    oldPassword.disabled = disabled;
    oldPassword.value = disabled ? '********' : "";
    newPassword.disabled = disabled;
    newPassword.value = disabled ? '********' : "";
    savePasswordBtn.disabled = disabled;
}

export const readyConfiguration = () => {
    switchTeme = document.getElementById("switchTheme");

    formUser = document.getElementById("formUser");
    profile = document.getElementById("profile");
    pencilBtn = document.getElementById("pencil");
    user = document.getElementById("user");
    name = document.getElementById("name");
    firstSurname = document.getElementById("firstSurname");
    secondSurname = document.getElementById("secondSurname");
    email = document.getElementById("email");
    role = document.getElementById("role");
    oldPassword = document.getElementById("oldPassword");
    newPassword = document.getElementById("newPassword");
    viewPasswordBtn = document.getElementsByName("eye");

    cancelBtn = document.getElementById("cancel");
    editBtn = document.getElementById("edit");
    saveBtn = document.getElementById("save");
    profileCancelBtn = document.getElementById("profileCancel");

    profilesPic = document.querySelectorAll(".img-fluid");

    formPassword = document.getElementById("formPassword");

    cancelPasswordBtn = document.getElementById("cancelPassword");
    editPasswordBtn = document.getElementById("editPassword");
    savePasswordBtn = document.getElementById("savePassword");

    switchTeme.checked = localStorage.getItem("theme") === "dark" || false;
    const label = switchTeme.nextElementSibling;
    label.innerHTML = switchTeme.checked ? '<i class="bi bi bi-cloud-moon-fill"></i> Modo oscuro' : '<i class="bi bi bi-cloud-sun-fill"></i> Modo claro';

    profile.src = currentSession?.imagen_perfil || "https://marvi-api.onrender.com/pictures/profile/0.jpg";
    user.value = currentSession.usuario;
    name.value = currentSession.nombre;
    firstSurname.value = currentSession.primer_apellido;
    secondSurname.value = currentSession.segundo_apellido;
    email.value = currentSession.correo;
    oldPassword.value = '********';
    newPassword.value = '********';

    switchTeme.addEventListener("click", () => {
        label.innerHTML = switchTeme.checked ? '<i class="bi bi bi-cloud-moon-fill"></i> Modo oscuro' : '<i class="bi bi bi-cloud-sun-fill"></i> Modo oscuro';
        changeTheme();
    });


    editBtn.addEventListener("click", async () => {
        if (await alertConfirm("Modificar información", "Al guardar los cambios se cerrar tu sesión", "question")) {
            disableInputs(false);
            editBtn.classList.add("d-none");
            cancelBtn.classList.remove("d-none");
        }
    });

    cancelBtn.addEventListener("click", () => {
        profile.src = currentSession?.imagen_perfil || "https://marvi-api.onrender.com/pictures/profile/0.jpg";
        disableInputs(true);
        editBtn.classList.remove("d-none");
        cancelBtn.classList.add("d-none");
    });

    profilesPic.forEach((profilePic) => {
        profilePic.addEventListener("click", async () => {
            alertLoading('Actualizando foto de perfil', 'Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.');
            const response = await patchApi(`users/${currentSession._id}/profile-image`, {
                imagen_perfil: profilePic.src
            }, token)
            if (response.success) {
                alertToast("Información actualizada", response.message, "success", "bottom-end").finally(() => {
                    window.location.reload();
                });
            }
            profileCancelBtn.click();
        });
    });

    formUser.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateEmail(email.value)) {
            alertMessage("Correo inválido", "Por favor, ingresa un correo electrónico válido", "warning", 2500).then();
            return;
        }

        const data = {
            usuario: user.value,
            nombre: name.value,
            primer_apellido: firstSurname.value,
            segundo_apellido: secondSurname.value,
            correo: email.value
        };

        disableInputs(true);

        alertLoading("Actualizando usuario", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");
        try {
            const response = await putApi(`users/${currentSession._id}`, data, token);

            if (response.success) {
                localStorage.setItem("user", JSON.stringify(data));
                alertToast("Información actualizada", response.message, "success", "bottom-end").finally(() => {
                    deleteCookie('token');
                    window.location.href = "../../";
                });
            } else {
                const [firstMessage, secondMessage] = response.message.split(",");
                alertMessage(firstMessage, secondMessage, "warning").finally(() => {
                    disableInputs(false);
                    editBtn.classList.add("d-none");
                    cancelBtn.classList.remove("d-none");
                });
            }
            editBtn.classList.remove("d-none");
            cancelBtn.classList.add("d-none");
        } catch (error) {
            console.error(error);
            alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
        }
    });

    editPasswordBtn.addEventListener("click", async () => {
        if (await alertConfirm("Modificar contraseña", "Tu nueva contraseña debe contener al menos 6 caracteres", "question")) {
            disableInputPassword(false);
            editPasswordBtn.classList.add("d-none");
            cancelPasswordBtn.classList.remove("d-none");
        }
    });

    viewPasswordBtn.forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = btn.previousElementSibling;
            if (!input.disabled) {
                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";
                btn.innerHTML = isPassword ? "<i class='bi bi-eye-slash'></i>" : "<i class='bi bi-eye'></i>";
            }
        });
    });

    cancelPasswordBtn.addEventListener("click", () => {
        disableInputPassword(true);
        editPasswordBtn.classList.remove("d-none");
        cancelPasswordBtn.classList.add("d-none");
    });

    formPassword.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validatePasswordLength(newPassword.value)) {
            alertMessage("Contraseña inválida", "La contraseña debe tener al menos 6 caracteres y ser segura", "warning", 2500).then();
            return;
        }

        const data = {
            contrasena_actual: oldPassword.value, contrasena_nueva: newPassword.value
        };

        disableInputPassword(true);

        alertLoading("Actualizando contraseña", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");
        try {
            const response = await patchApi(`users/${currentSession._id}/password`, data, token);

            if (response.success) {
                alertToast("Información actualizada", response.message, "success", "bottom-end").finally(() => {
                    window.location.reload();
                });
            } else {
                const [firstMessage, secondMessage] = response.message.split(",");
                alertMessage(firstMessage, secondMessage, "warning").finally(() => {
                    disableInputPassword(false);
                    editPasswordBtn.classList.add("d-none");
                    cancelPasswordBtn.classList.remove("d-none");
                });
            }
            editPasswordBtn.classList.remove("d-none");
            cancelPasswordBtn.classList.add("d-none");
        } catch (error) {
            console.error(error);
            alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
        }
    });
};
