<?php

require_once '../conexion/bd.php';

/* consulta de datos con pdo */
$query = "SELECT * FROM usuarios ORDER BY id";
$stmt = $pdo->prepare($query);
$stmt->execute();
$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

?>



<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Listado de Usuarios - CRUD</title>
   <link rel="stylesheet" href="../public/lib/bootstrap-5.3.5-dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="../public/css/styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/css/swalstrap.min.css">
    <link rel="stylesheet" href ="https://cdn.datatables.net/2.3.2/css/dataTables.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            max-width: 900px;
            margin: auto;
        }
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>

<div class="container py-5">
    <div class="table-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="text-center">Listado de Usuarios</h1>
            <a href="crear.php" class="btn btn-primary">
                <i class="fas fa-plus"></i> Nuevo Usuario
            </a>
        </div>
    
<!-- verificar si hay usuarios -->

<?php if(!empty($usuarios)): ?>

    <div class="table-responsive">
        <table class="table table-striped table-bordered table-hover" id="tablaUsuarios">
            <thead class="table-dark">
                <tr> 
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Edad</th>
                    <th class="text-center">Acciones</th>
                </tr>
            </thead>
        <tbody>
            <?php foreach($usuarios as $usuario): ?>
            <tr>
 
                <td><?php echo htmlspecialchars($usuario['nombre']); ?></td>
                <td><?php echo htmlspecialchars($usuario['email']); ?></td>
                <td><?php echo htmlspecialchars($usuario['edad']); ?></td>
                <td>
                    <!-- <a href="editar.php?id=<?php echo $usuario['id']; ?>" class="btn btn-warning btn-sm">Editar</a> -->
                     <button type="button" class="btn btn-primary btnEditarUsuario" data-id="<?php echo $usuario['id']; ?>"> Editar </button>



                    <!-- <a href="eliminar.php?id=<?php echo $usuario['id']; ?>" class="btn btn-danger btn-sm" 
                       onclick="return confirm('¿Estás seguro de eliminar este usuario?')">Eliminar</a>
 -->
                    <button type="button" 
                    class="btn btn-danger btn-sm btnEliminarUsuario" 
                    data-id="<?php echo $usuario['id']; ?>" 
                    data-nombre="<?php echo htmlspecialchars($usuario['nombre']); ?>"
                    >Eliminar</button>

                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>
    
<div class="text-center mt-4">
    <a href="../index.html" class="btn btn-secondary">
        <i class="fas fa-home"></i> Volver al Inicio
    </a>
</div>

<?php else: ?>

<div class="text-center py-5">
    <div class="alert alert-info" role="alert">
        <h4 class="alert-heading">¡No hay usuarios registrados!</h4>
        <p>Aún no se han registrado usuarios en el sistema.</p>
        <hr>
        <p class="mb-0">
            <a href="crear.php" class="btn btn-primary">
                <i class="fas fa-plus"></i> Crear primer usuario
            </a>
        </p>
    </div>
    
    <div class="text-center mt-4">
        <a href="../index.html" class="btn btn-secondary">
            <i class="fas fa-home"></i> Volver al Inicio
        </a>
    </div>
</div>

<?php endif; ?>

<!-- Modal para editar usuario -->

<div class="modal fade" id="modalEditarUsuario" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="exampleModalLabel">Editar Usuario</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        
        <form id="formEditarUsuario">
            <input type="hidden" id="id" name="id">
            <div class="mb-3">
                <label for="nombre" class="form-label">Nombre</label>
                <input type="text" class="form-control" id="nombre" name="nombre" required>
            </div>
            <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control" id="email" name="email" required>
            </div>
            <div class="mb-3">
                <label for="edad" class="form-label">Edad</label>
                <input type="number" class="form-control" id="edad" name="edad" required>
            </div>
        </form>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="btnGuardarCambios">Save changes</button>
      </div>
    </div>
  </div>
</div>


<!-- Modal para eliminar usuario -->

</div>
<script src="../public/lib/bootstrap-5.3.5-dist/js/bootstrap.bundle.min.js"></script>
<script>
  $(document).ready(function() {
    $('#tablaUsuarios').DataTable({
      pageLength: 10,
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      }
    });
  });
</script>

<script>

const modalEditarUsuario = new bootstrap.Modal(document.getElementById('modalEditarUsuario'), { keyboard: false });

// Función para eliminar usuario con confirmación personalizada
function EliminarUsuario(id, nombre) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `¿Estás seguro de eliminar el usuario "${nombre}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '¡Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Usar fetch para eliminar el usuario
            fetch('eliminar.php', {
                method: 'POST',
                body: JSON.stringify({ id: id }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.status === 'success') {
                    Swal.fire('¡Eliminado!', data.message, 'success')
                    .then(() => {
                        // Recargar la página para actualizar la tabla
                        location.reload();
                    });
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(function(error) {
                console.error('Error al eliminar el usuario:', error);
                Swal.fire('Error', 'Ocurrió un error al eliminar el usuario', 'error');
            });
        }
    });
}


var tablaUsuarios = document.getElementById('tablaUsuarios');
tablaUsuarios.addEventListener('click', function(event) {
if (event.target && (event.target.classList.contains('btnEditarUsuario'))) {
   var idUser = event.target.dataset.id;
   console.log('ID del usuario:', idUser);
   modalEditarUsuario.show();
    
   fetch('obtenerPorId.php',{
    method: 'POST',
    body: JSON.stringify({ id: idUser }),
    headers:{
        'content-type': 'application/json'
    }



   })

   .then (function(response){
    return response.json();
   })
   
   .then(function(request){

    document.getElementById('id').value = request.id;
    document.getElementById('nombre').value = request.nombre;
    document.getElementById('email').value = request.email;
    document.getElementById('edad').value = request.edad;
    

   })

   .catch(function(error){
    console.error('Error al obtener los datos del usuario:', error);
   });
    }




if (event.target && event.target.classList.contains('btnEliminarUsuario')) {
        var idUser = event.target.dataset.id;
        var nombreUser = event.target.dataset.nombre;
        console.log('ID del usuario a eliminar:', idUser, 'Nombre:', nombreUser);
        
        // Llamar a la función EliminarUsuario
        EliminarUsuario(idUser, nombreUser);
    }    
});


// Event listener para el botón Save changes
document.getElementById('btnGuardarCambios').addEventListener('click', function() {
    const id = document.getElementById('id').value;
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const edad = document.getElementById('edad').value;
    
    // Validar que todos los campos estén llenos
    if (!nombre || !email || !edad) {
        Swal.fire('Error', 'Por favor completa todos los campos', 'error');
        return;
    }
    
    // Enviar datos para actualizar
    fetch('actualizar.php', {
        method: 'POST',
        body: JSON.stringify({ 
            id: id, 
            nombre: nombre, 
            email: email, 
            edad: edad 
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.status === 'success') {
            Swal.fire('¡Actualizado!', data.message, 'success')
            .then(() => {
                modalEditarUsuario.hide();
                location.reload();
            });
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    })
    .catch(function(error) {
        console.error('Error al actualizar el usuario:', error);
        Swal.fire('Error', 'Ocurrió un error al actualizar el usuario', 'error');
    });
});




</script>
 
<script src="../public/lib/bootstrap-5.3.5-dist/js/bootstrap.bundle.min.js"></script>
<script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5_all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5.min.js"></script>
<script src="https://cdn.datatables.net/2.3.2/js/dataTables.min.js"></script>


<script>
    // Create an instance 
    const mySwal = new Swalstrap();
    // Then use it for all your popupss</script>

</body>
</html>