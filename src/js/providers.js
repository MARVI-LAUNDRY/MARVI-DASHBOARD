import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import { deleteApi, getApi, postApi, putApi } from "./api.js";
import { token } from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newProviderBtn = null;

let formNewProvider = null;
let code = null;
let name = null;
let email = null;
let phone = null;
let address = null;

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
let selectedProviderId = null;

const PROVIDERS_LIMIT = 10;
let activeSearch = "";
let activeProvidersRequestId = 0;
let lastQueryKey = "";

const normalizeSearch = (value) => (value ?? "").trim();
const buildProvidersQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;
const EMPTY_REFERENCE_TEXT = "Sin informacion";

const getDisplayOrFallback = (value) => {
    const normalized = `${value ?? ""}`.trim();
    return normalized || EMPTY_REFERENCE_TEXT;
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
    code.disabled = disabled;
    name.disabled = disabled;
    email.disabled = disabled;
    phone.disabled = disabled;
    address.disabled = disabled;
    saveBtn.disabled = disabled;
};

const resetProviderFormState = () => {
    formNewProvider.reset();
    disabledEdit(false);
    edit = false;
    selectedProviderId = null;
};

const buildProviderPayload = () => ({
    codigo: code.value,
    nombre: name.value,
    correo: email.value,
    telefono: phone.value,
    direccion: address.value,
});

const refreshProviders = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getProviders(page, PROVIDERS_LIMIT, activeSearch, force);
};

export const actionsProvider = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const providerId = tr.dataset.providerId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando proveedor", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`suppliers/${providerId}`, token);
                    const providerData = response?.success ? response.data : null;

                    if (providerData) {
                        selectedProviderId = providerData._id ?? providerId;
                        code.value = providerData.codigo ?? "";
                        name.value = providerData.nombre ?? "";
                        email.value = providerData.correo ?? "";
                        phone.value = providerData.telefono ?? "";
                        address.value = providerData.direccion ?? "";

                        newProviderBtn.click();
                        alertToast("Proveedor cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar el proveedor", response?.error ?? "", "error", 5000)
                            .finally(() => refreshProviders({ currentPage: page, search: searchInput.value, force: true }));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        }

        if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const providerId = tr.dataset.providerId;
            const providerName = tr.dataset.providerName ?? tr.children[2].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar proveedor", `¿Esta seguro de que desea eliminar al proveedor ${providerName}?`, "warning", true)) {
                    alertLoading("Eliminando proveedor", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`suppliers/${providerId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshProviders({ currentPage: 1, search: searchInput.value, force: true });
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshProviders({ currentPage: page, search: searchInput.value, force: true }));
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
        const selectedProviders = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.providerId,
                    name: tr.dataset.providerName ?? tr.children[2].textContent,
                };
            });

        if (selectedProviders.length === 0) return;

        if (await alertConfirm("Eliminar proveedor", `¿Esta seguro de que desea eliminar a los proveedores ${selectedProviders.map((provider) => provider.name).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando proveedor", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let providersDeleted = 0;
            let providersNotDeleted = 0;

            try {
                for (const selectedProvider of selectedProviders) {
                    const response = await deleteApi(`suppliers/${selectedProvider.id}`, token);

                    if (response.success) providersDeleted++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        providersNotDeleted++;
                    }
                }

                alertToast(`Proveedores eliminados: ${providersDeleted}, Proveedores no eliminados: ${providersNotDeleted}`, false, "success", "bottom-end");
                refreshProviders({ currentPage: 1, search: searchInput.value, force: true });
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
        refreshProviders({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;

    refreshProviders({ currentPage: 1, search: searchValue });
};

export const readyProviders = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newProviderBtn = document.getElementById("newProviderBtn");

    formNewProvider = document.getElementById("formNewProvider");
    code = document.getElementById("code");
    name = document.getElementById("name");
    email = document.getElementById("email");
    phone = document.getElementById("phone");
    address = document.getElementById("address");

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
        refreshProviders({ currentPage: 1, search: searchInput.value });
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshProviders({ currentPage: 1, search: searchInput.value });
        };
    });

    editBtn.onclick = () => {
        alertToast("La edicion del proveedor esta activa", false, "success", "bottom-start");
        editBtn.disabled = true;
        code.disabled = false;
        name.disabled = false;
        email.disabled = false;
        phone.disabled = false;
        address.disabled = false;
        saveBtn.disabled = false;
        edit = true;
    };

    formNewProvider.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        const data = buildProviderPayload();

        alertLoading("Guardando proveedor", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedProviderId) {
                    alertMessage("Proveedor invalido", "No se encontro el identificador del proveedor a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await putApi(`suppliers/${selectedProviderId}`, data, token);
            } else {
                response = await postApi("suppliers", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetProviderFormState();
                    refreshProviders({ currentPage: 1, search: "", force: true });
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
        resetProviderFormState();
    };

    closeBtn.onclick = () => {
        resetProviderFormState();
    };

    startBtn.onclick = () => {
        refreshProviders({ currentPage: 1, search: searchInput.value });
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshProviders({ currentPage: nextPage, search: searchInput.value });
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshProviders({ currentPage: nextPage, search: searchInput.value });
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshProviders({ currentPage: totalPages, search: searchInput.value });
    };

    resetProviderFormState();
    refreshProviders({ currentPage: 1, search: "", force: true });
};

export async function getProviders(currentPage = 1, limit = PROVIDERS_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildProvidersQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeProvidersRequestId;

    addPlaceholder();

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(limit),
            search: normalizedSearch,
            sortBy: column,
            sortOrder: order,
        });

        const response = await getApi(`suppliers?${params.toString()}`, token);

        if (requestId !== activeProvidersRequestId) return;

        const list = response?.success ? (response.data ?? []) : [];
        const providersTable = document.getElementById("tbody");
        providersTable.innerHTML = "";

        list.forEach((providerResponse) => {
            const providerId = providerResponse._id ?? providerResponse.codigo;
            const registerDate = formatDateDDMMAAAA(providerResponse.createdAt ?? providerResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.providerId = providerId;
            tr.dataset.providerName = providerResponse.nombre ?? "";
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                <td>${providerResponse.codigo ?? ""}</td>
                <td>${getDisplayOrFallback(providerResponse.nombre)}</td>
                <td>${getDisplayOrFallback(providerResponse.correo)}</td>
                <td>${getDisplayOrFallback(providerResponse.telefono)}</td>
                <td>${getDisplayOrFallback(providerResponse.direccion)}</td>
                <td>${registerDate}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver proveedor</button>
                        </li>
                        <li>
                            <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar proveedor</button>
                        </li>
                    </ul>
                </td>
            `;

            providersTable.appendChild(tr);
        });

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener proveedores", response?.error ?? "", "error", 5000);
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

        actionsProvider();
    } catch (error) {
        if (requestId !== activeProvidersRequestId) return;
        console.error(error);
        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeProvidersRequestId) removePlaceholder();
    }
}

