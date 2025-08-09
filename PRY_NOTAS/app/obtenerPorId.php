<?php

require_once '../conexion/bd.php';

$request = json_decode(file_get_contents('php://input'), true);
$id = $request['id'] ?? null;

if ($id) {
    $sql = "SELECT * FROM usuarios WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id);
    
    try {
        $stmt->execute();
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($usuario) {
            echo json_encode($usuario);
        } else {
            echo json_encode(['error' => 'Usuario no encontrado']);
        }
    } catch(PDOException $e) {
        echo json_encode(['error' => 'Error al obtener el usuario: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'ID no proporcionado']);
}

?>