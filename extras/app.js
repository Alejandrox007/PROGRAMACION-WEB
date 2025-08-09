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
const adminCredentials = {
    username: 'admin',
    password: '123'
};


// ---------------------------------------------------------------------------------
// 2. INICIALIZACIÓN DE LA APLICACIÓN
// ---------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
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
}


// ---------------------------------------------------------------------------------
// 5. SISTEMA DE BÚSQUEDA Y FILTROS (SIN CAMBIOS)
// ---------------------------------------------------------------------------------

function inicializarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => realizarBusqueda(this.value), 300);
    });
}

function realizarBusqueda(termino) {
    termino = termino.toLowerCase().trim();
    if (!termino) {
        productosFiltrados = [...productos];
    } else {
        productosFiltrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino) ||
            p.descripcion.toLowerCase().includes(termino) ||
            p.categoria.toLowerCase().includes(termino)
        );
    }
    actualizarVistaProductos();
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
                <label for="productPrice">Precio</label>
                <input type="number" id="productPrice" step="0.01" value="${producto.precio || ''}" required>
            </div>
            <div class="form-group">
                <label for="productStock">Cantidad (Stock)</label>
                <input type="number" id="productStock" value="${producto.cantidad || ''}" required>
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
        const nombre = document.getElementById('productName').value;
        const precio = parseFloat(document.getElementById('productPrice').value);
        const cantidad = parseInt(document.getElementById('productStock').value);
        let imagen = document.getElementById('productImage').value;
        const previewImg = document.querySelector('#camera-container-product img');

        if (previewImg && previewImg.src) {
            imagen = previewImg.src;
        }

        if (!nombre || isNaN(precio) || isNaN(cantidad)) {
            mostrarNotificacion('Por favor, complete todos los campos requeridos.', 'error');
            return;
        }

        if (esNuevo) {
            const nuevoProducto = {
                id: Date.now(),
                nombre,
                precio,
                cantidad,
                imagen
            };
            productos.push(nuevoProducto);
            mostrarNotificacion('Producto agregado exitosamente', 'success');
        } else {
            producto.nombre = nombre;
            producto.precio = precio;
            producto.cantidad = cantidad;
            producto.imagen = imagen;
            mostrarNotificacion('Producto actualizado exitosamente', 'success');
        }

        guardarDatos();
        actualizarTodasLasVistas();
        closeModal();
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
        <form id="client-form">
            <input type="hidden" id="clientId" value="${cliente.id || ''}">
            <div class="form-group">
                <label for="clientName">Nombre del Cliente</label>
                <input type="text" id="clientName" value="${cliente.nombre || ''}" required>
            </div>
            <div class="form-group">
                <label for="clientEmail">Email</label>
                <input type="email" id="clientEmail" value="${cliente.email || ''}" required>
            </div>
             <div class="form-group">
                <label>Foto del cliente</label>
                <button type="button" class="btn btn-secondary" onclick="startCamera('client')">
                    <i class="fas fa-camera"></i> Tomar Foto
                </button>
                 <input type="file" accept="image/*" onchange="loadImageFromFile(this, 'client')" style="display:none;" id="client-file-input">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('client-file-input').click()">
                    <i class="fas fa-upload"></i> Subir Imagen
                </button>
                <div id="camera-container-client" class="photo-preview" style="${cliente.imagen ? 'display: block;' : ''}">${cliente.imagen ? `<img src="${cliente.imagen}" alt="Preview">` : ''}</div>
            </div>
            <button type="submit" class="btn btn-primary">${esNuevo ? 'Agregar Cliente' : 'Guardar Cambios'}</button>
        </form>
    `;

    mostrarModal(modalTitle, modalBody);

    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        const imagen = document.querySelector('#camera-container-client img')?.src || '';

        if (!nombre || !email) {
            mostrarNotificacion('Por favor, complete todos los campos.', 'error');
            return;
        }

        if (esNuevo) {
            const nuevoCliente = { id: Date.now(), nombre, email, imagen };
            clientes.push(nuevoCliente);
            mostrarNotificacion('Cliente agregado exitosamente', 'success');
        } else {
            cliente.nombre = nombre;
            cliente.email = email;
            cliente.imagen = imagen;
            mostrarNotificacion('Cliente actualizado exitosamente', 'success');
        }

        guardarDatos();
        actualizarTodasLasVistas();
        closeModal();
    });
}

function eliminarCliente(id) {
    if (!verificarPermisosAdmin()) return;
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        clientes = clientes.filter(c => c.id !== id);
        guardarDatos();
        actualizarTodasLasVistas();
        mostrarNotificacion('Cliente eliminado.', 'success');
    }
}


// ---------------------------------------------------------------------------------
// 8. GESTIÓN DE CARRITO Y FACTURACIÓN
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
}

function procesarPedido() {
    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('El carrito está vacío.', 'error');
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
}


// ---------------------------------------------------------------------------------
// 9. RENDERIZADO Y ACTUALIZACIÓN DE VISTAS
// ---------------------------------------------------------------------------------

function actualizarVistaProductos() {
    const container = document.getElementById('products-catalog');
    container.innerHTML = '';
    productos.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${producto.imagen || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'}" alt="${producto.nombre}" class="product-card-img">
            <div class="product-card-body">
                <h3 class="product-card-title">${producto.nombre}</h3>
                <p class="product-card-price">$${producto.precio.toFixed(2)}</p>
                <p class="product-card-stock">${producto.cantidad > 0 ? `Stock: ${producto.cantidad}` : 'Agotado'}</p>
                <div class="product-card-actions">
                    <button class="btn btn-primary" onclick="agregarAlCarrito(${producto.id})" ${producto.cantidad === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Agregar
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function actualizarTablaAdminProductos() {
    const tbody = document.getElementById('admin-products-table');
    tbody.innerHTML = '';
    productos.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${p.imagen || 'https://via.placeholder.com/50'}" alt="${p.nombre}" width="50"></td>
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.cantidad}</td>
            <td class="actions">
                <button class="btn-icon" onclick="showEditProductModal(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="eliminarProducto(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function actualizarTablaAdminClientes() {
    const tbody = document.getElementById('admin-clients-table');
    tbody.innerHTML = '';
    clientes.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${c.imagen || 'https://via.placeholder.com/50'}" alt="${c.nombre}" width="50"></td>
            <td>${c.nombre}</td>
            <td>${c.email}</td>
            <td class="actions">
                <button class="btn-icon" onclick="showEditClientModal(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="eliminarCliente(${c.id})"><i class="fas fa-trash"></i></button>
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
        item.innerHTML = `
            <h3>Factura #${factura.id} - Cliente: ${factura.cliente.nombre}</h3>
            <p>Fecha: ${new Date(factura.fecha).toLocaleDateString()}</p>
            <p><strong>Total: $${factura.total.toFixed(2)}</strong></p>
            <ul>
                ${factura.productos.map(p => `<li>${p.nombre} (x${p.cantidad}) - $${(p.precio * p.cantidad).toFixed(2)}</li>`).join('')}
            </ul>
            ${factura.ubicacion ? `<p><small>Geolocalización: ${factura.ubicacion.latitud.toFixed(4)}, ${factura.ubicacion.longitud.toFixed(4)}</small></p>` : ''}
        `;
        container.appendChild(item);
    });
}

function actualizarVistaCarrito() {
    const container = document.getElementById('cart-items-container');
    const summary = document.getElementById('cart-summary');
    const cartInfo = document.getElementById('cart-info');
    
    const totalItems = facturaActual.productos.reduce((sum, item) => sum + item.cantidad, 0);
    cartInfo.textContent = `(${totalItems})`;

    if (totalItems === 0) {
        container.innerHTML = '<p>Tu carrito está vacío.</p>';
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    container.innerHTML = '';
    let subtotal = 0;

    facturaActual.productos.forEach(item => {
        subtotal += item.precio * item.cantidad;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <img src="${item.imagen || 'https://via.placeholder.com/80'}" alt="${item.nombre}" class="cart-item-img">
            <div class="cart-item-details">
                <p class="cart-item-title">${item.nombre}</p>
                <p class="cart-item-price">$${item.precio.toFixed(2)}</p>
            </div>
            <div class="cart-item-quantity">
                <button class="btn-icon" onclick="cambiarCantidadCarrito(${item.id}, -1)"><i class="fas fa-minus-circle"></i></button>
                <span>${item.cantidad}</span>
                <button class="btn-icon" onclick="cambiarCantidadCarrito(${item.id}, 1)"><i class="fas fa-plus-circle"></i></button>
            </div>
        `;
        container.appendChild(itemDiv);
    });

    const impuesto = subtotal * 0.15;
    const total = subtotal + impuesto;

    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `$${impuesto.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}


// ---------------------------------------------------------------------------------
// 10. INTEGRACIÓN DE APIs WEB
// ---------------------------------------------------------------------------------

// API de Cámara y Ficheros
function startCamera(type) {
    currentImageType = type;
    const containerId = `camera-container-${type}`;
    const previewContainer = document.getElementById(containerId);
    
    if (!previewContainer) {
        console.error(`Contenedor de cámara #${containerId} no encontrado.`);
        return;
    }

    previewContainer.style.display = 'block';
    previewContainer.innerHTML = '<p>Iniciando cámara...</p>';

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            currentCamera = stream;
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.style.width = '100%';
            
            const captureButton = document.createElement('button');
            captureButton.textContent = 'Capturar Foto';
            captureButton.className = 'btn btn-primary mt-2';
            captureButton.onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg');
                
                previewContainer.innerHTML = `<img src="${imageData}" alt="Captured photo" style="width:100%;">`;
                stopCamera();
            };

            previewContainer.innerHTML = '';
            previewContainer.appendChild(video);
            previewContainer.appendChild(captureButton);
        })
        .catch(err => {
            console.error("Error de cámara:", err);
            previewContainer.innerHTML = '<p style="color:red;">Error al acceder a la cámara.</p>';
            mostrarNotificacion('No se pudo acceder a la cámara.', 'error');
        });
}

function stopCamera() {
    if (currentCamera) {
        currentCamera.getTracks().forEach(track => track.stop());
        currentCamera = null;
    }
}

function loadImageFromFile(input, type) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById(`camera-container-${type}`);
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

// API de Geolocalización
function obtenerUbicacion() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            facturaActual.ubicacion = {
                latitud: pos.coords.latitude,
                longitud: pos.coords.longitude
            };
            mostrarNotificacion(`Ubicación capturada: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
        }, err => {
            mostrarNotificacion('No se pudo obtener la ubicación.', 'error');
        });
    } else {
        mostrarNotificacion('Geolocalización no disponible en este navegador.', 'warning');
    }
}

// API de Notificaciones
function solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function enviarNotificacionFactura(factura) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    const options = {
        body: `Tu pedido #${factura.id} por un total de $${factura.total.toFixed(2)} ha sido procesado.`,
        icon: 'https://via.placeholder.com/128'
    };
    new Notification('¡Compra Realizada!', options);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-notification ${tipo} show`;
    toast.textContent = mensaje;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}


// ---------------------------------------------------------------------------------
// 11. FUNCIONES AUXILIARES Y UTILIDADES
// ---------------------------------------------------------------------------------

function actualizarSelectores() {
    const select = document.getElementById('customer-select');
    if (!select) return;
    
    const selectedValue = select.value;
    select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    clientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
    select.value = selectedValue;
}

function mostrarModal(title, body) {
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('editModal').classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('modal-title').innerHTML = '';
    document.getElementById('modal-body').innerHTML = '';
    stopCamera();
}


// ---------------------------------------------------------------------------------
// 12. SISTEMA DE AUTENTICACIÓN DE ADMINISTRADOR
// ---------------------------------------------------------------------------------

function verificarAutenticacionAdmin() {
    isAdmin = JSON.parse(localStorage.getItem('adminLoggedIn')) || false;
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
            guardarDatos();
            actualizarInterfazAdmin();
            closeModal();
            showSection('admin');
            mostrarNotificacion('¡Bienvenido, Admin!', 'success');
        } else {
            mostrarNotificacion('Credenciales incorrectas.', 'error');
        }
    });
}

function cerrarSesionAdmin() {
    isAdmin = false;
    guardarDatos();
    actualizarInterfazAdmin();
    showSection('productos');
    mostrarNotificacion('Sesión de administrador cerrada.', 'info');
}

function actualizarInterfazAdmin() {
    const adminContent = document.getElementById('admin-content');
    const adminSection = document.getElementById('admin');

    if (isAdmin) {
        adminContent.classList.remove('d-none');
        if (adminSection.contains(document.getElementById('admin-login-prompt'))) {
             adminSection.removeChild(document.getElementById('admin-login-prompt'));
        }
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
// 13. DATOS DE EJEMPLO PARA DEMOSTRACIÓN
// ---------------------------------------------------------------------------------

function cargarDatosEjemplo() {
    if (productos.length === 0 && clientes.length === 0) {
        console.log("Cargando datos de ejemplo...");
        productos = [
            { id: 1, nombre: "Laptop Pro X", precio: 1200, cantidad: 15, imagen: "https://i.blogs.es/a24a9c/macbook-pro-14-16-2023-applesfera-01/1366_2000.jpeg" },
            { id: 2, nombre: "Smartphone Z", precio: 800, cantidad: 25, imagen: "https://media.revistagq.com/photos/650c1e15531953606369f0a9/16:9/w_2560%2Cc_limit/iPhone-15-Pro-Review-01.jpg" },
            { id: 3, nombre: "Auriculares Inalámbricos", precio: 150, cantidad: 50, imagen: "https://static.independent.co.uk/2023/10/10/15/Sony%20WH-1000XM5%20copy.jpg" },
            { id: 4, nombre: "Monitor Curvo 4K", precio: 600, cantidad: 10, imagen: "https://i.blogs.es/34438e/captura-de-pantalla-2022-01-04-a-las-12.39.05/1366_2000.jpeg" }
        ];
        clientes = [
            { id: 1, nombre: "Tech Solutions Inc.", email: "contact@techsolutions.com", imagen: "" },
            { id: 2, nombre: "Ana Pérez", email: "ana.perez@email.com", imagen: "" }
        ];
        guardarDatos();
        actualizarTodasLasVistas();
        mostrarNotificacion('Datos de ejemplo cargados.', 'info');
    }
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

    // Listener para el botón de generar factura
    document.getElementById('generate-invoice-btn').addEventListener('click', procesarPedido);
    
    // Listener para el botón de cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', cerrarSesionAdmin);
});
