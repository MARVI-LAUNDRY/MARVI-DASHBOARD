import {jwtDecode} from 'https://cdn.jsdelivr.net/npm/jwt-decode@4.0.0/+esm';
import {loadTheme} from "./theme.js";
import {alertConfirm, alertLoading, alertMessage, alertToast} from "./alerts.js";
import {readyHome} from "./home.js";
import {handleSearchInput, readyUsers} from "./users.js";
import {readyConfiguration} from "./configuration.js";
import {readyProducts} from "./products.js";
import {getApi} from "./api.js";
import {readyClients} from "./clients.js";
import {readyOrders} from "./orders.js";
import {readyProviders} from "./providers.js";
import {readyPurchases} from "./purchases.js";
import {readyServices} from "./services.js";
import {readyActividad} from "./actividad.js";

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
export let currentSession = (await getApi(`users/${decodedToken.id}`, token)).data;

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
        orders: "Buscar pedidos", purchases: "Buscar compras", clients: "Buscar clientes", providers: "Buscar proveedores", products: "Buscar productos", services: "Buscar servicios", users: "Buscar usuarios", actividad: "Buscar actividad",
    };

    if (placeholders[page]) {
        elements.searchBar.classList.remove("d-none");
        elements.searchBar.children[1].placeholder = placeholders[page];
    } else {
        elements.searchBar.classList.add("d-none");
    }

    elements.searchInput.removeEventListener("input", handleSearchInput);
    elements.searchInput.removeEventListener("keydown", handleSearchInput);
    elements.searchInput.oninput = null;
    elements.searchInput.onkeydown = null;
    elements.searchInput.value = "";

    switch (page) {
        case "home":
            readyHome();
            break;
        case "orders":
            readyOrders(elements.searchInput);
            break;
        case "purchases":
            readyPurchases(elements.searchInput);
            break;
        case "clients":
            readyClients(elements.searchInput);
            break;
        case "providers":
            readyProviders(elements.searchInput);
            break;
        case "products":
            readyProducts(elements.searchInput);
            break;
        case "services":
            readyServices(elements.searchInput);
            break;
        case "actividad":
            readyActividad(elements.searchInput);
            break;
        case "users":
            if (currentSession.rol !== "administrador") {
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
    if (mini) elements.menu.forEach(div => div.classList.add("mini"));

    loadTheme();
    await loadHash();

    if (window.innerWidth <= 767) {
        alertLoading("Pantalla no compatible", "Esta página no es compatible con dispositivos móviles", "error", 5000);
        document.querySelector(".swal2-container").style.background = "var(--background-content)";
    }

    if (currentSession.rol !== "administrador") {
        document.getElementById("users").style.display = "none";
        document.getElementById("clients").style.display = "none";
        document.getElementById("providers").style.display = "none";
        document.getElementById("purchases").style.display = "none";
    }

    elements.userProfile.src = currentSession.imagen_perfil || "https://marvi-api.onrender.com/pictures/profile/0.jpg";
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
        alertToast("Sesión terminada", false, "success", "bottom-end", 1500)
            .finally(() => {
                deleteCookie('token');
                window.location.href = "../../";
            });
    } else {
        window.history.back();
    }
});

ready().then(() => {
    const cleanDate = (iso) => iso.replace(/\.\d{3}Z$/, "");

    const createdAt = cleanDate(currentSession.createdAt);
    const updatedAt = cleanDate(currentSession.updatedAt);

    if (updatedAt === createdAt) alertMessage("Establecer contraseña", "Por seguridad, debes establecer tu contraseña antes de continuar.", "info", 5000).then(() => {
        window.location.hash = "#configuration";
    });
});