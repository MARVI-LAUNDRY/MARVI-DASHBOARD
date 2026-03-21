import {alertConfirm, alertLoading, alertMessage, alertToast} from "./alerts.js";
import {addPlaceholder, removePlaceholder} from "./tables.js";
import {deleteApi, getApi, postApi, putApi} from "./api.js";
import {token} from "./dashboard.js";

let searchInput = null;

let deleteBtn = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;
let newServiceBtn = null;

let formNewService = null;
let code = null;
let name = null;
let description = null;
let unitMeasure = null;
let price = null;
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
let selectedServiceId = null;
let selectedServiceImage = "";
let previewObjectUrl = null;

const SERVICES_LIMIT = 10;
let activeSearch = "";
let activeServicesRequestId = 0;
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

const getServiceId = (serviceResponse) => serviceResponse._id ?? serviceResponse.id_servicio ?? serviceResponse.codigo;
const getServiceImage = (serviceResponse) => {
    const imageValue = serviceResponse.imagen ?? serviceResponse.imagen_url ?? "";
    return typeof imageValue === "string" ? imageValue.trim() : "";
};

const buildServiceImagePlaceholder = () => "<div class='product-image-placeholder d-inline-flex align-items-center justify-content-center rounded'><i class='bi bi-image product-image-placeholder-icon' title='Sin imagen'></i></div>";

const buildServiceImageCell = (imageUrl, serviceCode) => {
    const placeholderContent = buildServiceImagePlaceholder();

    if (!imageUrl) {
        return `
            <td class="text-center">
                ${placeholderContent}
            </td>
        `;
    }

    return `
        <td class="text-center">
            <img class="product-table-image" src="${imageUrl}" alt="Servicio ${serviceCode}" />
        </td>
    `;
};

const attachServiceImageFallbacks = (tableElement) => {
    const imageElements = tableElement.querySelectorAll("img.product-table-image");

    imageElements.forEach((imageElement) => {
        imageElement.onerror = () => {
            const imageCell = imageElement.closest("td");
            if (!imageCell) return;

            imageCell.classList.add("text-center");
            imageCell.innerHTML = buildServiceImagePlaceholder();
        };
    });
};

const buildServicesQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;

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
    image.disabled = disabled;
    saveBtn.disabled = disabled;
};

const resetServiceFormState = () => {
    formNewService.reset();
    disabledEdit(false);
    edit = false;
    selectedServiceId = null;
    selectedServiceImage = "";
    clearImagePreview();
};

const buildServicePayload = () => {
    const data = new FormData();

    data.append("codigo", code.value);
    data.append("nombre", name.value);
    data.append("descripcion", description.value);
    data.append("unidad_medida", unitMeasure.value);
    data.append("precio", price.value);

    if (image.files.length > 0) data.append("imagen", image.files[0]);

    return data;
};

const refreshServices = ({currentPage = page, search = activeSearch, force = false} = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getServices(page, SERVICES_LIMIT, activeSearch, force);
};

export const actionsService = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action]");
    const checkboxes = document.querySelectorAll(".select-checkbox");

    actionButtons.forEach((button) => {
        if (button.dataset.action === "consult") {
            const tr = button.closest("tr");
            const serviceId = tr.dataset.serviceId;

            button.addEventListener("click", async () => {
                disabledEdit(true);
                alertLoading("Cargando servicio", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");

                try {
                    const response = await getApi(`services/${serviceId}`, token);
                    const serviceData = response?.success ? response.data : null;

                    if (serviceData) {
                        selectedServiceId = getServiceId(serviceData) ?? serviceId;
                        code.value = serviceData.codigo ?? "";
                        name.value = serviceData.nombre ?? "";
                        description.value = serviceData.descripcion ?? "";
                        unitMeasure.value = serviceData.unidad_medida ?? "";
                        price.value = serviceData.precio ?? 0;
                        selectedServiceImage = getServiceImage(serviceData);
                        setImagePreview(selectedServiceImage);

                        newServiceBtn.click();
                        alertToast("Servicio cargado correctamente", false, "success", "bottom-start");
                        disabledEdit(true);
                    } else {
                        alertMessage(response?.message ?? "No se pudo cargar el servicio", response?.error ?? "", "error", 5000)
                            .finally(() => refreshServices({currentPage: page, search: searchInput.value, force: true}));
                    }
                } catch (error) {
                    console.error(error);
                    alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
                }
            });
        }

        if (button.dataset.action === "delete") {
            const tr = button.closest("tr");
            const serviceId = tr.dataset.serviceId;
            const serviceCode = tr.dataset.serviceCode ?? tr.children[2].textContent;

            button.addEventListener("click", async () => {
                if (await alertConfirm("Eliminar servicio", `¿Esta seguro de que desea eliminar al servicio ${serviceCode}?`, "warning", true)) {
                    alertLoading("Eliminando servicio", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

                    try {
                        const response = await deleteApi(`services/${serviceId}`, token);

                        if (response.success) {
                            alertToast(response.message, false, "success", "bottom-end").finally(() => {
                                refreshServices({currentPage: 1, search: searchInput.value, force: true});
                            });
                        } else {
                            alertMessage(response.message, response.error, "error", 5000)
                                .finally(() => refreshServices({currentPage: page, search: searchInput.value, force: true}));
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
        const selectedServices = [...checkboxes]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => {
                const tr = checkbox.closest("tr");
                return {
                    id: tr.dataset.serviceId,
                    code: tr.dataset.serviceCode ?? tr.children[2].textContent,
                };
            });

        if (selectedServices.length === 0) return;

        if (await alertConfirm("Eliminar servicio", `¿Esta seguro de que desea eliminar a los servicios ${selectedServices.map((service) => service.code).join(", ")}?`, "warning", true)) {
            alertLoading("Eliminando servicio", "Por favor, no cierre ni actualice el navegador mientras se eliminan los cambios.");

            let deleted = 0;
            let notDeleted = 0;

            try {
                for (const selectedService of selectedServices) {
                    const response = await deleteApi(`services/${selectedService.id}`, token);

                    if (response.success) deleted++;
                    else {
                        alertMessage(response.message, response.error, "error", 5000);
                        notDeleted++;
                    }
                }

                alertToast(`Servicios eliminados: ${deleted}, Servicios no eliminados: ${notDeleted}`, false, "success", "bottom-end");
                refreshServices({currentPage: 1, search: searchInput.value, force: true});
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
        refreshServices({currentPage: 1, search: ""});
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;
    refreshServices({currentPage: 1, search: searchValue});
};

export const readyServices = (searchBar) => {
    searchInput = searchBar;

    deleteBtn = document.getElementById("delete");
    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");
    newServiceBtn = document.getElementById("newServiceBtn");

    formNewService = document.getElementById("formNewService");
    code = document.getElementById("code");
    name = document.getElementById("name");
    description = document.getElementById("description");
    unitMeasure = document.getElementById("unitMeasure");
    price = document.getElementById("price");
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
        refreshServices({currentPage: 1, search: searchInput.value});
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshServices({currentPage: 1, search: searchInput.value});
        };
    });

    editBtn.onclick = () => {
        alertToast("La edicion del servicio esta activa", false, "success", "bottom-start");
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

        setImagePreview(selectedServiceImage);
    };

    formNewService.onsubmit = async (event) => {
        event.preventDefault();
        disabledEdit(true);
        cancelBtn.disabled = true;
        closeBtn.disabled = true;


        const data = buildServicePayload();

        alertLoading("Guardando servicio", "Por favor, no cierre ni actualice el navegador mientras se guardan los cambios.");

        try {
            let response = null;

            if (edit) {
                if (!selectedServiceId) {
                    alertMessage("Servicio invalido", "No se encontro el identificador del servicio a editar", "error", 5000);
                    disabledEdit(false);
                    cancelBtn.disabled = false;
                    closeBtn.disabled = false;
                    return;
                }

                response = await putApi(`services/${selectedServiceId}`, data, token);
            } else {
                response = await postApi("services", data, token);
            }

            if (response.success) {
                alertToast(response.message, false, "success", "bottom-start").finally(() => {
                    disabledEdit(false);
                    closeBtn.disabled = false;
                    cancelBtn.disabled = false;
                    closeBtn.click();
                    searchInput.value = "";
                    resetServiceFormState();
                    refreshServices({currentPage: 1, search: "", force: true});
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
        resetServiceFormState();
    };

    closeBtn.onclick = () => {
        resetServiceFormState();
    };

    startBtn.onclick = () => {
        refreshServices({currentPage: 1, search: searchInput.value});
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshServices({currentPage: nextPage, search: searchInput.value});
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshServices({currentPage: nextPage, search: searchInput.value});
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshServices({currentPage: totalPages, search: searchInput.value});
    };

    resetServiceFormState();
    refreshServices({currentPage: 1, search: "", force: true});
};

export async function getServices(currentPage = 1, limit = SERVICES_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildServicesQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeServicesRequestId;

    addPlaceholder();

    const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        search: normalizedSearch,
        sortBy: column,
        sortOrder: order,
    });

    try {
        const response = await getApi(`services?${params.toString()}`, token);

        if (requestId !== activeServicesRequestId) return;

        const list = response?.success ? (response.data ?? []) : [];
        const servicesTable = document.getElementById("tbody");
        servicesTable.innerHTML = "";

        list.forEach((serviceResponse) => {
            const serviceId = getServiceId(serviceResponse);
            const serviceCode = serviceResponse.codigo ?? "";
            const serviceImage = getServiceImage(serviceResponse);
            const registerDate = formatDateDDMMAAAA(serviceResponse.createdAt ?? serviceResponse.fecha_registro);

            const tr = document.createElement("tr");
            tr.dataset.serviceId = serviceId;
            tr.dataset.serviceCode = serviceCode;
            tr.innerHTML = `
                <th scope="row" class="text-center">
                    <input type="checkbox" class="select-checkbox" />
                </th>
                ${buildServiceImageCell(serviceImage, serviceCode)}
                <td>${serviceCode}</td>
                <td>${getDisplayOrFallback(serviceResponse.nombre)}</td>
                <td>${getDisplayOrFallback(serviceResponse.descripcion)}</td>
                <td>${getDisplayOrFallback(serviceResponse.unidad_medida)}</td>
                <td>${formatCurrency(serviceResponse.precio)}</td>
                <td>${registerDate}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-pencil-square"></i> Ver servicio</button>
                        </li>
                        <li>
                            <button class="dropdown-item" data-action="delete"><i class="bi bi-trash3"></i> Eliminar servicio</button>
                        </li>
                    </ul>
                </td>
            `;

            servicesTable.appendChild(tr);
        });

        attachServiceImageFallbacks(servicesTable);

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener servicios", response?.error ?? "", "error", 5000);
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

        actionsService();
    } catch (error) {
        if (requestId !== activeServicesRequestId) return;
        console.error(error);
        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeServicesRequestId) removePlaceholder();
    }
}

