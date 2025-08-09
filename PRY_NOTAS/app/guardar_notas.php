<?php

require_once '../conexion/bd.php';

/* capturar datos del form ingresarnotas.php */

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario_id = $_POST['usuario_id'];
    $materias_id = $_POST['materias_id'];
    $nota_1 = $_POST['nota_1'];
    $nota_2 = $_POST['nota_2'];
    $nota_3 = $_POST['nota_3'];
    $promedio = ($nota_1 + $nota_2 + $nota_3) / 3;

    $sql = "INSERT INTO notas (usuario_id, materias_id, n1, n2, n3, promedio) 
            VALUES (:usuario_id, :materias_id, :n1, :n2, :n3, :promedio)";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':usuario_id', $usuario_id);
    $stmt->bindParam(':materias_id', $materias_id);
    $stmt->bindParam(':n1', $nota_1);
    $stmt->bindParam(':n2', $nota_2);
    $stmt->bindParam(':n3', $nota_3);
    $stmt->bindParam(':promedio', $promedio);
    if($stmt -> execute()){
        echo "<div class='alert alert-success'>Notas guardadas correctamente</div>";
        echo "<a href='ingresarnotas.php' class='btn btn-primary'>Volver al formulario</a>";
    } else {
        echo "Error al guardar las notas";
    }
} else {
    echo "Método de solicitud no válido.";
}

?>