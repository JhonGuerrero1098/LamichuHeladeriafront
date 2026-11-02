// 1. Validar si el usuario ha iniciado sesión antes de permitir cargar la página
const usuarioActual = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuarioActual) {
    // Si no hay sesión activa, redirigir automáticamente al login
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sectionTitle = document.getElementById('section-title');
    const contentBody = document.querySelector('.content-body');

    // --- CONFIGURACIÓN DEL BOTÓN DE CERRAR SESIÓN ---
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                localStorage.removeItem('usuarioLogueado');
                window.location.href = 'login.html';
            }
        });
    }

    // Identificar el rol en texto para la consola
    const nombreRol = usuarioActual.idRol === 3 ? 'Superusuario' : (usuarioActual.idRol === 2 ? 'Cajero' : 'Administrador');
    console.log(`Usuario conectado con éxito: ${usuarioActual.nombreCompleto} (Rol: ${nombreRol})`);

    // --- CONFIGURACIÓN DE INACTIVIDAD (5 MINUTOS) ---
    let temporizadorInactividad;
    const TIEMPO_INACTIVIDAD_MS = 5 * 60 * 1000; // 5 minutos

    function mostrarModalBloqueo() {
        // Evitar duplicar modales si ya está abierto
        if (document.getElementById('modal-bloqueo-inactividad')) return;

        const modalHTML = `
            <div id="modal-bloqueo-inactividad" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.95); display: flex; justify-content: center; align-items: center; z-index: 9999;">
                <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); width: 100%; max-width: 400px; text-align: center;">
                    <h3 style="color: #1e293b; margin-bottom: 10px;">Sesión Bloqueada por Inactividad</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">
                        Han pasado 5 minutos sin actividad. Por seguridad, ingresa tu contraseña para continuar, <b>${usuarioActual.nombreCompleto}</b>.
                    </p>
                    <form id="form-desbloqueo" style="display: flex; flex-direction: column; gap: 12px;">
                        <input type="password" id="input-pass-bloqueo" placeholder="Contraseña actual" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%;">
                        <button type="submit" style="padding: 10px; background-color: #1e293b; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Desbloquear</button>
                        <button type="button" id="btn-forzar-salir" style="padding: 8px; background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.85rem;">Cerrar sesión actual</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('form-desbloqueo').addEventListener('submit', (e) => {
            e.preventDefault();
            const passwordIngresada = document.getElementById('input-pass-bloqueo').value;

            // Validar credenciales contra la API de login
            fetch('https://localhost:7137/api/Usuarios/Login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: usuarioActual.email, contrasena: passwordIngresada })
            })
            .then(async res => {
                if (res.ok) {
                    // Contraseña correcta: removemos modal y reiniciamos temporizador
                    document.getElementById('modal-bloqueo-inactividad').remove();
                    reiniciarTemporizadorInactividad();
                } else {
                    alert('Contraseña incorrecta. Inténtalo de nuevo.');
                }
            })
            .catch(() => {
                alert('Error de conexión con el servidor al verificar credenciales.');
            });
        });

        document.getElementById('btn-forzar-salir').addEventListener('click', () => {
            localStorage.removeItem('usuarioLogueado');
            window.location.href = 'login.html';
        });
    }

    function reiniciarTemporizadorInactividad() {
        clearTimeout(temporizadorInactividad);
        temporizadorInactividad = setTimeout(mostrarModalBloqueo, TIEMPO_INACTIVIDAD_MS);
    }

    // Escuchar eventos de interacción del usuario para medir inactividad
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evento => {
        window.addEventListener(evento, reiniciarTemporizadorInactividad, true);
    });

    // Iniciar temporizador al cargar la página
    reiniciarTemporizadorInactividad();

    // Restricciones según el rol al cargar la página (Ocultar opciones del menú lateral)
    if (usuarioActual.idRol === 2) {
        navLinks.forEach(link => {
            const seccion = link.getAttribute('data-section');
            // Si el rol es cajero, ocultamos Dashboard, Clientes y Producto Más Vendido
            if (seccion === 'dashboard' || seccion === 'clientes' || seccion === 'producto-mas-vendido') {
                link.parentElement.style.display = 'none'; 
            }
        });
    }

    // Configuración de la navegación del menú 
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Obtener la sección seleccionada
            const section = link.getAttribute('data-section');

            // Bloqueo de seguridad por si intentan forzar la vista por cajero
            if (usuarioActual.idRol === 2 && (section === 'dashboard' || section === 'clientes' || section === 'producto-mas-vendido')) {
                alert('Acceso denegado. Este módulo está restringido para tu rol.');
                return;
            }

            // Quitar la clase 'active' de todos los enlaces y ponerla en el presionado
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Cambiar el título superior y el contenido según la opción
            switch (section) {
               case 'Inicio':
                    sectionTitle.textContent = '/ Inicio /';
                    let contenidoDashboard = `
                    <div class="card" style="margin-bottom: 20px;">
                    <h3>Bienvenido ${usuarioActual.nombreCompleto || 'Usuario'}</h3>
                    <p>Selecciona una opcion del menu lateral para iniciar.</p>
                </div>
            `;
            // Si el usuario es Superusuario (3) o Administrador (1), le mostramos el módulo para crear usuarios
            if (usuarioActual.idRol === 3 || usuarioActual.idRol === 1){
                const opcionesRolHTML = usuarioActual.idRol === 3
                ? `<option value="1">Administrador / Dueño del local</option>
                   <option value="2">Cajero</option>`
                :    `<option value="2">Cajero</option>`; 
                
                contenidoDashboard += `
                <div class="card" style="max-width: 600px; margin: 0 auto;">
                    <h3>Crear Nuevo Usuario</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
                        ${usuarioActual.idRol === 3 ? 'Como Superusuario, puedes registrar cuentas para administradores o cajeros.' : 'Como Administrador, puedes registrar cuentas para los cajeros.'}
                    </p>
                    <form id="form-crear-usuario-admin" style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="text" id="nuevo-nombre" placeholder="Nombre completo" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <input type="email" id="nuevo-correo" placeholder="Correo electrónico" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <input type="password" id="nuevo-contrasena" placeholder="Contraseña (Mín. 8 caracteres, 1 may., 1 núm., 1 especial)" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <label for="nuevo-rol" style="font-weight: bold; color: #475569; font-size: 0.9rem;">Asignar Rol:</label>
                        <select id="nuevo-rol" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
                            <option value="">Seleccione un rol...</option>
                            ${opcionesRolHTML}
                        </select>
                        <button type="submit" style="padding: 10px 15px; background-color: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 5px;">Crear Usuario</button>
                    </form>
                </div>
                `;
            }
            contentBody.innerHTML = contenidoDashboard;

                    setTimeout(() => {
                        const formCrearUsuario = document.getElementById('form-crear-usuario-admin');
                        if (formCrearUsuario) {
                            formCrearUsuario.addEventListener('submit', (e) => {
                                e.preventDefault();

                                const nombre = document.getElementById('nuevo-nombre').value.trim();
                                const email = document.getElementById('nuevo-correo').value.trim();
                                const contrasena = document.getElementById('nuevo-contrasena').value;
                                const idRol = parseInt(document.getElementById('nuevo-rol').value);

                                const validarPatronContrasena = (pass) => {
                                    const minLength = pass.length >= 8;
                                    const hasUpperCase = /[A-Z]/.test(pass);
                                    const hasNumber = /[0-9]/.test(pass);
                                    const hasSpecialChar = /[^a-zA-Z0-9]/.test(pass);
                                    return minLength && hasUpperCase && hasNumber && hasSpecialChar;
                                };

                                if (!validarPatronContrasena(contrasena)) {
                                    alert('La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, un número y un carácter especial.');
                                    return;
                                }

                                const nuevoUsuarioData = {
                                    nombreCompleto: nombre,
                                    email: email,
                                    contrasena: contrasena,
                                    idRol: idRol
                                };

                                fetch('https://localhost:7137/api/Usuarios/Registro', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(nuevoUsuarioData)
                                })
                                .then(async res => {
                                    if (res.ok) {
                                        alert('¡Usuario creado con éxito!');
                                        formCrearUsuario.reset();
                                    } else {
                                        const errorText = await res.text();
                                        alert('Error al crear usuario: ' + errorText);
                                    }
                                })
                                .catch(err => console.error('Error de red:', err));
                            });
                        }
                    }, 100);
                    break;

              case 'inventario':
                    sectionTitle.textContent = 'Inventario de productos';
                    contentBody.innerHTML = `
                        <!-- FORMULARIO PARA AGREGAR NUEVO PRODUCTO -->
                        <div class="card" style="margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                            <h3>Registrar Nuevo Producto</h3>
                            <form id="form-crear-producto-inventario" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                                <input type="text" id="nuevo-prod-nombre" placeholder="Nombre del producto" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="number" id="nuevo-prod-precio" placeholder="Precio" step="0.01" required style="padding: 8px; flex: 1; min-width: 120px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="number" id="nuevo-prod-stock" placeholder="Stock / Cantidad inicial" min="0" required style="padding: 8px; flex: 1; min-width: 120px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="nuevo-prod-categoria" placeholder="Categoría" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="nuevo-prod-descripcion" placeholder="Descripción (Opcional)" style="padding: 8px; flex: 1; min-width: 200px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <button type="submit" style="padding: 8px 15px; background-color: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Guardar Producto</button>
                            </form>
                        </div>

                        <!-- FORMULARIO DESPLEGABLE PARA EDITAR PRODUCTO -->
                        <div class="card" id="card-formulario-producto" style="margin-bottom: 20px; display: none;">
                            <h3 id="titulo-form-productos">Editar Producto</h3>
                            <form id="form-editar-producto" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">  
                                <input type="hidden" id="edit-id">
                                <input type="hidden" id="edit-stock-original">
                                <input type="text" id="edit-nombre" placeholder="Nombre del producto" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="number" id="edit-precio" placeholder="Precio" step="0.01" required style="padding: 8px; flex: 1; min-width: 120px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="number" id="edit-stock" placeholder="Stock a agregar" required style="padding: 8px; flex: 1; min-width: 100px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="edit-categoria" placeholder="Categoría" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="edit-descripcion" placeholder="Descripción del producto" style="padding: 8px; flex: 1; min-width: 200px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <button type="submit" style="padding: 8px 15px; background-color: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">Actualizar</button>
                                <button type="button" id="btn-cancelar-edit" style="padding: 8px 15px; background-color: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                            </form>
                        </div>

                        <!-- TABLA DE PRODUCTOS EN STOCK -->
                        <div class="card">
                            <h3>Productos en stock</h3>
                            <div id="contenedor-tabla">
                                <p style="padding: 10px; color: #64748b;">Cargando productos...</p>
                            </div>
                        </div>
                    `;

                    function cargarInventario() {
                        fetch('https://localhost:7137/api/productos')
                            .then(response => response.json())
                            .then(productos => {
                                const contenedor = document.getElementById('contenedor-tabla');

                                if (productos.length === 0) {
                                    contenedor.innerHTML = '<p style="padding: 10px; text-align: center;">No hay productos registrados.</p>';
                                    return;
                                }

                                let tablaHTML = `
                                    <table style="width:100%; border-collapse: collapse; margin-top:15px;">
                                        <thead>
                                            <tr style="background-color:#1e293b; color: white; text-align: left;">
                                                <th style="padding: 10px;">ID</th>
                                                <th style="padding: 10px;">Nombre</th>
                                                <th style="padding: 10px;">Precio</th>
                                                <th style="padding: 10px;">Stock</th>
                                                <th style="padding: 10px;">Categoría</th>
                                                <th style="padding: 10px; text-align: center;">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                `;

                                productos.forEach(prod => {
                                    const estiloStock = prod.stock <= 10 ? 'color: red; font-weight: bold;' : '';
                                    tablaHTML += `
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            <td style="padding: 10px;">${prod.id}</td>
                                            <td style="padding: 10px;">${prod.nombre}</td>
                                            <td style="padding: 10px;">$${prod.precio}</td>
                                            <td style="padding: 10px; ${estiloStock}">${prod.stock}</td>
                                            <td style="padding: 10px;">${prod.categoria || 'General'}</td>
                                            <td style="padding: 10px; text-align: center; display: flex; gap: 5px; justify-content: center;">
                                                <button class="btn-editar" data-id="${prod.id}" data-nombre="${prod.nombre}" data-precio="${prod.precio}" data-stock="${prod.stock}" data-categoria="${prod.categoria || ''}" data-descripcion="${prod.descripcion || ''}" style="padding: 5px 10px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Editar</button>
                                                <button class="btn-eliminar-producto" data-id="${prod.id}" style="padding: 5px 10px; background-color: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                                            </td>
                                        </tr>
                                    `;
                                });

                                tablaHTML += `</tbody></table>`;
                                contenedor.innerHTML = tablaHTML;

                                // Evento para abrir el formulario de edición
                                document.querySelectorAll('.btn-editar').forEach(btn => {
                                    btn.addEventListener('click', (e) => {
                                        const id = e.target.getAttribute('data-id');
                                        const nombre = e.target.getAttribute('data-nombre');
                                        const precio = e.target.getAttribute('data-precio');
                                        const stockactual = e.target.getAttribute('data-stock');
                                        const categoria = e.target.getAttribute('data-categoria');
                                        const descripcion = e.target.getAttribute('data-descripcion');

                                        document.getElementById('card-formulario-producto').style.display = 'block';
                                        document.getElementById('edit-id').value = id;
                                        document.getElementById('edit-stock-original').value = stockactual;
                                        document.getElementById('edit-nombre').value = nombre;
                                        document.getElementById('edit-precio').value = precio;
                                        document.getElementById('edit-stock').value = '';
                                        document.getElementById('edit-categoria').value = categoria;
                                        document.getElementById('edit-descripcion').value = descripcion;

                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    });
                                });

                                // Evento para Eliminar producto de la base de datos
                                document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
                                    btn.addEventListener('click', (e) => {
                                        const idProducto = e.target.getAttribute('data-id');

                                        if (confirm('¿Estás seguro de que deseas eliminar este producto del inventario?')) {
                                            fetch(`https://localhost:7137/api/productos/${idProducto}`, {
                                                method: 'DELETE'
                                            })
                                            .then(response => {
                                                if (response.ok) {
                                                    alert('¡Producto eliminado con éxito!');
                                                    cargarInventario(); // Refrescar la tabla
                                                } else {
                                                    alert('No se pudo eliminar el producto (puede estar asociado a ventas registradas).');
                                                }
                                            })
                                            .catch(err => console.error('Error en DELETE Producto:', err));
                                        }
                                    });
                                });
                            })
                            .catch(error => {
                                console.error('Error al cargar los productos:', error);
                                document.getElementById('contenedor-tabla').innerHTML = '<p style="padding: 10px; color: red; text-align: center;">Error al cargar los productos.</p>';
                            });
                    }

                    cargarInventario();

                    setTimeout(() => {
                        // Lógica para Crear Nuevo Producto
                        const formCrearProd = document.getElementById('form-crear-producto-inventario');
                        if (formCrearProd) {
                            formCrearProd.addEventListener('submit', (e) => {
                                e.preventDefault();
                                const nuevoProductoData = {
                                    nombre: document.getElementById('nuevo-prod-nombre').value.trim(),
                                    precio: parseFloat(document.getElementById('nuevo-prod-precio').value),
                                    stock: parseInt(document.getElementById('nuevo-prod-stock').value),
                                    categoria: document.getElementById('nuevo-prod-categoria').value.trim(),
                                    descripcion: document.getElementById('nuevo-prod-descripcion').value.trim()
                                };

                                fetch('https://localhost:7137/api/productos', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(nuevoProductoData)
                                })
                                .then(response => {
                                    if (response.ok) {
                                        alert('¡Producto creado y registrado con éxito en el inventario!');
                                        formCrearProd.reset();
                                        cargarInventario();
                                    } else {
                                        response.text().then(err => alert('Error al crear el producto: ' + err));
                                    }
                                })
                                .catch(err => console.error('Error en POST Producto:', err));
                            });
                        }

                        // Lógica para Editar / Actualizar Producto
                        const formEditar = document.getElementById('form-editar-producto');
                        const btnCancelar = document.getElementById('btn-cancelar-edit');

                        if (btnCancelar) {
                            btnCancelar.addEventListener('click', () => {
                                document.getElementById('card-formulario-producto').style.display = 'none';
                                formEditar.reset();
                            });
                        }

                        if (formEditar) {
                            formEditar.addEventListener('submit', (e) => {
                                e.preventDefault();
                                const id = document.getElementById('edit-id').value;
                                const stockOriginal = parseInt(document.getElementById('edit-stock-original').value) || 0;
                                const cantidadIngresada = parseInt(document.getElementById('edit-stock').value) || 0;

                                const stockFinal = stockOriginal + cantidadIngresada;

                                const productoActualizado = {
                                    id: parseInt(id),
                                    nombre: document.getElementById('edit-nombre').value,
                                    precio: parseFloat(document.getElementById('edit-precio').value),
                                    stock: stockFinal,
                                    categoria: document.getElementById('edit-categoria').value,
                                    descripcion: document.getElementById('edit-descripcion').value
                                };

                                fetch(`https://localhost:7137/api/productos/${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(productoActualizado)
                                })
                                .then(response => {
                                    if (response.ok) {
                                        alert(`Producto actualizado con éxito (Anterior: ${stockOriginal} + Agregados: ${cantidadIngresada} = Total: ${stockFinal})`);
                                        document.getElementById('card-formulario-producto').style.display = 'none';
                                        formEditar.reset();
                                        cargarInventario();
                                    } else {
                                        response.text().then(err => alert('Error al actualizar producto: ' + err));
                                    }
                                })
                                .catch(err => console.error('Error en PUT Producto:', err));
                            });
                        }
                    }, 100);
                    break;

              case 'clientes':
                    sectionTitle.textContent = 'Gestión de Clientes';
                    contentBody.innerHTML = `
                        <!-- FORMULARIO DESPLEGABLE (ACORDEÓN) PARA EDITAR CLIENTE -->
                        <div class="card" id="card-formulario-cliente" style="margin-bottom: 20px; display: none; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                            <h3 id="titulo-form-clientes">Editar Cliente</h3>
                            <form id="form-editar-cliente" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">  
                                <input type="hidden" id="edit-cliente-id">
                                <input type="text" id="edit-cliente-nombre" placeholder="Nombre completo" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="edit-cliente-cedula" placeholder="Cédula" required style="padding: 8px; flex: 1; min-width: 130px; border: 1px solid #cbd5e1; border-radius: 4px;">   
                                <input type="text" id="edit-cliente-telefono" placeholder="Número de teléfono" required style="padding: 8px; flex: 1; min-width: 130px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="email" id="edit-cliente-email" placeholder="Correo electrónico" style="padding: 8px; flex: 1; min-width: 180px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="edit-cliente-direccion" placeholder="Dirección" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <button type="submit" style="padding: 8px 15px; background-color: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Actualizar</button>
                                <button type="button" id="btn-cancelar-edit-cliente" style="padding: 8px 15px; background-color: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                            </form>
                        </div>

                        <!-- FORMULARIO PARA REGISTRAR NUEVO CLIENTE -->
                        <div class="card" style="margin-bottom: 20px;">
                            <h3>Registrar nuevo Cliente</h3>
                            <form id="form-cliente" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                                <input type="text" id="nombre-cliente" placeholder="Nombre completo" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="cedula-cliente" placeholder="Cédula" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">   
                                <input type="text" id="telefono-cliente" placeholder="Número de teléfono" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="email" id="email-cliente" placeholder="Correo electrónico" style="padding: 8px; flex: 1; min-width: 200px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <input type="text" id="direccion-cliente" placeholder="Dirección" required style="padding: 8px; flex: 1; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <button type="submit" style="padding: 8px 15px; background-color: #1e293b; color: white; border: none; border-radius: 4px; cursor: pointer;">Guardar cliente</button>
                            </form>
                        </div>

                        <!-- TABLA DE CLIENTES Y FILTRO -->
                        <div class="card">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                                <h3 style="margin: 0;">Clientes Registrados</h3>
                                <input type="text" id="input-buscar-cliente-tabla" placeholder="Buscar cliente por nombre o cédula..." style="padding: 8px; width: 280px; border: 1px solid #cbd5e1; border-radius: 4px;">
                            </div>
                            <div id="contenedor-tabla-clientes">
                                <p style="padding: 10px; color: #64748b;">Cargando clientes...</p>
                            </div>
                        </div>
                    `;

                    let listaClientesGlobal = [];
                    // Conjunto para almacenar los IDs de los clientes eliminados de la vista principal en esta sesión
                    let idsClientesEliminados = JSON.parse(localStorage.getItem('clientesEliminadosUI') || '[]');

                    function cargarClientes() {
                        fetch('https://localhost:7137/api/clientes')
                            .then(response => response.json())
                            .then(clientes => {
                                // Filtramos para excluir permanentemente de la vista aquellos cuyo ID esté en la lista de eliminados
                                listaClientesGlobal = clientes.filter(c => !idsClientesEliminados.includes(c.id));
                                renderizarTablaClientes(listaClientesGlobal);
                            })
                            .catch(error => {
                                console.error('Error al cargar los clientes:', error);
                                document.getElementById('contenedor-tabla-clientes').innerHTML = '<p style="padding: 10px; color: red; text-align: center;">Error al cargar los clientes.</p>';
                            });
                    }

                    function renderizarTablaClientes(clientesAMostrar) {
                        const contenedor = document.getElementById('contenedor-tabla-clientes');

                        if (clientesAMostrar.length === 0) {
                            contenedor.innerHTML = '<p style="padding: 10px; text-align: center; color: #64748b;">No hay clientes para mostrar.</p>';
                            return;
                        }

                        let tablaHTML = `
                            <table style="width:100%; border-collapse: collapse; margin-top:15px;">
                                <thead>
                                    <tr style="background-color:#1e293b; color: white; text-align: left;">
                                        <th style="padding: 10px;">ID</th>
                                        <th style="padding: 10px;">Cedula</th>
                                        <th style="padding: 10px;">Nombre</th>
                                        <th style="padding: 10px;">Teléfono</th>
                                        <th style="padding: 10px;">E-mail</th>
                                        <th style="padding: 10px; text-align: center;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;

                        clientesAMostrar.forEach(cli => {
                            tablaHTML += `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px;">${cli.id}</td>
                                    <td style="padding: 10px;">${cli.cedula}</td>
                                    <td style="padding: 10px;">${cli.nombre}</td>
                                    <td style="padding: 10px;">${cli.telefono || 'N/A'}</td>
                                    <td style="padding: 10px;">${cli.email || 'N/A'}</td>
                                    <td style="padding: 10px; text-align: center;">
                                        <div style="display: flex; gap: 5px; justify-content: center;">
                                            <button class="btn-editar-cliente" data-id="${cli.id}" data-cedula="${cli.cedula}" data-nombre="${cli.nombre}" data-telefono="${cli.telefono || ''}" data-email="${cli.email || ''}" data-direccion="${cli.direccion || ''}" style="padding: 5px 10px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Editar</button>
                                            <button class="btn-eliminar-cliente" data-id="${cli.id}" style="padding: 5px 10px; background-color: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        });

                        tablaHTML += `</tbody></table>`;
                        contenedor.innerHTML = tablaHTML;

                        // Evento para Editar (Desplegar acordeón)
                        document.querySelectorAll('.btn-editar-cliente').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const id = e.target.getAttribute('data-id');
                                const cedula = e.target.getAttribute('data-cedula');
                                const nombre = e.target.getAttribute('data-nombre');
                                const telefono = e.target.getAttribute('data-telefono');
                                const email = e.target.getAttribute('data-email');
                                const direccion = e.target.getAttribute('data-direccion');

                                document.getElementById('card-formulario-cliente').style.display = 'block';
                                document.getElementById('edit-cliente-id').value = id;
                                document.getElementById('edit-cliente-cedula').value = cedula;
                                document.getElementById('edit-cliente-nombre').value = nombre;
                                document.getElementById('edit-cliente-telefono').value = telefono;
                                document.getElementById('edit-cliente-email').value = email;
                                document.getElementById('edit-cliente-direccion').value = direccion;

                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            });
                        });

                        // Evento para Eliminar de la lista principal (permanente en la vista, intacto en la base de datos)
                        document.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const idCliente = parseInt(e.target.getAttribute('data-id'));
                                
                                if (confirm('¿Estás seguro de que deseas eliminar este cliente de la lista? (Permanecerá guardado en la base de datos por seguridad de las ventas).')) {
                                    if (!idsClientesEliminados.includes(idCliente)) {
                                        idsClientesEliminados.push(idCliente);
                                        localStorage.setItem('clientesEliminadosUI', JSON.stringify(idsClientesEliminados));
                                    }
                                    
                                    listaClientesGlobal = listaClientesGlobal.filter(c => c.id !== idCliente);
                                    
                                    // Validar si hay texto en el buscador para aplicar el filtro actual
                                    const textoBusqueda = document.getElementById('input-buscar-cliente-tabla').value.toLowerCase().trim();
                                    if (textoBusqueda) {
                                        const filtrados = listaClientesGlobal.filter(cli => 
                                            cli.cedula.toLowerCase().includes(textoBusqueda) || 
                                            cli.nombre.toLowerCase().includes(textoBusqueda)
                                        );
                                        renderizarTablaClientes(filtrados);
                                    } else {
                                        renderizarTablaClientes(listaClientesGlobal);
                                    }

                                    alert('Cliente eliminado de la lista principal con éxito.');
                                }
                            });
                        });
                    }

                    cargarClientes();

                    setTimeout(() => {
                        // Buscador en tiempo real por Cédula o Nombre
                        const inputBusqueda = document.getElementById('input-buscar-cliente-tabla');
                        if (inputBusqueda) {
                            inputBusqueda.addEventListener('input', (e) => {
                                const texto = e.target.value.toLowerCase().trim();
                                const resultados = listaClientesGlobal.filter(cli => 
                                    cli.cedula.toLowerCase().includes(texto) || 
                                    cli.nombre.toLowerCase().includes(texto)
                                );
                                renderizarTablaClientes(resultados);
                            });
                        }

                        // 1. Registrar Nuevo Cliente con validación de error (Cédula duplicada)
                        const formCliente = document.getElementById('form-cliente');
                        if (formCliente) {
                            formCliente.addEventListener('submit', (e) => {
                                e.preventDefault();

                                const nuevoCliente = {
                                    nombre: document.getElementById('nombre-cliente').value,
                                    cedula: document.getElementById('cedula-cliente').value,
                                    telefono: document.getElementById('telefono-cliente').value,
                                    email: document.getElementById('email-cliente').value,
                                    direccion: document.getElementById('direccion-cliente').value
                                };

                                fetch('https://localhost:7137/api/clientes', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(nuevoCliente)
                                })
                                .then(async response => {
                                    if (response.ok) {
                                        formCliente.reset();
                                        cargarClientes();
                                        alert('¡Cliente registrado con éxito!');
                                    } else {
                                        const mensajeError = await response.text();
                                        alert('Error: ' + mensajeError);
                                    }
                                })
                                .catch(err => console.error('Error en POST:', err));
                            });
                        }

                        // 2. Editar / Actualizar Cliente Existente
                        const formEditarCliente = document.getElementById('form-editar-cliente');
                        const btnCancelarEditCliente = document.getElementById('btn-cancelar-edit-cliente');

                        if (btnCancelarEditCliente) {
                            btnCancelarEditCliente.addEventListener('click', () => {
                                document.getElementById('card-formulario-cliente').style.display = 'none';
                                formEditarCliente.reset();
                            });
                        }

                        if (formEditarCliente) {
                            formEditarCliente.addEventListener('submit', (e) => {
                                e.preventDefault();
                                const id = document.getElementById('edit-cliente-id').value;

                                const clienteActualizado = {
                                    id: parseInt(id),
                                    nombre: document.getElementById('edit-cliente-nombre').value,
                                    cedula: document.getElementById('edit-cliente-cedula').value,
                                    telefono: document.getElementById('edit-cliente-telefono').value,
                                    email: document.getElementById('edit-cliente-email').value,
                                    direccion: document.getElementById('edit-cliente-direccion').value
                                };

                                fetch(`https://localhost:7137/api/clientes/${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(clienteActualizado)
                                })
                                .then(async response => {
                                    if (response.ok) {
                                        alert('¡Cliente actualizado con éxito!');
                                        document.getElementById('card-formulario-cliente').style.display = 'none';
                                        formEditarCliente.reset();
                                        cargarClientes();
                                    } else {
                                        const mensajeError = await response.text();
                                        alert('Error al actualizar: ' + mensajeError);
                                    }
                                })
                                .catch(err => console.error('Error en PUT Cliente:', err));
                            });
                        }
                    }, 100);
                    break;
case 'pos':
                    sectionTitle.textContent = 'Punto de Venta (POS)';
                    contentBody.innerHTML = `
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                            <div class="card">
                                <h3>Seleccionar Productos</h3>
                                <div style="display: flex; gap: 10px; margin-top: 15px; margin-bottom: 15px;">
                                    <div style="flex: 2; position: relative;">
                                        <input type="text" id="input-buscar-producto" placeholder="Escribe para buscar por iniciales o nombre..." list="lista-sugerencias-productos" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                        <datalist id="lista-sugerencias-productos">
                                            <!-- Las recomendaciones se cargan dinámicamente aquí -->
                                        </datalist>
                                        <input type="hidden" id="producto-seleccionado-id" value="">
                                    </div>
                                    <input type="number" id="cantidad-producto" value="1" min="1" style="padding: 8px; width: 80px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                    <button type="button" id="btn-agregar-carrito" style="padding: 8px 15px; background-color: #1e293b; color: white; border: none; border-radius: 4px; cursor: pointer;">Agregar</button>
                                </div>
                                <h4>Carrito de Compras</h4>
                                <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                                    <thead>
                                        <tr style="background-color:#1e293b; color: white; text-align: left;">
                                            <th style="padding: 8px;">Producto</th>
                                            <th style="padding: 8px;">Precio</th>
                                            <th style="padding: 8px; text-align: center;">Cantidad</th>
                                            <th style="padding: 8px;">Subtotal</th> 
                                            <th style="padding: 8px; text-align: center;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="carrito-body">
                                        <tr><td colspan="5" style="padding: 10px; text-align: center; color: #64748b;">No hay productos en el carrito.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="card">
                                <h3>Datos de la venta</h3>
                                <div style="margin-top: 15px; margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Buscar Cliente (Opcional):</label>
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" id="busqueda-cedula" placeholder="Digite la cédula..." style="padding: 8px; flex: 1; border: 1px solid #cbd5e1; border-radius: 4px;">
                                        <button type="button" id="btn-buscar-cliente" style="padding: 8px 12px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Buscar</button>
                                    </div>
                                </div>

                                <div id="info-cliente-container" style="margin-bottom: 15px; padding: 12px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; display: none;">
                                    <p style="margin: 0; color: #166534; font-weight: bold;" id="texto-cliente-encontrado"></p>
                                    <button type="button" id="btn-cambiar-cliente" style="margin-top: 6px; background: none; border: none; color: #2563eb; cursor: pointer; padding: 0; font-size: 0.85rem;">Cambiar cliente</button>
                                </div>

                                <div id="form-nuevo-cliente-pos" style="margin-bottom: 15px; padding: 12px; background: #fffbeb; border-radius: 6px; border: 1px solid #fde68a; display: none;">
                                    <h4 style="margin: 0 0 8px 0; color: #b45309; font-size: 0.95rem;">Cliente no encontrado. Regístrese aquí:</h4>
                                    <input type="text" id="pos-nuevo-nombre" placeholder="Nombre completo" required style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                    <input type="text" id="pos-nuevo-telefono" placeholder="Número de teléfono" required style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                    <input type="email" id="pos-nuevo-email" placeholder="Correo electrónico" style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                    <input type="text" id="pos-nuevo-direccion" placeholder="Dirección" required style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                    <button type="button" id="btn-registrar-rapido" style="width: 100%; padding: 8px; background-color: #d97706; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Registrar y Seleccionar</button>
                                </div>

                                <input type="hidden" id="cliente-seleccionado-id" value="">

                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                                    <h4 style="margin: 0 0 10px 0;">Resumen y Pago</h4>
                                    <p style="font-size: 1.2rem; font-weight: bold; margin: 0 0 10px 0;">Total: $<span id="span-total">0.00</span></p>
                                    
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: block; font-size: 0.85rem; margin-bottom: 4px; font-weight: bold;">Método de Pago:</label>
                                        <select id="select-metodo-pago" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Datáfono">Datáfono</option>
                                        </select>

                                        <label style="display: block; font-size: 0.85rem; margin-bottom: 4px; font-weight: bold;">Monto Recibido / Pagado:</label>
                                        <input type="number" id="input-monto-pago" placeholder="0.00" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;" min="0" step="0.01">
                                    </div>
                                    
                                    <p style="font-size: 1rem; font-weight: bold; margin: 8px 0 0 0; color: #16a34a;">Cambio (Vueltos): $<span id="span-cambio">0.00</span></p>
                                </div>
                                <button type="button" id="btn-procesar-venta" style="width: 100%; padding: 12px; background-color: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-bottom: 8px;">Procesar Venta</button>
                                <button type="button" id="btn-cancelar-venta" style="width: 100%; padding: 10px; background-color: #64748b; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Cancelar Venta</button>
                            </div>
                        </div>
                    `;

                    let carrito = [];
                    let productosGlobal = [];
                    let clientesGlobal = [];

                    function renderizarDatalistProductos(listaProductos) {
                        const datalist = document.getElementById('lista-sugerencias-productos');
                        datalist.innerHTML = '';
                        listaProductos.forEach(p => {
                            datalist.innerHTML += `<option value="${p.nombre} - $${p.precio} (Stock: ${p.stock})">`;
                        });
                    }

                    function cargarDatosPOS() {
                        fetch('https://localhost:7137/api/productos')
                            .then(res => res.json())
                            .then(data => {
                                productosGlobal = data;
                                renderizarDatalistProductos(productosGlobal);
                            });

                        fetch('https://localhost:7137/api/clientes')
                            .then(res => res.json())
                            .then(data => {
                                clientesGlobal = data;
                            });
                    }

                    cargarDatosPOS();

                    setTimeout(() => {
                        const btnAgregar = document.getElementById('btn-agregar-carrito');
                        const btnProcesar = document.getElementById('btn-procesar-venta');
                        const btnCancelarVenta = document.getElementById('btn-cancelar-venta');
                        const btnBuscarCliente = document.getElementById('btn-buscar-cliente');
                        const inputBusquedaCedula = document.getElementById('busqueda-cedula');
                        const infoClienteContainer = document.getElementById('info-cliente-container');
                        const textoClienteEncontrado = document.getElementById('texto-cliente-encontrado');
                        const formNuevoClientePos = document.getElementById('form-nuevo-cliente-pos');
                        const clienteSeleccionadoIdInput = document.getElementById('cliente-seleccionado-id');
                        const btnRegistrarRapido = document.getElementById('btn-registrar-rapido');
                        const btnCambiarCliente = document.getElementById('btn-cambiar-cliente');
                        
                        const inputBuscarProducto = document.getElementById('input-buscar-producto');
                        const productoSeleccionadoIdInput = document.getElementById('producto-seleccionado-id');
                        const inputMontoPago = document.getElementById('input-monto-pago');
                        const selectMetodoPago = document.getElementById('select-metodo-pago');
                        const spanCambio = document.getElementById('span-cambio');
                        const spanTotal = document.getElementById('span-total');

                        inputBuscarProducto.addEventListener('input', () => {
                            const valorEscrito = inputBuscarProducto.value.trim();
                            const productoEncontrado = productosGlobal.find(p => 
                                valorEscrito.includes(p.nombre) || p.nombre.toLowerCase() === valorEscrito.toLowerCase()
                            );

                            if (productoEncontrado) {
                                productoSeleccionadoIdInput.value = productoEncontrado.id;
                            } else {
                                productoSeleccionadoIdInput.value = '';
                            }
                        });

                        function calcularCambio() {
                            const totalGeneral = carrito.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
                            const montoPagado = parseFloat(inputMontoPago.value) || 0;
                            const cambio = montoPagado - totalGeneral;
                            spanCambio.textContent = cambio >= 0 ? cambio.toFixed(2) : '0.00';
                        }

                        inputMontoPago.addEventListener('input', calcularCambio);

                        btnBuscarCliente.addEventListener('click', () => {
                            const cedulaBuscada = inputBusquedaCedula.value.trim();
                            if (!cedulaBuscada) {
                                alert('Por favor ingrese un número de cédula para buscar.');
                                return;
                            }

                            const clienteEncontrado = clientesGlobal.find(c => c.cedula === cedulaBuscada);

                            if (clienteEncontrado) {
                                clienteSeleccionadoIdInput.value = clienteEncontrado.id;
                                textoClienteEncontrado.textContent = `✔ Cliente: ${clienteEncontrado.nombre} (Cédula: ${clienteEncontrado.cedula})`;
                                infoClienteContainer.style.display = 'block';
                                formNuevoClientePos.style.display = 'none';
                                inputBusquedaCedula.disabled = true;
                                btnBuscarCliente.disabled = true;
                            } else {
                                clienteSeleccionadoIdInput.value = '';
                                infoClienteContainer.style.display = 'none';
                                formNuevoClientePos.style.display = 'block';
                                alert('Cliente no encontrado. Puede registrarlo abajo de forma rápida o continuar sin cliente.');
                            }
                        });

                        btnCambiarCliente.addEventListener('click', () => {
                            clienteSeleccionadoIdInput.value = '';
                            infoClienteContainer.style.display = 'none';
                            inputBusquedaCedula.value = '';
                            inputBusquedaCedula.disabled = false;
                            btnBuscarCliente.disabled = false;
                        });

                        btnRegistrarRapido.addEventListener('click', () => {
                            const nombre = document.getElementById('pos-nuevo-nombre').value.trim();
                            const cedula = inputBusquedaCedula.value.trim();
                            const telefono = document.getElementById('pos-nuevo-telefono').value.trim();
                            const email = document.getElementById('pos-nuevo-email').value.trim();
                            const direccion = document.getElementById('pos-nuevo-direccion').value.trim();

                            if (!nombre || !cedula || !telefono || !direccion) {
                                alert('Por favor complete todos los campos para el registro del cliente.');
                                return;
                            }

                            const nuevoCliente = { nombre, cedula, telefono, email, direccion };

                            fetch('https://localhost:7137/api/clientes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(nuevoCliente)
                            })
                            .then(response => {
                                if (response.ok) {
                                    return response.json().catch(() => null);
                                } else {
                                    throw new Error('Error al registrar el cliente.');
                                }
                            })
                            .then(() => fetch('https://localhost:7137/api/clientes'))
                            .then(res => res.json())
                            .then(data => {
                                clientesGlobal = data;
                                const clienteCreado = clientesGlobal.find(c => c.cedula === cedula);
                                if (clienteCreado) {
                                    clienteSeleccionadoIdInput.value = clienteCreado.id;
                                    textoClienteEncontrado.textContent = `✔ Cliente Registrado y Seleccionado: ${clienteCreado.nombre} (Cédula: ${clienteCreado.cedula})`;
                                    infoClienteContainer.style.display = 'block';
                                    formNuevoClientePos.style.display = 'none';
                                    inputBusquedaCedula.disabled = true;
                                    btnBuscarCliente.disabled = true;
                                    alert('¡Cliente registrado con éxito y asignado a la venta!');
                                }
                            })
                            .catch(err => {
                                console.error('Error:', err);
                                alert('No se pudo registrar el cliente.');
                            });
                        });

                        btnAgregar.addEventListener('click', () => {
                            const prodId = parseInt(productoSeleccionadoIdInput.value);
                            const cantidad = parseInt(document.getElementById('cantidad-producto').value);

                            if (!prodId) {
                                alert('Por favor seleccione o escriba un producto válido de la lista.');
                                return;
                            }
                            if (cantidad <= 0) {
                                alert('La cantidad debe ser mayor a 0.');
                                return;
                            }

                            const productoInfo = productosGlobal.find(p => p.id === prodId);
                            if (!productoInfo) return;

                            if (productoInfo.stock < cantidad) {
                                alert(`Stock insuficiente. Stock disponible: ${productoInfo.stock}`);
                                return;
                            }

                            const itemExistente = carrito.find(item => item.idProducto === prodId);
                            if (itemExistente) {
                                if (productoInfo.stock < (itemExistente.cantidad + cantidad)) {
                                    alert('No hay suficiente stock para agregar más unidades.');
                                    return;
                                }
                                itemExistente.cantidad += cantidad;
                            } else {
                                carrito.push({
                                    idProducto: prodId,
                                    nombre: productoInfo.nombre,
                                    precioUnitario: productoInfo.precio,
                                    cantidad: cantidad
                                });
                            }

                            actualizarCarritoUI();

                            document.getElementById('cantidad-producto').value = '1';
                            inputBuscarProducto.value = '';
                            productoSeleccionadoIdInput.value = '';
                        });

                        function actualizarCarritoUI() {
                            const tbody = document.getElementById('carrito-body');
                            tbody.innerHTML = '';

                            if (carrito.length === 0) {
                                tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #64748b;">No hay productos en el carrito.</td></tr>';
                                spanTotal.textContent = '0.00';
                                spanCambio.textContent = '0.00';
                                return;
                            }

                            let totalGeneral = 0;
                            carrito.forEach((item, index) => {
                                const subtotal = item.precioUnitario * item.cantidad;
                                totalGeneral += subtotal;
                                tbody.innerHTML += `
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 8px;">${item.nombre}</td>
                                        <td style="padding: 8px;">$${item.precioUnitario}</td>
                                        <td style="padding: 8px; text-align: center;">
                                            <input type="number" class="input-cambiar-cantidad" data-index="${index}" value="${item.cantidad}" min="1" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
                                        </td>
                                        <td style="padding: 8px;">$${subtotal.toFixed(2)}</td>
                                        <td style="padding: 8px; text-align: center;">
                                            <button type="button" class="btn-eliminar-item" data-index="${index}" style="padding: 4px 8px; background-color: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Quitar</button>
                                        </td>
                                    </tr>
                                `;
                            });

                            spanTotal.textContent = totalGeneral.toFixed(2);
                            calcularCambio();

                            document.querySelectorAll('.input-cambiar-cantidad').forEach(input => {
                                input.addEventListener('change', (e) => {
                                    const index = e.target.getAttribute('data-index');
                                    const nuevaCantidad = parseInt(e.target.value);
                                    const productoInfo = productosGlobal.find(p => p.id === carrito[index].idProducto);

                                    if (nuevaCantidad <= 0 || isNaN(nuevaCantidad)) {
                                        alert('La cantidad debe ser al menos 1.');
                                        e.target.value = carrito[index].cantidad;
                                        return;
                                    }

                                    if (productoInfo && productoInfo.stock < nuevaCantidad) {
                                        alert(`Stock insuficiente. Stock disponible: ${productoInfo.stock}`);
                                        e.target.value = carrito[index].cantidad;
                                        return;
                                    }

                                    carrito[index].cantidad = nuevaCantidad;
                                    actualizarCarritoUI();
                                });
                            });

                            document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    const index = e.target.getAttribute('data-index');
                                    carrito.splice(index, 1);
                                    actualizarCarritoUI();
                                });
                            });
                        }

                        btnCancelarVenta.addEventListener('click', () => {
                            if (carrito.length === 0 && !clienteSeleccionadoIdInput.value) {
                                alert('No hay una venta en proceso para cancelar.');
                                return;
                            }

                            if (confirm('¿Estás seguro de que deseas cancelar el proceso de venta actual? Se perderán los datos ingresados.')) {
                                carrito = [];
                                actualizarCarritoUI();
                                
                                clienteSeleccionadoIdInput.value = '';
                                infoClienteContainer.style.display = 'none';
                                formNuevoClientePos.style.display = 'none';
                                inputBusquedaCedula.value = '';
                                inputBusquedaCedula.disabled = false;
                                btnBuscarCliente.disabled = false;

                                inputBuscarProducto.value = '';
                                productoSeleccionadoIdInput.value = '';
                                document.getElementById('cantidad-producto').value = '1';
                                inputMontoPago.value = '';
                                spanCambio.textContent = '0.00';

                                alert('Venta cancelada con éxito.');
                            }
                        });

                        btnProcesar.addEventListener('click', () => {
                            const clienteIdRaw = clienteSeleccionadoIdInput.value.trim();
                            const clienteId = clienteIdRaw ? parseInt(clienteIdRaw) : null;

                            if (carrito.length === 0) {
                                alert('El carrito de compras está vacío.');
                                return;
                            }

                            const totalGeneral = carrito.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
                            const montoPagado = parseFloat(inputMontoPago.value) || 0;
                            const metodoSeleccionado = selectMetodoPago.value;

                            if (montoPagado < totalGeneral) {
                                alert('El monto pagado es menor al total de la venta.');
                                return;
                            }

                            const cambio = montoPagado - totalGeneral;

                            const ventaData = {
                                idCliente: clienteId,
                                metodoPago: metodoSeleccionado,
                                detalleVenta: carrito.map(item => ({
                                    idProducto: item.idProducto,
                                    cantidad: item.cantidad
                                }))
                            };

                            fetch('https://localhost:7137/api/ventas', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(ventaData)
                            })
                            .then(response => {
                                if (response.ok) {
                                    alert(`¡Venta procesada con éxito!\nMétodo: ${metodoSeleccionado}\nCambio a devolver: $${cambio.toFixed(2)}`);
                                    carrito = [];
                                    inputMontoPago.value = '';
                                    actualizarCarritoUI();
                                    cargarDatosPOS();
                                    clienteSeleccionadoIdInput.value = '';
                                    infoClienteContainer.style.display = 'none';
                                    formNuevoClientePos.style.display = 'none';
                                    inputBusquedaCedula.value = '';
                                    inputBusquedaCedula.disabled = false;
                                    btnBuscarCliente.disabled = false;
                                } else {
                                    response.text().then(err => alert('Error al procesar la venta: ' + err));
                                }
                            })
                            .catch(error => console.error('Error en POST Venta:', error));
                        });
                    }, 100);
                    break;

             case 'ventas-dia':
                    sectionTitle.textContent = 'Ventas del Día';
                    contentBody.innerHTML = `
                        <div class="card" style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3>Total ventas del dia.</h3>
                                <div style="background-color: #f0fdf4; padding: 10px 15px; border-radius: 6px; border: 1px solid #bbf7d0;">
                                    <span style="font-weight: bold; color: #166534;">Total Vendido Hoy: $<span id="total-ventas-dia">0.00</span></span>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <h3>Detalle de Facturas (Haga clic en "Ver Detalle" para desplegar)</h3>
                            <div id="contenedor-tabla-ventas">
                                <p style="padding: 10px; color: #64748b;">Cargando ventas del día...</p>
                            </div>
                        </div>
                    `;

                    function cargarVentasDelDia() {
                        const fechaLocal = new Date().toLocaleDateString('en-CA');

                        fetch(`https://localhost:7137/api/Ventas/PorFecha?fecha=${fechaLocal}`)
                            .then(res => res.json())
                            .then(ventas => {
                                const contenedor = document.getElementById('contenedor-tabla-ventas');
                                const spanTotalDia = document.getElementById('total-ventas-dia');

                                if (!ventas || ventas.length === 0) {
                                    contenedor.innerHTML = '<p style="padding: 10px; text-align: center; color: #64748b;">No se han registrado ventas el día de hoy.</p>';
                                    spanTotalDia.textContent = '0.00';
                                    return;
                                }

                                let tablaHTML = `
                                    <table style="width:100%; border-collapse: collapse; margin-top:15px;">
                                        <thead>
                                            <tr style="background-color:#1e293b; color: white; text-align: left;">
                                                <th style="padding: 10px;">ID Venta</th>
                                                <th style="padding: 10px;">Hora</th>
                                                <th style="padding: 10px;">Cliente</th>
                                                <th style="padding: 10px;">Método Pago</th>
                                                <th style="padding: 10px; text-align: right;">Total</th>
                                                <th style="padding: 10px; text-align: center;">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                `;

                                let acumuladoTotal = 0;

                                ventas.forEach(venta => {
                                    const hora = venta.fecha ? venta.fecha.split('T')[1].substring(0, 5) : 'N/A';
                                    const nombreCliente = venta.idClienteNavigation ? venta.idClienteNavigation.nombre : 'Cliente General';
                                    const metodoPagoVenta = venta.metodoPago || 'Efectivo';
                                    
                                    let totalVenta = 0;
                                    let listaProductosHTML = '<ul style="margin: 0; padding-left: 20px;">';
                                    
                                    if (venta.detalleVenta && venta.detalleVenta.length > 0) {
                                        venta.detalleVenta.forEach(det => {
                                            const subtotal = det.cantidad * det.precioUnitario;
                                            totalVenta += subtotal;
                                            const prodNombre = det.idProductoNavigation ? det.idProductoNavigation.nombre : `ID: ${det.idProducto}`;
                                            listaProductosHTML += `<li style="margin-bottom: 4px;"><strong>${prodNombre}</strong> - Cantidad: ${det.cantidad} - Subtotal: $${subtotal.toFixed(2)}</li>`;
                                        });
                                    }
                                    listaProductosHTML += '</ul>';

                                    acumuladoTotal += totalVenta;

                                    tablaHTML += `
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            <td style="padding: 10px;">#${venta.id}</td>
                                            <td style="padding: 10px;">${hora}</td>
                                            <td style="padding: 10px;">${nombreCliente}</td>
                                            <td style="padding: 10px;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">${metodoPagoVenta}</span></td>
                                            <td style="padding: 10px; text-align: right; font-weight: bold;">$${totalVenta.toFixed(2)}</td>
                                            <td style="padding: 10px; text-align: center;">
                                                <button class="btn-desplegar" data-id="${venta.id}" style="background-color: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Ver Detalle ▼</button>
                                            </td>
                                        </tr>
                                        <tr id="detalle-${venta.id}" style="display: none; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                            <td colspan="6" style="padding: 15px 20px;">
                                                <div style="font-weight: bold; margin-bottom: 6px; color: #1e293b;">Productos de la Factura #${venta.id}:</div>
                                                ${listaProductosHTML}
                                            </td>
                                        </tr>
                                    `;
                                });

                                tablaHTML += `</tbody></table>`;
                                contenedor.innerHTML = tablaHTML;
                                spanTotalDia.textContent = acumuladoTotal.toFixed(2);

                                document.querySelectorAll('.btn-desplegar').forEach(btn => {
                                    btn.addEventListener('click', (e) => {
                                        const ventaId = e.target.getAttribute('data-id');
                                        const filaDetalle = document.getElementById(`detalle-${ventaId}`);

                                        if (filaDetalle.style.display === 'none') {
                                            filaDetalle.style.display = 'table-row';
                                            e.target.textContent = 'Ocultar ▲';
                                            e.target.style.backgroundColor = '#475569';
                                        } else {
                                            filaDetalle.style.display = 'none';
                                            e.target.textContent = 'Ver Detalle ▼';
                                            e.target.style.backgroundColor = '#2563eb';
                                        }
                                    });
                                });
                            })
                            .catch(err => {
                                console.error('Error al cargar ventas:', err);
                                document.getElementById('contenedor-tabla-ventas').innerHTML = '<p style="padding: 10px; color: red; text-align: center;">Error al cargar el reporte de ventas.</p>';
                            });
                    }

                    cargarVentasDelDia();
                    break;

                case 'producto-mas-vendido':
                    sectionTitle.textContent = 'Producto Más Vendido';
                    contentBody.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div class="card">
                                <h3>🏆 Producto con mayor demanda</h3>
                                <div id="contenedor-producto-general" style="margin-top: 15px;">
                                    <p style="color: #64748b;">Cargando general...</p>
                                </div>
                            </div>
                            <div class="card">
                                <h3>📅 Más Vendido del Día</h3>
                                <div style="margin-top: 10px; margin-bottom: 15px; display: flex; gap: 8px; align-items: center;">
                                    <input type="date" id="filtro-fecha-estrella" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                    <button type="button" id="btn-consultar-dia" style="padding: 6px 12px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Consultar</button>
                                </div>
                                <div id="contenedor-producto-diario">
                                    <p style="color: #64748b;">Cargando diario...</p>
                                </div>
                            </div>
                        </div>
                    `;

                    fetch('https://localhost:7137/api/Ventas/ProductoMasVendido')
                        .then(res => res.json())
                        .then(data => {
                            const contenedor = document.getElementById('contenedor-producto-general');
                            const prod = data.producto;
                            if (!prod) {
                                contenedor.innerHTML = '<p style="color: #64748b;">Sin registros.</p>';
                                return;
                            }
                            contenedor.innerHTML = `
                                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <h4 style="margin: 0 0 5px 0; color: #1e293b; font-size: 1.1rem;">${prod.nombre}</h4>
                                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem;">Categoría: ${prod.categoria || 'General'}</p>
                                    <p style="margin: 0; font-weight: bold; color: #16a34a;">Total histórico: ${data.totalUnidadesVendidas} unidades</p>
                                </div>
                            `;
                        })
                        .catch(() => {
                            document.getElementById('contenedor-producto-general').innerHTML = '<p style="color: red;">Sin datos suficientes.</p>';
                        });

                    function cargarEstrellaDiario(fechaStr = '') {
                        let url = 'https://localhost:7137/api/Ventas/ProductoMasVendidoDiario';
                        if (fechaStr) {
                            url += `?fecha=${fechaStr}`;
                        }

                        fetch(url)
                            .then(res => {
                                if (!res.ok) throw new Error('Sin ventas');
                                return res.json();
                            })
                            .then(data => {
                                const contenedor = document.getElementById('contenedor-producto-diario');
                                const prod = data.producto;
                                contenedor.innerHTML = `
                                    <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <h4 style="margin: 0 0 5px 0; color: #1e293b; font-size: 1.1rem;">${prod.nombre}</h4>
                                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem;">Fecha consultada: ${data.fechaConsulta}</p>
                                        <p style="margin: 0; font-weight: bold; color: #2563eb;">Vendidos hoy: ${data.totalUnidadesVendidas} unidades</p>
                                    </div>
                                `;
                            })
                            .catch(() => {
                                document.getElementById('contenedor-producto-diario').innerHTML = '<p style="color: #d97706; font-size: 0.9rem;">No hay ventas registradas en esta fecha.</p>';
                            });
                    }

                    setTimeout(() => {
                        const inputFecha = document.getElementById('filtro-fecha-estrella');
                        const fechaLocal = new Date().toLocaleDateString('en-CA');
                        inputFecha.value = fechaLocal;

                        cargarEstrellaDiario(fechaLocal);

                        document.getElementById('btn-consultar-dia').addEventListener('click', () => {
                            cargarEstrellaDiario(inputFecha.value);
                        });
                    }, 100);
                    break;

                default:
                    sectionTitle.textContent = 'Dashboard';
                    break;
            }
        });
    }); 
});