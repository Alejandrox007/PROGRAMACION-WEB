<?php
// Incluir la conexión a la base de datos
require_once '../conexion/bd.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Aquí va el código para manejar el formulario enviado

    $nombre = $_POST['nombre'] ?? '';
    $email = $_POST['email'] ?? '';
    $edad = $_POST['edad'] ?? '';


    // Preparar consulta de inserción SQL
    $sql = "INSERT INTO usuarios (nombre, email, edad) VALUES (:nombre, :email, :edad)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':nombre', $nombre);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':edad', $edad);

    // Ejecutar inserción
    try {
        $stmt->execute();
        echo "Usuario guardado exitosamente. Redirigiendo...";
        // Redireccionar después de un breve delay
        echo "<script>
                setTimeout(function() {
                    window.location.href = '../index.html';
                }, 2000);
              </script>";
        exit();
    } catch (PDOException $e) {
        echo "Error al insertar datos: " . $e->getMessage();
    }
} else {
    echo "Método no permitido.";
}
?>