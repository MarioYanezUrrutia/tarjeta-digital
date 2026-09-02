# Reporte de acciones realizadas

Fecha: 2026-09-02
Directorio del proyecto: C:\MisDocumentos\ProyectosActivos\8_tarjeta-digital\src\tarjeta-digital
Repositorio remoto: https://github.com/MarioYanezUrrutia/tarjeta-digital.git

## Objetivo
Crear el esqueleto del proyecto `tarjeta-digital` con stack Django (backend) + React + Vite + Tailwind (frontend). No se implementaron features funcionales, solo el esqueleto necesario para arrancar y compilar vacío.

## Acciones realizadas (cronológico)

1) Creación de `.gitignore`
- Ruta: `.gitignore`
- Contenido: patrones para Python, Django, Node, env, IDEs y otros (ignora `node_modules/`, `dist/`, `venv/`, `.env`, `db.sqlite3`, `__pycache__/`, `.claude`, etc.).

2) Creación carpeta `reportes` y archivo inicial
- Ruta: `reportes/SETUP_ESQUELETO.md` (archivo actualizado posteriormente con instrucciones y estado).

3) Backend: creación de esqueleto Django
- Carpeta: `backend/`
- Archivos y carpetas creados:
  - `backend/manage.py`
  - `backend/config/__init__.py`
  - `backend/config/settings.py` (configurada para usar `django-environ`, lectura de `.env`, CORS, MEDIA_ROOT, DATABASE_URL con fallback a sqlite)
  - `backend/config/urls.py` (incluye endpoint de health: `/api/health/` que devuelve `{"status":"ok"}`)
  - `backend/config/wsgi.py`
  - `backend/apps/tarjetas/__init__.py`
  - `backend/apps/tarjetas/apps.py`
  - `backend/apps/tarjetas/views.py` (view de health en la app)
  - `backend/.env.example` (plantilla de variables)
  - `backend/requirements.txt` (lista: Django, djangorestframework, django-cors-headers, django-environ, psycopg2-binary, Pillow)

- Notas: intenté crear un venv e instalar paquetes con comandos en terminal, pero en este entorno la instalación no quedó registrada como verificada. Las instrucciones para instalar están en `reportes/SETUP_ESQUELETO.md`.

4) Frontend: scaffold React + Vite + Tailwind
- Carpeta: `frontend/`
- Archivos creados:
  - `frontend/package.json` (scripts `dev`, `build`, `preview`, dependencias básicas)
  - `frontend/index.html`
  - `frontend/src/main.jsx`
  - `frontend/src/App.jsx` (componente que hace `fetch` a `VITE_API_BASE + '/health/'` y muestra el status)
  - `frontend/src/index.css` (Tailwind imports y placeholder `@theme` block)
  - `frontend/tailwind.config.cjs`
  - `frontend/postcss.config.cjs`
  - `frontend/.env` (local) con `VITE_API_BASE=http://localhost:8000/api`
  - `frontend/.env.production` con `VITE_API_BASE` apuntando a producción de ejemplo

- Notas: no se ejecutó `npm install` ni `npm run build` en este entorno; el frontend está preparado para instalar y construir localmente.

5) Git: inicialización, staging selectivo, commit y push
- Inicialicé repo Git local en la carpeta del proyecto y creé la rama `main`.
- Añadí explícitamente (no `git add -A`) los archivos permitidos, evitando `node_modules/`, venvs y `.env`:
  - Añadidos explícitamente (lista completa en el siguiente apartado "Archivos staged")
- Configuré identidad Git local (user.email y user.name) para permitir el commit.
- Commit realizado con el mensaje: "chore: esqueleto inicial del proyecto tarjeta-digital (Django + React/Vite/Tailwind)"
- Push a remoto `origin main`: exitoso. (La rama `main` quedó trackeando `origin/main`.)

6) Verificaciones y limitaciones realizadas aquí
- Endpoint `/api/health/` creado en `backend/config/urls.py` y devuelve estáticamente `{"status":"ok"}`. Esto permite verificar la integración una vez que el backend esté levantado.
- No se pudo ejecutar `python -m pip install -r requirements.txt` ni `npm install` ni `npm run build` dentro de este entorno de trabajo de la sesión (limitación de ejecución o permisos). Por tanto, recomiendo ejecutar los pasos locales que se indican más abajo para confirmar.

## Archivos staged antes del commit (lista exacta)
- .gitignore
- backend/.env.example
- backend/config/__init__.py
- backend/config/settings.py
- backend/config/urls.py
- backend/config/wsgi.py
- backend/manage.py
- backend/requirements.txt
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

> Nota: `frontend/.env` quedó en el repo local pero fue ignorado al añadir por `.gitignore`; solo `frontend/.env.production` fue staged.

## Comandos ejecutados (representativos)
- Creación venv y dependencias (intentado en terminal):
```powershell
cd "C:\MisDocumentos\ProyectosActivos\8_tarjeta-digital\src\tarjeta-digital"
mkdir backend -Force
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip setuptools wheel
.\.venv\Scripts\python -m pip install Django djangorestframework django-cors-headers django-environ psycopg2-binary Pillow
.\.venv\Scripts\python -m django startproject config .
.\manage.py startapp tarjetas
```
- Inicializar Git y push:
```powershell
cd "C:\MisDocumentos\ProyectosActivos\8_tarjeta-digital\src\tarjeta-digital"
git init
git checkout -b main
git remote add origin https://github.com/MarioYanezUrrutia/tarjeta-digital.git
# add selectivo de archivos (ejemplos en el repo)
git add .gitignore
# ... (otros adds explícitos)
git config user.email "mario@example.com"
git config user.name "Mario Yanez"
git commit -m "chore: esqueleto inicial del proyecto tarjeta-digital (Django + React/Vite/Tailwind)"
git push -u origin main
```

## Pasos recomendados para verificar localmente
1. Backend (PowerShell):
```powershell
cd C:\MisDocumentos\ProyectosActivos\8_tarjeta-digital\src\tarjeta-digital\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
# crear .env local basado en .env.example con DEBUG=True (no commitear .env)
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py runserver 8000
# Verificar:
# http://localhost:8000/api/health/  -> {"status":"ok"}
```

2. Frontend:
```bash
cd frontend
npm install
npm run build   # verifica que compila sin errores
npm run dev     # abre en http://localhost:5173 por defecto
# Verificar que la UI muestre el estado del health endpoint
```

## Observaciones y buenas prácticas aplicadas
- Evité `git add -A` y `git add .` y añadí solo rutas explícitas al stage.
- `.env` de backend y frontend está en `.gitignore` para evitar subir secretos.
- Se incluyó `backend/.env.example` con nombres de variables.
- `media/` está ignorado para no subir ficheros binarios grandes.

---
Si quieres, puedo:
- Ejecutar los pasos de instalación y verificación en tu entorno (ejecutar `pip install` y `npm install` y `npm run build`) si me indicas que proceda.
- Crear scripts adicionales (`Makefile`, `tasks.ps1`) para simplificar los comandos de arranque.
- Abrir un PR con mejoras al README o estructura.

