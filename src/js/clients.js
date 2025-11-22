import {alertMessage} from "./alerts.js";
import {addPlaceholder, removePlaceholder} from "./tables.js";
import {postApi} from "./api.js";
import {token} from "./dashboard.js";

let searchInput = null;

let orderBtn = null;
let filterBtn = null;
let filter = null;

let currentPageNum = null;
let totalPagesNum = null;

let startBtn = null;
let prevBtn = null;
let nextBtn = null;
let endBtn = null;

let column = "cliente";
let order = "ASC";
let edit = false;
let page = 1;

export const handleSearchInput = () => {
    page = 1;
    if (searchInput.value) searchClients(searchInput.value); else {
        getClients(column, order);
        filterBtn.classList.remove("d-none");
        orderBtn.classList.remove("d-none");
    }
};

export const readyClients = (searchBar) => {
    searchInput = searchBar;

    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item");

    currentPageNum = document.getElementById("currentPageNum");
    totalPagesNum = document.getElementById("totalPagesNum");

    startBtn = document.getElementById("start");
    prevBtn = document.getElementById("prev");
    nextBtn = document.getElementById("next");
    endBtn = document.getElementById("end");

    searchInput.addEventListener("input", handleSearchInput);

    orderBtn.addEventListener("click", () => {
        order = order === "ASC" ? "DESC" : "ASC";
        orderBtn.innerHTML = `<i class="bi ${order === "ASC" ? "bi-arrow-up" : "bi-arrow-down"}"></i> ${order === "ASC" ? "Ascendente" : "Descendente"}`;
        getClients(column, order);
    });

    filter.forEach((button) => {
        button.addEventListener("click", () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            getClients(column, order);
        });
    });

    startBtn.addEventListener("click", () => {
        page = 1;
        if (searchInput.value) searchClients(searchInput.value); else getClients(column, order);
    });
    prevBtn.addEventListener("click", () => {
        if (page > 1) page--;
        if (searchInput.value) searchClients(searchInput.value, (page - 1) * 10); else getClients(column, order, (page - 1) * 10);
    });
    nextBtn.addEventListener("click", () => {
        if (page < totalPagesNum.textContent) page++;
        if (searchInput.value) searchClients(searchInput.value, (page - 1) * 10); else getClients(column, order, (page - 1) * 10);
    });
    endBtn.addEventListener("click", () => {
        page = totalPagesNum.textContent;
        if (searchInput.value) searchClients(searchInput.value, (page - 1) * 10); else getClients(column, order, (page - 1) * 10);
    });

    getClients(column, order);
};

export async function getClients(_column, _order, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("clients/filter", {
            columna_orden: _column, orden: _order, limite: 10, desplazamiento: _offset
        }, token);

        if (response.length > 0) {
            const clientsTable = document.getElementById("tbody");
            clientsTable.innerHTML = "";

            response.forEach((clientResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${clientResponse.cliente}</td>
                    <td>${clientResponse.nombre_completo}</td>
                    <td>${clientResponse.correo}</td>
                    <td>${clientResponse.telefono}</td>
                    <td>${clientResponse.direccion}</td>
                    <td>${clientResponse.fecha_registro}</td>
                `;
                clientsTable.appendChild(tr);
            });

            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
        } else {
            const clientsTable = document.getElementById("tbody");
            clientsTable.innerHTML = "";
            currentPageNum.textContent = 1;
            totalPagesNum.textContent = 1;
        }

        if (page === 1) {
            startBtn.disabled = true;
            prevBtn.disabled = true;
        } else {
            startBtn.disabled = false;
            prevBtn.disabled = false;
        }
        if (page >= totalPagesNum.textContent) {
            page = totalPagesNum.textContent;
            nextBtn.disabled = true;
            endBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
            endBtn.disabled = false;
        }

        removePlaceholder();
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    }
}

export async function searchClients(_search, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("clients/search", {
            busqueda: _search, limite: 10, desplazamiento: _offset
        }, token);
        const clientsTable = document.getElementById("tbody");

        if (response.length > 0) {
            clientsTable.innerHTML = "";

            response.forEach((clientResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${clientResponse.cliente}</td>
                    <td>${clientResponse.nombre_completo}</td>
                    <td>${clientResponse.correo}</td>
                    <td>${clientResponse.telefono}</td>
                    <td>${clientResponse.direccion}</td>
                    <td>${clientResponse.fecha_registro}</td>
                `;
                clientsTable.appendChild(tr);
            });

            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
        } else {
            clientsTable.innerHTML = "";
            currentPageNum.textContent = 1;
            totalPagesNum.textContent = 1;
        }

        filterBtn.classList.add("d-none");
        orderBtn.classList.add("d-none");

        if (page === 1) {
            startBtn.disabled = true;
            prevBtn.disabled = true;
        } else {
            startBtn.disabled = false;
            prevBtn.disabled = false;
        }
        if (page >= totalPagesNum.textContent) {
            page = totalPagesNum.textContent;
            nextBtn.disabled = true;
            endBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
            endBtn.disabled = false;
        }

        removePlaceholder();
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    }
}
