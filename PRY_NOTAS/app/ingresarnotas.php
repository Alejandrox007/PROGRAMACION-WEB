
<?php
require_once '../conexion/bd.php';

$query = "SELECT * FROM usuarios";
$stm = $pdo->prepare($query);
$stm->execute();
$usuarios = $stm->fetchAll(PDO::FETCH_ASSOC);

$queryMaterias = "SELECT * FROM materias";
$stmMaterias = $pdo->prepare($queryMaterias);
$stmMaterias->execute();
$materias = $stmMaterias->fetchAll(PDO::FETCH_ASSOC);


?>
<!-- Consultar usuarios de base de datos -->

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ingreso de Notas</title>
    <link rel="stylesheet" href="../public/lib/bootstrap-5.3.5-dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/css/swalstrap.min.css">
</head>
<body>

<div class="container mt-5">
    <h1 class="text-center mb-4">Ingreso de Notas</h1>

    <form action="./guardar_notas.php" id="formIngresarNotas" method="POST">
        <div class="mb-3">
            <label for="usuario_id" class="form-label">Seleccionar Usuario</label>

            <select name="usuario_id" id="usuario_id" class="form-select" required>
                <option value="">Seleccione un usuario</option>
                <!-- Iterar sobre los usuarios obtenidos de la base de datos -->
                <?php foreach ($usuarios as $usuario): ?>
                    <option value="<?= $usuario['id'] ?>"><?= $usuario['nombre'] ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="mb-3">
            <label for="materias_id" class="form-label">Seleccionar Materia</label>
            <select name="materias_id" id="materias_id" class="form-select" required>
                <option value="">Seleccione una materia</option>
                <?php foreach ($materias as $materia): ?>
                    <option value="<?= $materia['id'] ?>"><?= $materia['nombre'] ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div class="row">
            <div class="col-md-4 mb-3">
                <label for="nota_1" class="form-label">Ingrese la Nota 1</label>
                <input type="number" name="nota_1" id="nota1" class="form-control" step="0.01" required max="20" min="0">
            </div>
            <div class="col-md-4 mb-3">
                <label for="nota_2" class="form-label">Ingrese la Nota 2</label>
                <input type="number" name="nota_2" id="nota2" class="form-control" step="0.01" max="20" min="0">
            </div>
            <div class="col-md-4 mb-3">
                <label for="nota_3" class="form-label">Ingrese la Nota 3</label>
                <input type="number" name="nota_3" id="nota3" class="form-control" step="0.01" required max="20" min="0">
            </div>
        </div>

        <div class="d-grid gap-2">
            <button
                type="submit"
                class="btn btn-primary"
                
            >
              Guardar Notas
            </button>

            <button
                type="button"
                class="btn btn-success"
                onclick="window.location.href='../index.html'"
            >
              Regresar
            </button>

        </div>
        
    </form>

<script src="../public/lib/bootstrap-5.3.5-dist/js/bootstrap.bundle.min.js"></script>
<script>
    const formIngresarNotas = document.getElementById('formIngresarNotas');
    formIngresarNotas.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(formIngresarNotas);
        fetch('guardar_notas.php', {
            method: 'POST',
            body: formData
        })

        .then(function(response) {
            return response.text();
        })
        .then(function(data) {
            console.log(data);
            swal.fire({
                title: 'Éxito',
                text: 'Notas guardadas correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
            });
            formIngresarNotas.reset();
        })
        .catch(function(error) {
            console.error('Error:', error);
        });

    });
</script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5_all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magicbruno/swalstrap5@1.0.8/dist/js/swalstrap5.min.js"></script>
</body>
</html>