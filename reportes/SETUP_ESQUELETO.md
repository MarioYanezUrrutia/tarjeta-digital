
# Reporte: Setup esqueleto tarjeta-digital

## Resumen
- Backend: Django con estructura `config/` y app principal `apps/tarjetas`.
- Frontend: React + Vite + Tailwind (carpeta `frontend`).

## Qué se creó
- `.gitignore`
- `backend/` con:
  - `manage.py`
  - `config/` (settings.py, urls.py, wsgi.py)
  - `apps/tarjetas/` app (vacía, registrada en `INSTALLED_APPS` como `apps.tarjetas`)
  - `backend/.env.example`
  - `backend/requirements.txt`
- `frontend/` con scaffold mínimo (Vite config via `package.json`, `src/` con `App.jsx`, `main.jsx`, estilos y Tailwind config)
- `reportes/SETUP_ESQUELETO.md` (este archivo)

## Dependencias sugeridas
Listado en `backend/requirements.txt`:
- Django
- djangorestframework
- django-cors-headers
- django-environ
- psycopg2-binary
- Pillow

Listado en `frontend/package.json` (dev + deps): React, Vite, Tailwind, PostCSS, Autoprefixer

## Instrucciones locales para verificar
1. Backend (Windows PowerShell):

```powershell
cd c:\MisDocumentos\ProyectosActivos\8_tarjeta-digital\src\tarjeta-digital\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
# crear .env local basado en .env.example (DEBUG=True, usar sqlite)
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py runserver 8000
```

- Health endpoint: `http://localhost:8000/api/health/` debe devolver `{"status":"ok"}`

2. Frontend (desde la carpeta frontend):

```bash
cd frontend
npm install
npm run build   # para verificar que compila
npm run dev     # para desarrollo (por defecto en Vite 5173)
```

- La variable `VITE_API_BASE` está en `frontend/.env` apuntando a `http://localhost:8000/api`.
- La página inicial consulta `GET ${VITE_API_BASE}/health/` y muestra el estado.

## Estado de ejecución en este entorno
- Se creó todo el esqueleto de archivos y carpetas en el repo.
- No se ejecutaron `pip install` ni `npm install` en este entorno (restricciones de ejecución/entorno), por lo que **no** se pudo verificar `runserver` ni `npm run build` automáticamente aquí.

## Archivos staged antes del commit (lista)
- .gitignore
- backend/.env.example
- backend/config/__init__.py
- backend/config/settings.py
- backend/config/urls.py
- backend/config/wsgi.py
- backend/manage.py
- backend/requirements.txt
- backend/apps/tarjetas/__init__.py
- backend/apps/tarjetas/apps.py
- backend/apps/tarjetas/views.py
- frontend/.env.production
- frontend/index.html
- frontend/package.json
- frontend/postcss.config.cjs
- frontend/src/App.jsx
- frontend/src/index.css
- frontend/src/main.jsx
- frontend/tailwind.config.cjs
- reportes/SETUP_ESQUELETO.md

## Acciones restantes (locales)
- Crear y activar el venv, instalar `requirements.txt` y correr `migrate` + `runserver`.
- Ejecutar `npm install` y `npm run build` para verificar compilación del frontend.


