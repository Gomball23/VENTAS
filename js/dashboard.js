import { supabase } from "./supabase.js";

/* =========================================================
   SESIÓN
========================================================= */
const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    window.location.href = "login.html";
}

/* =========================================================
   VARIABLES GLOBALES
========================================================= */
const productsTable = document.getElementById("productsTable");
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const modalTitle = document.getElementById("modalTitle");

const servicesTable = document.getElementById("servicesTable");
const serviceModal = document.getElementById("serviceModal");
const serviceForm = document.getElementById("serviceForm");
const serviceModalTitle = document.getElementById("serviceModalTitle");

let products = [];
let services = [];
let brands = [];
let serviceReservations = [];
let categoriesList = [];
let subcategoriesList = [];

/* =========================================================
   NAVEGACIÓN GLOBAL DE PESTAÑAS (Unificada)
========================================================= */
function showDashboardSection(sectionId, activeTabId) {
    const sections = [
        document.getElementById("productsSection"),
        document.getElementById("servicesSection"),
        document.getElementById("brandsSection"),
        document.getElementById("reservationsSection")
    ];

    sections.forEach(sec => {
        if (sec) sec.style.display = "none";
    });

    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(tab => tab.classList.remove("active"));

    const targetSection = document.getElementById(sectionId);
    const activeTab = document.getElementById(activeTabId) || document.querySelector(`button[href="#${sectionId}"]`);

    if (targetSection) targetSection.style.display = "block";
    if (activeTab) activeTab.classList.add("active");
}

const productsTabEl = document.getElementById("productsTab");
if (productsTabEl) {
    productsTabEl.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardSection("productsSection", "productsTab");
        loadProducts();
    });
}

const servicesTabEl = document.getElementById("servicesTab");
if (servicesTabEl) {
    servicesTabEl.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardSection("servicesSection", "servicesTab");
        loadServices();
    });
}

const brandsTabEl = document.getElementById("brandsTab");
if (brandsTabEl) {
    brandsTabEl.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardSection("brandsSection", "brandsTab");
        if (typeof loadBrands === "function") loadBrands();
    });
}

const reservationsTabEl = document.getElementById("reservationsTab") || document.querySelector('button[href="#reservationsSection"]');
if (reservationsTabEl) {
    reservationsTabEl.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardSection("reservationsSection", reservationsTabEl.id || "reservationsTab");
        loadServiceReservations();
    });
}

/* =========================================================
   PRODUCTOS
========================================================= */
async function loadProducts() {
    const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los productos.");
        return;
    }

    products = data || [];
    renderProducts();
    updateProductStatistics();
}

function renderProducts(list = products) {
    const tableContainer = document.getElementById("productsTable") || productsTable;
    if (!tableContainer) return;

    tableContainer.innerHTML = "";

    if (!list.length) {
        tableContainer.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    No hay productos registrados.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(product => {
        const row = document.createElement("tr");
        const promotion = product.promocion && product.precio_promocion;

        const imageElement = (product.imagen && product.imagen.startsWith("http"))
            ? `<img src="${product.imagen}" alt="${product.nombre}" style="width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 8px; flex-shrink: 0;">`
            : `<span class="product-icon">${product.imagen || "📦"}</span>`;

        row.innerHTML = `
            <td>
                <div class="product-name" style="display: flex; align-items: center; gap: 12px;">
                    ${imageElement}
                    <div>
                        <strong>${product.nombre}</strong>
                        <small style="display: block; color: #8a97ab;">
                            ${product.marca ? `Marca: ${product.marca}` : (product.descripcion || "")}
                        </small>
                    </div>
                </div>
            </td>
            <td>
                <div><strong>${product.categoria || "—"}</strong></div>
                ${product.subcategoria ? `<small style="color: #8a97ab;">${product.subcategoria}</small>` : ''}
            </td>
            <td>
                ${promotion
                    ? `<div class="price-promotion"><span>S/ ${Number(product.precio).toFixed(2)}</span><strong>S/ ${Number(product.precio_promocion).toFixed(2)}</strong></div>`
                    : `S/ ${Number(product.precio).toFixed(2)}`}
            </td>
            <td><span class="stock ${product.stock <= 5 ? "low-stock" : ""}">${product.stock}</span></td>
            <td>${product.promocion ? `<span class="badge promotion">🔥 Activa</span>` : `<span class="badge">Sin promoción</span>`}</td>
            <td>${product.activo ? `<span class="badge active">● Activo</span>` : `<span class="badge inactive">● Oculto</span>`}</td>
            <td>
                <div class="actions">
                    <button class="edit-button" onclick="editProduct(${product.id})">✏️</button>
                    <button class="delete-button" onclick="deleteProduct(${product.id})">🗑️</button>
                </div>
            </td>
        `;

        tableContainer.appendChild(row);
    });
}

function updateProductStatistics() {
    const pCount = document.getElementById("productCount");
    const aCount = document.getElementById("activeCount");
    const lCount = document.getElementById("lowStockCount");
    const prCount = document.getElementById("promotionCount");

    if (pCount) pCount.textContent = products.length;
    if (aCount) aCount.textContent = products.filter(p => p.activo).length;
    if (lCount) lCount.textContent = products.filter(p => p.stock <= 5).length;
    if (prCount) prCount.textContent = products.filter(p => p.promocion).length;
}

function resetProductForm() {
    if (productForm) productForm.reset();

    const productId = document.getElementById("productId");
    if (productId) productId.value = "";

    const existingImage = document.getElementById("productExistingImage");
    if (existingImage) existingImage.value = "";

    const fileInput = document.getElementById("productImageFile");
    if (fileInput) fileInput.value = "";

    const preview = document.getElementById("productImagePreview");
    if (preview) preview.innerHTML = "";

    const catSelect = document.getElementById("productCategory");
    if (catSelect) catSelect.value = "";

    const subSelect = document.getElementById("productSubcategory");
    if (subSelect) subSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';

    const brandSelect = document.getElementById("productBrand");
    if (brandSelect) brandSelect.value = "";

    const promoCheck = document.getElementById("productPromotion");
    if (promoCheck) promoCheck.checked = false;

    const promoPrice = document.getElementById("promotionPrice");
    if (promoPrice) promoPrice.value = "";

    const activeCheck = document.getElementById("productActive");
    if (activeCheck) activeCheck.checked = true;
}

function closeProductModal() {
    if (productModal) productModal.classList.remove("open");
    resetProductForm();
}

const newProductBtn = document.getElementById("newProductButton");
if (newProductBtn) {
    newProductBtn.addEventListener("click", () => {
        resetProductForm();
        if (modalTitle) modalTitle.textContent = "Nuevo producto";
        if (productModal) productModal.classList.add("open");
    });
}

const closeModalBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelButton");

if (closeModalBtn) closeModalBtn.addEventListener("click", closeProductModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeProductModal);

if (productModal) {
    productModal.addEventListener("click", (e) => {
        if (e.target === productModal) closeProductModal();
    });
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && productModal && productModal.classList.contains("open")) {
        closeProductModal();
    }
});

if (productForm) {
    productForm.addEventListener("submit", async event => {
        event.preventDefault();

        const saveBtn = productForm.querySelector('button[type="submit"]');
        const originalBtnText = saveBtn ? saveBtn.textContent : "Guardar";
        
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Guardando...";
        }

        try {
            const id = document.getElementById("productId").value;
            const fileInput = document.getElementById("productImageFile");
            const file = fileInput ? fileInput.files[0] : null;
            let imageUrl = document.getElementById("productExistingImage") 
                ? document.getElementById("productExistingImage").value 
                : null;

            if (file) {
                if (saveBtn) saveBtn.textContent = "Subiendo imagen...";
                const fileExt = file.name.split(".").pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(fileName, file);

                if (uploadError) {
                    console.error("Error al subir la imagen:", uploadError);
                    alert("No se pudo subir la imagen del producto. Verifica los permisos del bucket.");
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(fileName);

                imageUrl = publicUrlData.publicUrl;
            }

            const productData = {
                nombre: document.getElementById("productName").value.trim(),
                descripcion: document.getElementById("productDescription").value.trim(),
                precio: Number(document.getElementById("productPrice").value),
                stock: Number(document.getElementById("productStock").value),
                categoria: document.getElementById("productCategory").value,
                subcategoria: document.getElementById("productSubcategory").value || null,
                marca: document.getElementById("productBrand").value || null,
                imagen: imageUrl,
                promocion: document.getElementById("productPromotion").checked,
                precio_promocion: document.getElementById("promotionPrice").value
                    ? Number(document.getElementById("promotionPrice").value)
                    : null,
                activo: document.getElementById("productActive").checked,
                updated_at: new Date().toISOString()
            };

            let result;

            if (id) {
                result = await supabase
                    .from("productos")
                    .update(productData)
                    .eq("id", id);
            } else {
                result = await supabase
                    .from("productos")
                    .insert([productData]);
            }

            if (result.error) {
                console.error(result.error);
                alert("Error al guardar el producto.");
                return;
            }

            closeProductModal();
            await loadProducts();
            alert(id ? "Producto actualizado." : "Producto creado.");

        } catch (error) {
            console.error("Error inesperado:", error);
            alert("Ocurrió un error al procesar el producto.");
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalBtnText;
            }
        }
    });
}

window.editProduct = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.nombre || "";
    document.getElementById("productDescription").value = product.descripcion || "";
    document.getElementById("productPrice").value = product.precio || 0;
    document.getElementById("productStock").value = product.stock || 0;
    
    const catSelect = document.getElementById("productCategory");
    if (catSelect) {
        catSelect.value = product.categoria || "";
        const selectedOpt = catSelect.options[catSelect.selectedIndex];
        const catId = selectedOpt ? selectedOpt.dataset.id : null;
        if (typeof populateSubcategorySelect === "function") {
            populateSubcategorySelect(catId, product.subcategoria || "");
        }
    }

    const brandSelect = document.getElementById("productBrand");
    if (brandSelect) brandSelect.value = product.marca || "";

    document.getElementById("productExistingImage").value = product.imagen || "";
    const fileInput = document.getElementById("productImageFile");
    if (fileInput) fileInput.value = "";

    const preview = document.getElementById("productImagePreview");
    if (preview) {
        if (product.imagen && product.imagen.startsWith("http")) {
            preview.innerHTML = `
                <small style="display:block; color:#8a97ab; margin-bottom:4px;">Imagen actual:</small>
                <img src="${product.imagen}" alt="Vista previa" style="max-height: 80px; object-fit: contain; background: #1a2234; padding: 4px; border-radius: 6px;">
            `;
        } else {
            preview.innerHTML = "";
        }
    }

    document.getElementById("productPromotion").checked = product.promocion || false;
    document.getElementById("promotionPrice").value = product.precio_promocion || "";
    const promotionGroup = document.getElementById("promotionPriceGroup");
    if (promotionGroup) promotionGroup.style.display = product.promocion ? "block" : "none";
    
    document.getElementById("productActive").checked = product.activo;

    const productModal = document.getElementById("productModal");
    if (productModal) productModal.classList.add("open");
};

window.deleteProduct = async function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const confirmDelete = confirm(`¿Deseas eliminar "${product.nombre}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("No se pudo eliminar el producto.");
        return;
    }

    await loadProducts();
    alert("Producto eliminado correctamente.");
};

document.getElementById("searchProducts")?.addEventListener("input", event => {
    const search = event.target.value.toLowerCase().trim();
    const filtered = products.filter(product =>
        product.nombre.toLowerCase().includes(search) ||
        (product.categoria && product.categoria.toLowerCase().includes(search))
    );
    renderProducts(filtered);
});

/* =========================================================
   SERVICIOS
========================================================= */
async function loadServices() {
    const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error(error);
        alert("No se pudieron cargar los servicios.");
        return;
    }

    services = data || [];
    renderServices();
    updateServiceStatistics();
}

function renderServices(list = services) {
    const tableContainer = document.getElementById("servicesTable") || servicesTable;
    if (!tableContainer) return;

    tableContainer.innerHTML = "";

    if (!list.length) {
        tableContainer.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    No hay servicios registrados.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(service => {
        const row = document.createElement("tr");
        const promotion = service.promocion && service.precio_promocion;

        row.innerHTML = `
            <td>
                <div class="product-name">
                    <span class="product-icon">${service.imagen || "🔧"}</span>
                    <div>
                        <strong>${service.nombre}</strong>
                        <small>${service.descripcion || ""}</small>
                    </div>
                </div>
            </td>
            <td>
                ${promotion ? `<div class="price-promotion"><span>S/ ${Number(service.precio).toFixed(2)}</span><strong>S/ ${Number(service.precio_promocion).toFixed(2)}</strong></div>` : `S/ ${Number(service.precio).toFixed(2)}`}
            </td>
            <td>${service.promocion ? `<span class="badge promotion">🔥 Activa</span>` : `<span class="badge">Sin promoción</span>`}</td>
            <td>${service.activo ? `<span class="badge active">● Activo</span>` : `<span class="badge inactive">● Oculto</span>`}</td>
            <td>
                <div class="actions">
                    <button class="edit-button" onclick="editService(${service.id})">✏️</button>
                    <button class="delete-button" onclick="deleteService(${service.id})">🗑️</button>
                </div>
            </td>
        `;
        tableContainer.appendChild(row);
    });
}

function updateServiceStatistics() {
    const sCount = document.getElementById("serviceCount");
    const aSCount = document.getElementById("activeServiceCount");
    const sPCount = document.getElementById("servicePromotionCount");
    const sAvgPrice = document.getElementById("serviceAveragePrice");

    if (sCount) sCount.textContent = services.length;
    if (aSCount) aSCount.textContent = services.filter(s => s.activo).length;
    if (sPCount) sPCount.textContent = services.filter(s => s.promocion).length;

    const average = services.length
        ? services.reduce((sum, s) => sum + Number(s.precio), 0) / services.length
        : 0;

    if (sAvgPrice) sAvgPrice.textContent = `S/ ${average.toFixed(2)}`;
}

document.getElementById("newServiceButton")?.addEventListener("click", () => {
    if (serviceForm) serviceForm.reset();
    const sId = document.getElementById("serviceId");
    if (sId) sId.value = "";

    const sActive = document.getElementById("serviceActive");
    if (sActive) sActive.checked = true;

    if (serviceModalTitle) serviceModalTitle.textContent = "Nuevo servicio";
    if (serviceModal) serviceModal.classList.add("open");
});

function closeServiceModal() {
    if (serviceModal) serviceModal.classList.remove("open");
}

document.getElementById("closeServiceModal")?.addEventListener("click", closeServiceModal);
document.getElementById("cancelServiceButton")?.addEventListener("click", closeServiceModal);

if (serviceForm) {
    serviceForm.addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("serviceId").value;
        const serviceData = {
            nombre: document.getElementById("serviceName").value.trim(),
            descripcion: document.getElementById("serviceDescription").value.trim(),
            precio: Number(document.getElementById("servicePrice").value),
            promocion: document.getElementById("servicePromotion").checked,
            precio_promocion: document.getElementById("servicePromotionPrice").value
                ? Number(document.getElementById("servicePromotionPrice").value)
                : null,
            imagen: document.getElementById("serviceImage").value.trim(),
            activo: document.getElementById("serviceActive").checked,
            updated_at: new Date().toISOString()
        };

        let result = id
            ? await supabase.from("servicios").update(serviceData).eq("id", id)
            : await supabase.from("servicios").insert([serviceData]);

        if (result.error) {
            console.error(result.error);
            alert("Error al guardar el servicio.");
            return;
        }

        closeServiceModal();
        await loadServices();
        alert(id ? "Servicio actualizado." : "Servicio creado.");
    });
}

window.editService = function(id) {
    const service = services.find(s => s.id === id);
    if (!service) return;

    document.getElementById("serviceId").value = service.id;
    document.getElementById("serviceName").value = service.nombre || "";
    document.getElementById("serviceDescription").value = service.descripcion || "";
    document.getElementById("servicePrice").value = service.precio;
    document.getElementById("serviceImage").value = service.imagen || "";
    document.getElementById("servicePromotion").checked = service.promocion;
    document.getElementById("servicePromotionPrice").value = service.precio_promocion || "";
    document.getElementById("serviceActive").checked = service.activo;

    if (serviceModalTitle) serviceModalTitle.textContent = "Editar servicio";
    if (serviceModal) serviceModal.classList.add("open");
};

window.deleteService = async function(id) {
    const service = services.find(s => s.id === id);
    if (!service) return;

    const confirmDelete = confirm(`¿Deseas eliminar "${service.nombre}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("servicios").delete().eq("id", id);
    if (error) {
        console.error(error);
        alert("No se pudo eliminar el servicio.");
        return;
    }

    await loadServices();
    alert("Servicio eliminado correctamente.");
};

document.getElementById("searchServices")?.addEventListener("input", event => {
    const search = event.target.value.toLowerCase().trim();
    const filtered = services.filter(service =>
        service.nombre.toLowerCase().includes(search) ||
        (service.descripcion || "").toLowerCase().includes(search)
    );
    renderServices(filtered);
});

/* =========================================================
   RESERVAS DE SERVICIO
========================================================= */
async function loadServiceReservations() {
    const tableBody = document.getElementById("reservationsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="reservations-loading">
                Cargando reservas...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("reservas_servicio")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error cargando reservas:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="reservations-error">
                    No se pudieron cargar las reservas.
                </td>
            </tr>
        `;
        return;
    }

    serviceReservations = data || [];
    renderServiceReservations();
}

function renderServiceReservations() {
    const tableBody = document.getElementById("reservationsTableBody");
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
            reservation.cliente_telefono
        ].map(value => String(value || "").toLowerCase()).join(" ");

        const matchesSearch = searchableText.includes(search);
        const matchesStatus = !selectedStatus || reservation.estado === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (!filteredReservations.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="reservations-empty">
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
                        aria-label="Estado de la reserva ${reservation.codigo || reservation.id}"
                    >
                        <option value="pendiente" ${estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="en_proceso" ${estado === "en_proceso" ? "selected" : ""}>En proceso</option>
                        <option value="completado" ${estado === "completado" ? "selected" : ""}>Completado</option>
                        <option value="cancelado" ${estado === "cancelado" ? "selected" : ""}>Cancelado</option>
                    </select>
                </td>
                <td class="reservation-actions">
                    <button type="button" class="view-reservation-btn" data-id="${reservation.id}">
                        Ver detalles
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    updateReservationStatistics();
}

const reservationSearch = document.getElementById("reservationSearch");
const reservationStatusFilter = document.getElementById("reservationStatusFilter");
const resetReservationFilters = document.getElementById("resetReservationFilters");

if (reservationSearch) reservationSearch.addEventListener("input", renderServiceReservations);
if (reservationStatusFilter) reservationStatusFilter.addEventListener("change", renderServiceReservations);

if (resetReservationFilters) {
    resetReservationFilters.addEventListener("click", () => {
        if (reservationSearch) reservationSearch.value = "";
        if (reservationStatusFilter) reservationStatusFilter.value = "";
        renderServiceReservations();
    });
}

const reservationsBody = document.getElementById("reservationsTableBody");

if (reservationsBody) {
    reservationsBody.addEventListener("change", async (event) => {
        const selector = event.target.closest(".reservation-status-select");
        if (!selector) return;

        const reservaId = selector.dataset.id;
        const estadoAnterior = selector.dataset.estado;
        const nuevoEstado = selector.value;

        if (nuevoEstado === estadoAnterior) return;

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
            selector.value = estadoAnterior;
            return;
        }

        selector.disabled = true;

        try {
            const { data, error } = await supabase
                .from("reservas_servicio")
                .update({ estado: nuevoEstado })
                .eq("id", reservaId)
                .select("id");

            if (error || !data || data.length === 0) {
                console.error("Error actualizando reserva:", error);
                alert("No se pudo actualizar la reserva. Verifica los permisos de Supabase.");
                selector.value = estadoAnterior;
                return;
            }

            selector.dataset.estado = nuevoEstado;

            const reservaActualizada = serviceReservations.find(
                reservation => String(reservation.id) === String(reservaId)
            );

            if (reservaActualizada) {
                reservaActualizada.estado = nuevoEstado;
            }

            updateReservationStatistics();
            alert("Estado de la reserva actualizado correctamente.");

        } catch (error) {
            console.error("Error inesperado:", error);
            selector.value = estadoAnterior;
            alert("Ocurrió un error al actualizar la reserva.");
        } finally {
            selector.disabled = false;
        }
    });
}

function updateReservationStatistics() {
    const count = estado => serviceReservations.filter(res => res.estado === estado).length;

    const rTotal = document.getElementById("reservationTotal");
    const rPending = document.getElementById("reservationPending");
    const rInProgress = document.getElementById("reservationInProgress");
    const rCompleted = document.getElementById("reservationCompleted");
    const rCancelled = document.getElementById("reservationCancelled");

    if (rTotal) rTotal.textContent = serviceReservations.length;
    if (rPending) rPending.textContent = count("pendiente");
    if (rInProgress) rInProgress.textContent = count("en_proceso");
    if (rCompleted) rCompleted.textContent = count("completado");
    if (rCancelled) rCancelled.textContent = count("cancelado");
}

const reservationDetailsModal = document.getElementById("reservationDetailsModal");
const reservationDetailsBody = document.getElementById("reservationDetailsBody");
const closeReservationDetails = document.getElementById("closeReservationDetails");

document.addEventListener("click", (event) => {
    const button = event.target.closest(".view-reservation-btn");
    if (!button) return;

    const reservationId = button.dataset.id;
    const reservation = serviceReservations.find(item => String(item.id) === String(reservationId));

    if (!reservation) {
        alert("No se encontró la reserva.");
        return;
    }

    const details = [
        ["Código", reservation.codigo],
        ["Cliente", reservation.cliente_nombre],
        ["Equipo", reservation.equipo],
        ["Servicio", reservation.servicio],
        ["Descripción del problema", reservation.descripcion]
    ];

    if (reservationDetailsBody) {
        reservationDetailsBody.innerHTML = details.map(([label, value]) => `
            <div class="reservation-detail-item">
                <span>${label}</span>
                <p>${escapeReservationHTML(value || "No especificado")}</p>
            </div>
        `).join("");
    }

    if (reservationDetailsModal) reservationDetailsModal.hidden = false;
});

closeReservationDetails?.addEventListener("click", () => {
    if (reservationDetailsModal) reservationDetailsModal.hidden = true;
});

reservationDetailsModal?.addEventListener("click", (event) => {
    if (event.target === reservationDetailsModal) {
        reservationDetailsModal.hidden = true;
    }
});

function escapeReservationHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* =========================================================
   CATEGORÍAS, SUBCATEGORÍAS Y AUTOCLASIFICACIÓN
========================================================= */
async function loadCategoriesAndSubcategories() {
    try {
        const { data: categories, error: catError } = await supabase
            .from("categorias")
            .select("*")
            .eq("activo", true)
            .order("id", { ascending: true });

        const { data: subcategories, error: subError } = await supabase
            .from("subcategorias")
            .select("*")
            .eq("activo", true)
            .order("orden", { ascending: true });

        if (catError) console.error("Error al cargar categorías:", catError);
        if (subError) console.error("Error al cargar subcategorías:", subError);

        categoriesList = categories || [];
        subcategoriesList = subcategories || [];

        populateCategorySelect();
    } catch (err) {
        console.error("Error cargando categorías/subcategorías:", err);
    }
}

function populateCategorySelect() {
    const categorySelect = document.getElementById("productCategory");
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';

    categoriesList.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.nombre;
        option.dataset.id = cat.id;
        option.textContent = `${cat.icono ? cat.icono + " " : ""}${cat.nombre}`;
        categorySelect.appendChild(option);
    });
}

function populateSubcategorySelect(categoryId, selectedSubcategoryName = "") {
    const subcategorySelect = document.getElementById("productSubcategory");
    if (!subcategorySelect) return;

    subcategorySelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
    if (!categoryId) return;

    const filteredSubs = subcategoriesList.filter(s => String(s.categoria_id) === String(categoryId));

    filteredSubs.forEach(sub => {
        const option = document.createElement("option");
        option.value = sub.nombre;
        option.textContent = sub.nombre;
        if (selectedSubcategoryName && sub.nombre === selectedSubcategoryName) {
            option.selected = true;
        }
        subcategorySelect.appendChild(option);
    });
}

const productNameInput = document.getElementById("productName");
if (productNameInput) {
    productNameInput.addEventListener("input", (e) => {
        autoClassifyProduct(e.target.value);
    });
}

function autoClassifyProduct(text) {
    if (!text || text.trim() === "") return;

    const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let matchedCategory = categoriesList.find(cat => {
        const catName = cat.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const catSlug = (cat.slug || "").toLowerCase();
        const singular = catName.endsWith('s') ? catName.slice(0, -1) : catName;
        return normalizedText.includes(catName) || normalizedText.includes(catSlug) || normalizedText.includes(singular);
    });

    if (!matchedCategory) {
        if (normalizedText.includes('mouse') || normalizedText.includes('raton')) matchedCategory = categoriesList.find(c => c.id === 1);
        else if (normalizedText.includes('teclad')) matchedCategory = categoriesList.find(c => c.id === 2);
        else if (normalizedText.includes('audifono') || normalizedText.includes('auricular') || normalizedText.includes('headset')) matchedCategory = categoriesList.find(c => c.id === 3);
        else if (normalizedText.includes('microfono') || normalizedText.includes('mic')) matchedCategory = categoriesList.find(c => c.id === 4);
        else if (normalizedText.includes('parlante') || normalizedText.includes('altavoz') || normalizedText.includes('speaker')) matchedCategory = categoriesList.find(c => c.id === 5);
        else if (normalizedText.includes('memoria') || normalizedText.includes('ram') || normalizedText.includes('ssd') || normalizedText.includes('pendrive')) matchedCategory = categoriesList.find(c => c.id === 6);
        else if (normalizedText.includes('mando') || normalizedText.includes('joystick') || normalizedText.includes('gamepad')) matchedCategory = categoriesList.find(c => c.id === 7);
        else if (normalizedText.includes('router') || normalizedText.includes('repetidor') || normalizedText.includes('wifi')) matchedCategory = categoriesList.find(c => c.id === 8);
    }

    if (matchedCategory) {
        const catSelect = document.getElementById("productCategory");
        if (catSelect) {
            catSelect.value = matchedCategory.nombre;
            populateSubcategorySelect(matchedCategory.id);

            const availableSubs = subcategoriesList.filter(s => String(s.categoria_id) === String(matchedCategory.id));
            const matchedSub = availableSubs.find(sub => {
                const subName = sub.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const subSlug = (sub.slug || "").toLowerCase();
                return normalizedText.includes(subName) || normalizedText.includes(subSlug);
            });

            if (matchedSub) {
                const subSelect = document.getElementById("productSubcategory");
                if (subSelect) subSelect.value = matchedSub.nombre;
            }
        }
    }
}

const categorySelectEl = document.getElementById("productCategory");
if (categorySelectEl) {
    categorySelectEl.addEventListener("change", () => {
        const selectedOption = categorySelectEl.options[categorySelectEl.selectedIndex];
        const categoryId = selectedOption ? selectedOption.dataset.id : null;
        populateSubcategorySelect(categoryId);
    });
}

/* =========================================================
   CERRAR SESIÓN Y CARGA INICIAL
========================================================= */
document.getElementById("logoutButton")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
});

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadCategoriesAndSubcategories();
    loadServiceReservations();
    if (typeof loadBrands === "function") loadBrands();
});

// Respaldos de carga inicial
loadProducts();
loadCategoriesAndSubcategories();
loadServiceReservations();
if (typeof loadBrands === "function") loadBrands();