import { alertLoading, alertMessage, alertToast } from "./alerts.js";
import { getApi } from "./api.js";
import { currentSession, token } from "./dashboard.js";
import { addPlaceholder, removePlaceholder } from "./tables.js";

let searchInput = null;
let orderBtn = null;
let filterBtn = null;
let filter = null;

let rowsNum = null;
let currentPageNum = null;
let totalPagesNum = null;

let startBtn = null;
let prevBtn = null;
let nextBtn = null;
let endBtn = null;

let detailOffcanvasElement = null;
let detailUserName = null;
let detailUserRole = null;
let detailAction = null;
let detailEntity = null;
let detailEntityId = null;
let detailEntityCode = null;
let detailIp = null;
let detailUserAgent = null;
let detailDate = null;

let column = "fecha_registro";
let order = "desc";
let page = 1;

const ACTIVITY_LIMIT = 20;
let activeSearch = "";
let activeActivityRequestId = 0;
let lastQueryKey = "";

const EMPTY_REFERENCE_TEXT = "Sin información";
const normalizeSearch = (value) => (value ?? "").trim();
const buildActivityQueryKey = (currentPage, limit, search) => `${currentPage}|${limit}|${search}|${column}|${order}`;

const getDisplayOrFallback = (value) => {
    const normalized = `${value ?? ""}`.trim();
    return normalized || EMPTY_REFERENCE_TEXT;
};

const formatDateTime = (value) => {
    if (!value) return EMPTY_REFERENCE_TEXT;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return getDisplayOrFallback(value);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const getAuditLogsEndpoint = () => currentSession.rol === "administrador" ? "audit-logs" : "audit-logs/me";

const setDetailField = (element, value) => {
    if (!element) return;
    element.value = getDisplayOrFallback(value);
};

const resetDetailFields = () => {
    setDetailField(detailUserName, "");
    setDetailField(detailUserRole, "");
    setDetailField(detailAction, "");
    setDetailField(detailEntity, "");
    setDetailField(detailEntityId, "");
    setDetailField(detailEntityCode, "");
    setDetailField(detailIp, "");
    setDetailField(detailUserAgent, "");
    setDetailField(detailDate, "");
};

const openDetailOffcanvas = () => {
    if (!detailOffcanvasElement || !window.bootstrap?.Offcanvas) return;
    const offcanvasInstance = window.bootstrap.Offcanvas.getOrCreateInstance(detailOffcanvasElement);
    offcanvasInstance.show();
};

const loadActivityDetail = async (activityId) => {
    if (!activityId) return;

    alertLoading("Cargando actividad", "Por favor, no cierre ni actualice el navegador mientras se cargan los cambios.");
    resetDetailFields();

    try {
        const response = await getApi(`audit-logs/${activityId}`, token);

        if (!response?.success || !response?.data) {
            alertMessage(response?.message ?? "No se pudo cargar el detalle", response?.error ?? "", "error", 5000);
            return;
        }

        const activityDetail = response.data;
        const requestMeta = activityDetail.request_meta ?? {};

        setDetailField(detailUserName, activityDetail.usuario_nombre);
        setDetailField(detailUserRole, activityDetail.usuario_rol);
        setDetailField(detailAction, activityDetail.accion);
        setDetailField(detailEntity, activityDetail.entidad);
        setDetailField(detailEntityId, activityDetail.entidad_id);
        setDetailField(detailEntityCode, activityDetail.entidad_codigo);
        setDetailField(detailIp, requestMeta.ip);
        setDetailField(detailUserAgent, requestMeta.user_agent);
        setDetailField(detailDate, formatDateTime(activityDetail.fecha_registro ?? activityDetail.createdAt));
        openDetailOffcanvas();
        alertToast("Actividad cargada correctamente", false, "success", "bottom-start");
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    }
};

const refreshActivity = ({ currentPage = page, search = activeSearch, force = false } = {}) => {
    page = currentPage;
    activeSearch = normalizeSearch(search);
    return getActivity(currentPage, ACTIVITY_LIMIT, activeSearch, force);
};

const actionsActivity = () => {
    const actionButtons = document.querySelectorAll(".dropdown-item[data-action='consult']");

    actionButtons.forEach((button) => {
        const tr = button.closest("tr");
        const activityId = tr?.dataset.activityId;

        button.addEventListener("click", async () => {
            await loadActivityDetail(activityId);
        });
    });
};

export const handleSearchInput = (event) => {
    const searchValue = normalizeSearch(searchInput.value);

    if (event.type === "input") {
        if (searchValue !== "") return;
        refreshActivity({ currentPage: 1, search: "" });
        return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== "NumpadEnter") return;

    refreshActivity({ currentPage: 1, search: searchValue });
};

export function readyActividad(searchBar) {
    searchInput = searchBar;

    orderBtn = document.getElementById("order");
    filterBtn = document.getElementById("filter");
    filter = document.querySelectorAll(".dropdown-item[data-filter]");

    rowsNum = document.getElementById("rowsNum");
    currentPageNum = document.getElementById("currentPageNum");
    totalPagesNum = document.getElementById("totalPagesNum");

    startBtn = document.getElementById("start");
    prevBtn = document.getElementById("prev");
    nextBtn = document.getElementById("next");
    endBtn = document.getElementById("end");

    detailOffcanvasElement = document.getElementById("offcanvasActivityDetail");
    detailUserName = document.getElementById("detailUserName");
    detailUserRole = document.getElementById("detailUserRole");
    detailAction = document.getElementById("detailAction");
    detailEntity = document.getElementById("detailEntity");
    detailEntityId = document.getElementById("detailEntityId");
    detailEntityCode = document.getElementById("detailEntityCode");
    detailIp = document.getElementById("detailIp");
    detailUserAgent = document.getElementById("detailUserAgent");
    detailDate = document.getElementById("detailDate");

    resetDetailFields();

    searchInput.onkeydown = handleSearchInput;
    searchInput.oninput = handleSearchInput;

    orderBtn.onclick = () => {
        order = order === "asc" ? "desc" : "asc";
        orderBtn.innerHTML = `<i class="bi ${order === "asc" ? "bi-arrow-up" : "bi-arrow-down"}"></i> ${order === "asc" ? "Ascendente" : "Descendente"}`;
        refreshActivity({ currentPage: 1, search: searchInput.value });
    };

    filter.forEach((button) => {
        button.onclick = () => {
            column = button.dataset.filter;
            filterBtn.innerHTML = `<i class="bi bi-filter"></i> ${button.textContent}`;
            refreshActivity({ currentPage: 1, search: searchInput.value });
        };
    });

    startBtn.onclick = () => {
        refreshActivity({ currentPage: 1, search: searchInput.value });
    };

    prevBtn.onclick = () => {
        const nextPage = page > 1 ? page - 1 : 1;
        refreshActivity({ currentPage: nextPage, search: searchInput.value });
    };

    nextBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        const nextPage = page < totalPages ? page + 1 : totalPages;
        refreshActivity({ currentPage: nextPage, search: searchInput.value });
    };

    endBtn.onclick = () => {
        const totalPages = Number(totalPagesNum.textContent) || 1;
        refreshActivity({ currentPage: totalPages, search: searchInput.value });
    };

    refreshActivity({ currentPage: 1, search: "", force: true });
}

export async function getActivity(currentPage = 1, limit = ACTIVITY_LIMIT, search = "", force = false) {
    const normalizedSearch = normalizeSearch(search);
    const queryKey = buildActivityQueryKey(currentPage, limit, normalizedSearch);

    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    const requestId = ++activeActivityRequestId;

    addPlaceholder();

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(limit),
            search: normalizedSearch,
            sortBy: column,
            sortOrder: order,
        });

        const response = await getApi(`${getAuditLogsEndpoint()}?${params.toString()}`, token);

        if (requestId !== activeActivityRequestId && !force) return;

        const list = response?.success ? (response.data ?? []) : [];
        const activityTable = document.getElementById("tbody");
        activityTable.innerHTML = "";

        list.forEach((activityResponse) => {
            const tr = document.createElement("tr");
            tr.dataset.activityId = activityResponse._id ?? "";
            tr.innerHTML = `
                <td>${getDisplayOrFallback(activityResponse.usuario_nombre)}</td>
                <td>${getDisplayOrFallback(activityResponse.accion)}</td>
                <td>${getDisplayOrFallback(activityResponse.entidad)}</td>
                <td>${getDisplayOrFallback(activityResponse.entidad_codigo)}</td>
                <td>${formatDateTime(activityResponse.fecha_registro ?? activityResponse.createdAt)}</td>
                <td class="text-center">
                    <button class="btn options" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <button class="dropdown-item" data-action="consult"><i class="bi bi-eye"></i> Ver detalle</button>
                        </li>
                    </ul>
                </td>
            `;

            activityTable.appendChild(tr);
        });

        if (!response?.success) {
            alertMessage(response?.message ?? "Error al obtener bitacoras", response?.error ?? "", "error", 5000);
        }

        const totalRegisters = Number(response?.pagination?.total ?? list.length);
        const totalPages = Number(response?.pagination?.totalPages ?? Math.max(1, Math.ceil(totalRegisters / limit)));
        page = Number(response?.pagination?.page ?? Math.min(Math.max(1, currentPage), totalPages));

        rowsNum.textContent = totalRegisters;
        currentPageNum.textContent = page;
        totalPagesNum.textContent = totalPages;

        startBtn.disabled = page === 1;
        prevBtn.disabled = page === 1;
        nextBtn.disabled = page >= totalPages;
        endBtn.disabled = page >= totalPages;

        actionsActivity();
    } catch (error) {
        console.error(error);
        alertMessage("Error de conexión", "No se pudo conectar con el servidor", "error", 5000);
    } finally {
        if (requestId === activeActivityRequestId || force) removePlaceholder();
    }
}




