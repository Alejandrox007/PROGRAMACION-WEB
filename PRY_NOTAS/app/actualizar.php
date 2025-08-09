<?php

require_once '../conexion/bd.php';

$request = json_decode(file_get_contents('php://input'), true);
$id = $request['id'] ?? null;
$nombre = $request['nombre'] ?? null;
$email = $request['email'] ?? null;
$edad = $request['edad'] ?? null;

if ($id && $nombre && $email && $edad) {
    // Actualizar usuario
    $sql = "UPDATE usuarios SET nombre = :nombre, email = :email, edad = :edad WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':nombre', $nombre);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':edad', $edad);
    
    try {
        $stmt->execute();
        if($stmt->rowCount() > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Usuario actualizado correctamente.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No se pudo actualizar el usuario.']);
        }
    } catch(PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error al actualizar el usuario: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
}

?>