document.addEventListener("DOMContentLoaded", async () => {
    const navBtns = document.querySelectorAll(".nav-btn");
    const vistas = document.querySelectorAll(".vista");
    
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            navBtns.forEach(b => b.classList.remove("active"));
            vistas.forEach(v => v.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.target).classList.add("active");
            if (btn.dataset.target === "seccion-historial") cargarHistorial();
            if (btn.dataset.target === "seccion-clientes") cargarClientesVista();
            if (btn.dataset.target === "seccion-ctacte") cargarCuentaCorrienteVista();
        });
    });

    let carrito = [];
    await actualizarSelectClientesFiltro();

    const inputVencimientoVenta = document.getElementById("input-vencimiento-venta");
    if (inputVencimientoVenta) {
        const fechaDefecto = new Date();
        fechaDefecto.setDate(fechaDefecto.getDate() + 10);
        inputVencimientoVenta.value = fechaDefecto.toISOString().split('T')[0];
    }

    // Buscador predictivo de Clientes en Nueva Venta (Con control de duplicados)
    const inputBuscarCliente = document.getElementById("input-buscar-cliente");
    const sugerenciasClienteBox = document.getElementById("sugerencias-cliente-box");
    const selectClienteId = document.getElementById("select-cliente-id");
    const lblClienteSeleccionado = document.getElementById("lbl-cliente-seleccionado");

    if (inputBuscarCliente) {
        inputBuscarCliente.addEventListener("input", async (e) => {
            const query = e.target.value.toLowerCase().trim();
            sugerenciasClienteBox.innerHTML = "";
            if (query.length === 0) return;

            const { data: clientes, error } = await supabaseClient
                .from('clientes_skf')
                .select('*')
                .or(`nombre.ilike.%${query}%,cuit.ilike.%${query}%`);

            if (error || !clientes) return;

            const unicos = Array.from(new Set(clientes.map(c => c.id)))
                .map(id => clientes.find(c => c.id === id));

            unicos.forEach(cli => {
                const div = document.createElement("div");
                div.classList.add("sugerencia-item");
                div.innerHTML = `<strong>${cli.nombre}</strong> (CUIT: ${cli.cuit || 'N/A'})`;
                div.addEventListener("click", () => {
                    selectClienteId.value = cli.id;
                    inputBuscarCliente.value = cli.nombre;
                    lblClienteSeleccionado.innerText = `✓ Seleccionado`;
                    sugerenciasClienteBox.innerHTML = "";
                });
                sugerenciasClienteBox.appendChild(div);
            });
        });
    }

    // Buscador predictivo de Clientes en Cuentas Corrientes (Con control de duplicados)
    const inputBuscarClienteCtacte = document.getElementById("input-buscar-cliente-ctacte");
    const sugerenciasClienteCtacteBox = document.getElementById("sugerencias-cliente-ctacte-box");
    const selectClienteCtacteId = document.getElementById("select-cliente-ctacte");
    const lblClienteCtacteSeleccionado = document.getElementById("lbl-cliente-ctacte-seleccionado");

    if (inputBuscarClienteCtacte) {
        inputBuscarClienteCtacte.addEventListener("input", async (e) => {
            const query = e.target.value.toLowerCase().trim();
            sugerenciasClienteCtacteBox.innerHTML = "";
            if (query.length === 0) return;

            const { data: clientes, error } = await supabaseClient
                .from('clientes_skf')
                .select('*')
                .or(`nombre.ilike.%${query}%,cuit.ilike.%${query}%`);

            if (error || !clientes) return;

            const unicos = Array.from(new Set(clientes.map(c => c.id)))
                .map(id => clientes.find(c => c.id === id));

            unicos.forEach(cli => {
                const div = document.createElement("div");
                div.classList.add("sugerencia-item");
                div.innerHTML = `<strong>${cli.nombre}</strong> (CUIT: ${cli.cuit || 'N/A'})`;
                div.addEventListener("click", async () => {
                    selectClienteCtacteId.value = cli.id;
                    inputBuscarClienteCtacte.value = cli.nombre;
                    lblClienteCtacteSeleccionado.innerText = `✓ Seleccionado`;
                    sugerenciasClienteCtacteBox.innerHTML = "";
                    await renderizarDetalleCuentaCorriente();
                });
                sugerenciasClienteCtacteBox.appendChild(div);
            });
        });
    }

    // Buscador predictivo de Productos desde Supabase
    const inputBuscar = document.getElementById("input-buscar-sku");
    const sugerenciasBox = document.getElementById("sugerencias-box");

    if (inputBuscar) {
        inputBuscar.addEventListener("input", async (e) => {
            const query = e.target.value.toLowerCase().trim();
            sugerenciasBox.innerHTML = "";
            if (query.length === 0) return;

            const { data: productos, error } = await supabaseClient
                .from('productos_skf')
                .select('*')
                .or(`sku.ilike.%${query}%,nombre.ilike.%${query}%`)
                .limit(10);

            if (error) {
                console.error("Error al buscar productos:", error);
                return;
            }

            if (!productos || productos.length === 0) {
                const div = document.createElement("div");
                div.classList.add("sugerencia-item");
                div.innerHTML = `<span style="color: #64748b;">No se encontraron artículos con "${query}"</span>`;
                sugerenciasBox.appendChild(div);
                return;
            }

            productos.forEach(prod => {
                const div = document.createElement("div");
                div.classList.add("sugerencia-item");
                div.innerHTML = `<strong>${prod.sku}</strong> - ${prod.nombre} (${prod.moneda} $${prod.precio})`;
                div.addEventListener("click", () => {
                    agregarAlCarrito(prod);
                    inputBuscar.value = "";
                    sugerenciasBox.innerHTML = "";
                });
                sugerenciasBox.appendChild(div);
            });
        });
    }

    const btnItemManual = document.getElementById("btn-item-manual");
    if (btnItemManual) {
        btnItemManual.addEventListener("click", () => {
            const nombreManual = prompt("Ingrese descripción del ítem manual:");
            if (!nombreManual) return;
            const precioManual = parseFloat(prompt("Ingrese precio en Pesos (ARS):", "0"));
            if (isNaN(precioManual)) return;

            const itemManual = {
                id: 'manual_' + Date.now(),
                sku: 'MANUAL',
                nombre: nombreManual,
                precio: precioManual,
                moneda: 'ARS'
            };
            agregarAlCarrito(itemManual);
        });
    }

    function agregarAlCarrito(prod) {
        const existente = carrito.find(item => item.id === prod.id);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({ ...prod, cantidad: 1 });
        }
        renderizarCarrito();
    }

    function renderizarCarrito() {
        const tbody = document.getElementById("carrito-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        const cotizacionDolar = parseFloat(document.getElementById("input-dolar").value) || 1;
        const configDesc = parseFloat(document.getElementById("input-config-descuento")?.value) || 15;
        const ivaVal = parseFloat(document.getElementById("input-iva").value) || 0;
        const tasaVal = parseFloat(document.getElementById("input-tasa").value) || 0;
        
        let totalGeneralFinal = 0;

        carrito.forEach((item, index) => {
            let precioEnPesosBruto = item.moneda === "USD" ? item.precio * cotizacionDolar : item.precio;
            let precioConDescuento = precioEnPesosBruto * (1 - (configDesc / 100));
            let precioUnitarioFinal = precioConDescuento * (1 + ((ivaVal + tasaVal) / 100));
            
            let totalLinea = precioUnitarioFinal * item.cantidad;
            totalGeneralFinal += totalLinea;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.sku}</td>
                <td>${item.nombre}</td>
                <td>${item.moneda}</td>
                <td>$${precioUnitarioFinal.toFixed(2)}</td>
                <td><input type="number" value="${item.cantidad}" min="1" data-index="${index}" class="input-cant" style="width: 60px;"></td>
                <td>$${totalLinea.toFixed(2)}</td>
                <td><button class="btn-danger btn-eliminar" data-index="${index}">X</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll(".input-cant").forEach(input => {
            input.addEventListener("change", (e) => {
                const idx = e.target.dataset.index;
                carrito[idx].cantidad = parseInt(e.target.value) || 1;
                renderizarCarrito();
            });
        });

        document.querySelectorAll(".btn-eliminar").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = e.target.dataset.index;
                carrito.splice(idx, 1);
                renderizarCarrito();
            });
        });

        const lblTotal = document.getElementById("lbl-total-final");
        if (lblTotal) lblTotal.innerText = `$${totalGeneralFinal.toFixed(2)}`;
    }

    ["input-dolar", "input-iva", "input-tasa"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", renderizarCarrito);
    });

    // Finalizar Venta y guardarla en Supabase
    const btnFinalizarVenta = document.getElementById("btn-finalizar-venta");
    if (btnFinalizarVenta) {
        btnFinalizarVenta.addEventListener("click", async () => {
            if (carrito.length === 0) {
                alert("El carrito está vacío.");
                return;
            }
            const clienteId = document.getElementById("select-cliente-id").value;
            if (!clienteId) {
                alert("Seleccione un cliente utilizando el buscador predictivo.");
                return;
            }

            const fechaVencimientoInput = inputVencimientoVenta.value;
            if (!fechaVencimientoInput) {
                alert("Por favor, seleccione una fecha de vencimiento válida.");
                return;
            }

            const configDesc = parseFloat(document.getElementById("input-config-descuento")?.value) || 15;
            const cotizacionDolar = parseFloat(document.getElementById("input-dolar").value) || 1;
            const ivaVal = parseFloat(document.getElementById("input-iva").value) || 0;
            const tasaVal = parseFloat(document.getElementById("input-tasa").value) || 0;

            const { count } = await supabaseClient.from('ventas_skf').select('*', { count: 'exact', head: true });
            const siguienteNumero = (count || 0) + 1;
            const idVentaCorrelativo = `V-${siguienteNumero.toString().padStart(4, '0')}`;

            const fechaEmision = new Date();
            const [anio, mes, dia] = fechaVencimientoInput.split('-');
            const fechaVencimientoObj = new Date(anio, mes - 1, dia);
            const fechaVencimientoStr = `${dia}/${mes}/${anio}`;
            const timestampVencimiento = fechaVencimientoObj.getTime();

            const itemsConDetalle = carrito.map(item => {
                let precioBruto = item.moneda === "USD" ? item.precio * cotizacionDolar : item.precio;
                let precioNeto = (precioBruto * (1 - (configDesc / 100))) * (1 + ((ivaVal + tasaVal) / 100));
                return {
                    ...item,
                    precioBrutoUnitario: precioBruto,
                    precioNetoUnitario: precioNeto
                };
            });

            const montoTotalNum = parseFloat(document.getElementById("lbl-total-final").innerText.replace("$", ""));

            const nuevaVenta = {
                id_venta: idVentaCorrelativo,
                fecha: fechaEmision.toLocaleDateString() + " " + fechaEmision.toLocaleTimeString(),
                timestamp_emision: fechaEmision.getTime(),
                fecha_vencimiento: fechaVencimientoStr,
                timestamp_vencimiento: timestampVencimiento,
                id_cliente: parseInt(clienteId),
                items: itemsConDetalle,
                total_numerico: montoTotalNum,
                total: document.getElementById("lbl-total-final").innerText,
                configuracion_aplicada: {
                    dolar: cotizacionDolar,
                    iva: ivaVal,
                    tasa: tasaVal,
                    descuentoInternoPorcentaje: configDesc
                }
            };

            const { error } = await supabaseClient.from('ventas_skf').insert([nuevaVenta]);

            if (error) {
                alert("Error al registrar la venta en Supabase: " + error.message);
                return;
            }

            alert(`¡Venta ${nuevaVenta.id_venta} registrada con éxito! Vence el ${nuevaVenta.fecha_vencimiento}.`);
            carrito = [];
            inputBuscarCliente.value = "";
            selectClienteId.value = "";
            lblClienteSeleccionado.innerText = "Ninguno seleccionado";
            renderizarCarrito();
        });
    }

    async function cargarCuentaCorrienteVista() {
        const clienteId = selectClienteCtacteId.value;
        if (clienteId) {
            await renderizarDetalleCuentaCorriente();
        } else {
            const tbody = document.getElementById("ctacte-tbody");
            const tbodyRecibos = document.getElementById("recibos-tbody");
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b;">Utilice el buscador superior para seleccionar un cliente.</td></tr>`;
            if (tbodyRecibos) tbodyRecibos.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">Seleccione un cliente para ver sus recibos.</td></tr>`;
        }
    }

    async function renderizarDetalleCuentaCorriente() {
        const clienteId = selectClienteCtacteId.value;
        if (!clienteId) return;

        const { data: ventasCliente } = await supabaseClient.from('ventas_skf').select('*').eq('id_cliente', clienteId);
        const { data: pagosCliente } = await supabaseClient.from('pagos_skf').select('*').eq('id_cliente', clienteId);

        let totalPagado = pagosCliente ? pagosCliente.reduce((acc, p) => acc + parseFloat(p.monto), 0) : 0;
        let deudaTotalAcumulada = 0;

        const tbody = document.getElementById("ctacte-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const ahora = new Date().getTime();

        if (ventasCliente && ventasCliente.length > 0) {
            ventasCliente.forEach(v => {
                let saldoVenta = parseFloat(v.total_numerico);
                if (totalPagado >= saldoVenta) {
                    totalPagado -= saldoVenta;
                    saldoVenta = 0;
                } else {
                    saldoVenta -= totalPagado;
                    totalPagado = 0;
                }

                deudaTotalAcumulada += saldoVenta;

                let badgeHtml = '<span class="badge-al-dia">Al día</span>';
                const diasRestantes = (v.timestamp_vencimiento - ahora) / (1000 * 60 * 60 * 24);

                if (saldoVenta > 0) {
                    if (diasRestantes < 0) {
                        badgeHtml = '<span class="badge-vencido">VENCIDO</span>';
                    } else if (diasRestantes <= 3) {
                        badgeHtml = '<span class="badge-por-vencer">Por vencer</span>';
                    }
                } else {
                    badgeHtml = '<span style="color: #16a34a; font-weight: 600;">Pagado</span>';
                }

                const isDisabled = saldoVenta <= 0 ? 'disabled' : '';
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: center;"><input type="checkbox" class="check-venta-ctacte" value="${v.id_venta}" data-saldo="${saldoVenta}" ${isDisabled}></td>
                        <td>${v.id_venta}</td>
                        <td>${v.fecha}</td>
                        <td>${v.fecha_vencimiento}</td>
                        <td>${v.total}</td>
                        <td><strong>$${saldoVenta.toFixed(2)}</strong></td>
                        <td>${badgeHtml}</td>
                        <td><button class="btn-secundario" onclick="verDetalleVenta('${v.id_venta}')">Ver Reporte Interno</button></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b;">Este cliente no registra comprobantes.</td></tr>`;
        }

        const lblDeuda = document.getElementById("lbl-deuda-total");
        if (lblDeuda) lblDeuda.innerText = `$${deudaTotalAcumulada.toFixed(2)}`;

        // Cargar tabla de recibos emitidos para este cliente
        const tbodyRecibos = document.getElementById("recibos-tbody");
        if (tbodyRecibos) {
            tbodyRecibos.innerHTML = "";
            if (pagosCliente && pagosCliente.length > 0) {
                pagosCliente.forEach(p => {
                    tbodyRecibos.innerHTML += `
                        <tr>
                            <td><strong>${p.nro_recibo || 'REC-s/n'}</strong></td>
                            <td>${p.fecha}</td>
                            <td>$${parseFloat(p.monto).toFixed(2)}</td>
                            <td>${p.observaciones || '-'}</td>
                            <td><button class="btn-secundario" onclick="verRecibo('${p.id_pago}')">Ver Recibo / PDF</button></td>
                        </tr>
                    `;
                });
            } else {
                tbodyRecibos.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">No hay recibos registrados para este cliente.</td></tr>`;
            }
        }
    }

    window.verRecibo = function(idPago) {
        window.open(`recibo.html?id=${idPago}`, '_blank');
    };

    // Modal de Pagos con Recibo Autogenerado (REC-0001) y Detalle
    const modalPago = document.getElementById("modal-pago");
    const btnRegistrarPago = document.getElementById("btn-registrar-pago");
    const checkAbonarTotal = document.getElementById("check-abonar-total");
    const inputMontoPago = document.getElementById("input-monto-pago");

    if (btnRegistrarPago) {
        btnRegistrarPago.addEventListener("click", async () => {
            const checkboxesSeleccionados = document.querySelectorAll(".check-venta-ctacte:checked");
            if (checkboxesSeleccionados.length === 0) {
                alert("Por favor, seleccione al menos un presupuesto o venta con el tilde para abonar.");
                return;
            }

            let sumaSaldoSeleccionado = 0;
            checkboxesSeleccionados.forEach(chk => {
                sumaSaldoSeleccionado += parseFloat(chk.dataset.saldo) || 0;
            });

            const { count } = await supabaseClient.from('pagos_skf').select('*', { count: 'exact', head: true });
            const siguienteReciboNum = (count || 0) + 1;
            const nroReciboAuto = `REC-${siguienteReciboNum.toString().padStart(4, '0')}`;

            const nombreCliente = inputBuscarClienteCtacte ? inputBuscarClienteCtacte.value : "Cliente";
            
            document.getElementById("pago-cliente-nombre").innerText = `Cliente: ${nombreCliente} | Recibo: ${nroReciboAuto}`;
            document.getElementById("pago-seleccion-info").innerText = `Comprobantes seleccionados: ${checkboxesSeleccionados.length} | Saldo combinado: $${sumaSaldoSeleccionado.toFixed(2)}`;
            
            const obsPago = document.getElementById("input-obs-pago");
            if (obsPago) {
                obsPago.dataset.reciboAuto = nroReciboAuto;
                obsPago.value = "";
            }

            if (checkAbonarTotal) checkAbonarTotal.checked = false;
            if (inputMontoPago) {
                inputMontoPago.value = "";
                inputMontoPago.disabled = false;
            }

            if (modalPago) modalPago.style.display = "flex";
        });
    }

    if (checkAbonarTotal && inputMontoPago) {
        checkAbonarTotal.addEventListener("change", (e) => {
            const checkboxesSeleccionados = document.querySelectorAll(".check-venta-ctacte:checked");
            let sumaSaldoSeleccionado = 0;
            checkboxesSeleccionados.forEach(chk => {
                sumaSaldoSeleccionado += parseFloat(chk.dataset.saldo) || 0;
            });

            if (e.target.checked) {
                inputMontoPago.value = sumaSaldoSeleccionado.toFixed(2);
                inputMontoPago.disabled = true;
            } else {
                inputMontoPago.value = "";
                inputMontoPago.disabled = false;
            }
        });
    }

    const closePago = document.querySelector(".close-pago");
    if (closePago) {
        closePago.addEventListener("click", () => {
            if (modalPago) modalPago.style.display = "none";
        });
    }

    const formPago = document.getElementById("form-pago");
    if (formPago) {
        formPago.addEventListener("submit", async (e) => {
            e.preventDefault();
            const clienteId = selectClienteCtacteId.value;
            if (!clienteId) {
                alert("No hay un cliente válido seleccionado.");
                return;
            }
            const monto = parseFloat(inputMontoPago.value);
            const obsInput = document.getElementById("input-obs-pago");
            const observaciones = obsInput.value;
            const nroRecibo = obsInput.dataset.reciboAuto || `REC-${Date.now()}`;

            if (isNaN(monto) || monto <= 0) {
                alert("Ingrese un monto válido.");
                return;
            }

            const checkboxesSeleccionados = document.querySelectorAll(".check-venta-ctacte:checked");
            let detalleAfectados = [];
            checkboxesSeleccionados.forEach(chk => {
                detalleAfectados.push({
                    id_venta: chk.value,
                    montoAplicado: parseFloat(chk.dataset.saldo)
                });
            });

            const nuevoPago = {
                id_pago: Date.now(),
                nro_recibo: nroRecibo,
                id_cliente: parseInt(clienteId),
                monto: monto,
                fecha: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
                ventas_afectadas: detalleAfectados,
                observaciones: observaciones || "Pago a cuenta de presupuestos"
            };

            const { error } = await supabaseClient.from('pagos_skf').insert([nuevoPago]);

            if (error) {
                alert("Error al registrar el recibo en Supabase: " + error.message);
                return;
            }

            if (modalPago) modalPago.style.display = "none";
            alert(`¡Recibo ${nroRecibo} generado y registrado correctamente!`);
            await renderizarDetalleCuentaCorriente();
        });
    }

    async function cargarClientesVista() {
        const { data: clientes, error } = await supabaseClient.from('clientes_skf').select('*');
        const tbody = document.getElementById("clientes-tbody");
        if (!tbody || error) return;
        tbody.innerHTML = "";
        
        clientes.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${c.cuit || '-'}</td>
                    <td>${c.telefono || '-'}</td>
                    <td><button class="btn-secundario" onclick="editarCliente(${c.id})">Editar</button></td>
                </tr>
            `;
        });
    }

    async function actualizarSelectClientesFiltro() {
        const { data: clientes, error } = await supabaseClient.from('clientes_skf').select('*');
        const sel = document.getElementById("filtro-cliente-historial");
        if(!sel || error) return;
        sel.innerHTML = '<option value="">Todos</option>';
        clientes.forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    }

    const formCliente = document.getElementById("form-cliente");
    if (formCliente) {
        formCliente.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("cliente-id").value;
            const nombre = document.getElementById("cliente-nombre").value;
            const cuit = document.getElementById("cliente-cuit").value;
            const telefono = document.getElementById("cliente-telefono").value;
            const direccion = document.getElementById("cliente-direccion").value;

            let clienteData = { nombre, cuit, telefono, direccion };

            if (id) {
                await supabaseClient.from('clientes_skf').update(clienteData).eq('id', parseInt(id));
            } else {
                clienteData.id = Date.now();
                await supabaseClient.from('clientes_skf').insert([clienteData]);
            }

            formCliente.reset();
            document.getElementById("cliente-id").value = "";
            await cargarClientesVista();
            await actualizarSelectClientesFiltro();
            alert("Cliente guardado correctamente en Supabase.");
        });
    }

    window.editarCliente = async function(id) {
        const { data: clientes } = await supabaseClient.from('clientes_skf').select('*').eq('id', id);
        if (!clientes || clientes.length === 0) return;
        const c = clientes[0];
        document.getElementById("cliente-id").value = c.id;
        document.getElementById("cliente-nombre").value = c.nombre;
        document.getElementById("cliente-cuit").value = c.cuit;
        document.getElementById("cliente-telefono").value = c.telefono;
        document.getElementById("cliente-direccion").value = c.direccion;
    };

    async function cargarHistorial() {
        const filtroCliElem = document.getElementById("filtro-cliente-historial");
        const filtroCli = filtroCliElem ? filtroCliElem.value : "";
        
        let query = supabaseClient.from('ventas_skf').select('*, clientes_skf(nombre)');
        if (filtroCli) {
            query = query.eq('id_cliente', filtroCli);
        }

        const { data: ventas, error } = await query;
        const tbody = document.getElementById("historial-tbody");
        if (!tbody || error) return;
        tbody.innerHTML = "";

        ventas.forEach(v => {
            const nombreCliente = v.clientes_skf ? v.clientes_skf.nombre : 'Desconocido';
            tbody.innerHTML += `
                <tr>
                    <td>${v.id_venta}</td>
                    <td>${v.fecha}</td>
                    <td>${nombreCliente}</td>
                    <td>${v.total}</td>
                    <td><button class="btn-secundario" onclick="verDetalleVenta('${v.id_venta}')">Ver Reporte Interno</button></td>
                </tr>
            `;
        });
    }

    const filtroHistorial = document.getElementById("filtro-cliente-historial");
    if (filtroHistorial) {
        filtroHistorial.addEventListener("change", cargarHistorial);
    }

    window.verDetalleVenta = function(idVenta) {
        window.open(`reporte.html?id=${idVenta}`, '_blank');
    };

    const modalBackdoor = document.getElementById("modal-backdoor");
    const btnBackdoor = document.getElementById("btn-backdoor");
    if (btnBackdoor) {
        btnBackdoor.addEventListener("click", () => {
            if (modalBackdoor) modalBackdoor.style.display = "flex";
        });
    }

    const closeBackdoor = document.querySelector(".close-backdoor");
    if (closeBackdoor) {
        closeBackdoor.addEventListener("click", () => {
            if (modalBackdoor) modalBackdoor.style.display = "none";
        });
    }

    const btnGuardarConfig = document.getElementById("btn-guardar-config");
    if (btnGuardarConfig) {
        btnGuardarConfig.addEventListener("click", () => {
            if (modalBackdoor) modalBackdoor.style.display = "none";
            renderizarCarrito();
            alert("Configuración aplicada correctamente.");
        });
    }

    const btnProcesarExcel = document.getElementById("btn-procesar-excel");
    if (btnProcesarExcel) {
        btnProcesarExcel.addEventListener("click", () => {
            const fileInput = document.getElementById("input-excel-file");
            if (!fileInput.files || fileInput.files.length === 0) {
                alert("Por favor, seleccione un archivo de Excel.");
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonRows.length === 0) {
                        alert("El archivo Excel está vacío.");
                        return;
                    }

                    const nuevosProductos = jsonRows.map((row, index) => ({
                        id: Date.now() + index,
                        sku: String(row.SKU || row.sku || row.Codigo || `SKU-${index}`),
                        nombre: String(row.Nombre || row.nombre || row.Descripcion || 'Producto sin nombre'),
                        marca: String(row.Marca || row.marca || 'SKF'),
                        precio: parseFloat(row.Precio || row.precio || 0),
                        moneda: String(row.Moneda || row.moneda || 'ARS').toUpperCase()
                    }));

                    const { error } = await supabaseClient.from('productos_skf').upsert(nuevosProductos);

                    if (error) {
                        alert("Error al sincronizar con Supabase: " + error.message);
                        return;
                    }

                    alert(`¡Se importaron y guardaron ${nuevosProductos.length} productos en Supabase correctamente!`);
                    if (modalBackdoor) modalBackdoor.style.display = "none";
                    fileInput.value = "";
                } catch (error) {
                    console.error(error);
                    alert("Ocurrió un error al procesar el archivo.");
                }
            };

            reader.readAsArrayBuffer(file);
        });
    }
});