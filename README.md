# ps-ms-curriculum-service

Microservicio encargado de la gestión de mallas curriculares, ramos, prerrequisitos y el progreso académico de los estudiantes dentro del ecosistema **PopStudy**.

## 🚀 Tecnologías

- **Node.js** & **Express**
- **Supabase** (PostgreSQL)
- **JWT** (Autenticación via Supabase Auth)

## 🛠️ Configuración

1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   Crea un archivo `.env` basado en `.env.example`:
   ```env
   PORT=3002
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE=tu_service_role_key
   ```

4. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```

## 📍 Endpoints Principales

Todas las rutas requieren un token válido de Supabase en el header `Authorization: Bearer <token>`.

### Contexto de Inteligencia Artificial (IA)
- `GET /ai-context`: Obtiene la malla curricular completa adaptada para el contexto de la IA (Header + Ramos + Progreso).
- `GET /ai-context/current`: Obtiene únicamente las materias que el estudiante está cursando actualmente para el contexto de la IA.

### Malla Curricular (Header)
- `GET /`: Obtiene la malla completa del estudiante (Header + Ramos + Progreso).
- `PATCH /`: Actualiza los datos generales de la malla (nombre, universidad, etc).
- `DELETE /`: Elimina la malla completa (incluyendo ramos y progreso).
- **`POST /import`**: Importación masiva de una malla mediante un JSON estructurado (ideal para datos provenientes de IA).

### Ramos (Subjects)
- `GET /subjects/current`: Obtiene las materias que el estudiante está cursando actualmente.
- `GET /subjects/semester/:semesterId`: Obtiene las materias correspondientes a un semestre específico (filtrado por su ID numérico).
- `POST /:curriculumId/subjects`: Agrega un nuevo ramo.
- `PATCH /subjects/:subjectId`: Actualiza la información de un ramo.
- `DELETE /subjects/:subjectId`: Elimina un ramo.

### Prerrequisitos
- `POST /subjects/:subjectId/prerequisites`: Añade un ramo como prerrequisito de otro.
- `DELETE /subjects/:subjectId/prerequisites/:prerequisiteId`: Elimina un prerrequisito.

### Progreso Estudiantil
- `PATCH /subjects/:subjectId/status`: Actualiza el estado de un ramo para el estudiante (`aprobado`, `cursando`, `pendiente`).

## 🐳 Docker

Puedes ejecutar el servicio usando Docker:

```bash
docker build -t ps-ms-curriculum-service .
docker run -p 3002:3002 --env-file .env ps-ms-curriculum-service
```

---
PopStudy Ecosystem - 2024
