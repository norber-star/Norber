// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'Tus_URL_de_Supabase'; // Reemplazá con tu URL real
const SUPABASE_ANON_KEY = 'Tu_Clave_Anon_De_Supabase'; // Reemplazá con tu Key real

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales para filtros y datos
let filtroActualCC = 'todas';
let listaCuentasGlobal = [];

// ==========================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargar las cuentas corrientes y otros datos iniciales
    await cargarCuentasCorrientes();

    // 2. Configurar eventos de los botones de filtro de Cuentas Corrientes
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', (e) => {
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            e.target.classList.add('activo');

            filtroActualCC = e.target.getAttribute('data-filtro');
            renderizarTablaCuentasCorrientes(listaCuentasGlobal);
        });
    });
});

// ==========================================
// GESTIÓN DE CUENTAS CORRIENTES
// ==========================================

// Trae TODAS las cuentas corrientes (vencidas y al día) desde Supabase
async function cargarCuentasCorrientes() {
    try {
        const { data: cuentas, error } = await supabaseClient
            .from('ventas_skf') // O la tabla que utilices para cuentas corrientes
            .select('*')
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;

        listaCuentasGlobal = cuentas || [];
        renderizarTablaCuentasCorrientes(listaCuentasGlobal);

    } cat (err) {
        console.error("Error al cargar cuentas corrientes:", err);
        const tbody = document.getElementById('tabla-cuentas-corrientes-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #dc2626;">Error al cargar los datos de la base de datos.</td></tr>`;
        }
    }
}

// Dibuja la tabla aplicando el filtro seleccionado (Todas / Vencidas / Al día)
function renderizarTablaCuentasCorrientes(cuentas) {
    const tbody = document.getElementById('tabla-cuentas-corrientes-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar fecha actual

    const cuentasFiltradas = cuentas.filter(item => {
        if (!item.fecha_vencimiento) return false;
        
        const fechaVenc = new Date(item.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        
        const estaVencida = fechaVenc < hoy;

        if (filtroActualCC === 'vencidas') return estaVencida;
        if (filtroActualCC === 'vigentes') return !estaVencida;
        return true; // Opción 'todas'
    });

    if (cuentasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 25px; color: #64748b;">No hay registros para mostrar en este filtro.</td></tr>`;
        return;
    }

    cuentasFiltradas.forEach(cta => {
        const fechaVenc = new Date(cta.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        const estaVencida = fechaVenc < hoy;

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
                    <button onclick="cobrarCuenta('${cta.id}')" style="padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Cobrar</button>
                </td>
            </tr>
        `;
    });
}

function cobrarCuenta(idVenta) {
    alert("Acción de cobro para la venta ID: " + idVenta);
}
