import {jwtDecode} from 'https://cdn.jsdelivr.net/npm/jwt-decode@4.0.0/+esm';
import {loadTheme} from "./theme.js";
import {alertConfirm, alertLoading, alertMessage, alertToast} from "./alerts.js";
import demo from "./home.js";
import {handleSearchInput, readyUsers} from "./users.js";
import {readyConfiguration} from "./configuration.js";
import {readyProducts} from "./products.js";
import {getApi, putApi} from "./api.js";
import {readyClients} from "./clients.js";
import {readyOrders} from "./orders.js";

const getCookie = (name) => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    return cookie ? cookie.split('=')[1] : null;
};

export const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
};

export const token = getCookie("token");
if (!token) window.location.href = "../../";

const decodedToken = jwtDecode(token);
const mini = localStorage.getItem("mini") === "true";
export let currentSession = await getApi(`users/${decodedToken.usuario_activo}`, token);

const elements = {
    menuBtn: document.getElementById("menu"),
    searchInput: document.getElementById("search"),
    searchBar: document.getElementById("searchBar"),
    menu: document.querySelectorAll(".nav-menu"),
    exitBtn: document.getElementById("exit"),
    userProfile: document.getElementById("userProfile"),
    userName: document.getElementById("userName"),
    userSurnames: document.getElementById("userSurnames"),
    main: document.getElementById("main"),
};

const loadContent = async (page) => {
    const response = await fetch(`${page}.html`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    elements.main.innerHTML = doc.body.innerHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
};

const loadHash = async () => {
    const hash = window.location.hash || "#home";
    const page = hash.slice(1);
    if (!window.location.hash) window.location.hash = hash;

    if (page !== "logout") await loadContent(page);

    document.querySelectorAll("a").forEach(a => {
        a.classList.toggle("active", a.getAttribute("href") === hash);
    });

    const placeholders = {
        orders: "Buscar pedidos", clients: "Buscar clientes", products: "Buscar productos", users: "Buscar usuarios",
    };

    if (placeholders[page]) {
        elements.searchBar.classList.remove("d-none");
        elements.searchBar.children[1].placeholder = placeholders[page];
    } else {
        elements.searchBar.classList.add("d-none");
    }

    elements.searchInput.removeEventListener("input", handleSearchInput);
    elements.searchInput.value = "";

    switch (page) {
        case "home":
            demo();
            break;
        case "orders":
            readyOrders(elements.searchInput);
            break;
        case "clients":
            readyClients(elements.searchInput);
            break;
        case "products":
            readyProducts(elements.searchInput);
            break;
        case "users":
            if (currentSession.rol !== "A") {
                alertMessage("Acceso denegado", "No tienes permisos para acceder a esta página", "error", 5000)
                    .finally(() => window.history.back());
                break;
            }
            readyUsers(elements.searchInput);
            break;
        case "configuration":
            readyConfiguration();
            break;
    }
};

const ready = async () => {
    if (!currentSession.en_linea) {
        await putApi('login/user/session', {usuario: currentSession.usuario, en_linea: true}, token);
        currentSession = await getApi(`users/${currentSession.usuario}`, token);
    }

    if (mini) elements.menu.forEach(div => div.classList.add("mini"));

    loadTheme();
    await loadHash();

    if (window.innerWidth <= 767) {
        alertLoading("Pantalla no compatible", "Esta página no es compatible con dispositivos móviles", "error", 5000);
        document.querySelector(".swal2-container").style.background = "var(--background-content)";
    }

    if (currentSession.rol !== "A") {
        document.getElementById("users").style.display = "none";
        document.getElementById("clients").style.display = "none";
    }

    elements.userProfile.src = currentSession.imagen_src || "http://localhost:3000/img/profile/0.jpg";
    elements.userName.textContent = currentSession.nombre;
    elements.userSurnames.textContent = `${currentSession.primer_apellido} ${currentSession.segundo_apellido}`;
};

window.addEventListener("hashchange", loadHash);

elements.menuBtn.addEventListener("click", () => {
    elements.menu.forEach(div => div.classList.toggle("mini"));
    localStorage.setItem("mini", elements.menu[0].classList.contains("mini"));
});

elements.exitBtn.addEventListener("click", async () => {
    if (await alertConfirm("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", "question")) {
        const response = await putApi('login/user/session', {usuario: currentSession.usuario, en_linea: false}, token);
        alertToast(response.message, false, response.success ? "success" : "error", "bottom-end", 1500)
            .finally(() => {
                deleteCookie('token');
                window.location.href = "../../";
            });
    } else {
        window.history.back();
    }
});

ready().then(() => {
    if (currentSession.contrasena === "") alertMessage("Establecer contraseña", "Por seguridad, debes establecer tu contraseña antes de continuar.", "info", 5000).then(() => {
        window.location.hash = "#configuration";
    });
});

console.log(token);