<?php

require_once '../conexion/bd.php';

$request = json_decode(file_get_contents('php://input'), true);

$id = $request['id'];

if ($id) {
    $sql = "DELETE FROM usuarios WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id);
    
    try {
        $stmt->execute();
        if($stmt->rowCount() > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Usuario eliminado correctamente.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No se encontró el usuario o ya fue eliminado.']);
        }
    } catch(PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error al eliminar el usuario: ' . $e->getMessage()]);
    }
}