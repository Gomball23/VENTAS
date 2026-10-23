import { supabase } from "./supabase.js";

/* =========================================================
   ELEMENTOS DEL DOM
========================================================= */
const brandsTable = document.getElementById("brandsTable");
const brandModal = document.getElementById("brandModal");
const brandForm = document.getElementById("brandForm");
const productBrandSelect = document.getElementById("productBrand");
const brandsSection = document.getElementById("brandsSection");
const brandsTab = document.getElementById("brandsTab");

let brands = [];

/* =========================================================
   NAVEGACIÓN DE PESTAÑAS
========================================================= */
if (brandsTab) {
    brandsTab.addEventListener("click", () => {
        const sections = [
            document.getElementById("productsSection"),
            document.getElementById("servicesSection"),
            document.getElementById("brandsSection"),
            document.getElementById("reservationsSection")
        ];
        
        const tabs = [
            document.getElementById("productsTab"),
            document.getElementById("servicesTab"),
            document.getElementById("brandsTab"),
            document.getElementById("reservationsTab")
        ];

        sections.forEach(sec => { if (sec) sec.style.display = "none"; });
        tabs.forEach(tab => { if (tab) tab.classList.remove("active"); });

        brandsTab.classList.add("active");
        if (brandsSection) brandsSection.style.display = "block";

        loadBrands();
    });
}

/* =========================================================
   CARGAR Y RENDERIZAR MARCAS
========================================================= */
export async function loadBrands() {
    const { data, error } = await supabase
        .from("marcas")
        .select("*")
        .order("orden", { ascending: true });

    if (error) {
        console.error("Error cargando marcas:", error);
        return;
    }

    brands = data || [];
    renderBrands();
    populateBrandSelect();
}

function renderBrands() {
    if (!brandsTable) return;
    brandsTable.innerHTML = "";

    if (!brands.length) {
        brandsTable.innerHTML = `<tr><td colspan="5" class="empty-table">No hay marcas registradas.</td></tr>`;
        return;
    }

    brands.forEach(brand => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="product-name">
                    ${brand.logo_url 
                        ? `<img src="${brand.logo_url}" alt="${brand.nombre}" style="width:40px; height:40px; object-fit:contain; background:#fff; border-radius:8px; margin-right:10px;">` 
                        : `<span class="product-icon" style="margin-right:10px;">🏷️</span>`}
                    <div><strong>${brand.nombre}</strong></div>
                </div>
            </td>
            <td>${brand.slug || "—"}</td>
            <td>${brand.orden || 1}</td>
            <td>
                ${brand.activo ? `<span class="badge active">● Activa</span>` : `<span class="badge inactive">● Oculta</span>`}
            </td>
            <td>
                <div class="actions">
                    <button class="edit-button" onclick="editBrand(${brand.id})">✏️</button>
                    <button class="delete-button" onclick="deleteBrand(${brand.id})">🗑️</button>
                </div>
            </td>
        `;
        brandsTable.appendChild(row);
    });
}

export function populateBrandSelect() {
    if (!productBrandSelect) return;
    productBrandSelect.innerHTML = '<option value="">Seleccionar marca</option>';
    brands.filter(b => b.activo).forEach(brand => {
        const option = document.createElement("option");
        option.value = brand.nombre;
        option.textContent = brand.nombre;
        productBrandSelect.appendChild(option);
    });
}

/* =========================================================
   CONTROL DEL MODAL (ABRIR / CERRAR)
========================================================= */
function closeBrandModal() {
    if (brandModal) brandModal.classList.remove("open");
}

const newBrandBtn = document.getElementById("newBrandButton");
if (newBrandBtn) {
    newBrandBtn.addEventListener("click", () => {
        if (brandForm) brandForm.reset();

        const brandId = document.getElementById("brandId");
        if (brandId) brandId.value = "";

        const brandExistingLogo = document.getElementById("brandExistingLogo");
        if (brandExistingLogo) brandExistingLogo.value = "";

        const brandLogoPreview = document.getElementById("brandLogoPreview");
        if (brandLogoPreview) brandLogoPreview.innerHTML = "";

        const brandActive = document.getElementById("brandActive");
        if (brandActive) brandActive.checked = true;

        const brandOrder = document.getElementById("brandOrder");
        if (brandOrder) brandOrder.value = (brands ? brands.length : 0) + 1;

        const brandModalTitle = document.getElementById("brandModalTitle");
        if (brandModalTitle) brandModalTitle.textContent = "Nueva marca";

        if (brandModal) brandModal.classList.add("open");
    });
}

const closeBtn = document.getElementById("closeBrandModal");
if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); closeBrandModal(); });

const cancelBtn = document.getElementById("cancelBrandButton");
if (cancelBtn) cancelBtn.addEventListener("click", (e) => { e.preventDefault(); closeBrandModal(); });

if (brandModal) {
    brandModal.addEventListener("click", (e) => {
        if (e.target === brandModal) closeBrandModal();
    });
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && brandModal && brandModal.classList.contains("open")) {
        closeBrandModal();
    }
});

/* =========================================================
   GUARDAR MARCA (Subida de Imagen a Supabase Storage: brand-logos)
========================================================= */
if (brandForm) {
    brandForm.addEventListener("submit", async event => {
        event.preventDefault();

        const saveBtn = document.getElementById("saveBrandButton");
        const originalBtnText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";

        try {
            const id = document.getElementById("brandId").value;
            const brandName = document.getElementById("brandName").value.trim();
            const fileInput = document.getElementById("brandLogoFile");
            const file = fileInput.files[0];
            let logoUrl = document.getElementById("brandExistingLogo").value || null;

            // Generar slug automáticamente desde el nombre
            const slug = brandName
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

            // Subida de imagen al bucket 'brand-logos'
            if (file) {
                saveBtn.textContent = "Subiendo imagen...";
                const fileExt = file.name.split(".").pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("brand-logos")
                    .upload(fileName, file);

                if (uploadError) {
                    console.error("Error subiendo logo:", uploadError);
                    alert("Error al subir la imagen. Asegúrate de tener permisos públicos en el bucket 'brand-logos'.");
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from("brand-logos")
                    .getPublicUrl(fileName);

                logoUrl = publicUrlData.publicUrl;
            }

            const brandData = {
                nombre: brandName,
                slug: slug,
                logo_url: logoUrl,
                descripcion: document.getElementById("brandDescription").value.trim() || null,
                orden: Number(document.getElementById("brandOrder").value),
                activo: document.getElementById("brandActive").checked
            };

            let result;
            if (id) {
                result = await supabase.from("marcas").update(brandData).eq("id", id);
            } else {
                result = await supabase.from("marcas").insert([brandData]);
            }

            if (result.error) {
                console.error("Error BD:", result.error);
                alert("Error al guardar la marca en la base de datos.");
                return;
            }

            closeBrandModal();
            await loadBrands();
            alert(id ? "Marca actualizada correctamente." : "Marca creada correctamente.");

        } catch (error) {
            console.error("Error inesperado:", error);
            alert("Ocurrió un error inesperado al procesar la marca.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalBtnText;
        }
    });
}

/* =========================================================
   FUNCIONES GLOBALES (EDITAR / ELIMINAR)
========================================================= */
window.editBrand = function(id) {
    const brand = brands.find(b => b.id === id);
    if (!brand) return;

    document.getElementById("brandId").value = brand.id;
    document.getElementById("brandName").value = brand.nombre || "";
    document.getElementById("brandExistingLogo").value = brand.logo_url || "";
    document.getElementById("brandDescription").value = brand.descripcion || "";
    document.getElementById("brandOrder").value = brand.orden || 1;
    document.getElementById("brandActive").checked = brand.activo;

    const fileInput = document.getElementById("brandLogoFile");
    if (fileInput) fileInput.value = "";

    const preview = document.getElementById("brandLogoPreview");
    if (preview) {
        if (brand.logo_url) {
            preview.innerHTML = `
                <small style="display:block; color:#8a97ab; margin-bottom:4px;">Logo actual:</small>
                <img src="${brand.logo_url}" alt="Logo actual" style="max-height: 50px; background: #fff; padding: 4px; border-radius: 6px;">
            `;
        } else {
            preview.innerHTML = "";
        }
    }

    document.getElementById("brandModalTitle").textContent = "Editar marca";
    if (brandModal) brandModal.classList.add("open");
};

window.deleteBrand = async function(id) {
    const brand = brands.find(b => b.id === id);
    if (!brand) return;
    if (!confirm(`¿Deseas eliminar la marca "${brand.nombre}"?`)) return;

    const { error } = await supabase.from("marcas").delete().eq("id", id);
    if (error) {
        console.error(error);
        alert("No se pudo eliminar la marca.");
        return;
    }
    await loadBrands();
    alert("Marca eliminada correctamente.");
};

// Carga inicial
loadBrands();