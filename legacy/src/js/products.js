import {alertConfirm, alertLoading, alertMessage, alertToast} from "./alerts.js";
import {addPlaceholder, removePlaceholder} from "./tables.js";
import {deleteApi, getApi, postApi, putApi} from "./api.js";
import {token} from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newProductBtn = null;

let formNewProduct = null;
let code = null;
let name = null;
let description = null;
let unitMeasure = null;
let price = null;
let stock = null;
let image = null;
let imagePreviewContainer = null;
let imagePreview = null;

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
let selectedProductId = null;
let selectedProductImage = "";
let previewObjectUrl = null;

const PRODUCTS_LIMIT = 10;
let activeSearch = "";
let activeProductsRequestId = 0;
let lastQueryKey = "";

const normalizeSearch = (value) => (value ?? "").trim();
const EMPTY_REFERENCE_TEXT = "Sin informacion";

const getDisplayOrFallback = (value) => {
    const normalized = `${value ?? ""}`.trim();
    return normalized || EMPTY_REFERENCE_TEXT;
};

const formatDateDDMMAAAA = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}/${month}/${year}`;
};

const formatCurrency = (value) => `$${Number(value ?? 0).toFixed(2)}`;

const getProductId = (productResponse) => productResponse._id ?? productResponse.id_producto ?? productResponse.codigo;
const getProductStock = (productResponse) => productResponse.stock ?? productResponse.stokc ?? productResponse.cantidad ?? 0;
const getProductImage = (productResponse) => {
    const imageValue = productResponse.imagen ?? productResponse.imagen_url ?? "";
    return typeof imageValue === "string" ? imageValue.trim() : "";
};

const buildProductImagePlaceholder = () => "<div class='product-image-placeholder d-inline-flex align-items-center justify-content-center rounded'><i class='bi bi-image product-image-placeholder-icon' title='Sin imagen'></i></div>";

const buildProductImageCell = (imageUrl, productCode) => {
    const placeholderContent = buildProductImagePlaceholder();

    if (!imageUrl) {
        return `
            <td class="text-center">
                ${placeholderContent}
            </td>
        `;
    }

    return `
        <td class="text-center">
            <img class="product-table-image" src="${imageUrl}" alt="Producto ${productCode}" />
        </td>
    `;
};

const attachProductImageFallbacks = (tableElement) => {
    const imageElements = tableElement.querySelectorAll("img.product-table-image");

    imageElements.forEach((imageElement) => {
        imageElement.onerror = () => {
            const imageCell = imageElement.closest("td");
            if (!imageCell) return;

            imageCell.classList.add("text-center");
            imageCell.innerHTML = buildProductImagePlaceholder();
        };
    });
};

const buildProductsQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;

const revokePreviewObjectUrl = () => {
    if (!previewObjectUrl) return;
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
};

const clearImagePreview = () => {
    if (!imagePreviewContainer || !imagePreview) return;
    revokePreviewObjectUrl();
    imagePreview.removeAttribute("src");
    imagePreviewContainer.classList.add("d-none");
};

const setImagePreview = (imageUrl) => {
    if (!imagePreviewContainer || !imagePreview || !imageUrl) {
        clearImagePreview();
        return;
    }

    if (previewObjectUrl && imageUrl !== previewObjectUrl) revokePreviewObjectUrl();

    imagePreview.src = imageUrl;
    imagePreviewContainer.classList.remove("d-none");
};

const disabledEdit = (disabled) => {
    editBtn.disabled = !disabled;
    code.disabled = disabled;
    name.disabled = disabled;
    description.disabled = disabled;
    unitMeasure.disabled = disabled;
    price.disabled = disabled;
    stock.disabled = disabled;
    image.disabled = disabled;
    saveBtn.disabled = disabled;
};

const resetProductFormState = () => {
    formNewProduct.reset();
    disabledEdit(false);
    edit = false;
    selectedProductId = null;
    selectedProductImage = "";
    clearImagePreview();
};

const buildProductPayload = () => {
    const data = new FormData();

    data.append("codigo", code.value);
    data.append("nombre", name.value);
    data.append("descripcion", description.value);
    data.append("unidad_medida", unitMeasure.value);
    data.append("precio", price.value);
    data.append("stock", stock.value);
    data.append("stokc", stock.value);

    if (image.files.length > 0) data.append("imagen", image.files[0]);

    return data;
};

const refreshProducts = ({currentPage = page, search = activeSearch, force = false} = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getProducts(page, PRODUCTS_LIMIT, activeSearch, force);
};

export const actionsProduct = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const productId = tr.dataset.productId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando producto", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`products/${productId}`, token);
                    const productData = response?.success ? response.data : null;

                    if (productData) {
                        selectedProductId = getProductId(productData) ?? productId;
                        code.value = productData.codigo ?? "";
                        name.value = productData.nombre ?? "";
                        description.value = productData.descripcion ?? "";
                        unitMeasure.value = productData.unidad_medida ?? "";
                        price.value = productData.precio ?? 0;
                        stock.value = getProductStock(productData);
                        selectedProductImage = getProductImage(productData);
                        setImagePreview(selectedProductImage);

                        newProductBtn.click();
                        alertToast("Producto cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar el producto", response?.error ?? "", "error", 5000)
                            .finally(() => refreshProducts({
                                currentPage: page, search: searchInput.value, force: true
                            }));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        }

        if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const productId = tr.dataset.productId;
            const productCode = tr.dataset.productCode ?? tr.children[2].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar producto", `¿Está seguro de que desea eliminar al producto ${productCode}?`, "warning", true)) {
                    alertLoading("Eliminando producto", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`products/${productId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshProducts({currentPage: 1, search: searchInput.value, force: true});
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshProducts({
                                    currentPage: page, search: searchInput.value, force: true
                                }));
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
        const selectedProducts = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.productId, code: tr.dataset.productCode ?? tr.children[2].textContent,
                };
            });

        if (selectedProducts.length === 0) return;

        if (await alertConfirm("Eliminar producto", `¿Está seguro de que desea eliminar a los productos ${selectedProducts.map((product) => product.code).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando producto", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let productosEliminados = 0;
            let productosNoEliminados = 0;

            try {
                for (const selectedProduct of selectedProducts) {
                    const response = await deleteApi(`products/${selectedProduct.id}`, token);

                    if (response.success) productosEliminados++; else {
                        alertMessage(response.message, response.error, "error", 5000);
                        productosNoEliminados++;
                    }
                }

                alertToast(`Productos eliminados: ${productosEliminados}, Productos no eliminados: ${productosNoEliminados}`, false, "success", "bottom-end");
                refreshProducts({currentPage: 1, search: searchInput.value, force: true});
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
        refreshProducts({currentPage: 1, search: ""});
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;
    refreshProducts({currentPage: 1, search: searchValue});
};

export const readyProducts = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newProductBtn = document.getElementById("newProduct");

    formNewProduct = document.getElementById("formNewProduct");
    code = document.getElementById("code");
    name = document.getElementById("name");
    description = document.getElementById("description");
    unitMeasure = document.getElementById("unitMeasure");
    price = document.getElementById("price");
    stock = document.getElementById("stock");
    image = document.getElementById("image");
    imagePreviewContainer = document.getElementById("imagePreviewContainer");
    imagePreview = document.getElementById("imagePreview");

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
        refreshProducts({currentPage: 1, search: searchInput.value});
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshProducts({currentPage: 1, search: searchInput.value});
        };
    });

    editBtn.onclick = () => {
        alertToast("La edición del producto está activa", false, "success", "bottom-start");
        disabledEdit(false);
        edit = true;
    };

    image.onchange = () => {
        if (image.files.length > 0) {
            revokePreviewObjectUrl();
            previewObjectUrl = URL.createObjectURL(image.files[0]);
            setImagePreview(previewObjectUrl);
            return;
        }

        setImagePreview(selectedProductImage);
    };

    formNewProduct.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;


        const data = buildProductPayload();

        alertLoading("Guardando producto", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedProductId) {
                    alertMessage("Producto inválido", "No se encontró el identificador del producto a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await putApi(`products/${selectedProductId}`, data, token);
            } else {
                response = await postApi("products", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetProductFormState();
                    refreshProducts({currentPage: 1, search: "", force: true});
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
        resetProductFormState();
    };

    closeBtn.onclick = () => {
        resetProductFormState();
    };

    startBtn.onclick = () => {
        refreshProducts({currentPage: 1, search: searchInput.value});
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshProducts({currentPage: nextPage, search: searchInput.value});
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshProducts({currentPage: nextPage, search: searchInput.value});
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshProducts({currentPage: totalPages, search: searchInput.value});
    };

    resetProductFormState();
    refreshProducts({currentPage: 1, search: "", force: true});
};

export async function getProducts(currentPage = 1, limit = PRODUCTS_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildProductsQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeProductsRequestId;

    addPlaceholder();

    const params = new URLSearchParams({
        page: String(currentPage), limit: String(limit), search: normalizedSearch, sortBy: column, sortOrder: order,
    });

    try {
        const response = await getApi(`products?${params.toString()}`, token);

        if (requestId !== activeProductsRequestId) return;

        const list = response?.success ? (response.data ?? []) : [];
        const productsTable = document.getElementById("tbody");
        productsTable.innerHTML = "";

        list.forEach((productResponse) => {
            const productId = getProductId(productResponse);
            const productCode = productResponse.codigo ?? "";
            const productImage = getProductImage(productResponse);
            const productStock = getProductStock(productResponse);
            const registerDate = formatDateDDMMAAAA(productResponse.createdAt ?? productResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.productId = productId;
            tr.dataset.productCode = productCode;
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                ${buildProductImageCell(productImage, productCode)}
                <td>${productCode}</td>
                <td>${getDisplayOrFallback(productResponse.nombre)}</td>
                <td>${getDisplayOrFallback(productResponse.descripcion)}</td>
                <td>${getDisplayOrFallback(productResponse.unidad_medida)}</td>
                <td>${formatCurrency(productResponse.precio)}</td>
                <td>${productStock}</td>
                <td>${registerDate}</td>
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

        attachProductImageFallbacks(productsTable);

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener productos", response?.error ?? "", "error", 5000);
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

        actionsProduct();
    } catch (error) {
        if (requestId !== activeProductsRequestId) return;
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeProductsRequestId) removePlaceholder();
    }
}
