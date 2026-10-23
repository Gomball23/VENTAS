import { supabase } from "./supabase.js";

/* =========================================================
   WIDGETS VISUALES DEL DASHBOARD
   (no modifica dashboard.js: solo lee datos y dibuja)
========================================================= */

const $ = id => document.getElementById(id);

const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);

const STATUS_LABELS = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    completado: "Completado",
    cancelado: "Cancelado"
};

let widgetProducts = [];
let widgetReservations = [];


/* =========================================================
   DATOS
========================================================= */

async function fetchWidgetData() {

    const [productsResult, reservationsResult] = await Promise.all([
        supabase.from("productos").select("*"),
        supabase
            .from("reservas_servicio")
            .select("*")
            .order("created_at", { ascending: false })
    ]);

    if (!productsResult.error) {
        widgetProducts = productsResult.data || [];
    }

    if (!reservationsResult.error) {
        widgetReservations = reservationsResult.data || [];
    }

    renderWidgets();
}


/* =========================================================
   GRÁFICO: RESERVAS EN LOS ÚLTIMOS 30 DÍAS
========================================================= */

const DAYS = 30;

function pad(n) {
    return String(n).padStart(2, "0");
}

function dayKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildSeries() {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const series = [];
    const index = {};

    for (let i = DAYS - 1; i >= 0; i--) {

        const date = new Date(today);
        date.setDate(today.getDate() - i);

        index[dayKey(date)] = series.length;

        series.push({ date, value: 0 });
    }

    widgetReservations.forEach(reservation => {

        if (!reservation.created_at) return;

        const key = dayKey(new Date(reservation.created_at));

        if (key in index) {
            series[index[key]].value++;
        }
    });

    return series;
}

function niceStep(value) {

    if (value <= 1) return 1;

    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / power;

    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;

    return nice * power;
}

function smoothPath(points, minY, maxY) {

    if (points.length < 2) return "";

    const clamp = y => Math.min(maxY, Math.max(minY, y));

    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {

        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = clamp(p2.y - (p3.y - p1.y) / 6);

        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    return d;
}

function renderChart() {

    const box = $("reservationsChart");

    if (!box) return;

    const series = buildSeries();

    const total = series.reduce((sum, item) => sum + item.value, 0);
    const maxValue = Math.max(...series.map(item => item.value));

    const meta = $("chartMeta");

    if (meta) {
        meta.textContent = `Últimos ${DAYS} días · ${total} reserva${total === 1 ? "" : "s"}`;
    }

    const step = niceStep(Math.ceil(maxValue / 4));
    const yMax = step * 4;

    const W = 900;
    const H = 280;
    const padL = 44;
    const padR = 20;
    const padT = 20;
    const padB = 34;

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const baseY = padT + innerH;

    const points = series.map((item, i) => ({
        x: padL + (i * innerW) / (series.length - 1),
        y: padT + (1 - item.value / yMax) * innerH,
        value: item.value
    }));

    const line = smoothPath(points, padT, baseY);

    const area =
        `${line} L${points[points.length - 1].x.toFixed(1)},${baseY} ` +
        `L${points[0].x.toFixed(1)},${baseY} Z`;

    /* Líneas guía y etiquetas del eje Y */

    let grid = "";

    for (let i = 0; i <= 4; i++) {

        const y = padT + innerH - (i * innerH) / 4;

        grid += `
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
                  stroke="rgba(255,255,255,.07)" stroke-dasharray="4 5"/>
            <text x="${padL - 10}" y="${y + 4}" text-anchor="end"
                  fill="#8a97ab" font-size="11">${i * step}</text>
        `;
    }

    /* Etiquetas del eje X */

    let labels = "";

    [0, 7, 14, 21, DAYS - 1].forEach(i => {

        const text = series[i].date.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short"
        });

        labels += `
            <text x="${points[i].x}" y="${H - 10}"
                  text-anchor="${i === 0 ? "start" : i === DAYS - 1 ? "end" : "middle"}"
                  fill="#8a97ab" font-size="11">${esc(text)}</text>
        `;
    });

    /* Puntos: máximos locales con valor y el último día */

    let dots = "";

    points.forEach((point, i) => {

        const prev = points[i - 1];
        const next = points[i + 1];

        const isPeak =
            point.value > 0 &&
            (!prev || point.value >= prev.value) &&
            (!next || point.value >= next.value);

        if (isPeak) {
            dots += `
                <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5"
                        fill="#0e1422" stroke="#22e5d8" stroke-width="2"/>
            `;
        }
    });

    box.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" role="img"
             aria-label="Reservas de servicio de los últimos ${DAYS} días">

            <defs>
                <linearGradient id="rcLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#a855f7"/>
                    <stop offset="100%" stop-color="#22e5d8"/>
                </linearGradient>

                <linearGradient id="rcArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#a855f7" stop-opacity=".55"/>
                    <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
                </linearGradient>

                <filter id="rcGlow" x="-10%" y="-30%" width="120%" height="160%">
                    <feGaussianBlur stdDeviation="4"/>
                </filter>
            </defs>

            ${grid}

            <path d="${area}" fill="url(#rcArea)"/>

            <path d="${line}" fill="none" stroke="url(#rcLine)"
                  stroke-width="5" opacity=".55" filter="url(#rcGlow)"/>

            <path d="${line}" fill="none" stroke="url(#rcLine)"
                  stroke-width="2.5" stroke-linecap="round"/>

            ${dots}
            ${labels}
        </svg>
    `;
}


/* =========================================================
   WIDGET: PRODUCTOS CON MÁS STOCK
========================================================= */
export function renderTopStockWidget(products) {
    const container = document.getElementById("topStockList") || document.querySelector("#topStockWidget");
    if (!container) return;

    if (!products || !products.length) {
        container.innerHTML = `<p class="empty-text">No hay productos registrados.</p>`;
        return;
    }

    // Ordenar por stock de mayor a menor y tomar los primeros 5
    const topProducts = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5);

    container.innerHTML = topProducts.map(p => {
        // Detectar si 'imagen' es una URL o un emoji
        const imageHTML = (p.imagen && p.imagen.startsWith("http"))
            ? `<img src="${p.imagen}" alt="${p.nombre}" style="width: 38px; height: 38px; object-fit: contain; background: #ffffff; border-radius: 8px; padding: 2px; flex-shrink: 0;">`
            : `<span class="product-icon" style="font-size: 1.5rem; flex-shrink: 0;">${p.imagen || "📦"}</span>`;

        return `
            <div class="top-stock-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; max-width: 65%;">
                    ${imageHTML}
                    <div style="overflow: hidden;">
                        <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${p.nombre}</div>
                        <small style="color: #8a97ab; font-size: 0.8rem;">${p.categoria || "Sin categoría"}</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px; flex-shrink: 0;">
                    <span style="background: rgba(0, 212, 255, 0.1); color: #00d4ff; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">
                        ${p.stock}
                    </span>
                    <strong style="color: #fff; font-size: 0.95rem;">S/ ${Number(p.precio).toFixed(2)}</strong>
                </div>
            </div>
        `;
    }).join("");
}


/* =========================================================
   RESERVAS RECIENTES
========================================================= */

function timeAgo(iso) {

    if (!iso) return "—";

    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) return "ahora";
    if (minutes < 60) return `hace ${minutes}m`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `hace ${hours}h`;

    return `hace ${Math.floor(hours / 24)}d`;
}

function renderRecentReservations() {

    const container = $("recentReservationsList");

    if (!container) return;

    const list = widgetReservations.slice(0, 5);

    if (!list.length) {
        container.innerHTML =
            `<p class="panel-empty">Aún no hay reservas.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="mini-row mini-head reservations-row">
            <span>Código</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Registro</span>
        </div>
    ` + list.map(reservation => {

        const estado = reservation.estado || "pendiente";

        return `
            <div class="mini-row reservations-row">
                <strong>${esc(reservation.codigo || "—")}</strong>
                <span>${esc(reservation.cliente_nombre || "—")}</span>
                <span class="reservation-status ${esc(estado)}">
                    ${esc(STATUS_LABELS[estado] || estado)}
                </span>
                <span class="mini-muted">${esc(timeAgo(reservation.created_at))}</span>
            </div>
        `;
    }).join("");
}


/* =========================================================
   RENDER GENERAL
========================================================= */

function renderWidgets() {
    renderChart();
    renderTopProducts();
    renderRecentReservations();
}


/* =========================================================
   ACTUALIZAR CUANDO dashboard.js CAMBIA LOS DATOS
========================================================= */

let refreshTimer;

function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(fetchWidgetData, 400);
}

const observer = new MutationObserver(scheduleRefresh);

[
    "productsTable",
    "reservationsTableBody",
    "reservationTotal",
    "reservationPending",
    "reservationInProgress",
    "reservationCompleted",
    "reservationCancelled"
].forEach(id => {

    const element = $(id);

    if (element) {
        observer.observe(element, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
});

fetchWidgetData();