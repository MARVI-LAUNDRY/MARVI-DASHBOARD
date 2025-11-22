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

let column = "folio";
let order = "ASC";
let edit = false;
let page = 1;

export const handleSearchInput = () => {
    page = 1;
    if (searchInput.value) searchOrders(searchInput.value); else {
        getOrders(column, order);
        filterBtn.classList.remove("d-none");
        orderBtn.classList.remove("d-none");
    }
};

export const readyOrders = (searchBar) => {
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
        getOrders(column, order);
    });

    filter.forEach((button) => {
        button.addEventListener("click", () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            getOrders(column, order);
        });
    });

    startBtn.addEventListener("click", () => {
        page = 1;
        if (searchInput.value) searchOrders(searchInput.value); else getOrders(column, order);
    });
    prevBtn.addEventListener("click", () => {
        if (page > 1) page--;
        if (searchInput.value) searchOrders(searchInput.value, (page - 1) * 10); else getOrders(column, order, (page - 1) * 10);
    });
    nextBtn.addEventListener("click", () => {
        if (page < totalPagesNum.textContent) page++;
        if (searchInput.value) searchOrders(searchInput.value, (page - 1) * 10); else getOrders(column, order, (page - 1) * 10);
    });
    endBtn.addEventListener("click", () => {
        page = totalPagesNum.textContent;
        if (searchInput.value) searchOrders(searchInput.value, (page - 1) * 10); else getOrders(column, order, (page - 1) * 10);
    });

    getOrders(column, order);
};

export async function getOrders(_column, _order, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("orders/filter", {
            columna_orden: _column, orden: _order, limite: 10, desplazamiento: _offset
        }, token);
        console.log(response);

        if (response.length > 0) {
            const ordersTable = document.getElementById("tbody");
            ordersTable.innerHTML = "";

            response.forEach((orderResponse) => {
                const tr = document.createElement("tr");
                let estado;
                switch (orderResponse.estado) {
                    case 'R':
                        estado = 'En Proceso';
                        break;
                    case 'P':
                        estado = 'Pagado';
                        break;
                    case 'E':
                        estado = 'Entregado';
                        break;
                    case 'C':
                        estado = 'Cancelado';
                        break;
                    default:
                        estado = orderResponse.estado;
                }
                tr.innerHTML = `
                    <td>${orderResponse.folio}</td>
                    <td>${orderResponse.nombre_completo}</td>
                    <td>${orderResponse.subtotal}</td>
                    <td>${orderResponse.descuento}</td>
                    <td>${orderResponse.total_pedido}</td>
                    <td><div class="${orderResponse.estado}">${estado}</div></td>
                    <td>${orderResponse.fecha_pedido}</td>
                    <td>${orderResponse.fecha_entrega ? orderResponse.fecha_entrega : ''}</td>
                `;
                ordersTable.appendChild(tr);
            });

            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
        } else {
            const ordersTable = document.getElementById("tbody");
            ordersTable.innerHTML = "";
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

export async function searchOrders(_search, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("orders/search", {
            busqueda: _search, limite: 10, desplazamiento: _offset
        }, token);
        const ordersTable = document.getElementById("tbody");

        if (response.length > 0) {
            ordersTable.innerHTML = "";

            response.forEach((orderResponse) => {
                const tr = document.createElement("tr");
                let estado;
                switch (orderResponse.estado) {
                    case 'R':
                        estado = 'En Proceso';
                        break;
                    case 'P':
                        estado = 'Pagado';
                        break;
                    case 'E':
                        estado = 'Entregado';
                        break;
                    case 'C':
                        estado = 'Cancelado';
                        break;
                    default:
                        estado = orderResponse.estado;
                }
                tr.innerHTML = `
                    <td>${orderResponse.folio}</td>
                    <td>${orderResponse.nombre_completo}</td>
                    <td>${orderResponse.subtotal}</td>
                    <td>${orderResponse.descuento}</td>
                    <td>${orderResponse.total_pedido}</td>
                    <td><div class="${orderResponse.estado}">${estado}</div></td>
                    <td>${orderResponse.fecha_pedido}</td>
                    <td>${orderResponse.fecha_entrega ? orderResponse.fecha_entrega : ''}</td>
                `;
                ordersTable.appendChild(tr);
            });

            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
        } else {
            ordersTable.innerHTML = "";
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
