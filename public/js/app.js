// =================================================================================
// AMAZON BUSINESS - SISTEMA DE FACTURACIÓN AVANZADO
// =================================================================================

// ---------------------------------------------------------------------------------
// 1. VARIABLES GLOBALES Y ESTADO DE LA APLICACIÓN
// ---------------------------------------------------------------------------------

let productos = [];
let clientes = [];
let facturas = [];
let facturaActual = {
    cliente: null,
    productos: [],
    fecha: null,
    ubicacion: null,
    metodoPago: 'transferencia',
    prioridad: 'normal'
};
let currentCamera = null;
let currentImageType = '';
let productosFiltrados = [];
let searchTimeout = null;

// Sistema de autenticación simple
let isAdmin = false;
let adminSessionTimer = null;
const ADMIN_SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutos en milisegundos
const adminCredentials = {
    username: 'admin',
    password: '123'
};


// ---------------------------------------------------------------------------------
// 2. INICIALIZACIÓN DE LA APLICACIÓN
// ---------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
    // Carga inicial de datos y configuración
    cargarDatos();
    inicializarFormularios();
    actualizarSelectores();
    verificarAutenticacionAdmin();

    // Configurar la fecha de entrega por defecto para mañana
    const fechaEntregaInput = document.getElementById('fechaEntrega');
    if (fechaEntregaInput) {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        fechaEntregaInput.valueAsDate = manana;
    }

    // APIs Web
    solicitarPermisoNotificaciones();
    inicializarBusqueda();

    // Cargar datos de ejemplo si es la primera vez
    setTimeout(cargarDatosEjemplo, 500);
});


// ---------------------------------------------------------------------------------
// 3. GESTIÓN DE DATOS (PERSISTENCIA CON LOCALSTORAGE)
// ---------------------------------------------------------------------------------

function guardarDatos() {
    try {
        localStorage.setItem('amazonBusiness_productos', JSON.stringify(productos));
        localStorage.setItem('amazonBusiness_clientes', JSON.stringify(clientes));
        localStorage.setItem('amazonBusiness_facturas', JSON.stringify(facturas));
        localStorage.setItem('adminLoggedIn', JSON.stringify(isAdmin));
    } catch (error) {
        console.error('Error al guardar datos en localStorage:', error);
        mostrarNotificacion('❌ No se pudieron guardar los datos', 'error');
    }
}

function cargarDatos() {
    try {
        productos = JSON.parse(localStorage.getItem('amazonBusiness_productos')) || [];
        clientes = JSON.parse(localStorage.getItem('amazonBusiness_clientes')) || [];
        facturas = JSON.parse(localStorage.getItem('amazonBusiness_facturas')) || [];
    } catch (error) {
        console.error('Error al cargar datos de localStorage:', error);
        productos = [];
        clientes = [];
        facturas = [];
    }

    // Inicializar productos filtrados
    productosFiltrados = [...productos];
    
    actualizarTodasLasVistas();
}

function actualizarTodasLasVistas() {
    actualizarVistaProductos();
    actualizarTablaAdminProductos();
    actualizarTablaAdminClientes();
    actualizarVistaFacturas();
    actualizarVistaCarrito();
    actualizarSelectores();
}


// ---------------------------------------------------------------------------------
// 4. NAVEGACIÓN Y VISUALIZACIÓN DE SECCIONES
// ---------------------------------------------------------------------------------

function showSection(sectionName) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    document.querySelector(`section#${sectionName}`).classList.add('active');

    document.querySelectorAll('header nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`#nav-${sectionName}`).classList.add('active');

    if (sectionName === 'admin' && !isAdmin) {
        mostrarLoginAdmin();
    }

    // Actualizar vista específica según la sección
    if (sectionName === 'carrito') {
        actualizarVistaCarrito();
    } else if (sectionName === 'facturacion') {
        actualizarVistaCheckout();
        actualizarInfoClienteSeleccionado();
    } else if (sectionName === 'admin' && isAdmin) {
        // Actualizar las tablas del panel de administración
        actualizarTablaAdminProductos();
        actualizarTablaAdminClientes();
    }
}


// ---------------------------------------------------------------------------------
// 5. SISTEMA DE BÚSQUEDA Y FILTROS (SIN CAMBIOS)
// ---------------------------------------------------------------------------------

function inicializarBusqueda() {
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => realizarBusqueda(this.value), 300);
        });
    }
}

function realizarBusqueda(termino) {
    termino = termino.toLowerCase().trim();
    if (!termino) {
        productosFiltrados = [...productos];
        actualizarContadorResultados('Mostrando todos los productos');
        ocultarBotonLimpiar();
    } else {
        productosFiltrados = productos.filter(p =>
            p.nombre.toLowerCase().includes(termino) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(termino)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termino))
        );
        actualizarContadorResultados(`Se encontraron ${productosFiltrados.length} productos`);
        mostrarBotonLimpiar();
    }
    actualizarVistaProductos();
}

// Nueva función para buscar productos (llamada desde el botón)
function buscarProductos() {
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        realizarBusqueda(searchInput.value);
    }
}

// Función para filtrar por categoría
function filtrarPorCategoria(categoria) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${categoria}"]`).classList.add('active');
    
    if (categoria === 'todas') {
        productosFiltrados = [...productos];
        actualizarContadorResultados('Mostrando todos los productos');
        ocultarBotonLimpiar();
    } else {
        productosFiltrados = productos.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase()
        );
        actualizarContadorResultados(`Categoría: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)} (${productosFiltrados.length} productos)`);
        mostrarBotonLimpiar();
    }
    
    actualizarVistaProductos();
    
    // Limpiar búsqueda
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Función para limpiar filtros
function limpiarFiltros() {
    // Limpiar búsqueda
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Resetear filtros de categoría
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-category="todas"]').classList.add('active');
    
    // Mostrar todos los productos
    productosFiltrados = [...productos];
    actualizarContadorResultados('Mostrando todos los productos');
    ocultarBotonLimpiar();
    actualizarVistaProductos();
}

// Funciones auxiliares para la interfaz
function actualizarContadorResultados(texto) {
    const contador = document.getElementById('results-count');
    if (contador) {
        contador.textContent = texto;
    }
}

function mostrarBotonLimpiar() {
    const boton = document.getElementById('clear-filters-btn');
    if (boton) {
        boton.classList.remove('d-none');
    }
}

function ocultarBotonLimpiar() {
    const boton = document.getElementById('clear-filters-btn');
    if (boton) {
        boton.classList.add('d-none');
    }
}


// ---------------------------------------------------------------------------------
// 6. GESTIÓN DE PRODUCTOS (CRUD) - REFACTORIZADO PARA MODAL
// ---------------------------------------------------------------------------------

function showEditProductModal(id = null) {
    if (!verificarPermisosAdmin()) return;

    const esNuevo = id === null;
    const producto = esNuevo ? {} : productos.find(p => p.id === id);
    if (!esNuevo && !producto) return;

    const modalTitle = esNuevo ? 'Agregar Nuevo Producto' : 'Editar Producto';
    const modalBody = `
        <form id="product-form">
            <input type="hidden" id="productId" value="${producto.id || ''}">
            <div class="form-group">
                <label for="productName">Nombre del Producto</label>
                <input type="text" id="productName" value="${producto.nombre || ''}" required>
            </div>
            <div class="form-group">
                <label for="productCategory">Categoría</label>
                <select id="productCategory" required>
                    <option value="">-- Seleccionar Categoría --</option>
                    <option value="tecnologia" ${producto.categoria === 'tecnologia' ? 'selected' : ''}>Tecnología</option>
                    <option value="audio" ${producto.categoria === 'audio' ? 'selected' : ''}>Audio</option>
                    <option value="monitores" ${producto.categoria === 'monitores' ? 'selected' : ''}>Monitores</option>
                    <option value="electrodomesticos" ${producto.categoria === 'electrodomesticos' ? 'selected' : ''}>Electrodomésticos</option>
                </select>
            </div>
            <div class="form-group">
                <label for="productPrice">Precio</label>
                <input type="number" id="productPrice" step="0.01" value="${producto.precio || ''}" required>
            </div>
            <div class="form-group">
                <label for="productStock">Cantidad (Stock)</label>
                <input type="number" id="productStock" value="${producto.cantidad || ''}" required>
            </div>
            <div class="form-group">
                <label for="productDescription">Descripción (Opcional)</label>
                <textarea id="productDescription" rows="3" placeholder="Descripción del producto...">${producto.descripcion || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="productImage">URL de la Imagen</label>
                <input type="text" id="productImage" value="${producto.imagen || ''}">
            </div>
            <div class="form-group">
                <label>Foto del producto</label>
                <button type="button" class="btn btn-secondary" onclick="startCamera('product')">
                    <i class="fas fa-camera"></i> Tomar Foto
                </button>
                <input type="file" accept="image/*" onchange="loadImageFromFile(this, 'product')" style="display:none;" id="product-file-input">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('product-file-input').click()">
                    <i class="fas fa-upload"></i> Subir Imagen
                </button>
                <div id="camera-container-product" class="photo-preview" style="${producto.imagen ? 'display: block;' : ''}">${producto.imagen ? `<img src="${producto.imagen}" alt="Preview">` : ''}</div>
            </div>
            <button type="submit" class="btn btn-primary">${esNuevo ? 'Agregar Producto' : 'Guardar Cambios'}</button>
        </form>
    `;

    mostrarModal(modalTitle, modalBody);

    document.getElementById('product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('productName').value.trim();
        const categoria = document.getElementById('productCategory').value;
        const precio = parseFloat(document.getElementById('productPrice').value);
        const cantidad = parseInt(document.getElementById('productStock').value);
        const descripcion = document.getElementById('productDescription').value.trim();
        let imagen = document.getElementById('productImage').value;
        const previewImg = document.querySelector('#camera-container-product .photo-preview');

        if (previewImg && previewImg.src) {
            imagen = previewImg.src;
        }

        if (!nombre || !categoria || isNaN(precio) || isNaN(cantidad)) {
            mostrarNotificacion('Por favor, complete todos los campos requeridos.', 'error');
            return;
        }

        if (precio <= 0) {
            mostrarNotificacion('El precio debe ser mayor a 0.', 'error');
            return;
        }

        if (cantidad < 0) {
            mostrarNotificacion('La cantidad no puede ser negativa.', 'error');
            return;
        }

        if (esNuevo) {
            const nuevoProducto = {
                id: Date.now(),
                nombre,
                categoria,
                precio,
                cantidad,
                descripcion,
                imagen,
                fechaRegistro: new Date().toISOString()
            };
            productos.push(nuevoProducto);
            mostrarNotificacion('✅ Producto agregado exitosamente', 'success');
        } else {
            producto.nombre = nombre;
            producto.categoria = categoria;
            producto.precio = precio;
            producto.cantidad = cantidad;
            producto.descripcion = descripcion;
            producto.imagen = imagen;
            producto.fechaModificacion = new Date().toISOString();
            mostrarNotificacion('✅ Producto actualizado exitosamente', 'success');
        }

        guardarDatos();
        actualizarTodasLasVistas();
        closeModal();
        
        // Cerrar sesión de administrador automáticamente después del registro
        if (esNuevo) {
            cerrarSesionAdminAutomaticamente();
        }
    });
}

function eliminarProducto(id) {
    if (!verificarPermisosAdmin()) return;
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        productos = productos.filter(p => p.id !== id);
        guardarDatos();
        actualizarTodasLasVistas();
        mostrarNotificacion('Producto eliminado.', 'success');
    }
}


// ---------------------------------------------------------------------------------
// 7. GESTIÓN DE CLIENTES (CRUD) - REFACTORIZADO PARA MODAL
// ---------------------------------------------------------------------------------

function showEditClientModal(id = null) {
    const esNuevo = id === null;
    const cliente = esNuevo ? {} : clientes.find(c => c.id === id);
    if (!esNuevo && !cliente) return;

    const modalTitle = esNuevo ? 'Agregar Nuevo Cliente' : 'Editar Cliente';
    const modalBody = `
        <div class="modal-header">
            <h3 class="modal-title">
                <i class="fas fa-user-plus"></i> ${modalTitle}
            </h3>
            <p class="modal-subtitle">
                ${esNuevo ? 'Complete la información del nuevo cliente' : 'Modifique la información del cliente'}
            </p>
        </div>
        
        <form id="client-form">
            <input type="hidden" id="clientId" value="${cliente.id || ''}">
            
            <!-- Información básica -->
            <div class="form-row">
                <div class="form-group required">
                    <label for="clientName">
                        <i class="fas fa-user"></i> Nombre Completo
                    </label>
                    <input 
                        type="text" 
                        id="clientName" 
                        value="${cliente.nombre || ''}" 
                        placeholder="Ej: Juan Pérez"
                        required
                        autocomplete="name"
                    >
                </div>
                
                <div class="form-group required">
                    <label for="clientEmail">
                        <i class="fas fa-envelope"></i> Correo Electrónico
                    </label>
                    <input 
                        type="email" 
                        id="clientEmail" 
                        value="${cliente.email || ''}" 
                        placeholder="ejemplo@correo.com"
                        required
                        autocomplete="email"
                    >
                </div>
            </div>

            <!-- Información adicional -->
            <div class="form-row">
                <div class="form-group">
                    <label for="clientPhone">
                        <i class="fas fa-phone"></i> Teléfono (Opcional)
                    </label>
                    <input 
                        type="text" 
                        id="clientPhone" 
                        value="${cliente.telefono || ''}" 
                        placeholder="(123) 456-7890"
                        autocomplete="tel"
                    >
                </div>
                
                <div class="form-group">
                    <label for="clientCedula">
                        <i class="fas fa-id-card"></i> Cédula (Opcional)
                    </label>
                    <input 
                        type="text" 
                        id="clientCedula" 
                        value="${cliente.cedula || ''}" 
                        placeholder="1234567890"
                        maxlength="10"
                    >
                </div>
            </div>

            <!-- Foto del cliente -->
            <div class="form-group">
                <label>
                    <i class="fas fa-camera"></i> Foto del Cliente
                </label>
                <div class="photo-upload-section">
                    <div class="photo-upload-buttons">
                        <button type="button" class="btn btn-secondary" onclick="startCamera('client')">
                            <i class="fas fa-camera"></i> Tomar Foto
                        </button>
                        <input type="file" accept="image/*" onchange="loadImageFromFile(this, 'client')" style="display:none;" id="client-file-input">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('client-file-input').click()">
                            <i class="fas fa-upload"></i> Subir Imagen
                        </button>
                        ${cliente.imagen ? `<button type="button" class="btn btn-danger" onclick="removeClientPhoto()"><i class="fas fa-trash"></i> Remover</button>` : ''}
                    </div>
                    <div id="camera-container-client" class="photo-preview-container" style="${cliente.imagen ? 'display: block;' : 'display: none;'}">
                        ${cliente.imagen ? `<img src="${cliente.imagen}" alt="Preview" class="photo-preview"><button type="button" class="photo-remove-btn" onclick="removeClientPhoto()">×</button>` : ''}
                    </div>
                    ${!cliente.imagen ? '<p style="color: #666; font-size: 14px; margin: 0;">No se ha seleccionado ninguna imagen</p>' : ''}
                </div>
            </div>
            
            <!-- Ubicación del cliente -->
            <div class="form-group">
                <label>
                    <i class="fas fa-map-marker-alt"></i> Ubicación del Cliente
                </label>
                <div class="geolocation-section" style="margin-top: 10px; padding-top: 15px;">
                    <button type="button" id="capture-client-location-btn" class="btn btn-secondary" onclick="obtenerUbicacionCliente()">
                        <i class="fas fa-location-arrow"></i> 
                        ${cliente.ubicacion ? 'Actualizar Ubicación' : 'Capturar Ubicación'}
                    </button>
                    <div id="client-location-info" class="location-info" style="margin-top: 15px;">
                        <p id="client-location-status" class="location-status ${cliente.ubicacion ? 'success' : ''}">
                            ${cliente.ubicacion ? '✅ Ubicación guardada' : 'Ubicación no capturada'}
                        </p>
                        <div id="client-location-details" class="${cliente.ubicacion ? '' : 'd-none'}">
                            <p><strong>Latitud:</strong> <span id="client-location-lat">${cliente.ubicacion?.latitud?.toFixed(6) || '-'}</span></p>
                            <p><strong>Longitud:</strong> <span id="client-location-lng">${cliente.ubicacion?.longitud?.toFixed(6) || '-'}</span></p>
                            <p><strong>Precisión:</strong> <span id="client-location-accuracy">${cliente.ubicacion ? Math.round(cliente.ubicacion.precision || 0) : '-'}</span> metros</p>
                            <div id="client-location-address-container" class="${cliente.ubicacion?.direccionAproximada ? '' : 'd-none'}">
                                <p><strong>Zona:</strong> <span id="client-location-address">${cliente.ubicacion?.direccionAproximada || ''}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 
                    ${esNuevo ? 'Agregar Cliente' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    `;

    mostrarModal('', modalBody, 'large'); // Pasar título vacío para evitar duplicación

    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('clientName').focus();
    }, 100);

    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('clientName').value.trim();
        const email = document.getElementById('clientEmail').value.trim();
        const telefono = document.getElementById('clientPhone').value.trim();
        const cedula = document.getElementById('clientCedula').value.trim();
        const imagen = document.querySelector('#camera-container-client .photo-preview')?.src || '';

        // Obtener ubicación actual del cliente si fue capturada
        let ubicacionCliente = cliente.ubicacion || null;
        if (window.tempClientLocation) {
            ubicacionCliente = window.tempClientLocation;
            delete window.tempClientLocation;
        }

        // Validaciones
        if (!nombre) {
            mostrarNotificacion('El nombre es requerido.', 'error');
            document.getElementById('clientName').focus();
            return;
        }

        if (!email) {
            mostrarNotificacion('El email es requerido.', 'error');
            document.getElementById('clientEmail').focus();
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            mostrarNotificacion('Por favor, ingresa un email válido.', 'error');
            document.getElementById('clientEmail').focus();
            return;
        }

        // Verificar email duplicado
        const emailExistente = clientes.find(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== cliente.id);
        if (emailExistente) {
            mostrarNotificacion('Ya existe un cliente con este email.', 'error');
            document.getElementById('clientEmail').focus();
            return;
        }

        // Validar cédula si se proporciona
        if (cedula && !/^\d{10}$/.test(cedula)) {
            mostrarNotificacion('La cédula debe tener exactamente 10 dígitos.', 'error');
            document.getElementById('clientCedula').focus();
            return;
        }

        // Verificar cédula duplicada si se proporciona
        if (cedula) {
            const cedulaExistente = clientes.find(c => c.cedula === cedula && c.id !== cliente.id);
            if (cedulaExistente) {
                mostrarNotificacion('Ya existe un cliente con esta cédula.', 'error');
                document.getElementById('clientCedula').focus();
                return;
            }
        }

        if (esNuevo) {
            const nuevoCliente = {
                id: Date.now(),
                nombre,
                email,
                telefono,
                cedula,
                imagen,
                ubicacion: ubicacionCliente,
                fechaRegistro: new Date().toISOString()
            };
            clientes.push(nuevoCliente);
            mostrarNotificacion('✅ Cliente agregado exitosamente', 'success');
        } else {
            cliente.nombre = nombre;
            cliente.email = email;
            cliente.telefono = telefono;
            cliente.cedula = cedula;
            cliente.imagen = imagen;
            cliente.ubicacion = ubicacionCliente;
            cliente.fechaModificacion = new Date().toISOString();
            mostrarNotificacion('✅ Cliente actualizado exitosamente', 'success');
        }

        guardarDatos();
        actualizarTodasLasVistas();
        closeModal();
        
        // Cerrar sesión de administrador automáticamente después del registro
        if (esNuevo) {
            cerrarSesionAdminAutomaticamente();
        }
    });
}

function removeClientPhoto() {
    const container = document.getElementById('camera-container-client');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';

        // Actualizar botones
        const photoSection = container.closest('.photo-upload-section');
        const removeBtn = photoSection.querySelector('.btn-danger');
        if (removeBtn) {
            removeBtn.remove();
        }

        // Mostrar mensaje
        if (!photoSection.querySelector('p')) {
            const noImageMsg = document.createElement('p');
            noImageMsg.style.cssText = 'color: #666; font-size: 14px; margin: 0;';
            noImageMsg.textContent = 'No se ha seleccionado ninguna imagen';
            photoSection.appendChild(noImageMsg);
        }

        mostrarNotificacion('Foto removida', 'info');
    }
}


// ---------------------------------------------------------------------------------
// 8. GESTIÓN DE CARRITO Y FACTURACIÓN - SEPARADOS
// ---------------------------------------------------------------------------------

function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (producto.cantidad < 1) {
        mostrarNotificacion('Producto agotado', 'error');
        return;
    }

    const itemEnCarrito = facturaActual.productos.find(p => p.id === productoId);
    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.cantidad) {
            itemEnCarrito.cantidad++;
        } else {
            mostrarNotificacion('No puedes agregar más de la cantidad disponible en stock.', 'warning');
        }
    } else {
        facturaActual.productos.push({ ...producto, cantidad: 1 });
    }
    actualizarVistaCarrito();
    actualizarInfoCarrito();
    mostrarNotificacion(`${producto.nombre} agregado al carrito.`, 'success');
}

function cambiarCantidadCarrito(productoId, cambio) {
    const itemEnCarrito = facturaActual.productos.find(p => p.id === productoId);
    const productoStock = productos.find(p => p.id === productoId);

    if (itemEnCarrito) {
        const nuevaCantidad = itemEnCarrito.cantidad + cambio;
        if (nuevaCantidad > 0 && nuevaCantidad <= productoStock.cantidad) {
            itemEnCarrito.cantidad = nuevaCantidad;
        } else if (nuevaCantidad > productoStock.cantidad) {
            mostrarNotificacion('Cantidad máxima de stock alcanzada.', 'warning');
        } else {
            facturaActual.productos = facturaActual.productos.filter(p => p.id !== productoId);
        }
    }
    actualizarVistaCarrito();
    actualizarVistaCheckout();
    actualizarInfoCarrito();
}

function vaciarCarrito() {
    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('El carrito ya está vacío.', 'info');
        return;
    }

    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
        facturaActual.productos = [];
        actualizarVistaCarrito();
        actualizarVistaCheckout();
        actualizarInfoCarrito();
        mostrarNotificacion('Carrito vaciado.', 'info');
    }
}

function procederAlPago() {
    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('El carrito está vacío.', 'error');
        return;
    }
    showSection('facturacion');
    actualizarVistaCheckout();
}

function volverAlCarrito() {
    showSection('carrito');
}

function procesarPedido() {
    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('No hay productos para procesar.', 'error');
        return;
    }
    const clienteId = document.getElementById('customer-select').value;
    if (!clienteId) {
        mostrarNotificacion('Por favor, selecciona un cliente.', 'error');
        return;
    }

    const cliente = clientes.find(c => c.id == clienteId);
    const subtotal = facturaActual.productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    const impuesto = subtotal * 0.15;
    const total = subtotal + impuesto;

    const nuevaFactura = {
        id: Date.now(),
        cliente,
        productos: [...facturaActual.productos],
        subtotal,
        impuesto,
        total,
        fecha: new Date().toISOString(),
        ubicacion: facturaActual.ubicacion
    };

    facturas.push(nuevaFactura);

    // Actualizar stock de productos
    nuevaFactura.productos.forEach(itemCarrito => {
        const productoOriginal = productos.find(p => p.id === itemCarrito.id);
        if (productoOriginal) {
            productoOriginal.cantidad -= itemCarrito.cantidad;
        }
    });

    guardarDatos();
    enviarNotificacionFactura(nuevaFactura);
    limpiarFactura();
    actualizarTodasLasVistas();
    showSection('historial');
    mostrarNotificacion('¡Compra finalizada! Factura generada.', 'success');
}

function limpiarFactura() {
    facturaActual = {
        cliente: null,
        productos: [],
        fecha: null,
        ubicacion: null,
        metodoPago: 'transferencia',
        prioridad: 'normal'
    };
    actualizarVistaCarrito();
    limpiarUbicacion(); // Agregar esta línea
}

// ---------------------------------------------------------------------------------
// 9. RENDERIZADO Y ACTUALIZACIÓN DE VISTAS - SEPARADAS
// ---------------------------------------------------------------------------------

function actualizarVistaProductos() {
    const container = document.getElementById('products-catalog');
    container.innerHTML = '';
    
    // Usar productosFiltrados si existe, si no usar todos los productos
    const productosAMostrar = productosFiltrados.length > 0 || productosFiltrados === productos ? productosFiltrados : productos;
    
    if (productosAMostrar.length === 0) {
        container.innerHTML = `
            <div class="empty-catalog">
                <i class="fas fa-search"></i>
                <h3>No se encontraron productos</h3>
                <p>Intenta con otros términos de búsqueda o revisa los filtros aplicados.</p>
                <button class="btn btn-primary" onclick="limpiarFiltros()">
                    <i class="fas fa-undo"></i> Limpiar filtros
                </button>
            </div>
        `;
        return;
    }
    
    productosAMostrar.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Determinar estado del stock
        let stockClass = 'in-stock';
        let stockText = `Stock: ${producto.cantidad}`;
        if (producto.cantidad === 0) {
            stockClass = 'out-of-stock';
            stockText = 'Agotado';
        } else if (producto.cantidad <= 5) {
            stockClass = 'low-stock';
            stockText = `Últimas ${producto.cantidad} unidades`;
        }
        
        // Obtener categoría para el badge
        const categoria = producto.categoria || 'sin-categoria';
        const categoriaNombre = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        
        // Obtener color de categoría
        const colorCategoria = obtenerColorCategoria(categoria);
        
        card.innerHTML = `
            <div class="product-card-category" style="background: ${colorCategoria};">${categoriaNombre}</div>
            <img src="${producto.imagen || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'}" 
                 alt="${producto.nombre}" 
                 class="product-card-img"
                 onclick="mostrarDetalleProducto(${producto.id})">
            <div class="product-card-body">
                <h3 class="product-card-title">${producto.nombre}</h3>
                ${producto.descripcion ? `<p class="product-card-description">${producto.descripcion}</p>` : ''}
                <p class="product-card-price">$${producto.precio.toFixed(2)}</p>
                <p class="product-card-stock ${stockClass}">${stockText}</p>
                <div class="product-card-actions">
                    <button class="btn btn-primary" 
                            onclick="agregarAlCarrito(${producto.id})" 
                            ${producto.cantidad === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> 
                        ${producto.cantidad === 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Función para mostrar detalle del producto
function mostrarDetalleProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const stockClass = producto.cantidad === 0 ? 'out-of-stock' : 
                      producto.cantidad <= 5 ? 'low-stock' : 'in-stock';
    const stockText = producto.cantidad === 0 ? 'Agotado' : 
                     producto.cantidad <= 5 ? `Últimas ${producto.cantidad} unidades` : 
                     `Stock: ${producto.cantidad}`;
    
    const modalBody = `
        <div class="product-detail">
            <div class="product-detail-image">
                <img src="${producto.imagen || 'https://via.placeholder.com/400x300.png?text=Sin+Imagen'}" 
                     alt="${producto.nombre}" style="width: 100%; border-radius: 8px;">
            </div>
            <div class="product-detail-info" style="margin-top: 20px;">
                <h3 style="color: var(--amazon-blue); margin-bottom: 10px;">${producto.nombre}</h3>
                ${producto.descripcion ? `<p style="margin-bottom: 15px; color: #666;">${producto.descripcion}</p>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 28px; font-weight: bold; color: var(--amazon-orange);">$${producto.precio.toFixed(2)}</span>
                    <span class="product-card-stock ${stockClass}" style="margin: 0;">${stockText}</span>
                </div>
                ${producto.categoria ? `<p><strong>Categoría:</strong> ${producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1)}</p>` : ''}
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary btn-block" 
                            onclick="agregarAlCarrito(${producto.id}); closeModal();" 
                            ${producto.cantidad === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> 
                        ${producto.cantidad === 0 ? 'Producto Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    mostrarModal(`<i class="fas fa-eye"></i> Detalle del Producto`, modalBody, 'large');
}

// Función para obtener color de categoría
function obtenerColorCategoria(categoria) {
    const colores = {
        'tecnologia': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        'audio': 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
        'monitores': 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
        'electrodomesticos': 'linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)',
        'sin-categoria': 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
    };
    
    return colores[categoria.toLowerCase()] || colores['sin-categoria'];
}

function actualizarTablaAdminProductos() {
    console.log('Actualizando tabla de productos...', productos.length);
    const tbody = document.getElementById('admin-products-table');
    if (!tbody) {
        console.error('No se encontró tbody admin-products-table');
        return;
    }
    
    tbody.innerHTML = '';
    productos.forEach(p => {
        const row = document.createElement('tr');
        
        // Información de categoría
        const categoria = p.categoria || 'sin-categoria';
        const categoriaNombre = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        const categoriaClass = `category-badge ${categoria}`;
        
        // Estado del stock
        let stockClass = 'stock-normal';
        let stockText = p.cantidad;
        
        if (p.cantidad === 0) {
            stockClass = 'stock-out';
            stockText = 'Agotado';
        } else if (p.cantidad <= 5) {
            stockClass = 'stock-low';
            stockText = `${p.cantidad} (Bajo)`;
        }
        
        row.innerHTML = `
            <td class="product-image-cell">
                <img src="${p.imagen || 'https://via.placeholder.com/50'}" alt="${p.nombre}" class="product-image" width="50">
            </td>
            <td class="product-info-cell">
                <div class="product-info">
                    <div class="product-name">${p.nombre}</div>
                    ${p.descripcion ? `<div class="product-description">${p.descripcion}</div>` : ''}
                </div>
            </td>
            <td class="category-cell">
                <span class="${categoriaClass}">${categoriaNombre}</span>
            </td>
            <td class="price-cell">
                <span class="price-display">$${p.precio.toFixed(2)}</span>
            </td>
            <td class="stock-cell">
                <span class="stock-badge ${stockClass}">${stockText}</span>
            </td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="showEditProductModal(${p.id})" title="Editar producto">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="eliminarProducto(${p.id})" title="Eliminar producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function actualizarTablaAdminClientes() {
    console.log('Actualizando tabla de clientes...', clientes.length);
    const tbody = document.getElementById('admin-clients-table');
    if (!tbody) {
        console.error('No se encontró tbody admin-clients-table');
        return;
    }
    
    tbody.innerHTML = '';
    clientes.forEach(c => {
        const row = document.createElement('tr');
        
        // Información adicional del cliente
        const telefonoInfo = c.telefono ? 
            `<br><small><i class="fas fa-phone"></i> ${c.telefono}</small>` : '';
        
        const cedulaInfo = c.cedula ?
            `<br><small><i class="fas fa-id-card"></i> Cédula: ${c.cedula}</small>` : '';
            
        const ubicacionInfo = c.ubicacion ?
            `<br><small><i class="fas fa-map-marker-alt"></i> ${c.ubicacion.direccionAproximada || 'Ubicación disponible'}</small>` :
            '';

        const fechaRegistro = c.fechaRegistro ? 
            `<br><small><i class="fas fa-calendar"></i> Registrado: ${new Date(c.fechaRegistro).toLocaleDateString()}</small>` : '';

        row.innerHTML = `
            <td class="product-image-cell">
                <img src="${c.imagen || 'https://via.placeholder.com/50'}" alt="${c.nombre}" class="product-image" width="50">
            </td>
            <td class="client-info-cell">
                <div class="client-info">
                    <div class="client-name">${c.nombre}</div>
                    <div class="client-details">
                        ${telefonoInfo}
                        ${cedulaInfo}
                        ${ubicacionInfo}
                        ${fechaRegistro}
                    </div>
                </div>
            </td>
            <td class="email-cell">
                <a href="mailto:${c.email}" style="color: var(--link-color); text-decoration: none;">
                    <i class="fas fa-envelope"></i> ${c.email}
                </a>
            </td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="showEditClientModal(${c.id})" title="Editar cliente">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="eliminarCliente(${c.id})" title="Eliminar cliente">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${c.ubicacion ? `<button class="btn-action" onclick="mostrarMapaUbicacion(${c.ubicacion.latitud}, ${c.ubicacion.longitud})" title="Ver ubicación"><i class="fas fa-map"></i></button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function actualizarVistaFacturas() {
    const container = document.getElementById('invoice-history-container');
    container.innerHTML = '<h3>Historial de Facturas</h3>';
    if (facturas.length === 0) {
        container.innerHTML += '<p>No hay facturas en el historial.</p>';
        return;
    }
    facturas.slice().reverse().forEach(factura => {
        const item = document.createElement('div');
        item.className = 'invoice-history-item';

        // Información de ubicación mejorada
        let ubicacionInfo = '';
        if (factura.ubicacion) {
            ubicacionInfo = `
                <div class="invoice-location">
                    <h4><i class="fas fa-map-marker-alt"></i> Información de Ubicación</h4>
                    <p><strong>Coordenadas:</strong> ${factura.ubicacion.latitud.toFixed(6)}, ${factura.ubicacion.longitud.toFixed(6)}</p>
                    <p><strong>Precisión:</strong> ${Math.round(factura.ubicacion.precision || 0)} metros</p>
                    ${factura.ubicacion.direccionAproximada ? `<p><strong>Zona:</strong> ${factura.ubicacion.direccionAproximada}</p>` : ''}

                    <p><strong>Capturada:</strong> ${new Date(factura.ubicacion.timestamp || factura.fecha).toLocaleString()}</p>
                    <button class="btn btn-secondary btn-sm" onclick="mostrarMapaUbicacion(${factura.ubicacion.latitud}, ${factura.ubicacion.longitud})">
                        <i class="fas fa-map"></i> Ver en Mapa
                    </button>
                </div>
            `;
        }

        item.innerHTML = `
            <h3>Factura #${factura.id} - Cliente: ${factura.cliente.nombre}</h3>
            <p>Fecha: ${new Date(factura.fecha).toLocaleDateString()}</p>
            <p><strong>Total: $${factura.total.toFixed(2)}</strong></p>
            <ul>
                ${factura.productos.map(p => `<li>${p.nombre} (x${p.cantidad}) - $${(p.precio * p.cantidad).toFixed(2)}</li>`).join('')}
            </ul>
            ${ubicacionInfo}
        `;
        container.appendChild(item);
    });
}

function mostrarMapaUbicacion(lat, lng) {
    // Abrir Google Maps en una nueva ventana con las coordenadas
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
    mostrarNotificacion('Abriendo ubicación en Google Maps...', 'info');
}

// ---------------------------------------------------------------------------------
// 10. INTEGRACIÓN DE APIs WEB (MOVIDO A api.js)
// ---------------------------------------------------------------------------------

// Las funciones relacionadas con la cámara, geolocalización y notificaciones
// han sido movidas a public/js/api.js para una mejor organización.

// ---------------------------------------------------------------------------------
// 11. FUNCIONES AUXILIARES Y UTILIDADES
// ---------------------------------------------------------------------------------

function actualizarSelectores() {
    // Actualizar selector de clientes
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
        const selectedValue = customerSelect.value;
        customerSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
        clientes.forEach(c => {
            customerSelect.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
        customerSelect.value = selectedValue;
    }

    // Actualizar selector de productos en facturación
    const productSelect = document.getElementById('product-select');
    if (productSelect) {
        const selectedValue = productSelect.value;
        productSelect.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
        productos.forEach(p => {
            if (p.cantidad > 0) { // Solo mostrar productos con stock
                productSelect.innerHTML += `<option value="${p.id}">${p.nombre} - $${p.precio.toFixed(2)} (Stock: ${p.cantidad})</option>`;
            }
        });
        productSelect.value = selectedValue;
    }
}

function mostrarModal(title, body, size = 'normal') {
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-body').innerHTML = body;

    const modalContent = document.querySelector('.modal-content');
    modalContent.className = `modal-content ${size}`;

    document.getElementById('editModal').classList.add('active');

    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('editModal');
    
    // Forzar el cierre del modal
    modal.classList.remove('active');
    modal.style.display = 'none';
    
    // Limpiar contenido
    document.getElementById('modal-title').innerHTML = '';
    document.getElementById('modal-body').innerHTML = '';

    // Restaurar scroll del body
    document.body.style.overflow = 'auto';

    stopCamera();

    // Limpiar ubicación temporal
    if (window.tempClientLocation) {
        delete window.tempClientLocation;
    }
    
    // Asegurar que el modal se resetee después de un momento
    setTimeout(() => {
        modal.style.display = '';
    }, 100);
}

// ---------------------------------------------------------------------------------
// 12. SISTEMA DE AUTENTICACIÓN DE ADMINISTRADOR
// ---------------------------------------------------------------------------------

function verificarAutenticacionAdmin() {
    isAdmin = JSON.parse(localStorage.getItem('adminLoggedIn')) || false;
    
    // Si el admin está logueado, iniciar el timer de sesión
    if (isAdmin) {
        iniciarTimerSesionAdmin();
    }
    
    actualizarInterfazAdmin();
}

function mostrarLoginAdmin() {
    const modalBody = `
        <form id="login-form">
            <div class="form-group">
                <label for="username">Usuario</label>
                <input type="text" id="username" required value="admin">
            </div>
            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" required value="123">
            </div>
            <button type="submit" class="btn btn-primary">Iniciar Sesión</button>
        </form>
    `;
    mostrarModal('Acceso de Administrador', modalBody);

    document.getElementById('login-form').addEventListener('submit', e => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        if (user === adminCredentials.username && pass === adminCredentials.password) {
            isAdmin = true;
            
            // Cerrar modal inmediatamente
            closeModal();
            
            // Guardar datos y actualizar interfaz
            guardarDatos();
            actualizarInterfazAdmin();
            showSection('admin');
            
            // Mostrar notificación de bienvenida con un pequeño delay
            setTimeout(() => {
                mostrarNotificacion('¡Bienvenido, Admin!', 'success');
            }, 100);
            
            // Iniciar timer de sesión de administrador
            iniciarTimerSesionAdmin();
        } else {
            mostrarNotificacion('Credenciales incorrectas.', 'error');
        }
    });
}

function cerrarSesionAdmin() {
    isAdmin = false;
    limpiarTimerSesionAdmin();
    guardarDatos();
    actualizarInterfazAdmin();
    showSection('productos');
    mostrarNotificacion('Sesión de administrador cerrada.', 'info');
}

function cerrarSesionAdminAutomaticamente() {
    // Esperar 2 segundos antes de cerrar la sesión para que el usuario vea el mensaje de éxito
    setTimeout(() => {
        isAdmin = false;
        limpiarTimerSesionAdmin();
        guardarDatos();
        actualizarInterfazAdmin();
        showSection('productos');
        mostrarNotificacion('Registro completado. Sesión de administrador cerrada automáticamente.', 'info');
    }, 2000);
}

// Funciones para manejar el timer de sesión
function iniciarTimerSesionAdmin() {
    limpiarTimerSesionAdmin(); // Limpiar timer anterior si existe
    
    adminSessionTimer = setTimeout(() => {
        isAdmin = false;
        guardarDatos();
        actualizarInterfazAdmin();
        showSection('productos');
        mostrarNotificacion('Sesión de administrador expirada por inactividad (10 minutos).', 'warning');
    }, ADMIN_SESSION_TIMEOUT);
}

function limpiarTimerSesionAdmin() {
    if (adminSessionTimer) {
        clearTimeout(adminSessionTimer);
        adminSessionTimer = null;
    }
}

function resetearTimerSesionAdmin() {
    if (isAdmin && adminSessionTimer) {
        iniciarTimerSesionAdmin(); // Reiniciar timer
    }
}

function actualizarInterfazAdmin() {
    const adminContent = document.getElementById('admin-content');
    const adminSection = document.getElementById('admin');

    if (isAdmin) {
        adminContent.classList.remove('d-none');
        if (adminSection.contains(document.getElementById('admin-login-prompt'))) {
            adminSection.removeChild(document.getElementById('admin-login-prompt'));
        }
        
        // Actualizar las tablas de administración inmediatamente
        setTimeout(() => {
            actualizarTablaAdminProductos();
            actualizarTablaAdminClientes();
        }, 100);
    } else {
        adminContent.classList.add('d-none');
        if (!document.getElementById('admin-login-prompt')) {
            const loginPrompt = document.createElement('div');
            loginPrompt.id = 'admin-login-prompt';
            loginPrompt.className = 'text-center';
            loginPrompt.innerHTML = `
                <h2>Acceso Restringido</h2>
                <p>Debes iniciar sesión como administrador para ver esta sección.</p>
                <button class="btn btn-primary" onclick="mostrarLoginAdmin()">Iniciar Sesión</button>
            `;
            adminSection.appendChild(loginPrompt);
        }
    }
    // Actualizar vistas que dependen de si es admin o no (ej: botones de editar/eliminar)
    actualizarTodasLasVistas();
}

function verificarPermisosAdmin() {
    if (!isAdmin) {
        mostrarNotificacion('Acción no permitida. Se requieren permisos de administrador.', 'error');
        mostrarLoginAdmin();
        return false;
    }
    return true;
}


// ---------------------------------------------------------------------------------
// EVENT LISTENERS GLOBALES
// ---------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    verificarAutenticacionAdmin();
    solicitarPermisoNotificaciones();

    // Cargar datos de ejemplo si es la primera vez
    setTimeout(cargarDatosEjemplo, 500);

    // Event listeners para carrito y checkout
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', vaciarCarrito);
    }

    const proceedBtn = document.getElementById('proceed-to-checkout-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', procederAlPago);
    }

    const backToCartBtn = document.getElementById('back-to-cart-btn');
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', volverAlCarrito);
    }

    // Listener para el botón de generar factura
    const generateInvoiceBtn = document.getElementById('generate-invoice-btn');
    if (generateInvoiceBtn) {
        generateInvoiceBtn.addEventListener('click', procesarPedido);
    }

    // Listener para el botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesionAdmin);
    }

    // Actualizar info inicial del carrito
    actualizarInfoCarrito();

    // Listener para cambio de cliente
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
        customerSelect.addEventListener('change', actualizarInfoClienteSeleccionado);
    }

    // Listener para método de pago
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function () {
            facturaActual.metodoPago = this.value;
        });
    }

    // Listeners para detectar actividad del administrador y resetear timer
    document.addEventListener('click', function(e) {
        // Solo resetear timer si el admin está logueado y está en sección admin
        if (isAdmin && document.getElementById('admin').classList.contains('active')) {
            resetearTimerSesionAdmin();
        }
    });

    document.addEventListener('keydown', function(e) {
        // Solo resetear timer si el admin está logueado y está en sección admin
        if (isAdmin && document.getElementById('admin').classList.contains('active')) {
            resetearTimerSesionAdmin();
        }
    });

    // Listener para cerrar modal al hacer clic fuera del contenido
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Listener para cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('editModal').classList.contains('active')) {
            closeModal();
        }
    });
});

// ---------------------------------------------------------------------------------
// 12. SISTEMA DE NOTIFICACIONES (MOVIDO A api.js)
// ---------------------------------------------------------------------------------

// La función mostrarNotificacion y sus helpers han sido movidos a public/js/api.js

// ---------------------------------------------------------------------------------
// FUNCIONES DE DEBUG
// ---------------------------------------------------------------------------------

// Función de debug para verificar estado de las tablas
function debugTablas() {
    console.log('=== DEBUG TABLAS ADMIN ===');
    console.log('Productos:', productos.length);
    console.log('Clientes:', clientes.length);
    console.log('isAdmin:', isAdmin);
    
    const adminContent = document.getElementById('admin-content');
    const productsTable = document.getElementById('admin-products-table');
    const clientsTable = document.getElementById('admin-clients-table');
    
    console.log('Admin content visible:', !adminContent?.classList.contains('d-none'));
    console.log('Products table exists:', !!productsTable);
    console.log('Clients table exists:', !!clientsTable);
    
    if (productsTable) {
        console.log('Products table rows:', productsTable.children.length);
    }
    if (clientsTable) {
        console.log('Clients table rows:', clientsTable.children.length);
    }
}

// ---------------------------------------------------------------------------------
