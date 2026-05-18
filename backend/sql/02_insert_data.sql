INSERT INTO usuarios_sistema (nombre, email, password_hash, rol) VALUES
('Admin BioSenior', 'admin@biosenior.local', '1234', 'admin'),
('Auxiliar Demo', 'auxiliar@biosenior.local', '1234', 'auxiliar');

INSERT INTO residentes (nombre, apellidos, genero, habitacion) VALUES
('Carmen', 'García López', 'femenino', '101'),
('José', 'Martínez Ruiz', 'masculino', '102'),
('María', 'Sánchez Pérez', 'femenino', '103'),
('Antonio', 'Fernández Gómez', 'masculino', '104');

INSERT INTO tipos_deposicion (nombre, descripcion) VALUES
('Normal', 'Deposición normal'),
('Blanda', 'Deposición blanda'),
('Pastosa', 'Deposición pastosa'),
('Líquida', 'Deposición líquida'),
('Estreñida', 'Deposición estreñida'),
('No', 'No ha realizado deposición');

INSERT INTO auxiliares (nombre, grupo_letra) VALUES
('Laura', 'A'),
('Marta', 'B'),
('Sara', 'C'),
('Nuria', 'D');

INSERT INTO turnos (nombre, hora_inicio, hora_fin) VALUES
('Mañana', '07:00', '14:00'),
('Tarde', '14:00', '22:00'),
('Noche', '22:00', '07:00');

INSERT INTO tareas (nombre, descripcion) VALUES
('Basura', 'Retirada de basura del turno'),
('Lavandería', 'Gestión de ropa y lavandería'),
('Reposición', 'Reposición de material'),
('Apoyo comedor', 'Apoyo en comedor');

INSERT INTO registros_deposiciones (id_residente, id_tipo, id_usuario, fecha_registro, observacion) VALUES
(1, 1, 2, CURRENT_TIMESTAMP - INTERVAL '3 days', 'Registro de prueba'),
(2, 6, 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Sin deposición registrada'),
(3, 2, 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Blanda'),
(4, 1, 2, CURRENT_TIMESTAMP, 'Normal');

INSERT INTO planning_asignaciones (id_auxiliar, id_tarea, id_turno, fecha, estado, observacion) VALUES
(1, 1, 1, CURRENT_DATE, 'pendiente', 'Asignación de prueba'),
(2, 2, 1, CURRENT_DATE, 'pendiente', 'Asignación de prueba'),
(3, 3, 2, CURRENT_DATE, 'realizada', 'Asignación completada');