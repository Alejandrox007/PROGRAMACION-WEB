<?php

/* Conexion a base de datos usando PDO */

$host = 'localhost';
$db = 'c_usuarios';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
    /* Conexion a la base de datos */
    $pdo = new PDO($dsn, $user, $pass);

    /* Configuracion de errores */
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
/*     echo "Conexión exitosa a la base de datos $db"; */

} catch (PDOException $e) {
    echo "Error de conexión: " . $e->getMessage();
}

?>