CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    edad INT,
);

CREATE table materias(
    id int AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    NRC VARCHAR(20) NOT NULL UNIQUE,
);

CREATE table notas (
 id int AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT not null,
 materia_id int not null,
 n1 decimal(5,2),
 n2 decimal(5,2),
 n3 decimal(5,2),
 promedio decimal(5,2),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) on delete cascade,
FOREIGN KEY (materia_id) REFERENCES materias(id) on delete cascade
);