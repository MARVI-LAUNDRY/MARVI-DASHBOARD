import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import { deleteApi, getApi, postApi, putApi } from "./api.js";
import { token } from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newPurchaseBtn = null;

let formNewPurchase = null;
let code = null;
let supplier = null;
let productsRows = null;
let addProductLineBtn = null;
let purchaseTotal = null;

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
let selectedPurchaseId = null;

const PURCHASES_LIMIT = 10;
let activeSearch = "";
let activePurchasesRequestId = 0;
let lastQueryKey = "";

let suppliersCache = [];
let productsCache = [];

const normalizeSearch = (value) => (value ?? "").trim();
const buildPurchasesQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;
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

const getDisplayOrFallback = (value, label) => {
    const normalized = `${value ?? ""}`.trim();
    return normalized || `${EMPTY_REFERENCE_TEXT} (${label})`;
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
    supplier.disabled = disabled;
    addProductLineBtn.disabled = disabled;
    saveBtn.disabled = disabled;

    productsRows.querySelectorAll("select, input, button").forEach((element) => {
        element.disabled = disabled;
    });
};

const fillSupplierOptions = () => {
    const previous = supplier.value;
    const defaultOption = '<option value="">Seleccione un proveedor</option>';
    const options = suppliersCache
        .map((supplierItem) => `<option value="${supplierItem._id}">${supplierItem.nombre ?? supplierItem.codigo ?? supplierItem._id}</option>`)
        .join("");

    supplier.innerHTML = `${defaultOption}${options}`;
    supplier.value = previous || "";
};

const buildProductOptions = (selectedValue = "") => {
    const defaultOption = '<option value="">Seleccione un producto</option>';
    const options = productsCache
        .map((productItem) => `<option value="${productItem._id}" ${String(productItem._id) === String(selectedValue) ? "selected" : ""}>${productItem.nombre ?? productItem.codigo ?? productItem._id}</option>`)
        .join("");

    return `${defaultOption}${options}`;
};

const updatePurchaseTotal = () => {
    const rows = productsRows.querySelectorAll(".purchase-product-row");
    let total = 0;

    rows.forEach((row) => {
        const quantityInput = row.querySelector('[data-field="cantidad"]');
        const unitPriceInput = row.querySelector('[data-field="precio_unitario"]');
        const subtotalSpan = row.querySelector('[data-field="subtotal"]');

        const quantity = Number(quantityInput.value || 0);
        const unitPrice = Number(unitPriceInput.value || 0);
        const subtotal = quantity * unitPrice;

        subtotalSpan.textContent = subtotal.toFixed(2);
        total += subtotal;
    });

    purchaseTotal.textContent = total.toFixed(2);
};

const createProductLine = (item = {}) => {
    const row = document.createElement("tr");
    row.className = "purchase-product-row";
    row.innerHTML = `
        <td>
            <select class="form-select form-select-sm" data-field="producto_id">
                ${buildProductOptions(item.producto_id)}
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
        input.addEventListener("input", updatePurchaseTotal);
    });

    row.querySelector('[data-action="remove-line"]').addEventListener("click", () => {
        if (productsRows.children.length === 1) {
            row.querySelector('[data-field="producto_id"]').value = "";
            row.querySelector('[data-field="cantidad"]').value = 1;
            row.querySelector('[data-field="precio_unitario"]').value = 0;
        } else {
            row.remove();
        }
        updatePurchaseTotal();
    });

    return row;
};

const renderProductLines = (items = []) => {
    productsRows.innerHTML = "";

    const lines = items.length > 0 ? items : [{}];
    lines.forEach((item) => productsRows.appendChild(createProductLine(item)));

    updatePurchaseTotal();
};

const resetPurchaseFormState = () => {
    formNewPurchase.reset();
    edit = false;
    selectedPurchaseId = null;
    code.value = generateTimeBasedCode("COM");
    fillSupplierOptions();
    renderProductLines();
    disabledEdit(false);
};

const getPurchasePayload = () => {
    const productLines = [...productsRows.querySelectorAll(".purchase-product-row")]
        .map((row) => ({
            producto_id: row.querySelector('[data-field="producto_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }))
        .filter((productLine) => productLine.producto_id && productLine.cantidad > 0 && productLine.precio_unitario >= 0);

    return {
        codigo: code.value,
        proveedor_id: supplier.value,
        productos: productLines,
    };
};

const resolveSupplierDisplay = (purchaseResponse) => {
    const supplierSnapshot = purchaseResponse?.proveedor_snapshot;

    if (typeof supplierSnapshot === "string" && supplierSnapshot.trim()) return supplierSnapshot.trim();

    if (supplierSnapshot && typeof supplierSnapshot === "object") {
        const supplierCode = (supplierSnapshot.codigo ?? "").trim();
        const supplierName = (supplierSnapshot.nombre ?? "").trim();

        if (supplierCode && supplierName) return `${supplierCode} : ${supplierName}`;
        if (supplierName) return supplierName;
        if (supplierCode) return supplierCode;
    }

    return getDisplayOrFallback(purchaseResponse?.proveedor_id, "sin proveedor");
};

const loadCatalogs = async () => {
    try {
        const [suppliersResponse, productsResponse] = await Promise.all([
            getApi("suppliers?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc", token),
            getApi("products?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc", token),
        ]);

        suppliersCache = suppliersResponse?.success ? (suppliersResponse.data ?? []) : [];
        productsCache = productsResponse?.success ? (productsResponse.data ?? []) : [];

        fillSupplierOptions();
        const currentLines = [...productsRows.querySelectorAll(".purchase-product-row")].map((row) => ({
            producto_id: row.querySelector('[data-field="producto_id"]').value,
            cantidad: Number(row.querySelector('[data-field="cantidad"]').value),
            precio_unitario: Number(row.querySelector('[data-field="precio_unitario"]').value),
        }));
        renderProductLines(currentLines);
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexion", "No se pudo cargar el catalogo de proveedores/productos", "error", 5000);
    }
};

const refreshPurchases = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getPurchases(page, PURCHASES_LIMIT, activeSearch, force);
};

export const actionsPurchase = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const purchaseId = tr.dataset.purchaseId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando compra", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`purchases/${purchaseId}`, token);
                    const purchaseData = response?.success ? response.data : null;

                    if (purchaseData) {
                        selectedPurchaseId = purchaseData._id ?? purchaseId;
                        code.value = purchaseData.codigo ?? "";
                        supplier.value = purchaseData.proveedor_id ?? "";

                        const mappedLines = (purchaseData.productos ?? []).map((productLine) => ({
                            producto_id: productLine.producto_id ?? "",
                            cantidad: productLine.cantidad ?? 1,
                            precio_unitario: productLine.precio_unitario ?? 0,
                        }));
                        renderProductLines(mappedLines);

                        newPurchaseBtn.click();
                        alertToast("Compra cargada correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar la compra", response?.error ?? "", "error", 5000)
                            .finally(() => refreshPurchases({ currentPage: page, search: searchInput.value, force: true }));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        }

        if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const purchaseId = tr.dataset.purchaseId;
            const purchaseCode = tr.dataset.purchaseCode ?? tr.children[1].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar compra", `¿Esta seguro de que desea eliminar la compra ${purchaseCode}?`, "warning", true)) {
                    alertLoading("Eliminando compra", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`purchases/${purchaseId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshPurchases({ currentPage: 1, search: searchInput.value, force: true });
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshPurchases({ currentPage: page, search: searchInput.value, force: true }));
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
        const selectedPurchases = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.purchaseId,
                    code: tr.dataset.purchaseCode ?? tr.children[1].textContent,
                };
            });

        if (selectedPurchases.length === 0) return;

        if (await alertConfirm("Eliminar compra", `¿Esta seguro de que desea eliminar las compras ${selectedPurchases.map((purchase) => purchase.code).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando compra", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let purchasesDeleted = 0;
            let purchasesNotDeleted = 0;

            try {
                for (const selectedPurchase of selectedPurchases) {
                    const response = await deleteApi(`purchases/${selectedPurchase.id}`, token);

                    if (response.success) purchasesDeleted++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        purchasesNotDeleted++;
                    }
                }

                alertToast(`Compras eliminadas: ${purchasesDeleted}, Compras no eliminadas: ${purchasesNotDeleted}`, false, "success", "bottom-end");
                refreshPurchases({ currentPage: 1, search: searchInput.value, force: true });
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
        refreshPurchases({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;

    refreshPurchases({ currentPage: 1, search: searchValue });
};

export const readyPurchases = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newPurchaseBtn = document.getElementById("newPurchaseBtn");

    formNewPurchase = document.getElementById("formNewPurchase");
    code = document.getElementById("code");
    supplier = document.getElementById("supplier");
    productsRows = document.getElementById("productsRows");
    addProductLineBtn = document.getElementById("addProductLine");
    purchaseTotal = document.getElementById("purchaseTotal");

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
        refreshPurchases({ currentPage: 1, search: searchInput.value });
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshPurchases({ currentPage: 1, search: searchInput.value });
        };
    });

    addProductLineBtn.onclick = () => {
        productsRows.appendChild(createProductLine());
        updatePurchaseTotal();
    };

    editBtn.onclick = () => {
        alertToast("La edicion de la compra esta activa", false, "success", "bottom-start");
        disabledEdit(false);
        edit = true;
    };

    formNewPurchase.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        if (!edit && !normalizeSearch(code.value)) code.value = generateTimeBasedCode("COM");

        const data = getPurchasePayload();

        if (!data.proveedor_id) {
            alertMessage("Proveedor requerido", "Debes seleccionar un proveedor", "warning", 5000);
            disabledEdit(false);
            cancelBtn.disabled = false;
            closeBtn.disabled = false;
            return;
        }

        if (data.productos.length === 0) {
            alertMessage("Productos requeridos", "Debes agregar al menos un producto valido", "warning", 5000);
            disabledEdit(false);
            cancelBtn.disabled = false;
            closeBtn.disabled = false;
            return;
        }

        alertLoading("Guardando compra", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedPurchaseId) {
                    alertMessage("Compra invalida", "No se encontro el identificador de la compra a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await putApi(`purchases/${selectedPurchaseId}`, data, token);
            } else {
                response = await postApi("purchases", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetPurchaseFormState();
                    refreshPurchases({ currentPage: 1, search: "", force: true });
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
        resetPurchaseFormState();
    };

    closeBtn.onclick = () => {
        resetPurchaseFormState();
    };

    startBtn.onclick = () => {
        refreshPurchases({ currentPage: 1, search: searchInput.value });
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshPurchases({ currentPage: nextPage, search: searchInput.value });
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshPurchases({ currentPage: nextPage, search: searchInput.value });
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshPurchases({ currentPage: totalPages, search: searchInput.value });
    };

    fillSupplierOptions();
    renderProductLines();
    loadCatalogs();
    resetPurchaseFormState();
    refreshPurchases({ currentPage: 1, search: "", force: true });
};

export async function getPurchases(currentPage = 1, limit = PURCHASES_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildPurchasesQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activePurchasesRequestId;

    addPlaceholder();

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(limit),
            search: normalizedSearch,
            sortBy: column,
            sortOrder: order,
        });

        const response = await getApi(`purchases?${params.toString()}`, token);

        if (requestId !== activePurchasesRequestId) return;

        const list = response?.success ? (response.data ?? []) : [];
        const purchasesTable = document.getElementById("tbody");
        purchasesTable.innerHTML = "";

        list.forEach((purchaseResponse) => {
            const purchaseId = purchaseResponse._id ?? purchaseResponse.codigo;
            const productsDisplay = getItemsCountDisplay(purchaseResponse.productos, "sin productos");
            const registerDate = formatDateDDMMAAAA(purchaseResponse.createdAt ?? purchaseResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.purchaseId = purchaseId;
            tr.dataset.purchaseCode = purchaseResponse.codigo ?? "";
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                <td>${purchaseResponse.codigo ?? ""}</td>
                <td>${resolveSupplierDisplay(purchaseResponse)}</td>
                <td>${productsDisplay}</td>
                <td>$${Number(purchaseResponse.total ?? 0).toFixed(2)}</td>
                <td>${registerDate}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver compra</button>
                        </li>
                        <li>
                            <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar compra</button>
                        </li>
                    </ul>
                </td>
            `;

            purchasesTable.appendChild(tr);
        });

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener compras", response?.error ?? "", "error", 5000);
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

        actionsPurchase();
    } catch (error) {
        if (requestId !== activePurchasesRequestId) return;
        console.error(error);
        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activePurchasesRequestId) removePlaceholder();
    }
}

