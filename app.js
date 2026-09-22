// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'Tus_URL_de_Supabase'; // Reemplazá con tu URL real
const SUPABASE_ANON_KEY = 'Tu_Clave_Anon_De_Supabase'; // Reemplazá con tu Key real

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable global para controlar el filtro activo en cuentas corrientes
let filtroActualCC = 'todas';
let listaCuentasGlobal = []; // Almacena temporalmente los datos para filtrar sin volver a consultar

// ==========================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargar las cuentas corrientes al iniciar
    await cargarCuentasCorrientes();

    // 2. Configurar los eventos de clic para los botones de filtros
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', (e) => {
            // Actualizar clases visuales de los botones
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            e.target.classList.add('activo');

            // Guardar filtro seleccionado y redibujar la tabla
            filtroActualCC = e.target.getAttribute('data-filtro');
            renderizarTablaCuentasCorrientes(listaCuentasGlobal);
        });
    });
});

// ==========================================
// FUNCIONES DE DATOS Y RENDERIZADO
// ==========================================

// Trae TODAS las cuentas corrientes desde Supabase (vencidas y no vencidas)
async function cargarCuentasCorrientes() {
    try {
        const { data: cuentas, error } = await supabaseClient
            .from('ventas_skf') // O tu tabla correspondiente a cuentas corrientes
            .select('*')
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;

        // Guardamos en memoria y renderizamos
        listaCuentasGlobal = cuentas || [];
        renderizarTablaCuentasCorrientes(listaCuentasGlobal);

    } catch (err) {
        console.error("Error al cargar cuentas corrientes:", err);
        const tbody = document.getElementById('tabla-cuentas-corrientes-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #dc2626;">Error al cargar los datos.</td></tr>`;
        }
    }
}

// Dibuja la tabla aplicando el filtro de estado (Todas / Vencidas / Vigentes)
function renderizarTablaCuentasCorrientes(cuentas) {
    const tbody = document.getElementById('tabla-cuentas-corrientes-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos la hora para comparar correctamente fechas

    // Filtrar los registros según el botón activo
    const cuentasFiltradas = cuentas.filter(item => {
        if (!item.fecha_vencimiento) return false;
        
        const fechaVenc = new Date(item.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        
        const estaVencida = fechaVenc < hoy;

        if (filtroActualCC === 'vencidas') return estaVencida;
        if (filtroActualCC === 'vigentes') return !estaVencida;
        return true; // Opción 'todas'
    });

    // Si no hay resultados para mostrar
    if (cuentasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 25px; color: #64748b;">No hay registros para mostrar en este filtro.</td></tr>`;
        return;
    }

    // Insertar cada fila en la tabla
    cuentasFiltradas.forEach(cta => {
        const fechaVenc = new Date(cta.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        const estaVencida = fechaVenc < hoy;

        // Etiqueta visual de estado (Rojo si venció, Verde si está al día)
        const badgeEstado = estaVencida 
            ? `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">Vencida</span>`
            : `<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">Al día</span>`;

        tbody.innerHTML += `
            <tr>
                <td>${cta.cliente_nombre || 'Cliente sin nombre'}</td>
                <td>$ ${Number(cta.total || 0).toLocaleString()}</td>
                <td>${cta.fecha_vencimiento}</td>
                <td>${badgeEstado}</td>
                <td>
                    <!-- Botón de acción rápida (Cobrar / Ver detalle) -->
                    <button onclick="cobrarCuenta('${cta.id}')" style="padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Cobrar</button>
                </td>
            </tr>
        `;
    });
}

// Función de ejemplo para futuros botones de acción
function cobrarCuenta(idVenta) {
    alert("Acción de cobro para la venta ID: " + idVenta);
}
