// =================================================================================
// API DE NOTIFICACIONES (TOAST)
// =================================================================================

function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Contenedor de notificaciones no encontrado.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${tipo}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${getIconoNotificacion(tipo)}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }, 4000);
}

function getIconoNotificacion(tipo) {
    const iconos = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return iconos[tipo] || iconos.info;
}

function solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Permiso para notificaciones concedido.');
            }
        });
    }
}

function enviarNotificacionFactura(factura) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const clienteNombre = factura.cliente.nombre;
        const total = factura.total.toFixed(2);
        const body = `Cliente: ${clienteNombre}\nTotal: $${total}`;

        const notificacion = new Notification('✅ Factura Generada', {
            body: body,
            icon: './public/img/logo.png' 
        });
    } else {
        console.log('Notificación de factura generada (permiso no concedido):', factura);
    }
}


// =================================================================================
// API DE CÁMARA Y ARCHIVOS (FILE READER)
// =================================================================================

function startCamera(type) {
    stopCamera(); 
    currentImageType = type;
    const previewContainer = document.getElementById(`camera-container-${type}`);
    
    if (!previewContainer) {
        console.error(`Contenedor de cámara para '${type}' no encontrado.`);
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            currentCamera = stream;
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            
            const captureButton = document.createElement('button');
            captureButton.textContent = 'Capturar Foto';
            captureButton.className = 'btn btn-primary btn-sm';
            captureButton.onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg');

                previewContainer.innerHTML = `<img src="${imageData}" alt="Captured photo" class="photo-preview">`;
                stopCamera();
            };

            previewContainer.innerHTML = '';
            previewContainer.appendChild(video);
            previewContainer.appendChild(captureButton);
            previewContainer.style.display = 'block';
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
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="photo-preview">`;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}


// =================================================================================
// API DE GEOLOCALIZACIÓN
// =================================================================================

function obtenerUbicacion() {
    const captureBtn = document.getElementById('capture-location-btn');
    const locationStatus = document.getElementById('location-status');
    const locationDetails = document.getElementById('location-details');

    if (!('geolocation' in navigator)) {
        mostrarNotificacion('Geolocalización no disponible en este navegador.', 'error');
        if(locationStatus) locationStatus.textContent = 'Geolocalización no soportada';
        return;
    }

    if(captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
    }
    if(locationStatus) {
        locationStatus.textContent = 'Obteniendo ubicación...';
        locationStatus.className = 'location-status loading';
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            facturaActual.ubicacion = {
                latitud: latitude,
                longitud: longitude,
                precision: accuracy,
                timestamp: new Date().toISOString()
            };

            if(locationStatus) {
                locationStatus.textContent = '✅ Ubicación capturada';
                locationStatus.className = 'location-status success';
            }
            if(locationDetails) {
                document.getElementById('location-lat').textContent = latitude.toFixed(6);
                document.getElementById('location-lng').textContent = longitude.toFixed(6);
                locationDetails.classList.remove('d-none');
            }
            if(captureBtn) {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            }
            
            mostrarNotificacion(`Ubicación capturada con éxito.`, 'success');
            obtenerDireccionAproximada(latitude, longitude);
        },
        (error) => {
            handleGeolocationError(error, locationStatus, locationDetails, captureBtn);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function obtenerUbicacionCliente() {
    const captureBtn = document.getElementById('capture-client-location-btn');
    const locationStatus = document.getElementById('client-location-status');
    const locationDetails = document.getElementById('client-location-details');

    if (!('geolocation' in navigator)) {
        mostrarNotificacion('Geolocalización no disponible.', 'error');
        if(locationStatus) locationStatus.textContent = 'No soportada';
        return;
    }

    if(captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
    }
    if(locationStatus) {
        locationStatus.textContent = 'Obteniendo ubicación...';
        locationStatus.className = 'location-status loading';
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            window.tempClientLocation = {
                latitud: latitude,
                longitud: longitude,
                precision: accuracy,
                timestamp: new Date().toISOString()
            };

            if(locationStatus) {
                locationStatus.textContent = '✅ Ubicación capturada';
                locationStatus.className = 'location-status success';
            }
            if(locationDetails) {
                document.getElementById('client-location-lat').textContent = latitude.toFixed(6);
                document.getElementById('client-location-lng').textContent = longitude.toFixed(6);
                document.getElementById('client-location-accuracy').textContent = Math.round(accuracy);
                locationDetails.classList.remove('d-none');
            }
            if(captureBtn) {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            }
            
            mostrarNotificacion(`Ubicación del cliente capturada.`, 'success');
            obtenerDireccionAproximadaCliente(latitude, longitude);
        },
        (error) => {
            handleGeolocationError(error, locationStatus, locationDetails, captureBtn);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function handleGeolocationError(error, statusEl, detailsEl, btnEl) {
    let mensaje = 'Error desconocido al obtener ubicación';
    switch (error.code) {
        case error.PERMISSION_DENIED:
            mensaje = 'Permiso denegado para acceder a la ubicación';
            break;
        case error.POSITION_UNAVAILABLE:
            mensaje = 'Información de ubicación no disponible';
            break;
        case error.TIMEOUT:
            mensaje = 'Tiempo de espera agotado para obtener ubicación';
            break;
    }
    
    if(statusEl) {
        statusEl.textContent = '❌ ' + mensaje;
        statusEl.className = 'location-status error';
    }
    if(detailsEl) detailsEl.classList.add('d-none');
    if(btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="fas fa-location-arrow"></i> Intentar de nuevo';
    }

    mostrarNotificacion(mensaje, 'error');
    console.error('Error de geolocalización:', error);
}

function obtenerDireccionAproximada(lat, lng) {
    const direcciones = ['Zona Centro', 'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste'];
    const direccionAleatoria = direcciones[Math.floor(Math.random() * direcciones.length)];
    
    if (facturaActual.ubicacion) {
        facturaActual.ubicacion.direccionAproximada = direccionAleatoria;
    }

    const addressDisplay = document.getElementById('location-address-display');
    const addressText = document.getElementById('location-address-text');
    if (addressDisplay && addressText) {
        addressText.textContent = direccionAleatoria;
        addressDisplay.classList.remove('d-none');
    }
}

function obtenerDireccionAproximadaCliente(lat, lng) {
    const direcciones = ['Área Residencial', 'Distrito Comercial', 'Parque Industrial', 'Zona Rural', 'Centro Urbano'];
    const direccionAleatoria = direcciones[Math.floor(Math.random() * direcciones.length)];

    if (window.tempClientLocation) {
        window.tempClientLocation.direccionAproximada = direccionAleatoria;
    }

    const addressContainer = document.getElementById('client-location-address-container');
    const addressSpan = document.getElementById('client-location-address');
    if (addressContainer && addressSpan) {
        addressSpan.textContent = direccionAleatoria;
        addressContainer.classList.remove('d-none');
    }
}

function mostrarMapaUbicacion(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
    mostrarNotificacion('Abriendo ubicación en Google Maps...', 'info');
}

function limpiarUbicacion() {
    facturaActual.ubicacion = null;
    const locationStatus = document.getElementById('location-status');
    const locationDetails = document.getElementById('location-details');
    const captureBtn = document.getElementById('capture-location-btn');

    if (locationStatus) {
        locationStatus.textContent = 'Ubicación no capturada';
        locationStatus.className = 'location-status';
    }
    if (locationDetails) {
        locationDetails.classList.add('d-none');
    }
    if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Capturar Ubicación';
    }
}
