import { alertConfirm, alertLoading, alertMessage, alertToast } from "./alerts.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";
import {deleteApi, getApi, postApi, putApi} from "./api.js";
import {token} from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newProductBtn = null;

let formNewProduct = null;
let imagen=null;
let code = null;
let name = null;
let description = null;
let price = null;
let quantity = null;
let image = null;

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
let order = "ASC";
let edit = false;
let page = 1;

const disabledEdit = (disabled) => {
    editBtn.disabled = !disabled;
    code.disabled = disabled;
    name.disabled = disabled;
    description.disabled = disabled;
    price.disabled = disabled;
    quantity.disabled = disabled;
    image.disabled = disabled;
    saveBtn.disabled = disabled;
};

export const actionsProduct = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const codeProduct = tr.children[2].textContent;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando producto", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`products/${codeProduct}`, token);

                    if (response) {
                        sessionStorage.setItem("product", response.id_producto);
                        code.value = response.codigo;
                        name.value = response.nombre;
                        description.value = response.descripcion;
                        price.value = response.precio;
                        quantity.value = response.cantidad;

                        newProductBtn.click();
                        alertToast("Producto cargado correctamente", false, "success", "bottom-start", 1500);
                        disabledEdit(true);
                    } else {
                        alertMessage(response.message, response.error, "error", 5000).finally(() => {
                            if (searchInput.value) searchProducts(searchInput.value);
                            else getProducts(column, order);
                        });
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        } else if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const productCode = tr.children[2].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar producto", `¿Está seguro de que desea eliminar al producto ${productCode}?`, "warning", true)) {
                    alertLoading("Eliminando producto", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`products/${productCode}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end", 1500).finally(() => {
                                if (searchInput.value) {
                                    page = 1;
                                    searchProducts(searchInput.value);
                                } else {
                                    page = 1;
                                    getProducts(column, order, 0);
                                }
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000).finally(() => {
                                if (searchInput.value) searchProducts(searchInput.value, (page - 1) * 10);
                                else getProducts(column, order, (page - 1) * 10);
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
        const selectedProducts = [...checkboxes].filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.closest("tr").children[2].textContent);

        if (selectedProducts.length === 0) return;
        if (await alertConfirm("Eliminar producto", `¿Está seguro de que desea eliminar a los productos ${selectedProducts.join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando producto", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let productosEliminados = 0;
            let productosNoEliminados = 0;
            try {
                for (const productCode of selectedProducts) {
                    const response = await deleteApi(`products/${productCode}`, token);

                    if (response.success) productosEliminados++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        productosNoEliminados++;
                    }
                }
                alertToast(`Productos eliminados: ${productosEliminados}, Productos no eliminados: ${productosNoEliminados}`, false, "success", "bottom-end");
                if (searchInput.value) {
                    page = 1;
                    searchProducts(searchInput.value, 0);
                } else {
                    page = 1;
                    getProducts(column, order, 0);
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
    if (searchInput.value) searchProducts(searchInput.value);
    else {
        getProducts(column, order);
        filterBtn.classList.remove("d-none");
        orderBtn.classList.remove("d-none");
    }
};

export const readyProducts = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item");
    newProductBtn = document.getElementById("newProduct");

    formNewProduct = document.getElementById("formNewProduct");
    imagen = document.getElementById("imagen");
    code = document.getElementById("code");
    name = document.getElementById("name");
    description = document.getElementById("description");
    price = document.getElementById("price");
    quantity = document.getElementById("quantity");
    image = document.getElementById("image");

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
        getProducts(column, order);
    });

    filter.forEach((button) => {
        button.addEventListener("click", () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            getProducts(column, order);
        });
    });

    editBtn.addEventListener("click", () => {
        alertToast("La edición del producto esta activa", false, "success", "bottom-start");
        disabledEdit(false);
        edit = true;
    });

    formNewProduct.addEventListener("submit", async (e) => {
        e.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        const data = new FormData();
        data.append("id_producto", sessionStorage.getItem("product") || "");
        data.append("codigo", code.value);
        data.append("nombre", name.value);
        data.append("descripcion", description.value);
        data.append("precio", price.value);
        data.append("cantidad", quantity.value);

        if (image.files.length > 0) {
            data.append("imagen_url", image.files[0]);
        }

        alertLoading("Guardando producto", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");
        try {
            let response = null;
            if (edit) response = await putApi("products", data, token);
            else response = await postApi("products", data, token);

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start", 1500).finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    getProducts(column, order);
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
        }
    });

    cancelBtn.addEventListener("click", () => {
        formNewProduct.reset();
        disabledEdit(false);
        edit = false;
    });
    closeBtn.addEventListener("click", () => {
        formNewProduct.reset();
        disabledEdit(false);
        edit = false;
    });

    startBtn.addEventListener("click", () => {
        page = 1;
        if (searchInput.value) searchProducts(searchInput.value);
        else getProducts(column, order);
    });
    prevBtn.addEventListener("click", () => {
        if (page > 1) page--;
        if (searchInput.value) searchProducts(searchInput.value, (page - 1) * 10);
        else getProducts(column, order, (page - 1) * 10);
    });
    nextBtn.addEventListener("click", () => {
        if (page < totalPagesNum.textContent) page++;
        if (searchInput.value) searchProducts(searchInput.value, (page - 1) * 10);
        else getProducts(column, order, (page - 1) * 10);
    });
    endBtn.addEventListener("click", () => {
        page = totalPagesNum.textContent;
        if (searchInput.value) searchProducts(searchInput.value, (page - 1) * 10);
        else getProducts(column, order, (page - 1) * 10);
    });

    getProducts(column, order);
};

export async function getProducts(_column, _order, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("products/filter", { columna_orden: _column, orden: _order, limite: 10, desplazamiento: _offset }, token);

        if (response.length > 0) {
            const productsTable = document.getElementById("tbody");
            productsTable.innerHTML = "";

            response.forEach((productResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <th scope="row" class="text-center">
                        <input type="checkbox" class="select-checkbox" />
                    </th>
                    <td><img src="${productResponse.imagen_url}" alt="Producto ${productResponse.codigo}"></td>
                    <td>${productResponse.codigo}</td>
                    <td>${productResponse.nombre}</td>
                    <td>${productResponse.descripcion}</td>
                    <td>${productResponse.precio}</td>
                    <td>${productResponse.cantidad}</td>
                    <td class="text-center">
                        <button class="btn options" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver producto</button>
                            </li>
                            <li>
                                <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar producto</button>
                            </li>
                        </ul>
                    </td>
                `;
                productsTable.appendChild(tr);
            });

            rowSelectNum.textContent = 0;
            rowsNum.textContent = response.length;
            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
            actionsProduct();
        } else {
            const productsTable = document.getElementById("tbody");
            productsTable.innerHTML = "";
            rowSelectNum.textContent = 0;
            rowsNum.textContent = 1;
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

export async function searchProducts(_search, _offset = 0) {
    addPlaceholder();

    try {
        const response = await postApi("products/search", { busqueda: _search, limite: 10, desplazamiento: _offset }, token);
        const productsTable = document.getElementById("tbody");

        if (response.length > 0) {
            productsTable.innerHTML = "";

            response.forEach((productResponse) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <th scope="row" class="text-center">
                        <input type="checkbox" class="select-checkbox" />
                    </th>
                    <td><img src="${productResponse.imagen_url}" alt="Producto ${productResponse.codigo}"></td>
                    <td>${productResponse.codigo}</td>
                    <td>${productResponse.nombre}</td>
                    <td>${productResponse.descripcion}</td>
                    <td>${productResponse.precio}</td>
                    <td>${productResponse.cantidad}</td>
                    <td class="text-center">
                        <button class="btn options" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver producto</button>
                            </li>
                            <li>
                                <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar producto</button>
                            </li>
                        </ul>
                    </td>
                `;
                productsTable.appendChild(tr);
            });

            rowSelectNum.textContent = 0;
            rowsNum.textContent = response.length;
            currentPageNum.textContent = page;
            totalPagesNum.textContent = Math.ceil(response[0].total / 10);
            actionsProduct();
        } else {
            productsTable.innerHTML = "";
            rowSelectNum.textContent = 0;
            rowsNum.textContent = 1;
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
