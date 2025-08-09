<?php

require_once '../conexion/bd.php';

/* consulta de datos con pdo - JOIN para obtener nombres de usuario y materia */
$query = "SELECT 
            notas.id,
            usuarios.nombre AS usuario_nombre, 
            materias.nombre AS materias_nombre, 
            notas.n1, 
            notas.n2, 
            notas.n3, 
            notas.promedio 
          FROM notas
          JOIN usuarios ON notas.usuario_id = usuarios.id 
          JOIN materias ON notas.materias_id = materias.id
          ORDER BY notas.id";

$stmt = $pdo->prepare($query);
$stmt->execute();
$notas = $stmt->fetchAll(PDO::FETCH_ASSOC);

?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Listado de Notas - CRUD</title>
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
            max-width: 1200px;
            margin: auto;
        }
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .badge-aprobado {
            background-color: #28a745;
        }
        .badge-desaprobado {
            background-color: #dc3545;
        }
    </style>
</head>
<body>

<div class="container py-5">
    <div class="table-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="text-center">Listado de Notas</h1>
            <a href="./ingresarnotas.php" class="btn btn-primary">
                <i class="fas fa-plus"></i> Nueva Nota
            </a>
        </div>
    
<!-- verificar si hay notas -->

<?php if(!empty($notas)): ?>

    <div class="table-responsive">
        <table class="table table-striped table-bordered table-hover" id="tablaNotas">
            <thead class="table-dark">
                <tr>
                    <th>Nombre</th>
                    <th>Materia</th>
                    <th>Nota 1</th>
                    <th>Nota 2</th>
                    <th>Nota 3</th>
                    <th>Promedio</th>
                    <th class="text-center">Estado</th>
                </tr>
            </thead>
        <tbody>




                    <?php foreach($notas as $nota): ?>
            <tr>
                <td><?php echo htmlspecialchars($nota['usuario_nombre']); ?></td>
                <td><?php echo htmlspecialchars($nota['materias_nombre']); ?></td>
                <td><?php echo number_format($nota['n1'], 2); ?></td>
                <td><?php echo number_format($nota['n2'], 2); ?></td>
                <td><?php echo number_format($nota['n3'], 2); ?></td>
                <td><strong><?php echo number_format($nota['promedio'], 2); ?></strong></td>
                <td class="text-center">
                    <?php 
                    // Lógica de aprobación en PHP
                    if($nota['promedio'] >= 14): 
                        $estado = 'APROBADO';
                        $badgeClass = 'badge-aprobado';
                    else: 
                        $estado = 'REPROBADO';
                        $badgeClass = 'badge-desaprobado';
                    endif; 
                    ?>
                    <span class="badge <?php echo $badgeClass; ?>"><?php echo $estado; ?></span>
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
        <h4 class="alert-heading">¡No hay notas registradas!</h4>
        <p>Aún no se han registrado notas en el sistema.</p>
        <hr>
        <p class="mb-0">
            <a href="ingresarnotas.php" class="btn btn-primary">
                <i class="fas fa-plus"></i> Ingresar primera nota
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

</div>

<script src="../public/lib/bootstrap-5.3.5-dist/js/bootstrap.bundle.min.js"></script>
<script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5_all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5.min.js"></script>
<script src="https://cdn.datatables.net/2.3.2/js/dataTables.min.js"></script>

<script>
  $(document).ready(function() {
    $('#tablaNotas').DataTable({
      pageLength: 10,
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      }
    });
  });
</script>

<!-- <script>
    // Create an instance 
    const mySwal = new Swalstrap();
    
    Swal.fire('¡Bienvenido!','Sistema de notas cargado correctamente','success')
</script> -->

</body>
</html>
