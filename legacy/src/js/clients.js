import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import { deleteApi, getApi, postApi, putApi } from "./api.js";
import { token } from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newClientBtn = null;

let formNewClient = null;
let code = null;
let name = null;
let firstSurname = null;
let secondSurname = null;
let email = null;
let phone = null;

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
let selectedClientId = null;

const CLIENTS_LIMIT = 10;
let activeSearch = "";
let activeClientsRequestId = 0;
let lastQueryKey = "";

const normalizeSearch = (value) => (value ?? "").trim();

const formatDateDDMMAAAA = (value) => {
    if (!value) return "";
    const rawDate = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split("/").reverse().join("-") : value;
    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}/${month}/${year}`;
};

const getClientCode = (clientResponse) => clientResponse.codigo ?? clientResponse.cliente ?? "";

const getClientFullName = (clientResponse) => {
    if (clientResponse.nombre_completo) return clientResponse.nombre_completo;
    return [clientResponse.nombre, clientResponse.primer_apellido, clientResponse.segundo_apellido].filter(Boolean).join(" ");
};

const buildClientsQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;

const disabledEdit = (disabled) => {
    editBtn.disabled = !disabled;
    code.disabled = disabled;
    name.disabled = disabled;
    firstSurname.disabled = disabled;
    secondSurname.disabled = disabled;
    email.disabled = disabled;
    phone.disabled = disabled;
    saveBtn.disabled = disabled;
};

const resetClientFormState = () => {
    formNewClient.reset();
    disabledEdit(false);
    edit = false;
    selectedClientId = null;
};

const buildClientPayload = () => ({
    codigo: code.value,
    nombre: name.value,
    primer_apellido: firstSurname.value,
    segundo_apellido: secondSurname.value,
    correo: email.value,
    telefono: phone.value,
});

const refreshClients = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getClients(page, CLIENTS_LIMIT, activeSearch, force);
};

export const actionsClient = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const clientId = tr.dataset.clientId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando cliente", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`clients/${clientId}`, token);
                    const clientData = response?.success ? response.data : null;

                    if (clientData) {
                        selectedClientId = clientData._id ?? clientData.id_cliente ?? clientData.codigo ?? clientData.cliente ?? clientId;

                        code.value = clientData.codigo ?? clientData.cliente ?? "";
                        name.value = clientData.nombre ?? "";
                        firstSurname.value = clientData.primer_apellido ?? "";
                        secondSurname.value = clientData.segundo_apellido ?? "";
                        email.value = clientData.correo ?? "";
                        phone.value = clientData.telefono ?? "";

                        newClientBtn.click();
                        alertToast("Cliente cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar el cliente", response?.error ?? "", "error", 5000)
                            .finally(() => refreshClients({ currentPage: page, search: searchInput.value, force: true }));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        } else if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const clientId = tr.dataset.clientId;
            const clientName = tr.dataset.clientName ?? tr.children[2].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar cliente", `¿Está seguro de que desea eliminar al cliente ${clientName}?`, "warning", true)) {
                    alertLoading("Eliminando cliente", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`clients/${clientId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshClients({ currentPage: 1, search: searchInput.value, force: true });
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshClients({ currentPage: page, search: searchInput.value, force: true }));
                        }
                    } catch (error) {
                        console.error(error);
                        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
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
        const selectedClients = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.clientId,
                    name: tr.dataset.clientName ?? tr.children[2].textContent,
                };
            });

        if (selectedClients.length === 0) return;
        if (await alertConfirm("Eliminar cliente", `¿Está seguro de que desea eliminar a los clientes ${selectedClients.map((client) => client.name).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando cliente", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let clientesEliminados = 0;
            let clientesNoEliminados = 0;
            try {
                for (const selectedClient of selectedClients) {
                    const response = await deleteApi(`clients/${selectedClient.id}`, token);

                    if (response.success) clientesEliminados++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        clientesNoEliminados++;
                    }
                }

                alertToast(`Clientes eliminados: ${clientesEliminados}, Clientes no eliminados: ${clientesNoEliminados}`, false, "success", "bottom-end");
                refreshClients({ currentPage: 1, search: searchInput.value, force: true });
            } catch (error) {
                console.error(error);
                alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
            }
        }
    };
};

export const handleSearchInput = (event) => {
    const searchValue = normalizeSearch(searchInput.value);

    if (event.type === "input") {
        if (searchValue !== "") return;
        refreshClients({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;

    refreshClients({ currentPage: 1, search: searchValue });
};

export const readyClients = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newClientBtn = document.getElementById("newClientBtn");

    formNewClient = document.getElementById("formNewClient");
    code = document.getElementById("code");
    name = document.getElementById("name");
    firstSurname = document.getElementById("firstSurname");
    secondSurname = document.getElementById("secondSurname");
    email = document.getElementById("email");
    phone = document.getElementById("phone");

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
        refreshClients({ currentPage: 1, search: searchInput.value });
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshClients({ currentPage: 1, search: searchInput.value });
        };
    });

    editBtn.onclick = () => {
        alertToast("La edición del cliente está activa", false, "success", "bottom-start");
        editBtn.disabled = true;
        code.disabled = false;
        name.disabled = false;
        firstSurname.disabled = false;
        secondSurname.disabled = false;
        email.disabled = false;
        phone.disabled = false;
        saveBtn.disabled = false;
        edit = true;
    };

    formNewClient.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        const data = buildClientPayload();

        alertLoading("Guardando cliente", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedClientId) {
                    alertMessage("Cliente inválido", "No se encontró el identificador del cliente a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await putApi(`clients/${selectedClientId}`, data, token);
            } else {
                response = await postApi("clients", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetClientFormState();
                    refreshClients({ currentPage: 1, search: "", force: true });
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
            alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
            disabledEdit(false);
            closeBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    };

    cancelBtn.onclick = () => {
        resetClientFormState();
    };

    closeBtn.onclick = () => {
        resetClientFormState();
    };

    startBtn.onclick = () => {
        refreshClients({ currentPage: 1, search: searchInput.value });
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshClients({ currentPage: nextPage, search: searchInput.value });
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshClients({ currentPage: nextPage, search: searchInput.value });
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshClients({ currentPage: totalPages, search: searchInput.value });
    };

    resetClientFormState();
    refreshClients({ currentPage: 1, search: "", force: true });
};

export async function getClients(currentPage = 1, limit = CLIENTS_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildClientsQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeClientsRequestId;

    addPlaceholder();

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(limit),
            search: normalizedSearch,
            sortBy: column,
            sortOrder: order,
        });

        const response = await getApi(`clients?${params.toString()}`, token);

        if (requestId !== activeClientsRequestId && !force) return;

        const list = response?.success ? (response.data ?? []) : [];
        const clientsTable = document.getElementById("tbody");
        clientsTable.innerHTML = "";

        list.forEach((clientResponse) => {
            const clientId = clientResponse._id ?? clientResponse.id_cliente ?? getClientCode(clientResponse);
            const clientCode = getClientCode(clientResponse);
            const clientName = getClientFullName(clientResponse);
            const registerDate = formatDateDDMMAAAA(clientResponse.createdAt ?? clientResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.clientId = clientId;
            tr.dataset.clientName = clientName;
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                <td>${clientCode}</td>
                <td>${clientName}</td>
                <td>${clientResponse.correo ?? ""}</td>
                <td>${clientResponse.telefono ?? ""}</td>
                <td>${registerDate}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver cliente</button>
                        </li>
                        <li>
                            <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar cliente</button>
                        </li>
                    </ul>
                </td>
            `;

            clientsTable.appendChild(tr);
        });

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener clientes", response?.error ?? "", "error", 5000);
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

        actionsClient();
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeClientsRequestId || force) removePlaceholder();
    }
}
