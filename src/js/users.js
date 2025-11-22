import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import {deleteApi, getApi, patchApi, postApi, putApi} from "./api.js";
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
let order = "ASC";
let edit = false;
let page = 1;

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

export const actionsUser = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const userName = tr.children[1].textContent;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando usuario", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`users/${userName}`, token);

                    if (response) {
                        user.value = response.usuario;
                        name.value = response.nombre;
                        firstSurname.value = response.primer_apellido;
                        secondSurname.value = response.segundo_apellido;
                        email.value = response.correo;
                        role.value = response.rol;

                        newUserBtn.click();
                        alertToast("Usuario cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response.message, response.error, "error", 5000).finally(() => {
                            if (searchInput.value) searchUsers(searchInput.value);
                            else getUsers(column, order);
                        });
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        } else if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const userName = tr.children[1].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar usuario", `¿Está seguro de que desea eliminar al usuario ${userName}?`, "warning", true)) {
                    alertLoading("Eliminando usuario", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    if (userName === currentSession.usuario) {
                        alertToast("No puedes eliminar tu propio usuario", false, "error", "bottom-end");
                        return;
                    }

                    try {
                        const response = await deleteApi(`users/${userName}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                if (searchInput.value) {
                                    page = 1;
                                    searchUsers(searchInput.value, 0);
                                } else {
                                    page = 1;
                                    getUsers(column, order, 0);
                                }
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000).finally(() => {
                                if (searchInput.value) searchUsers(searchInput.value, (page - 1) * 10);
                                else getUsers(column, order, (page - 1) * 10);
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

    deleteBtn.addEventListener("click", async () => {
        const selectedUsers = [...checkboxes].filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.closest("tr").children[1].textContent);

        if (selectedUsers.length === 0) return;
        if (await alertConfirm("Eliminar usuario", `¿Está seguro de que desea eliminar a los usuarios ${selectedUsers.join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando usuario", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            if (selectedUsers.includes(currentSession.usuario)) {
                alertToast("No puedes eliminar tu propio usuario", false, "error", "bottom-end");
                return;
            }

            let usuariosEliminados = 0;
            let usuariosNoEliminados = 0;
            try {
                for (const userName of selectedUsers) {
                    const response = await deleteApi(`users/${userName}`, token);

                    if (response.success) usuariosEliminados++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        usuariosNoEliminados++;
                    }
                }
                alertToast(`Usuarios eliminados: ${usuariosEliminados}, Usuarios no eliminados: ${usuariosNoEliminados}`, false, "success", "bottom-end");
                if (searchInput.value) {
                    page = 1;
                    searchUsers(searchInput.value, 0);
                } else {
                    page = 1;
                    getUsers(column, order, 0);
                }
            } catch (error) {
                console.error(error);
                alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
            }
        }
    });
};

export const handleSearchInput = () => {
    page = 1;
    if (searchInput.value) searchUsers(searchInput.value);
    else {
        getUsers(column, order);
        filterBtn.classList.remove("d-none");
        orderBtn.classList.remove("d-none");
    }
};

export const readyUsers = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item");
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

    searchInput.addEventListener("input", handleSearchInput);

    orderBtn.addEventListener("click", () => {
        order = order === "ASC" ? "DESC" : "ASC";
        orderBtn.innerHTML = `<i class="bi ${order === "ASC" ? "bi-arrow-up" : "bi-arrow-down"}"></i> ${order === "ASC" ? "Ascendente" : "Descendente"}`;
        getUsers(column, order);
    });

    filter.forEach((button) => {
        button.addEventListener("click", () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            getUsers(column, order);
        });
    });

    editBtn.addEventListener("click", () => {
        if (user.value === currentSession.usuario) {
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
            if (edit) response = await patchApi("users/role", { usuario: user.value, rol: role.value }, token);
            else response = await postApi("users", data, token);

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    getUsers(column, order);
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
    });

    closeBtn.addEventListener("click", () => {
        formNewUser.reset();
        disabledEdit(false);
        edit = false;
    });

    startBtn.addEventListener("click", () => {
        page = 1;
        if (searchInput.value) searchUsers(searchInput.value);
        else getUsers(column, order);
    });
    prevBtn.addEventListener("click", () => {
        if (page > 1) page--;
        if (searchInput.value) searchUsers(searchInput.value, (page - 1) * 10);
        else getUsers(column, order, (page - 1) * 10);
    });
    nextBtn.addEventListener("click", () => {
        if (page < totalPagesNum.textContent) page++;
        if (searchInput.value) searchUsers(searchInput.value, (page - 1) * 10);
        else getUsers(column, order, (page - 1) * 10);
    });
    endBtn.addEventListener("click", () => {
        page = totalPagesNum.textContent;
        if (searchInput.value) searchUsers(searchInput.value, (page - 1) * 10);
        else getUsers(column, order, (page - 1) * 10);
    });

    getUsers(column, order);
};

export async function getUsers(_column, _order, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("users/filter", { columna_orden: _column, orden: _order, limite: 10, desplazamiento: _offset }, token);

        if (response.length > 0) {
            const usersTable = document.getElementById("tbody");
            usersTable.innerHTML = "";

            response.forEach((userResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <th scope="row" class="text-center">
                        <input type="checkbox" class="select-checkbox" />
                    </th>
                    <td>${userResponse.usuario}</td>
                    <td>${userResponse.nombre_completo}</td>
                    <td>${userResponse.correo}</td>
                    <td>${userResponse.rol_usuario}</td>
                    <td>${userResponse.en_linea ? "En linea" : "Desconectado"}</td>
                    <td>${userResponse.fecha_registro}</td>
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
        }

        rowSelectNum.textContent = 0;
        rowsNum.textContent = response.length;
        currentPageNum.textContent = page;
        totalPagesNum.textContent = Math.ceil(response[0].total / 10);
        actionsUser();

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

export async function searchUsers(_search, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("users/search", { busqueda: _search, limite: 10, desplazamiento: _offset }, token);
        const usersTable = document.getElementById("tbody");

        if (response.length > 0) {
            usersTable.innerHTML = "";

            response.forEach((userResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <th scope="row" class="text-center">
                        <input type="checkbox" class="select-checkbox" />
                    </th>
                    <td>${userResponse.usuario}</td>
                    <td>${userResponse.nombre_completo}</td>
                    <td>${userResponse.correo}</td>
                    <td>${userResponse.rol_usuario}</td>
                    <td>${userResponse.en_linea ? "En linea" : "Desconectado"}</td>
                    <td>${userResponse.fecha_registro}</td>
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

            rowSelectNum.textContent = 0;
            rowsNum.textContent = response.length;
            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
            actionsUser();
        } else {
            usersTable.innerHTML = "";
            rowSelectNum.textContent = 0;
            rowsNum.textContent = response.length;
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
