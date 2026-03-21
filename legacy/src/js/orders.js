import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import { deleteApi, getApi, patchApi, postApi } from "./api.js";
import { token } from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newOrderBtn = null;

let formNewOrder = null;
let code = null;
let client = null;
let status = null;
let productsRows = null;
let servicesRows = null;
let addProductLineBtn = null;
let addServiceLineBtn = null;
let orderTotal = null;

let editBtn = null;
let saveBtn = null;
let cancelBtn = null;
let closeBtn = null;

let rowSelectNum = null;
let rowsNum = null;
let currentPageNum = null;
let totalPagesNum = null;

let startBtn = null;
let prevBtn = null;
let nextBtn = null;
let endBtn = null;

let column = "codigo";
let order = "asc";
let edit = false;
let page = 1;
let selectedOrderId = null;

const ORDERS_LIMIT = 10;
let activeSearch = "";
let activeOrdersRequestId = 0;
let lastQueryKey = "";

let clientsCache = [];
let productsCache = [];
let servicesCache = [];

const normalizeSearch = (value) => (value ?? "").trim();
const buildOrdersQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;
const EMPTY_REFERENCE_TEXT = "Sin informacion";

const generateTimeBasedCode = (prefix) => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    return `${prefix}${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const getItemsCountDisplay = (items, label) => {
    const count = Array.isArray(items) ? items.length : 0;
    return count > 0 ? String(count) : `${EMPTY_REFERENCE_TEXT} (${label})`;
};

const formatDateDDMMAAAA = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}/${month}/${year}`;
};

const disabledEdit = (disabled) => {
    editBtn.disabled = !disabled;
    code.disabled = true;
    client.disabled = disabled;
    status.disabled = true;
    addProductLineBtn.disabled = disabled;
    addServiceLineBtn.disabled = disabled;
    saveBtn.disabled = disabled;

    [...productsRows.querySelectorAll("select, input, button"), ...servicesRows.querySelectorAll("select, input, button")]
        .forEach((element) => {
            element.disabled = disabled;
        });
};

const fillClientOptions = () => {
    const previous = client.value;
    const defaultOption = '<option value="">Seleccione un cliente</option>';
    const options = clientsCache
        .map((clientItem) => {
            const fullName = [clientItem.nombre, clientItem.primer_apellido, clientItem.segundo_apellido].filter(Boolean).join(" ");
            return `<option value="${clientItem._id}">${clientItem.codigo ?? ""} - ${fullName || clientItem.nombre || clientItem._id}</option>`;
        })
        .join("");

    client.innerHTML = `${defaultOption}${options}`;
    client.value = previous || "";
};

const buildProductOptions = (selectedValue = "") => {
    const defaultOption = '<option value="">Seleccione un producto</option>';
    const options = productsCache
        .map((productItem) => `<option value="${productItem._id}" ${String(productItem._id) === String(selectedValue) ? "selected" : ""}>${productItem.nombre ?? productItem.codigo ?? productItem._id}</option>`)
        .join("");

    return `${defaultOption}${options}`;
};

const buildServiceOptions = (selectedValue = "") => {
    const defaultOption = '<option value="">Seleccione un servicio</option>';
    const options = servicesCache
        .map((serviceItem) => `<option value="${serviceItem._id}" ${String(serviceItem._id) === String(selectedValue) ? "selected" : ""}>${serviceItem.nombre ?? serviceItem.codigo ?? serviceItem._id}</option>`)
        .join("");

    return `${defaultOption}${options}`;
};

const updateOrderTotal = () => {
    const productRows = productsRows.querySelectorAll(".order-product-row");
    const serviceRows = servicesRows.querySelectorAll(".order-service-row");
    let total = 0;

    [...productRows, ...serviceRows].forEach((row) => {
        const quantityInput = row.querySelector('[data-field="cantidad"]');
        const unitPriceInput = row.querySelector('[data-field="precio_unitario"]');
        const subtotalSpan = row.querySelector('[data-field="subtotal"]');

        const quantity = Number(quantityInput.value || 0);
        const unitPrice = Number(unitPriceInput.value || 0);
        const subtotal = quantity * unitPrice;

        subtotalSpan.textContent = subtotal.toFixed(2);
        total += subtotal;
    });

    orderTotal.textContent = total.toFixed(2);
};

const createOrderLine = ({ type, optionsHtml, rowClass }, item = {}) => {
    const row = document.createElement("tr");
    row.className = rowClass;
    row.innerHTML = `
        <td>
            <select class="form-select form-select-sm" data-field="${type}_id">
                ${optionsHtml(item[`${type}_id`])}
            </select>
        </td>
        <td>
            <input class="form-control form-control-sm" type="number" min="1" step="1" data-field="cantidad" value="${item.cantidad ?? 1}" />
        </td>
        <td>
            <input class="form-control form-control-sm" type="number" min="0" step="0.01" data-field="precio_unitario" value="${item.precio_unitario ?? 0}" />
        </td>
        <td class="text-end align-middle">$<span data-field="subtotal">0.00</span></td>
        <td class="text-center">
            <button class="btn close" type="button" title="Quitar linea" data-action="remove-line"><i class="bi bi-trash3"></i></button>
        </td>
    `;

    row.querySelectorAll('[data-field="cantidad"], [data-field="precio_unitario"]').forEach((input) => {
        input.addEventListener("input", updateOrderTotal);
    });

    row.querySelector('[data-action="remove-line"]').addEventListener("click", () => {
        const targetBody = row.parentElement;

        if (targetBody.children.length === 1) {
            row.querySelector(`select[data-field="${type}_id"]`).value = "";
            row.querySelector('[data-field="cantidad"]').value = 1;
            row.querySelector('[data-field="precio_unitario"]').value = 0;
        } else {
            row.remove();
        }
        updateOrderTotal();
    });

    return row;
};

const renderOrderLines = ({ products = [], services = [] } = {}) => {
    productsRows.innerHTML = "";
    servicesRows.innerHTML = "";

    const productLines = products.length > 0 ? products : [{}];
    const serviceLines = services.length > 0 ? services : [{}];

    productLines.forEach((item) => {
        productsRows.appendChild(createOrderLine({ type: "producto", optionsHtml: buildProductOptions, rowClass: "order-product-row" }, item));
    });

    serviceLines.forEach((item) => {
        servicesRows.appendChild(createOrderLine({ type: "servicio", optionsHtml: buildServiceOptions, rowClass: "order-service-row" }, item));
    });

    updateOrderTotal();
};

const resetOrderFormState = () => {
    formNewOrder.reset();
    edit = false;
    selectedOrderId = null;
    code.value = generateTimeBasedCode("PED");
    fillClientOptions();
    renderOrderLines();
    disabledEdit(false);
    status.disabled = true;
};

const getOrderPayload = () => {
    const products = [...productsRows.querySelectorAll(".order-product-row")]
        .map((row) => ({
            producto_id: row.querySelector('[data-field="producto_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }))
        .filter((item) => item.producto_id && item.cantidad > 0 && item.precio_unitario >= 0);

    const services = [...servicesRows.querySelectorAll(".order-service-row")]
        .map((row) => ({
            servicio_id: row.querySelector('[data-field="servicio_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }))
        .filter((item) => item.servicio_id && item.cantidad > 0 && item.precio_unitario >= 0);

    return {
        codigo: code.value,
        cliente_id: client.value,
        productos: products,
        servicios: services,
    };
};

const resolveClientDisplay = (orderResponse) => {
    const snapshot = orderResponse?.cliente_snapshot;

    if (typeof snapshot === "string" && snapshot.trim()) return snapshot.trim();

    if (snapshot && typeof snapshot === "object") {
        const clientCode = (snapshot.codigo ?? "").trim();
        const clientName = (snapshot.nombre ?? "").trim();

        if (clientCode && clientName) return `${clientCode} : ${clientName}`;
        if (clientName) return clientName;
        if (clientCode) return clientCode;
    }

    return orderResponse?.cliente_id ?? "";
};

const loadCatalogs = async () => {
    try {
        const [clientsResponse, productsResponse, servicesResponse] = await Promise.all([
            getApi("clients?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc", token),
            getApi("products?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc", token),
            getApi("services?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc", token),
        ]);

        clientsCache = clientsResponse?.success ? (clientsResponse.data ?? []) : [];
        productsCache = productsResponse?.success ? (productsResponse.data ?? []) : [];
        servicesCache = servicesResponse?.success ? (servicesResponse.data ?? []) : [];

        fillClientOptions();

        const currentProducts = [...productsRows.querySelectorAll(".order-product-row")].map((row) => ({
            producto_id: row.querySelector('[data-field="producto_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }));

        const currentServices = [...servicesRows.querySelectorAll(".order-service-row")].map((row) => ({
            servicio_id: row.querySelector('[data-field="servicio_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }));

        renderOrderLines({ products: currentProducts, services: currentServices });
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexion", "No se pudo cargar catalogos para pedidos", "error", 5000);
    }
};

const refreshOrders = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getOrders(page, ORDERS_LIMIT, activeSearch, force);
};

export const actionsOrder = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const orderId = tr.dataset.orderId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando pedido", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`orders/${orderId}`, token);
                    const orderData = response?.success ? response.data : null;

                    if (orderData) {
                        selectedOrderId = orderData._id ?? orderId;
                        code.value = orderData.codigo ?? "";
                        client.value = orderData.cliente_id ?? "";
                        status.value = orderData.estado ?? "";

                        const products = (orderData.productos ?? []).map((item) => ({
                            producto_id: item.producto_id ?? "",
                            cantidad: item.cantidad ?? 1,
                            precio_unitario: item.precio_unitario ?? 0,
                        }));

                        const services = (orderData.servicios ?? []).map((item) => ({
                            servicio_id: item.servicio_id ?? "",
                            cantidad: item.cantidad ?? 1,
                            precio_unitario: item.precio_unitario ?? 0,
                        }));

                        renderOrderLines({ products, services });

                        newOrderBtn.click();
                        alertToast("Pedido cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar el pedido", response?.error ?? "", "error", 5000)
                            .finally(() => refreshOrders({ currentPage: page, search: searchInput.value, force: true }));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        }

        if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const orderId = tr.dataset.orderId;
            const orderCode = tr.dataset.orderCode ?? tr.children[1].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar pedido", `¿Esta seguro de que desea eliminar el pedido ${orderCode}?`, "warning", true)) {
                    alertLoading("Eliminando pedido", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`orders/${orderId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshOrders({ currentPage: 1, search: searchInput.value, force: true });
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshOrders({ currentPage: page, search: searchInput.value, force: true }));
                        }
                    } catch (error) {
                        console.error(error);
                        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
                    }
                }
            });
        }
    });

    checkboxes.forEach((input) => {
        input.addEventListener("change", () => {
            const checkedCount = [...checkboxes].filter((checkbox) => checkbox.checked).length;
            deleteBtn.classList.toggle("d-none", checkedCount === 0);
            rowSelectNum.textContent = checkedCount;
        });
    });

    deleteBtn.onclick = async () => {
        const selectedOrders = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.orderId,
                    code: tr.dataset.orderCode ?? tr.children[1].textContent,
                };
            });

        if (selectedOrders.length === 0) return;

        if (await alertConfirm("Eliminar pedido", `¿Esta seguro de que desea eliminar los pedidos ${selectedOrders.map((item) => item.code).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando pedido", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let deleted = 0;
            let notDeleted = 0;

            try {
                for (const selectedOrder of selectedOrders) {
                    const response = await deleteApi(`orders/${selectedOrder.id}`, token);

                    if (response.success) deleted++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        notDeleted++;
                    }
                }

                alertToast(`Pedidos eliminados: ${deleted}, Pedidos no eliminados: ${notDeleted}`, false, "success", "bottom-end");
                refreshOrders({ currentPage: 1, search: searchInput.value, force: true });
            } catch (error) {
                console.error(error);
                alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
            }
        }
    };
};

export const handleSearchInput = (event) => {
    const searchValue = normalizeSearch(searchInput.value);

    if (event.type === "input") {
        if (searchValue !== "") return;
        refreshOrders({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;
    refreshOrders({ currentPage: 1, search: searchValue });
};

export const readyOrders = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newOrderBtn = document.getElementById("newOrderBtn");

    formNewOrder = document.getElementById("formNewOrder");
    code = document.getElementById("code");
    client = document.getElementById("client");
    status = document.getElementById("status");
    productsRows = document.getElementById("productsRows");
    servicesRows = document.getElementById("servicesRows");
    addProductLineBtn = document.getElementById("addProductLine");
    addServiceLineBtn = document.getElementById("addServiceLine");
    orderTotal = document.getElementById("orderTotal");

    editBtn = document.getElementById("edit");
    saveBtn = document.getElementById("save");
    cancelBtn = document.getElementById("cancel");
    closeBtn = document.getElementById("close");

    rowSelectNum = document.getElementById("rowSelectNum");
    rowsNum = document.getElementById("rowsNum");
    currentPageNum = document.getElementById("currentPageNum");
    totalPagesNum = document.getElementById("totalPagesNum");

    startBtn = document.getElementById("start");
    prevBtn = document.getElementById("prev");
    nextBtn = document.getElementById("next");
    endBtn = document.getElementById("end");

    searchInput.onkeydown = handleSearchInput;
    searchInput.oninput = handleSearchInput;

    orderBtn.onclick = () => {
        order = order === "asc" ? "desc" : "asc";
        orderBtn.innerHTML = `<i class="bi ${order === "asc" ? "bi-arrow-up" : "bi-arrow-down"}"></i> ${order === "asc" ? "Ascendente" : "Descendente"}`;
        refreshOrders({ currentPage: 1, search: searchInput.value });
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshOrders({ currentPage: 1, search: searchInput.value });
        };
    });

    addProductLineBtn.onclick = () => {
        productsRows.appendChild(createOrderLine({ type: "producto", optionsHtml: buildProductOptions, rowClass: "order-product-row" }));
        updateOrderTotal();
    };

    addServiceLineBtn.onclick = () => {
        servicesRows.appendChild(createOrderLine({ type: "servicio", optionsHtml: buildServiceOptions, rowClass: "order-service-row" }));
        updateOrderTotal();
    };

    editBtn.onclick = () => {
        alertToast("La edicion del pedido esta activa", false, "success", "bottom-start");
        code.disabled = true;
        client.disabled = true;
        addProductLineBtn.disabled = true;
        addServiceLineBtn.disabled = true;
        [...productsRows.querySelectorAll("select, input, button"), ...servicesRows.querySelectorAll("select, input, button")]
            .forEach((element) => {
                element.disabled = true;
            });
        status.disabled = false;
        editBtn.disabled = true;
        saveBtn.disabled = false;
        edit = true;
    };

    formNewOrder.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        if (!edit && !normalizeSearch(code.value)) code.value = generateTimeBasedCode("PED");

        const data = getOrderPayload();

        if (!data.cliente_id) {
            alertMessage("Cliente requerido", "Debes seleccionar un cliente", "warning", 5000);
            disabledEdit(false);
            cancelBtn.disabled = false;
            closeBtn.disabled = false;
            return;
        }

        if (data.productos.length === 0 && data.servicios.length === 0) {
            alertMessage("Conceptos requeridos", "Debes agregar al menos un producto o servicio", "warning", 5000);
            disabledEdit(false);
            cancelBtn.disabled = false;
            closeBtn.disabled = false;
            return;
        }

        alertLoading("Guardando pedido", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedOrderId) {
                    alertMessage("Pedido invalido", "No se encontro el identificador del pedido a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                const orderStatus = normalizeSearch(status.value);
                if (!orderStatus) {
                    alertMessage("Estado requerido", "Debes indicar el estado del pedido para actualizar", "warning", 5000);
                    disabledEdit(false);
                    code.disabled = true;
                    client.disabled = true;
                    addProductLineBtn.disabled = true;
                    addServiceLineBtn.disabled = true;
                    [...productsRows.querySelectorAll("select, input, button"), ...servicesRows.querySelectorAll("select, input, button")]
                        .forEach((element) => {
                            element.disabled = true;
                        });
                    status.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await patchApi(`orders/${selectedOrderId}`, { estado: orderStatus }, token);
            } else {
                response = await postApi("orders", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetOrderFormState();
                    refreshOrders({ currentPage: 1, search: "", force: true });
                });
            } else {
                alertMessage(response.message, response.error, "error", 5000).finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                });
            }
        } catch (error) {
            console.error(error);
            alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
            disabledEdit(false);
            closeBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    };

    cancelBtn.onclick = () => {
        resetOrderFormState();
    };

    closeBtn.onclick = () => {
        resetOrderFormState();
    };

    startBtn.onclick = () => {
        refreshOrders({ currentPage: 1, search: searchInput.value });
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshOrders({ currentPage: nextPage, search: searchInput.value });
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshOrders({ currentPage: nextPage, search: searchInput.value });
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshOrders({ currentPage: totalPages, search: searchInput.value });
    };

    fillClientOptions();
    renderOrderLines();
    loadCatalogs();
    resetOrderFormState();
    refreshOrders({ currentPage: 1, search: "", force: true });
};

export async function getOrders(currentPage = 1, limit = ORDERS_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildOrdersQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeOrdersRequestId;

    addPlaceholder();

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(limit),
            search: normalizedSearch,
            sortBy: column,
            sortOrder: order,
        });

        const response = await getApi(`orders?${params.toString()}`, token);

        if (requestId !== activeOrdersRequestId) return;

        const list = response?.success ? (response.data ?? []) : [];
        const ordersTable = document.getElementById("tbody");
        ordersTable.innerHTML = "";

        list.forEach((orderResponse) => {
            const orderId = orderResponse._id ?? orderResponse.codigo;
            const productsDisplay = getItemsCountDisplay(orderResponse.productos, "sin productos");
            const servicesDisplay = getItemsCountDisplay(orderResponse.servicios, "sin servicios");
            const registerDate = formatDateDDMMAAAA(orderResponse.createdAt ?? orderResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.orderId = orderId;
            tr.dataset.orderCode = orderResponse.codigo ?? "";
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                <td>${orderResponse.codigo ?? ""}</td>
                <td>${resolveClientDisplay(orderResponse)}</td>
                <td>${productsDisplay}</td>
                <td>${servicesDisplay}</td>
                <td>$${Number(orderResponse.total ?? 0).toFixed(2)}</td>
                <td>${orderResponse.estado ?? ""}</td>
                <td>${registerDate}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver pedido</button>
                        </li>
                        <li>
                            <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar pedido</button>
                        </li>
                    </ul>
                </td>
            `;

            ordersTable.appendChild(tr);
        });

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener pedidos", response?.error ?? "", "error", 5000);
        }

        const totalRegisters = Number(response?.pagination?.total ?? list.length);
        const totalPages = Number(response?.pagination?.totalPages ?? Math.max(1, Math.ceil(totalRegisters / limit)));
        page = Number(response?.pagination?.page ?? Math.min(Math.max(1, currentPage), totalPages));

        rowSelectNum.textContent = 0;
        rowsNum.textContent = totalRegisters;
        currentPageNum.textContent = page;
        totalPagesNum.textContent = totalPages;
        deleteBtn.classList.add("d-none");

        startBtn.disabled = page === 1;
        prevBtn.disabled = page === 1;
        nextBtn.disabled = page >= totalPages;
        endBtn.disabled = page >= totalPages;

        actionsOrder();
    } catch (error) {
        if (requestId !== activeOrdersRequestId) return;
        console.error(error);
        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeOrdersRequestId) removePlaceholder();
    }
}
