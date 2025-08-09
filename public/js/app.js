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
        localStorage.setItem('amazonBusiness_facturaActual', JSON.stringify(facturaActual));
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
        facturaActual = JSON.parse(localStorage.getItem('amazonBusiness_facturaActual')) || {
            cliente: null,
            productos: [],
            fecha: null,
            ubicacion: null,
            metodoPago: 'transferencia',
            prioridad: 'normal'
        };
    } catch (error) {
        console.error('Error al cargar datos de localStorage:', error);
        productos = [];
        clientes = [];
        facturas = [];
        facturaActual = {
            cliente: null,
            productos: [],
            fecha: null,
            ubicacion: null,
            metodoPago: 'transferencia',
            prioridad: 'normal'
        };
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
    console.log('Mostrando sección:', sectionName);
    
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    const section = document.querySelector(`section#${sectionName}`);
    if (section) {
        section.classList.add('active');
    }

    document.querySelectorAll('header nav a').forEach(a => a.classList.remove('active'));
    const navLink = document.querySelector(`#nav-${sectionName}`);
    if (navLink) {
        navLink.classList.add('active');
    }

    if (sectionName === 'admin') {
        if (!isAdmin) {
            // Si no está autenticado, mostrar el formulario de login
            mostrarLoginAdmin();
        } else {
            // Mostrar contenido de admin y actualizar tablas
            document.getElementById('admin-content').classList.remove('d-none');
            actualizarTablaAdminProductos();
            actualizarTablaAdminClientes();
            actualizarVistaFacturas();
        }
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
// FUNCIONES PARA CREAR CLIENTE DESDE FACTURACIÓN
// ---------------------------------------------------------------------------------

// Función para mostrar u ocultar campos según el tipo de cliente
function toggleClienteFields(tipo) {
    const regularFields = document.querySelectorAll('.cliente-regular-field');
    const nombreInput = document.getElementById('clientName');
    
    if (tipo === 'regular') {
        regularFields.forEach(field => field.style.display = 'block');
        document.getElementById('clientEmail').required = true;
        if (nombreInput.value === 'Consumidor Final') {
            nombreInput.value = '';
        }
    } else {
        regularFields.forEach(field => field.style.display = 'none');
        document.getElementById('clientEmail').required = false;
        
        // Si es consumidor final, establecer un nombre predeterminado si está vacío
        if (!nombreInput.value.trim() || nombreInput.value.startsWith('Consumidor Final')) {
            nombreInput.value = 'Consumidor Final';
        }
    }
}

// Función para mostrar el modal de nuevo cliente desde facturación
function mostrarNuevoClienteFactura() {
    console.log("Mostrando formulario de nuevo cliente");
    
    // Preparar el contenido del modal
    const modalTitle = 'Agregar Nuevo Cliente';
    const modalContent = document.querySelector('.modal-content');
    const modal = document.getElementById('editModal');
    
    // Establecer el título
    document.getElementById('modal-title').innerHTML = modalTitle;
    
    // Establecer el cuerpo del modal
    document.getElementById('modal-body').innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">
                <i class="fas fa-user-plus"></i> Nuevo Cliente para Factura
            </h3>
            <p class="modal-subtitle">
                Complete la información del cliente
            </p>
        </div>
        
        <form id="factura-client-form">
            <!-- Tipo de cliente -->
            <div class="form-group">
                <label>
                    <i class="fas fa-user-tag"></i> Tipo de Cliente
                </label>
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <input type="radio" id="cliente-regular" name="tipo-cliente" value="regular" checked 
                               onchange="toggleClienteFields(this.value)">
                        <label for="cliente-regular">Cliente Regular</label>
                    </div>
                    <div>
                        <input type="radio" id="consumidor-final" name="tipo-cliente" value="consumidor" 
                               onchange="toggleClienteFields(this.value)">
                        <label for="consumidor-final">Consumidor Final</label>
                    </div>
                </div>
            </div>
            
            <!-- Información básica -->
            <div class="form-row">
                <div class="form-group required">
                    <label for="clientName">
                        <i class="fas fa-user"></i> Nombre Completo
                    </label>
                    <input 
                        type="text" 
                        id="clientName" 
                        placeholder="Ej: Juan Pérez"
                        required
                        autocomplete="name"
                    >
                </div>
                
                <div class="form-group required cliente-regular-field">
                    <label for="clientEmail">
                        <i class="fas fa-envelope"></i> Correo Electrónico
                    </label>
                    <input 
                        type="email" 
                        id="clientEmail" 
                        placeholder="ejemplo@correo.com"
                        required
                        autocomplete="email"
                    >
                </div>
            </div>

            <!-- Información adicional -->
            <div class="form-row cliente-regular-field">
                <div class="form-group">
                    <label for="clientPhone">
                        <i class="fas fa-phone"></i> Teléfono (Opcional)
                    </label>
                    <input 
                        type="text" 
                        id="clientPhone" 
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
                        placeholder="1234567890"
                        maxlength="10"
                    >
                </div>
            </div>
            
            <!-- Foto del cliente -->
            <div class="form-group cliente-regular-field">
                <label>
                    <i class="fas fa-camera"></i> Foto del Cliente (Opcional)
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
                    </div>
                    <div id="camera-container-client" class="photo-preview-container" style="display: none;">
                        <!-- La vista previa de la foto aparecerá aquí -->
                    </div>
                </div>
            </div>

            <!-- Botones de acción -->
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Agregar Cliente
                </button>
            </div>
        </form>
    `;
    
    // Mostrar el modal
    modalContent.className = `modal-content large`;
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Establecer el manejador de eventos para el formulario
    setTimeout(() => {
        const form = document.getElementById('factura-client-form');
        if (form) {
            form.addEventListener('submit', crearClienteDesdeFactura);
        }
        
        // Enfocar el primer campo
        document.getElementById('clientName').focus();
    }, 100);
}

// Manejador para crear un nuevo cliente desde la factura
function crearClienteDesdeFactura(e) {
    e.preventDefault();
    
    // Obtener valores del formulario
    const tipoCliente = document.querySelector('input[name="tipo-cliente"]:checked').value;
    let nombre = document.getElementById('clientName').value.trim();
    let email = "";
    let telefono = "";
    let cedula = "";
    let imagen = "";
    
    // Solo procesar estos campos si es cliente regular
    if (tipoCliente === 'regular') {
        email = document.getElementById('clientEmail').value.trim();
        telefono = document.getElementById('clientPhone')?.value.trim() || "";
        cedula = document.getElementById('clientCedula')?.value.trim() || "";
        imagen = document.querySelector('#camera-container-client .photo-preview')?.src || '';
        
        // Validaciones para cliente regular
        if (!email) {
            mostrarNotificacion('El email es requerido para clientes regulares.', 'error');
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

        // Validar cédula si se proporciona
        if (cedula && !/^\d{10}$/.test(cedula)) {
            mostrarNotificacion('La cédula debe tener exactamente 10 dígitos.', 'error');
            document.getElementById('clientCedula').focus();
            return;
        }
    } else {
        // Para consumidor final, usar valores predeterminados
        nombre = "Consumidor Final";
        email = "consumidor.final@sistema.local";
        telefono = "0000000000";
        cedula = "0000000000";
        imagen = ''; // Sin imagen para consumidor final
    }

    // Validación común
    if (!nombre) {
        mostrarNotificacion('El nombre es requerido.', 'error');
        document.getElementById('clientName').focus();
        return;
    }

    // Crear el nuevo cliente
    const nuevoCliente = {
        id: Date.now(),
        nombre,
        email,
        telefono,
        cedula,
        imagen: imagen,
        tipo: tipoCliente,
        fechaRegistro: new Date().toISOString()
    };
    
    // Agregar a la lista de clientes siempre, independientemente del tipo
    clientes.push(nuevoCliente);
    
    // Establecer el cliente para la factura actual
    if (window.facturaActual) {
        window.facturaActual.cliente = nuevoCliente;
    }
    
    // Actualizar la interfaz con la información del cliente
    actualizarInterfazClienteFactura(nuevoCliente);
    
    guardarDatos();
    actualizarTodasLasVistas();
    closeModal();
    mostrarNotificacion('✅ Cliente agregado a la factura', 'success');
}

// Función para actualizar la interfaz con la información del cliente
function actualizarInterfazClienteFactura(cliente) {
    if (!cliente) return;
    
    // Actualizar la tarjeta de información del cliente
    const clienteInfoDiv = document.getElementById('selected-client-info');
    if (clienteInfoDiv) {
        // Mostrar la vista previa del cliente
        clienteInfoDiv.classList.remove('d-none');
        
        // Actualizar los detalles
        document.getElementById('client-avatar').src = cliente.imagen || 'https://via.placeholder.com/100';
        document.getElementById('client-name').textContent = cliente.nombre;
        document.getElementById('client-email').textContent = cliente.email || 'No especificado';
        document.getElementById('client-phone').textContent = cliente.telefono || 'No especificado';
        document.getElementById('client-cedula').textContent = cliente.cedula || 'No especificado';
    }
    
    // Actualizar vista previa de factura
    const previewClientName = document.getElementById('preview-client-name');
    const previewClientEmail = document.getElementById('preview-client-email');
    
    if (previewClientName) previewClientName.textContent = cliente.nombre;
    if (previewClientEmail) previewClientEmail.textContent = cliente.email || 'No especificado';

    // Actualizar totales en la vista previa
    actualizarVistaPrevia();
}

// ---------------------------------------------------------------------------------
// GESTIÓN DE PRODUCTOS (CRUD) - REFACTORIZADO PARA MODAL
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
    guardarDatos();
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
    guardarDatos();
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
        guardarDatos();
    }
}

function procederAlPago() {
    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('El carrito está vacío.', 'error');
        return;
    }
    window.location.href = 'factura.html';
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
    const impuesto = subtotal * 0.12; // Corregido a 12%
    const total = subtotal + impuesto;

    const nuevaFactura = {
        id: `FAC-${Date.now()}`,
        cliente,
        productos: [...facturaActual.productos],
        subtotal,
        impuesto,
        total,
        fecha: new Date().toISOString(),
        metodoPago: facturaActual.metodoPago,
        ubicacion: facturaActual.ubicacion
    };

    facturas.push(nuevaFactura);

    // Actualizar stock
    nuevaFactura.productos.forEach(pFactura => {
        const pGlobal = productos.find(p => p.id === pFactura.id);
        if (pGlobal) {
            pGlobal.cantidad -= pFactura.cantidad;
        }
    });

    guardarDatos();
    enviarNotificacionFactura(nuevaFactura);
    limpiarFactura();
    actualizarTodasLasVistas();
    window.location.href = 'index.html#admin';
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
    // Si estamos en factura.html, limpiar la interfaz
    if (window.location.pathname.includes('factura.html')) {
        actualizarVistaFactura();
        document.getElementById('selected-client-info').classList.add('d-none');
        generarNumeroFactura();
    } else {
        actualizarVistaCarrito();
    }
    limpiarUbicacion();
    mostrarNotificacion('Factura limpiada', 'info');
    guardarDatos();
}

function generarFactura() {
    if (!facturaActual.cliente) {
        mostrarNotificacion('Por favor, seleccione un cliente para la factura.', 'error');
        return;
    }

    if (facturaActual.productos.length === 0) {
        mostrarNotificacion('No hay productos en la factura.', 'error');
        return;
    }

    const subtotal = facturaActual.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const iva = subtotal * 0.12;
    const total = subtotal + iva;

    const nuevaFactura = {
        id: `FAC-${Date.now()}`,
        cliente: facturaActual.cliente,
        productos: [...facturaActual.productos],
        subtotal,
        iva,
        total,
        metodoPago: document.getElementById('payment-method').value,
        ubicacion: facturaActual.ubicacion,
        fecha: new Date().toISOString()
    };

    facturas.push(nuevaFactura);

    // Actualizar stock
    nuevaFactura.productos.forEach(pFactura => {
        const pGlobal = productos.find(p => p.id === pFactura.id);
        if (pGlobal) {
            pGlobal.cantidad -= pFactura.cantidad;
        }
    });

    guardarDatos();
    enviarNotificacionFactura(nuevaFactura);
    
    console.log('Factura Generada:', nuevaFactura);
    mostrarNotificacion(`Factura ${nuevaFactura.id} generada con éxito.`, 'success');

    limpiarFactura();
    
    setTimeout(() => {
        window.location.href = 'index.html#admin';
    }, 1000);
}


function agregarProductoFactura(productoId) {
    const cantidadInput = document.getElementById('product-quantity');
    const cantidad = parseInt(cantidadInput.value) || 1;

    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        mostrarNotificacion('Producto no encontrado.', 'error');
        return;
    }

    if (cantidad <= 0) {
        mostrarNotificacion('La cantidad debe ser mayor a 0.', 'error');
        return;
    }

    if (cantidad > producto.cantidad) {
        mostrarNotificacion('No hay suficiente stock disponible.', 'error');
        return;
    }

    const productoEnFactura = facturaActual.productos.find(p => p.id === productoId);
    if (productoEnFactura) {
        if ((productoEnFactura.cantidad + cantidad) > producto.cantidad) {
            mostrarNotificacion('La cantidad total excede el stock.', 'error');
            return;
        }
        productoEnFactura.cantidad += cantidad;
    } else {
        facturaActual.productos.push({ ...producto, cantidad });
    }

    actualizarVistaFactura();
    mostrarNotificacion(`Se agregó ${cantidad} unidad(es) de ${producto.nombre} a la factura.`, 'success');
    guardarDatos();
}

function eliminarProductoFactura(productoId) {
    const index = facturaActual.productos.findIndex(p => p.id === productoId);
    if (index > -1) {
        facturaActual.productos.splice(index, 1);
        actualizarVistaFactura();
        mostrarNotificacion('Producto eliminado de la factura.', 'info');
        guardarDatos();
    } else {
        mostrarNotificacion('Producto no encontrado en la factura.', 'error');
    }
}

function cambiarCantidadProductoFactura(productoId, cambio) {
    const itemEnFactura = facturaActual.productos.find(p => p.id === productoId);
    const productoStock = productos.find(p => p.id === productoId);

    if (itemEnFactura) {
        const nuevaCantidad = itemEnFactura.cantidad + cambio;
        if (nuevaCantidad <= 0) {
            eliminarProductoFactura(productoId);
            return;
        }
        if (nuevaCantidad > productoStock.cantidad) {
            mostrarNotificacion('Cantidad máxima de stock alcanzada.', 'warning');
            return;
        }
        itemEnFactura.cantidad = nuevaCantidad;
    }
    actualizarVistaFactura();
    guardarDatos();
}


// ---------------------------------------------------------------------------------
// 9. RENDERIZADO Y ACTUALIZACIÓN DE VISTAS - SEPARADAS
// ---------------------------------------------------------------------------------

function actualizarVistaProductos() {
    const container = document.getElementById('products-catalog');
    if (!container) {
        console.error('Container products-catalog not found');
        return;
    }

    const productosAMostrar = productosFiltrados.length > 0 ? productosFiltrados : productos;
    
    container.innerHTML = '';

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

// Función para mostrar el detalle del producto en un modal
function mostrarDetalleProducto(producto) {
    const modalBody = `
        <div class="product-detail-modal">
            <div class="product-detail-header">
                <img src="${producto.imagen || 'https://via.placeholder.com/150'}" alt="${producto.nombre}" class="product-detail-image">
                <h2>${producto.nombre}</h2>
            </div>
            <div class="product-detail-info">
                ${producto.descripcion ? `<p>${producto.descripcion}</p>` : ''}
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
        
        row.innerHTML =
            '<td class="product-image-cell">' +
                '<img src="' + (p.imagen || 'https://via.placeholder.com/50') + '" alt="' + p.nombre + '" class="product-image" width="50">' +
            '</td>' +
            '<td class="product-info-cell">' +
                '<div class="product-info">' +
                    '<div class="product-name">' + p.nombre + '</div>' +
                    (p.descripcion ? '<div class="product-description">' + p.descripcion + '</div>' : '') +
                '</div>' +
            '</td>' +
            '<td class="category-cell">' +
                '<span class="' + categoriaClass + '">' + categoriaNombre + '</span>' +
            '</td>' +
            '<td class="price-cell">' +
                '<span class="price-display">$' + p.precio.toFixed(2) + '</span>' +
            '</td>' +
            '<td class="stock-cell">' +
                '<span class="stock-badge ' + stockClass + '">' + stockText + '</span>' +
            '</td>' +
            '<td class="actions-cell">' +
                '<div class="action-buttons">' +
                    '<button class="btn-action btn-edit" onclick="showEditProductModal(' + p.id + ')" title="Editar producto">' +
                        '<i class="fas fa-edit"></i>' +
                    '</button>' +
                    '<button class="btn-action btn-delete" onclick="eliminarProducto(' + p.id + ')" title="Eliminar producto">' +
                        '<i class="fas fa-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</td>';
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
    if (!container) return; // No hacer nada si el contenedor no existe

    container.innerHTML = ''; // Limpiar antes de renderizar
    if (facturas.length === 0) {
        container.innerHTML = '<p class="no-items">No hay facturas en el historial.</p>';
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
            <div class="invoice-header">
                <h4>Factura ${factura.id}</h4>
                <p>Fecha: ${new Date(factura.fecha).toLocaleDateString()}</p>
            </div>
            <div class="invoice-body">
                <p><strong>Cliente:</strong> ${factura.cliente.nombre}</p>
                <p><strong>Total:</strong> <span class="total">$${factura.total.toFixed(2)}</span></p>
                <details>
                    <summary>Ver detalles</summary>
                    <p><strong>Email:</strong> ${factura.cliente.email}</p>
                    <div class="invoice-products">
                        <h5>Productos:</h5>
                        <ul>
                            ${factura.productos.map(p => `
                                <li>${p.nombre} x ${p.cantidad} = $${(p.precio * p.cantidad).toFixed(2)}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="invoice-totals">
                        <p><strong>Subtotal:</strong> $${factura.subtotal.toFixed(2)}</p>
                        <p><strong>IVA (12%):</strong> $${factura.iva.toFixed(2)}</p>
                    </div>
                    <p><strong>Método de Pago:</strong> ${factura.metodoPago}</p>
                    ${ubicacionInfo}
                </details>
            </div>
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
    const productSelect = document.getElementById('product-select');

    if (productSelect) {
        const currentVal = productSelect.value;
        productSelect.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
        productos.forEach(p => {
            if (p.stock > 0) { // Solo mostrar productos con stock
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = `${p.nombre} - $${p.precio.toFixed(2)} (Stock: ${p.stock})`;
                productSelect.appendChild(option);
            }
        });
        productSelect.value = currentVal;
    }
}

function mostrarModal(title, body, size = 'normal') {
    const modal = document.getElementById('editModal');
    modal.classList.remove('slide-out');
    modal.classList.add('slide-in');

    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-body').innerHTML = body;

    const modalContent = document.querySelector('.modal-content');
    modalContent.className = `modal-content ${size}`;

    modal.style.display = 'flex';
    modal.classList.add('active');

    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    
    // Asegurar que el modal sea visible
    setTimeout(() => {
        if (!modal.classList.contains('active')) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }, 100);
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

    // Detener la cámara si está activa
    if (typeof stopCamera === 'function') {
        stopCamera();
    }

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

function mostrarLoginAdmin() {
    const modalBody = `
        <div class="admin-login-form">
            <div class="admin-login-icon">
                <i class="fas fa-user-shield"></i>
            </div>
            <h3>Acceso de Administrador</h3>
            <form id="admin-login-form">
                <div class="form-group">
                    <label for="admin-username">Usuario</label>
                    <input type="text" id="admin-username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="admin-password">Contraseña</label>
                    <input type="password" id="admin-password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                </button>
            </form>
        </div>
    `;

    mostrarModal('Acceso Administrativo', modalBody);

    // Agregar evento submit al formulario
    document.getElementById('admin-login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        if (username === 'admin' && password === '123') {
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            closeModal();
            actualizarInterfazAdmin();
            mostrarNotificacion('Sesión iniciada correctamente', 'success');
            window.location.href = 'index.html#admin';
        } else {
            mostrarNotificacion('Credenciales incorrectas', 'error');
        }
    });
}

function verificarAutenticacionAdmin() {
    isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (isAdmin) {
        document.getElementById('logout-nav-item').style.display = 'block';
        const adminContent = document.getElementById('admin-content');
        if (adminContent) {
            adminContent.classList.remove('d-none');
        }
        actualizarInterfazAdmin();
    }
}

// ---------------------------------------------------------------------------------
// EVENT LISTENERS GLOBALES
// ---------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    verificarAutenticacionAdmin();

    const path = window.location.pathname;

    if (path.includes('factura.html')) {
        // Lógica específica para factura.html
        inicializarPaginaFactura();
    } else {
        // Lógica para index.html
        const hash = window.location.hash.substring(1);
        if (hash) {
            showSection(hash);
        } else {
            showSection('productos');
        }
        inicializarBusqueda();
    }
    
    // Agregar listener para cambios en el hash (navegación)
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.substring(1);
        if (newHash) {
            showSection(newHash);
        }
    });


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
        // Ya no es necesario
    }

    // Listener para el botón de generar factura
    const generateInvoiceBtn = document.getElementById('generate-invoice-btn');
    if (generateInvoiceBtn) {
        generateInvoiceBtn.addEventListener('click', procesarPedido);
    }

    // Listener para el botón de cerrar sesión
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesionAdmin();
        });
    }
    
    // Listener para navegar a la sección de admin
    const navAdminLink = document.getElementById('nav-admin');
    if (navAdminLink) {
        navAdminLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAdmin) {
                window.location.hash = 'admin';
                showSection('admin');
            } else {
                mostrarLoginAdmin();
            }
        });
    }

    const navHistorialLink = document.getElementById('nav-historial');
    if (navHistorialLink) {
        navHistorialLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAdmin) {
                window.location.href = 'index.html#admin';
                setTimeout(() => {
                    document.getElementById('admin-invoices')?.scrollIntoView({ behavior: 'smooth' });
                }, 200);
            } else {
                mostrarLoginAdmin();
            }
        });
    }

    // Actualizar info inicial del carrito
    if(typeof actualizarInfoCarrito === 'function') actualizarInfoCarrito();

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
        if (isAdmin && (document.getElementById('admin')?.classList.contains('active') || window.location.pathname.includes('factura.html'))) {
            resetearTimerSesionAdmin();
        }
    });

    document.addEventListener('keydown', function(e) {
        // Solo resetear timer si el admin está logueado y está en sección admin
        if (isAdmin && (document.getElementById('admin')?.classList.contains('active') || window.location.pathname.includes('factura.html'))) {
            resetearTimerSesionAdmin();
        }
    });

    // Listener para cerrar modal al hacer clic fuera del contenido
    const editModal = document.getElementById('editModal');
    if(editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    // Listener para cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && editModal && editModal.classList.contains('active')) {
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
// INICIALIZACIÓN PÁGINA DE FACTURA
// ---------------------------------------------------------------------------------

function inicializarPaginaFactura() {
    cargarProductosCatalogoFactura();
    actualizarVistaFactura();
    generarNumeroFactura();

    document.getElementById('btn-nuevo-cliente').addEventListener('click', mostrarNuevoClienteFactura);
    document.getElementById('generate-invoice-btn').addEventListener('click', generarFactura);
    document.getElementById('clear-invoice-btn').addEventListener('click', limpiarFactura);
    
    document.getElementById('payment-method').addEventListener('change', (e) => {
        facturaActual.metodoPago = e.target.value;
        actualizarVistaPrevia();
    });

    const searchInput = document.getElementById('search-products');
    searchInput.addEventListener('input', (e) => cargarProductosCatalogoFactura(e.target.value));
}

function cargarProductosCatalogoFactura(termino = '') {
    const container = document.getElementById('products-catalog');
    if (!container) return;

    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino.toLowerCase()) && p.cantidad > 0
    );

    if (productosFiltrados.length === 0) {
        container.innerHTML = '<p class="no-items">No se encontraron productos.</p>';
        return;
    }

    container.innerHTML = productosFiltrados.map(producto => `
        <div class="product-item" onclick="seleccionarProductoParaFactura(${producto.id})">
            <img src="${producto.imagen || 'https://via.placeholder.com/100'}" alt="${producto.nombre}">
            <div class="product-item-details">
                <h5>${producto.nombre}</h5>
                <p class="price">$${producto.precio.toFixed(2)}</p>
                <p>Stock: ${producto.cantidad}</p>
            </div>
        </div>
    `).join('');
}

let productoSeleccionadoFactura = null;

function seleccionarProductoParaFactura(id) {
    productoSeleccionadoFactura = productos.find(p => p.id === id);
    
    document.querySelectorAll('#products-catalog .product-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const itemEl = document.querySelector(`#products-catalog .product-item[onclick="seleccionarProductoParaFactura(${id})"]`);
    if (itemEl) {
        itemEl.classList.add('selected');
    }
    
    // Habilitar botón de agregar
    const addButton = document.querySelector('button[onclick="agregarProductoSeleccionadoAFactura()"]');
    if(addButton) addButton.disabled = false;
}

function agregarProductoSeleccionadoAFactura() {
    if (!productoSeleccionadoFactura) {
        mostrarNotificacion('Por favor, seleccione un producto del catálogo.', 'error');
        return;
    }
    agregarProductoFactura(productoSeleccionadoFactura.id);
}

function actualizarVistaFactura() {
    actualizarListaProductosFactura();
    actualizarTotalesFactura();
    actualizarVistaPrevia();
}

function actualizarListaProductosFactura() {
    const container = document.getElementById('invoice-items-container');
    if (!container) return;

    if (facturaActual.productos.length === 0) {
        container.innerHTML = `<div class="empty-items"><i class="fas fa-clipboard-list"></i><p>No hay productos agregados</p></div>`;
        return;
    }

    container.innerHTML = facturaActual.productos.map(producto => `
        <div class="invoice-item">
            <img src="${producto.imagen || 'https://via.placeholder.com/50'}" class="invoice-item-img">
            <div class="invoice-item-details">
                <h6>${producto.nombre}</h6>
                <p>$${producto.precio.toFixed(2)} x ${producto.cantidad}</p>
            </div>
            <div class="invoice-item-quantity">
                <button onclick="cambiarCantidadProductoFactura(${producto.id}, -1)" class="btn btn-sm btn-outline-secondary"><i class="fas fa-minus"></i></button>
                <span class="quantity-display">${producto.cantidad}</span>
                <button onclick="cambiarCantidadProductoFactura(${producto.id}, 1)" class="btn btn-sm btn-outline-secondary"><i class="fas fa-plus"></i></button>
            </div>
            <div class="invoice-item-total">$${(producto.precio * producto.cantidad).toFixed(2)}</div>
            <button onclick="eliminarProductoFactura(${producto.id})" class="btn-icon"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

function actualizarTotalesFactura() {
    const subtotal = facturaActual.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const iva = subtotal * 0.12;
    const total = subtotal + iva;

    document.getElementById('invoice-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('invoice-tax').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('invoice-total').textContent = `$${total.toFixed(2)}`;
}

function actualizarVistaPrevia() {
    const subtotal = facturaActual.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const iva = subtotal * 0.12;
    const total = subtotal + iva;

    const previewClientName = document.getElementById('preview-client-name');
    const previewClientEmail = document.getElementById('preview-client-email');
    const previewItemsCount = document.getElementById('preview-items-count');
    const previewTotal = document.getElementById('preview-total');

    if (previewClientName) previewClientName.textContent = facturaActual.cliente?.nombre || '-';
    if (previewClientEmail) previewClientEmail.textContent = facturaActual.cliente?.email || '-';
    if (previewItemsCount) previewItemsCount.textContent = facturaActual.productos.length;
    if (previewTotal) previewTotal.textContent = `$${total.toFixed(2)}`;
}

function generarNumeroFactura() {
    const invoiceNumberEl = document.getElementById('invoice-number');
    if (invoiceNumberEl) {
        invoiceNumberEl.textContent = `FAC-${String(facturas.length + 1).padStart(3, '0')}`;
    }
}
