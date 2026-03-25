import {alertMessage} from "./alerts.js";
import {getApi} from "./api.js";
import {token} from "./dashboard.js";

const COLORS = {
    primary: "#dd5746",
    secondary: "#ffe1c09f",
    success: "#65b741",
    danger: "#ff6868",
    warning: "#f5c45e",
    info: "#5aa9e6",
};

let financeChart = null;
let clientsChart = null;
let topSoldChart = null;
let topBoughtChart = null;
let activeRequestId = 0;

const formatCurrency = (value) => Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatInteger = (value) => Number(value || 0).toLocaleString("es-MX");

const formatRangeDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-MX", {year: "numeric", month: "2-digit", day: "2-digit"});
};

const formatPeriodLabel = (period, grouping) => {
    if (!period) return "-";

    if (grouping === "month") {
        const [year, month] = period.split("-");
        if (!year || !month) return period;
        return `${month}/${year}`;
    }

    const [year, month, day] = period.split("-");
    if (!year || !month || !day) return period;
    return `${day}/${month}`;
};

const toIsoStart = (dateValue) => `${dateValue}T00:00:00.000Z`;
const toIsoEnd = (dateValue) => `${dateValue}T23:59:59.999Z`;

const normalizeHomeResponse = (response) => {
    const payload = response?.data ?? {};

    return {
        rango: {
            desde: payload?.rango?.desde ?? null,
            hasta: payload?.rango?.hasta ?? null,
        },
        contadores: {
            ingresos_totales: Number(payload?.contadores?.ingresos_totales ?? 0),
            gastos_totales: Number(payload?.contadores?.gastos_totales ?? 0),
            balance: Number(payload?.contadores?.balance ?? 0),
            pedidos_totales: Number(payload?.contadores?.pedidos_totales ?? 0),
            compras_totales: Number(payload?.contadores?.compras_totales ?? 0),
            clientes_nuevos: Number(payload?.contadores?.clientes_nuevos ?? 0),
            ticket_promedio: Number(payload?.contadores?.ticket_promedio ?? 0),
        },
        agrupacion: payload?.agrupacion === "month" ? "month" : "day",
        serie: Array.isArray(payload?.serie) ? payload.serie : [],
        mas_vendidos: Array.isArray(payload?.mas_vendidos) ? payload.mas_vendidos : [],
        mas_comprados: Array.isArray(payload?.mas_comprados) ? payload.mas_comprados : [],
    };
};

const upsertChart = (instance, canvasId, config) => {
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx || !window.Chart) return null;

    if (instance) {
        if (instance.canvas !== ctx.canvas) {
            instance.destroy();
            return new window.Chart(ctx, config);
        }

        instance.data = config.data;
        instance.options = config.options;
        instance.update();
        return instance;
    }

    return new window.Chart(ctx, config);
};

const renderKpis = (contadores) => {
    document.getElementById("kpiIngresos").textContent = formatCurrency(contadores.ingresos_totales);
    document.getElementById("kpiGastos").textContent = formatCurrency(contadores.gastos_totales);
    document.getElementById("kpiBalance").textContent = formatCurrency(contadores.balance);
    document.getElementById("kpiPedidos").textContent = formatInteger(contadores.pedidos_totales);
    document.getElementById("kpiCompras").textContent = formatInteger(contadores.compras_totales);
    document.getElementById("kpiClientes").textContent = formatInteger(contadores.clientes_nuevos);
    document.getElementById("kpiTicket").textContent = formatCurrency(contadores.ticket_promedio);
};

const renderRange = (rango) => {
    document.getElementById("homeRange").textContent = `Rango actual: ${formatRangeDate(rango.desde)} - ${formatRangeDate(rango.hasta)}`;
};

const renderFinanceChart = (serie, agrupacion) => {
    const labels = serie.map((item) => formatPeriodLabel(item.periodo, agrupacion));

    financeChart = upsertChart(financeChart, "financeChart", {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Ingresos",
                    data: serie.map((item) => Number(item.ingresos || 0)),
                    borderColor: COLORS.success,
                    backgroundColor: COLORS.success,
                    tension: 0.3,
                },
                {
                    label: "Gastos",
                    data: serie.map((item) => Number(item.gastos || 0)),
                    borderColor: COLORS.danger,
                    backgroundColor: COLORS.danger,
                    tension: 0.3,
                },
                {
                    label: "Balance",
                    data: serie.map((item) => Number(item.balance || 0)),
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primary,
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {position: "bottom"},
            },
            scales: {
                y: {beginAtZero: true},
            },
        },
    });
};

const renderClientsChart = (serie, agrupacion) => {
    const labels = serie.map((item) => formatPeriodLabel(item.periodo, agrupacion));

    clientsChart = upsertChart(clientsChart, "clientsChart", {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Clientes nuevos",
                    data: serie.map((item) => Number(item.clientes_nuevos || 0)),
                    borderRadius: 10,
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.secondary,
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {position: "bottom"},
            },
            scales: {
                y: {beginAtZero: true},
            },
        },
    });
};

const mapTopItems = (items, valueKey) => {
    if (!items.length) {
        return {
            labels: ["Sin datos"],
            values: [0],
        };
    }

    return {
        labels: items.map((item) => item.nombre || item.codigo || "Sin nombre"),
        values: items.map((item) => Number(item[valueKey] || 0)),
    };
};

const renderTopCharts = (masVendidos, masComprados) => {
    const sold = mapTopItems(masVendidos, "cantidad");
    const bought = mapTopItems(masComprados, "cantidad");

    topSoldChart = upsertChart(topSoldChart, "topSoldChart", {
        type: "doughnut",
        data: {
            labels: sold.labels,
            datasets: [{
                label: "Cantidad vendida",
                data: sold.values,
                backgroundColor: [COLORS.primary, COLORS.warning, COLORS.info, COLORS.success, COLORS.danger],
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {position: "bottom"},
            },
        },
    });

    topBoughtChart = upsertChart(topBoughtChart, "topBoughtChart", {
        type: "doughnut",
        data: {
            labels: bought.labels,
            datasets: [{
                label: "Cantidad comprada",
                data: bought.values,
                backgroundColor: [COLORS.info, COLORS.warning, COLORS.primary, COLORS.success, COLORS.danger],
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {position: "bottom"},
            },
        },
    });
};

const buildQueryParams = ({from, to, grouping, limit}) => {
    const params = new URLSearchParams();

    params.set("desde", toIsoStart(from));
    params.set("hasta", toIsoEnd(to));
    params.set("startDate", toIsoStart(from));
    params.set("endDate", toIsoEnd(to));
    params.set("groupBy", grouping);
    params.set("agrupacion", grouping);
    params.set("limit", String(limit));

    return params;
};

const getFormValues = () => {
    const from = document.getElementById("homeFrom").value;
    const to = document.getElementById("homeTo").value;
    const grouping = document.getElementById("homeGroup").value || "day";
    const limit = Math.max(1, Number(document.getElementById("homeLimit").value || 31));

    return {from, to, grouping, limit};
};

const toggleLoadingState = (isLoading) => {
    const button = document.getElementById("homeApplyBtn");
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? '<i class="bi bi-hourglass-split"></i> Consultando...'
        : '<i class="bi bi-search"></i> Consultar';
};

const toggleEmptyState = (isEmpty) => {
    const emptyState = document.getElementById("homeEmptyState");
    if (!emptyState) return;
    emptyState.classList.toggle("visually-hidden", !isEmpty);
};

const fetchHomeDashboard = async () => {
    const values = getFormValues();
    const {from, to, grouping, limit} = values;

    if (!from || !to) {
        alertMessage("Rango invalido", "Debes seleccionar fecha inicial y final.", "warning", 3500);
        return;
    }

    if (from > to) {
        alertMessage("Rango invalido", "La fecha inicial no puede ser mayor a la final.", "warning", 3500);
        return;
    }

    const requestId = ++activeRequestId;
    toggleLoadingState(true);

    try {
        const params = buildQueryParams({from, to, grouping, limit});
        const response = await getApi(`reports/dashboard?${params.toString()}`, token);

        if (requestId !== activeRequestId) return;

        if (!response?.success) {
            toggleEmptyState(true);
            renderKpis(normalizeHomeResponse(null).contadores);
            renderRange({desde: null, hasta: null});
            alertMessage(response?.message ?? "No se pudo obtener el reporte", response?.error ?? "", "error", 4000);
            return;
        }

        const normalized = normalizeHomeResponse(response);
        renderKpis(normalized.contadores);
        renderRange(normalized.rango);
        renderFinanceChart(normalized.serie, normalized.agrupacion);
        renderClientsChart(normalized.serie, normalized.agrupacion);
        renderTopCharts(normalized.mas_vendidos, normalized.mas_comprados);
        toggleEmptyState(!normalized.serie.length);
    } catch (error) {
        console.error(error);
        toggleEmptyState(true);
        alertMessage("Error de conexion", "No se pudo conectar con el servidor", "error", 4000);
    } finally {
        if (requestId === activeRequestId) toggleLoadingState(false);
    }
};

const getTodayDate = () => {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

const getMonthStartDate = () => {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-01`;
};

const setDefaultDates = () => {
    const fromInput = document.getElementById("homeFrom");
    const toInput = document.getElementById("homeTo");

    if (!fromInput.value) fromInput.value = getMonthStartDate();
    if (!toInput.value) toInput.value = getTodayDate();
};

export const readyHome = () => {
    const applyButton = document.getElementById("homeApplyBtn");
    if (!applyButton) return;

    setDefaultDates();

    applyButton.onclick = async () => {
        await fetchHomeDashboard();
    };

    fetchHomeDashboard();
};
