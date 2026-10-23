import { supabase } from "./supabase.js";

/* =========================================================
   VARIABLES GLOBALES Y ELEMENTOS DEL DOM
========================================================= */
let serviceReservations = [];

const getTableBody = () => 
    document.getElementById("reservationsTableBody") || document.getElementById("reservationsTable");

/* =========================================================
   CARGAR RESERVAS DESDE SUPABASE
========================================================= */
export async function loadReservations() {
    const tableBody = getTableBody();

    if (!tableBody) {
        console.warn("No se encontró la tabla de reservas en el HTML.");
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" style="text-align: center; color: #8a97ab; padding: 20px;">
                Cargando reservas...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await supabase
            .from("reservas_servicio")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error cargando reservas:", error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: #ff6b6b; padding: 20px;">
                        No se pudieron cargar las reservas.
                    </td>
                </tr>
            `;
            return;
        }

        serviceReservations = data || [];
        renderServiceReservations();

    } catch (err) {
        console.error("Error inesperado en reservas:", err);
    }
}

/* =========================================================
   MOSTRAR Y FILTRAR RESERVAS
========================================================= */
function renderServiceReservations() {
    const tableBody = getTableBody();
    if (!tableBody) return;

    const searchInput = document.getElementById("reservationSearch");
    const statusFilter = document.getElementById("reservationStatusFilter");

    const search = (searchInput?.value || "").trim().toLowerCase();
    const selectedStatus = statusFilter?.value || "";

    const filteredReservations = serviceReservations.filter(reservation => {
        if (reservation.estado === "cancelado") return false;

        const searchableText = [
            reservation.codigo,
            reservation.cliente_nombre,
            reservation.cliente_telefono,
            reservation.equipo,
            reservation.servicio
        ].map(val => String(val || "").toLowerCase()).join(" ");

        const matchesSearch = searchableText.includes(search);
        const matchesStatus = !selectedStatus || reservation.estado === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (!filteredReservations.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-table" style="text-align: center; color: #8a97ab; padding: 20px;">
                    No se encontraron reservas con esos criterios.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredReservations.map(reservation => {
        const date = reservation.fecha_preferida
            ? new Date(reservation.fecha_preferida + "T00:00:00").toLocaleDateString("es-PE")
            : "—";

        const time = reservation.hora_preferida
            ? reservation.hora_preferida.slice(0, 5)
            : "—";

        const estado = reservation.estado || "pendiente";

        return `
            <tr>
                <td><strong>${reservation.codigo || "—"}</strong></td>
                <td>${reservation.cliente_nombre || "—"}</td>
                <td>${reservation.cliente_telefono || "—"}</td>
                <td>${reservation.equipo || "—"}</td>
                <td>${reservation.servicio || "—"}</td>
                <td>${date}</td>
                <td>${time}</td>
                <td>
                    <select
                        class="reservation-status-select"
                        data-id="${reservation.id}"
                        data-estado="${estado}"
                        style="background: #111827; color: #fff; border: 1px solid #374151; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem;"
                    >
                        <option value="pendiente" ${estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="en_proceso" ${estado === "en_proceso" ? "selected" : ""}>En proceso</option>
                        <option value="completado" ${estado === "completado" ? "selected" : ""}>Completado</option>
                        <option value="cancelado" ${estado === "cancelado" ? "selected" : ""}>Cancelado</option>
                    </select>
                </td>
                <td class="reservation-actions">
                    <button
                        type="button"
                        class="view-reservation-btn"
                        data-id="${reservation.id}"
                        style="background: rgba(0, 212, 255, 0.15); color: #00d4ff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;"
                    >
                        Ver detalles
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   ACTUALIZAR ESTADO DE LA RESERVA
========================================================= */
document.addEventListener("change", async (event) => {
    const selector = event.target.closest(".reservation-status-select");
    if (!selector) return;

    const reservaId = selector.dataset.id;
    const estadoAnterior = selector.dataset.estado;
    const nuevoEstado = selector.value;

    if (nuevoEstado === estadoAnterior) return;

    selector.disabled = true;

    try {
        const { error } = await supabase
            .from("reservas_servicio")
            .update({ estado: nuevoEstado })
            .eq("id", reservaId);

        if (error) {
            console.error("Error actualizando reserva:", error);
            alert("No se pudo actualizar el estado de la reserva.");
            selector.value = estadoAnterior;
            return;
        }

        selector.dataset.estado = nuevoEstado;
        const res = serviceReservations.find(r => String(r.id) === String(reservaId));
        if (res) res.estado = nuevoEstado;

        alert("Estado actualizado correctamente.");
    } catch (err) {
        console.error("Error inesperado:", err);
        selector.value = estadoAnterior;
    } finally {
        selector.disabled = false;
    }
});

/* =========================================================
   EVENTOS DE BÚSQUEDA Y FILTROS
========================================================= */
const searchInput = document.getElementById("reservationSearch");
const statusFilter = document.getElementById("reservationStatusFilter");
const resetBtn = document.getElementById("resetReservationFilters");

if (searchInput) searchInput.addEventListener("input", renderServiceReservations);
if (statusFilter) statusFilter.addEventListener("change", renderServiceReservations);

if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "";
        renderServiceReservations();
    });
}

/* =========================================================
   MODAL VER DETALLES
========================================================= */
const reservationDetailsModal = document.getElementById("reservationDetailsModal");
const reservationDetailsBody = document.getElementById("reservationDetailsBody");
const closeReservationDetails = document.getElementById("closeReservationDetails");

document.addEventListener("click", (event) => {
    const button = event.target.closest(".view-reservation-btn");
    if (!button) return;

    const reservationId = button.dataset.id;
    const reservation = serviceReservations.find(item => String(item.id) === String(reservationId));

    if (!reservation || !reservationDetailsModal || !reservationDetailsBody) return;

    const details = [
        ["Código", reservation.codigo],
        ["Cliente", reservation.cliente_nombre],
        ["Teléfono", reservation.cliente_telefono],
        ["Equipo", reservation.equipo],
        ["Servicio", reservation.servicio],
        ["Descripción del problema", reservation.descripcion]
    ];

    reservationDetailsBody.innerHTML = details.map(([label, value]) => `
        <div class="reservation-detail-item" style="margin-bottom: 10px;">
            <strong style="color: #8a97ab; font-size: 0.85rem; display: block;">${label}</strong>
            <p style="color: #fff; margin: 2px 0 0 0;">${value || "No especificado"}</p>
        </div>
    `).join("");

    reservationDetailsModal.hidden = false;
});

if (closeReservationDetails) {
    closeReservationDetails.addEventListener("click", () => {
        if (reservationDetailsModal) reservationDetailsModal.hidden = true;
    });
}

// Carga inicial
loadReservations();