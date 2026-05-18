# Control Bio-Senior — Resumen técnico del proyecto

## 1. Finalidad del documento

Este documento resume la ruta de desarrollo seguida para el proyecto **Control Bio-Senior**, tomando como referencia los requerimientos académicos del profesor: análisis del problema, diseño de base de datos, organización por capas, uso de PostgreSQL, API REST, estructura tipo MVC y documentación técnica.

El objetivo es que cualquier compañero pueda entender qué se ha construido, qué tablas forman parte del modelo de datos, qué módulos existen y qué queda pendiente por definir o desarrollar.

---

## 2. Descripción general del proyecto

**Control Bio-Senior** es una aplicación web pensada para una residencia. Su objetivo es centralizar información relevante sobre residentes, usuarios del sistema y registros asistenciales diarios.

La aplicación permite organizar distintos módulos relacionados con el trabajo de auxiliares, administración y coordinación del centro.

La idea principal es evitar que la información quede dispersa entre libretas, notas, conversaciones orales o registros aislados.

---

## 3. Problema que se quiere resolver

En un entorno residencial, la información diaria puede perderse fácilmente entre turnos y equipos de trabajo. Esto puede provocar:

- Dificultad para saber qué residente tiene registros pendientes.
- Pérdida de información entre turnos.
- Falta de trazabilidad sobre quién registró una actuación.
- Duplicación de tareas.
- Dependencia excesiva de notas manuales o comunicación oral.
- Dificultad para consultar historial de actuaciones.

El proyecto propone una solución web centralizada, sencilla y modular.

---

## 4. Ruta seguida según los requerimientos del proyecto

La ruta técnica seguida fue:

```txt
1. Identificación del problema real
2. Definición de módulos funcionales
3. Diseño del modelo de datos
4. Creación de base de datos PostgreSQL
5. Creación de backend con Node.js y Express
6. Organización del backend en estructura tipo MVC
7. Creación de API REST
8. Conexión del frontend con la API
9. Implementación de módulos principales
10. Documentación del proyecto
```

---

## 5. Tecnologías utilizadas

### Frontend

```txt
HTML5
CSS3
JavaScript
```

### Backend

```txt
Node.js
Express.js
```

### Base de datos

```txt
PostgreSQL
```

### Herramientas de desarrollo

```txt
Visual Studio Code
Git
GitHub
pgAdmin
npm
nodemon
```

---

## 6. Arquitectura general

La aplicación está organizada por capas:

```txt
Frontend
   ↓
API REST con Express
   ↓
Controladores
   ↓
Modelos
   ↓
PostgreSQL
```

Esta separación permite que la interfaz, la lógica del servidor y la base de datos no estén mezcladas en un solo archivo.

---

## 7. Estructura principal del proyecto

```txt
control-biosenior-postgres/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── db/
│   │   └── connection.js
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   └── sql/
│
├── frontend/
│   ├── index.html
│   ├── menu-principal.html
│   ├── gestion-admin.html
│   ├── biosenior.html
│   ├── planning.html
│   ├── alimentacion.html
│   ├── comedor.html
│   ├── js/
│   ├── biosenior/
│   ├── planning/
│   ├── gestion-admin/
│   └── img/
│
└── README.md
```

---

## 8. Patrón MVC aplicado en el backend

El backend está organizado en una estructura tipo MVC.

### Modelos

Los modelos se comunican directamente con PostgreSQL.

Ejemplos:

```txt
backend/models/residente.model.js
backend/models/usuario.model.js
backend/models/deposicion.model.js
backend/models/planning.model.js
```

### Controladores

Los controladores reciben las peticiones HTTP, validan datos básicos y llaman al modelo correspondiente.

Ejemplos:

```txt
backend/controllers/residente.controller.js
backend/controllers/usuario.controller.js
backend/controllers/deposicion.controller.js
backend/controllers/planning.controller.js
```

### Rutas

Las rutas definen los endpoints de la API.

Ejemplos:

```txt
backend/routes/residente.routes.js
backend/routes/usuario.routes.js
backend/routes/deposicion.routes.js
backend/routes/planning.routes.js
```

---

## 9. Módulos identificados

El sistema contempla los siguientes módulos:

```txt
1. Login / Autenticación
2. Menú principal
3. Gestión Admin
4. BioSenior
5. Planning
6. Alimentación
7. Comedor
8. Tablón
9. Parte del día
10. Chat interno
```

---

## 10. Módulo Login / Autenticación

Permite iniciar sesión mediante usuario y PIN.

Los usuarios se almacenan en PostgreSQL en la tabla:

```txt
usuarios_sistema
```

La sesión activa se mantiene temporalmente en:

```txt
sessionStorage
```

Esto permite recordar al usuario durante la navegación, sin guardar usuarios completos en el navegador.

---

## 11. Módulo Menú principal

Es la pantalla de acceso a los distintos módulos de la aplicación.

Desde el menú principal se accede a:

```txt
Gestión Admin
BioSenior
Planning
Alimentación
Comedor
```

Y quedan previstos:

```txt
Tablón
Parte del día
Chat interno
```

---

## 12. Módulo Gestión Admin

Módulo reservado para usuarios administradores.

Permite:

```txt
Crear residentes
Editar residentes
Desactivar residentes
Crear usuarios
Editar usuarios
Desactivar usuarios
Reactivar usuarios
```

La desactivación no elimina físicamente los datos. Los registros quedan en la base de datos con:

```txt
activo = false
```

Esto conserva trazabilidad y evita pérdida de información.

---

## 13. Módulo BioSenior

Módulo destinado al registro de deposiciones y micciones de residentes.

Funcionalidades principales:

```txt
Seleccionar residente por orden alfabético
Registrar tipo de deposición
Registrar micción
Añadir observaciones
Consultar historial
Filtrar registros
Eliminar registros
Detectar alertas por ausencia prolongada de deposición
```

BioSenior se relaciona principalmente con estas tablas:

```txt
residentes
tipos_deposicion
registros_deposiciones
usuarios_sistema
```

---

## 14. Módulo Planning

Módulo orientado a la organización de tareas, auxiliares, turnos y asignaciones.

Tablas relacionadas:

```txt
auxiliares
turnos
tareas
planning_asignaciones
```

Actualmente cuenta con estructura inicial de base de datos y API.

---

## 15. Módulo Alimentación

Módulo destinado a gestionar información relacionada con el tipo de alimentación de los residentes.

Tablas relacionadas:

```txt
tipos_alimentacion
registros_alimentacion
residentes
usuarios_sistema
```

Pendiente de completar su integración funcional.

---

## 16. Módulo Comedor

Módulo destinado al seguimiento de ingestas y observaciones del comedor.

Tabla relacionada:

```txt
registros_comedor
```

Pendiente de completar su integración funcional.

---

## 17. Módulo Tablón

Módulo previsto para publicar avisos o mensajes internos visibles para el equipo.

Tabla relacionada:

```txt
mensajes_tablon
```

Pendiente de desarrollar.

---

## 18. Módulo Parte del día

Módulo previsto para registrar un resumen de turno o jornada.

Tabla relacionada:

```txt
partes_dia
```

Pendiente de desarrollar.

---

## 19. Módulo Chat interno

Módulo previsto para comunicación interna básica entre usuarios.

Tabla relacionada:

```txt
chat_mensajes
```

Pendiente de desarrollar.

---

## 20. Base de datos

La base de datos se llama:

```txt
control_biosenior
```

Actualmente el modelo contiene **14 tablas principales**.

---

## 21. Tablas actuales

### 21.1. usuarios_sistema

Guarda los usuarios que pueden acceder a la aplicación.

Campos principales:

```txt
id_usuario
nombre
email
password_hash
rol
activo
fecha_creacion
pin
```

Uso:

```txt
Login
Gestión Admin
Registro de acciones realizadas por usuarios
```

---

### 21.2. residentes

Guarda los datos principales de los residentes.

Campos principales:

```txt
id_residente
nombre
apellidos
genero
habitacion
activo
fecha_alta
movilidad
condicion_cognitiva
tipo_alimentacion
ayuda_comer
riesgo_caida
riesgo_atragantamiento
requiere_supervision
observaciones
```

Uso:

```txt
Gestión Admin
BioSenior
Alimentación
Comedor
```

---

### 21.3. tipos_deposicion

Catálogo de tipos de deposición.

Valores iniciales:

```txt
Normal
Blanda
Pastosa
Líquida
Estreñida
No
```

Uso:

```txt
BioSenior
```

---

### 21.4. registros_deposiciones

Registra las deposiciones y micciones de residentes.

Campos principales:

```txt
id_registro
id_residente
id_tipo
id_usuario
fecha_registro
observacion
miccion
turno
```

Relaciones:

```txt
id_residente → residentes
id_tipo → tipos_deposicion
id_usuario → usuarios_sistema
```

Uso:

```txt
BioSenior
Historial
Alertas
```

---

### 21.5. auxiliares

Guarda auxiliares o personal asignable a tareas.

Campos principales:

```txt
id_auxiliar
nombre
grupo_letra
activo
```

Uso:

```txt
Planning
```

---

### 21.6. turnos

Guarda los turnos de trabajo.

Ejemplos:

```txt
Mañana
Tarde
Noche
```

Uso:

```txt
Planning
BioSenior
```

---

### 21.7. tareas

Guarda las tareas planificables.

Campos principales:

```txt
id_tarea
nombre
descripcion
activa
```

Uso:

```txt
Planning
```

---

### 21.8. planning_asignaciones

Relaciona auxiliares, tareas, turnos y fechas.

Campos principales:

```txt
id_asignacion
id_auxiliar
id_tarea
id_turno
fecha
estado
observacion
```

Uso:

```txt
Planning
```

---

### 21.9. tipos_alimentacion

Catálogo de tipos de alimentación.

Valores iniciales:

```txt
Normal
Fácil masticación
Triturada
Espesantes
Sonda
```

Uso:

```txt
Alimentación
Gestión Admin
```

---

### 21.10. registros_alimentacion

Tabla preparada para registrar información de alimentación por residente.

Campos principales:

```txt
id_registro_alimentacion
id_residente
id_tipo_alimentacion
id_usuario
fecha_registro
observacion
```

Uso previsto:

```txt
Alimentación
```

---

### 21.11. registros_comedor

Tabla preparada para registrar ingestas y observaciones del comedor.

Campos principales:

```txt
id_registro_comedor
id_residente
id_usuario
fecha_registro
comida
ingesta
liquidos
observacion
```

Uso previsto:

```txt
Comedor
```

---

### 21.12. mensajes_tablon

Tabla preparada para avisos internos.

Campos principales:

```txt
id_mensaje
id_usuario
titulo
contenido
prioridad
activo
fecha_creacion
```

Uso previsto:

```txt
Tablón
```

---

### 21.13. partes_dia

Tabla preparada para registrar partes o resúmenes de jornada.

Campos principales:

```txt
id_parte
id_usuario
fecha
turno
resumen
incidencias
pendientes
fecha_creacion
```

Uso previsto:

```txt
Parte del día
```

---

### 21.14. chat_mensajes

Tabla preparada para mensajes internos.

Campos principales:

```txt
id_chat
id_usuario
mensaje
fecha_envio
leido
```

Uso previsto:

```txt
Chat interno
```

---

## 22. Relaciones principales del DER

Relaciones principales:

```txt
residentes 1 ─── N registros_deposiciones

tipos_deposicion 1 ─── N registros_deposiciones

usuarios_sistema 1 ─── N registros_deposiciones

auxiliares 1 ─── N planning_asignaciones

tareas 1 ─── N planning_asignaciones

turnos 1 ─── N planning_asignaciones

residentes 1 ─── N registros_alimentacion

tipos_alimentacion 1 ─── N registros_alimentacion

residentes 1 ─── N registros_comedor

usuarios_sistema 1 ─── N registros_comedor

usuarios_sistema 1 ─── N mensajes_tablon

usuarios_sistema 1 ─── N partes_dia

usuarios_sistema 1 ─── N chat_mensajes
```

---

## 23. API REST implementada o preparada

### Residentes

```txt
GET    /api/residentes
GET    /api/residentes/:id
POST   /api/residentes
PUT    /api/residentes/:id
DELETE /api/residentes/:id
```

### Usuarios

```txt
GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id
POST   /api/usuarios/login
```

### Deposiciones

```txt
GET    /api/deposiciones
POST   /api/deposiciones
DELETE /api/deposiciones/:id
GET    /api/deposiciones/tipos
GET    /api/deposiciones/alertas
```

### Planning

```txt
GET    /api/planning
POST   /api/planning
GET    /api/planning/auxiliares
GET    /api/planning/tareas
```

---

## 24. Funcionalidades logradas

Actualmente se ha logrado:

```txt
Servidor Express funcionando
Conexión con PostgreSQL
Base de datos creada
Modelo relacional con 14 tablas
Autenticación por usuario y PIN
Login conectado al backend
Sesión activa en sessionStorage
Gestión Admin funcional
Crear residentes
Editar residentes
Desactivar residentes
Crear usuarios
Editar usuarios
Desactivar usuarios
Reactivar usuarios
Login solo con usuarios activos
API de residentes
API de usuarios
API de deposiciones
API inicial de Planning
BioSenior en proceso avanzado de integración
```

---

## 25. Pendiente por definir o desarrollar

Queda pendiente:

```txt
Terminar pruebas completas de BioSenior
Revisar filtros avanzados de historial BioSenior
Completar módulo Alimentación
Completar módulo Comedor
Completar módulo Planning
Desarrollar Tablón
Desarrollar Parte del día
Desarrollar Chat interno
Implementar backup desde backend
Crear DER visual
Añadir capturas para la defensa
Mejorar validaciones
Mejorar control de errores
Crear datos de prueba más realistas
Revisar seguridad del login
Añadir cifrado real de PIN/contraseñas en una versión futura
```

---

## 26. Scripts SQL creados

Los scripts SQL se encuentran en:

```txt
backend/sql/
```

Orden utilizado o recomendado:

```txt
01_create_tables.sql
02_insert_data.sql
04_expandir_modelo_real.sql
05_ajustar_genero_residentes.sql
06_ajustar_biosenior.sql
```

---

## 27. Ejecución local del proyecto

### 27.1. Instalar dependencias

Desde la carpeta `backend`:

```bash
npm install
```

### 27.2. Crear archivo `.env`

Dentro de `backend/`, crear:

```txt
.env
```

Contenido esperado:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=control_biosenior
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_DE_POSTGRES
```

El archivo `.env` no debe subirse a GitHub.

### 27.3. Ejecutar servidor

Desde `backend`:

```bash
npm run dev
```

La aplicación queda disponible en:

```txt
http://localhost:3000/index.html
```

---

## 28. Usuario de prueba

Usuario demo:

```txt
Admin BioSenior
PIN: 1234
```

---

## 29. Estado actual del proyecto

El proyecto está en fase de desarrollo académico.

Ya tiene una base técnica sólida:

```txt
Frontend organizado
Backend Express
PostgreSQL
API REST
Estructura MVC
Modelo relacional ampliado
Gestión Admin funcional
Login funcional
Módulos principales identificados
```

El siguiente objetivo es completar los módulos pendientes y preparar la explicación final del DER, la arquitectura y las funcionalidades implementadas.

---

## 30. Explicación breve para un compañero

Una forma simple de explicar el proyecto sería:

> Estamos desarrollando una aplicación web para una residencia. Primero identificamos los módulos que necesitaba el sistema: gestión de residentes, usuarios, BioSenior, planificación, alimentación, comedor, tablón, parte del día y chat. Después diseñamos una base de datos en PostgreSQL con 14 tablas relacionadas. Luego organizamos el backend con Node.js y Express usando una estructura tipo MVC: rutas, controladores y modelos. Finalmente conectamos el frontend con la API REST para que los datos se consulten y registren en la base de datos.

---

## 31. Autoría

Proyecto desarrollado como ejercicio académico para aplicar:

```txt
HTML
CSS
JavaScript
Node.js
Express
PostgreSQL
Diseño de base de datos
API REST
Arquitectura MVC
Git y GitHub
```
