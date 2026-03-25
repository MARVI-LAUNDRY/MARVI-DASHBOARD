import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import {deleteApi, getApi, postApi, putApi} from "./api.js";
import {token, currentSession} from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newUserBtn = null;

let formNewUser = null;
let user = null;
let name = null;
let firstSurname = null;
let secondSurname = null;
let email = null;
let role = null;

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

let column = "usuario";
let order = "asc";
let edit = false;
let page = 1;
let registers = null;
let selectedUserId = null;

const USERS_LIMIT = 10;
let activeSearch = "";
let lastQueryKey = "";
let activeUsersRequestId = 0;

const formatDateDDMMAAAA = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}/${month}/${year}`;
};

const disabledEdit = (disabled) => {
    editBtn.disabled = !disabled;
    user.disabled = disabled;
    name.disabled = disabled;
    firstSurname.disabled = disabled;
    secondSurname.disabled = disabled;
    email.disabled = disabled;
    role.disabled = disabled;
    saveBtn.disabled = disabled;
};

const normalizeSearch = (value) => (value ?? "").trim();
const EMPTY_REFERENCE_TEXT = "Sin información";

const getDisplayOrFallback = (value) => {
    const normalized = `${value ?? ""}`.trim();
    return normalized || EMPTY_REFERENCE_TEXT;
};

const buildUsersQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;

const refreshUsers = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getUsers(page, USERS_LIMIT, activeSearch, force);
};

export const actionsUser = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const userId = tr.dataset.userId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando usuario", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`users/${userId}`, token);

                    if (response.success && response.data) {
                        const userData = response.data;
                        selectedUserId = userData._id;

                        user.value = userData.usuario;
                        name.value = userData.nombre;
                        firstSurname.value = userData.primer_apellido;
                        secondSurname.value = userData.segundo_apellido;
                        email.value = userData.correo;
                        role.value = userData.rol;

                        newUserBtn.click();
                        alertToast("Usuario cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response.message, response.error, "error", 5000).finally(() => {
                            refreshUsers({ currentPage: page, search: searchInput.value, force: true });
                        });
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        } else if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const userId = tr.dataset.userId;
            const userName = tr.dataset.userName ?? tr.children[1].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar usuario", `¿Está seguro de que desea eliminar al usuario ${userName}?`, "warning", true)) {
                    alertLoading("Eliminando usuario", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    if (userId === currentSession._id) {
                        alertToast("No puedes eliminar tu propio usuario", false, "error", "bottom-end");
                        return;
                    }

                    try {
                        const response = await deleteApi(`users/${userId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshUsers({ currentPage: 1, search: searchInput.value, force: true });
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000).finally(() => {
                                refreshUsers({ currentPage: page, search: searchInput.value, force: true });
                            });
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
            if ([...checkboxes].every((checkbox) => !checkbox.checked)) deleteBtn.classList.add("d-none");
            else deleteBtn.classList.remove("d-none");
            rowSelectNum.textContent = [...checkboxes].filter((checkbox) => checkbox.checked).length;
        });
    });

    deleteBtn.onclick = async () => {
        const selectedUsers = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.userId,
                    name: tr.dataset.userName ?? tr.children[1].textContent,
                };
            });

        if (selectedUsers.length === 0) return;
        if (await alertConfirm("Eliminar usuario", `¿Está seguro de que desea eliminar a los usuarios ${selectedUsers.map((u) => u.name).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando usuario", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            if (selectedUsers.some((selectedUser) => selectedUser.id === currentSession._id)) {
                alertToast("No puedes eliminar tu propio usuario", false, "error", "bottom-end");
                return;
            }

            let usuariosEliminados = 0;
            let usuariosNoEliminados = 0;
            try {
                for (const selectedUser of selectedUsers) {
                    const response = await deleteApi(`users/${selectedUser.id}`, token);

                    if (response.success) usuariosEliminados++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        usuariosNoEliminados++;
                    }
                }
                alertToast(`Usuarios eliminados: ${usuariosEliminados}, Usuarios no eliminados: ${usuariosNoEliminados}`, false, "success", "bottom-end");
                refreshUsers({ currentPage: 1, search: searchInput.value, force: true });
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
        refreshUsers({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;

    refreshUsers({ currentPage: 1, search: searchValue });
};

export const readyUsers = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newUserBtn = document.getElementById("newUserBtn");

    formNewUser = document.getElementById("formNewUser");
    user = document.getElementById("user");
    name = document.getElementById("name");
    firstSurname = document.getElementById("firstSurname");
    secondSurname = document.getElementById("secondSurname");
    email = document.getElementById("email");
    role = document.getElementById("role");

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

    searchInput.addEventListener("keydown", handleSearchInput);
    searchInput.addEventListener("input", handleSearchInput);

    orderBtn.addEventListener("click", () => {
        order = order === "asc" ? "desc" : "asc";
        orderBtn.innerHTML = `<i class="bi ${order === "asc" ? "bi-arrow-up" : "bi-arrow-down"}"></i> ${order === "asc" ? "Ascendente" : "Descendente"}`;
        refreshUsers({ currentPage: 1, search: searchInput.value });
    });

    filter.forEach((button) => {
        button.addEventListener("click", () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshUsers({ currentPage: 1, search: searchInput.value });
        });
    });

    editBtn.addEventListener("click", () => {
        if (selectedUserId === currentSession._id) {
            alertToast("No puedes editar tu propio usuario", false, "error", "bottom-start");
            return;
        }
        alertToast("La edición del usuario esta activa", false, "success", "bottom-start");
        editBtn.disabled = true;
        role.disabled = false;
        saveBtn.disabled = false;
        edit = true;
    });

    formNewUser.addEventListener("submit", async (e) => {
        e.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        const data = {
            usuario: user.value,
            nombre: name.value,
            primer_apellido: firstSurname.value,
            segundo_apellido: secondSurname.value,
            correo: email.value,
            rol: role.value,
        };

        alertLoading("Guardando usuario", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");
        try {
            let response = null;
            if (edit) {
                if (!selectedUserId) {
                    alertMessage("Usuario inválido", "No se encontró el identificador del usuario a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    role.disabled = false;
                    return;
                }
                response = await putApi(`users/${selectedUserId}`, { rol: role.value }, token);
            }
            else response = await postApi("users", data, token);

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    selectedUserId = null;
                    refreshUsers({ currentPage: 1, search: "", force: true });
                });
            } else {
                alertMessage(response.message, response.error, "error", 5000).finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    role.disabled = false;
                });
            }
        } catch (error) {
            console.error(error);
            alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
        }
    });

    cancelBtn.addEventListener("click", () => {
        formNewUser.reset();
        disabledEdit(false);
        edit = false;
        selectedUserId = null;
    });

    closeBtn.addEventListener("click", () => {
        formNewUser.reset();
        disabledEdit(false);
        edit = false;
        selectedUserId = null;
    });

    startBtn.addEventListener("click", () => {
        refreshUsers({ currentPage: 1, search: searchInput.value });
    });
    prevBtn.addEventListener("click", () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshUsers({ currentPage: nextPage, search: searchInput.value });
    });
    nextBtn.addEventListener("click", () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshUsers({ currentPage: nextPage, search: searchInput.value });
    });
    endBtn.addEventListener("click", () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshUsers({ currentPage: totalPages, search: searchInput.value });
    });

    refreshUsers({ currentPage: page, search: "", force: true });
};

export async function getUsers(currentPage = 1, limit = USERS_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildUsersQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeUsersRequestId;
    addPlaceholder();

    const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        search: normalizedSearch,
        sortBy: column,
        sortOrder: order,
    });

    try {
        const response = await getApi(`users?${params.toString()}`, token);

        if (requestId !== activeUsersRequestId) return;

        if (response.success) {
            page = response.pagination?.page ?? currentPage;
            const usersTable = document.getElementById("tbody");
            usersTable.innerHTML = "";

            response.data.forEach((userResponse) => {
                const fullName = [userResponse.nombre, userResponse.primer_apellido, userResponse.segundo_apellido].filter(Boolean).join(" ");
                const registerDate = formatDateDDMMAAAA(userResponse.createdAt ?? userResponse.fecha_registro);

                const tr = document.createElement("tr");
                tr.dataset.userId = userResponse._id;
                tr.dataset.userName = getDisplayOrFallback(userResponse.usuario);
                tr.innerHTML = `
                    <th scope="row" class="text-center">
                        <input type="checkbox" class="select-checkbox" />
                    </th>
                    <td>${getDisplayOrFallback(userResponse.usuario)}</td>
                    <td>${getDisplayOrFallback(fullName)}</td>
                    <td>${getDisplayOrFallback(userResponse.correo)}</td>
                    <td>${getDisplayOrFallback(userResponse.rol)}</td>
                    <td>${getDisplayOrFallback(registerDate)}</td>
                    <td class="text-center">
                        <button class="btn options" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver usuario</button>
                            </li>
                            <li>
                                <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar usuario</button>
                            </li>
                        </ul>
                    </td>
                `;
                usersTable.appendChild(tr);
            });

            registers = response.data;

            rowSelectNum.textContent = 0;
            rowsNum.textContent = response.pagination.total;
            currentPageNum.textContent = page;
            totalPagesNum.textContent = response.pagination.totalPages;
            actionsUser();
        } else {
            alertMessage(response.message, response.error, "error", 5000);
        }

        if (page === 1) {
            startBtn.disabled = true;
            prevBtn.disabled = true;
        } else {
            startBtn.disabled = false;
            prevBtn.disabled = false;
        }
        if (page >= Number(totalPagesNum.textContent)) {
            page = Number(totalPagesNum.textContent);
            nextBtn.disabled = true;
            endBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
            endBtn.disabled = false;
        }

    } catch (error) {
        if (requestId !== activeUsersRequestId) return;
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeUsersRequestId) removePlaceholder();
    }
}
