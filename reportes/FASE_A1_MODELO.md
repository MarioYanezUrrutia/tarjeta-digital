# Fase A.1 — Modelo de datos (Cliente, Tarjeta, Producto)

Fecha: 2026-09-02

Resumen de cambios:

- Se crearon los modelos en `backend/apps/tarjetas/models.py`:
  - `Cliente` (origen, banexa_user_id, nombre, email, creado)
  - `Tarjeta` (FK a Cliente, tipo, plan, slug único, plantilla, estado, bloques identidad/contacto/redes/sobre/ubicación, controles de visibilidad, validación límite 3 tarjetas por cliente)
  - `Producto` (FK a Tarjeta, nombre, descripción, precio, imagen, url, creado)

- Se registraron los modelos en `backend/apps/tarjetas/admin.py` para poder cargar datos manualmente desde el admin.

- Se añadió la migración inicial `backend/apps/tarjetas/migrations/0001_initial.py`.

Notas de implementación:

- La validación del límite de 3 tarjetas por cliente se implementó en `Tarjeta.clean()` y se llama desde `save()` mediante `full_clean()` antes de guardar.
- El `slug` se genera automáticamente en `save()` si no existe, usando `nombre_mostrado` o una base por cliente, y asegurando unicidad añadiendo sufijos si es necesario.

Próximos pasos recomendados (local):

1. Activar el entorno virtual en `backend` e instalar dependencias:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
```

2. Aplicar migraciones y crear superuser para acceder al admin:

```powershell
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver 8000
```

3. Abrir `http://localhost:8000/admin/` e ingresar datos de prueba para `Cliente`, `Tarjeta` y `Producto`.

Archivos creados/modificados:

- `backend/apps/tarjetas/models.py` (nuevo)
- `backend/apps/tarjetas/admin.py` (nuevo)
- `backend/apps/tarjetas/migrations/0001_initial.py` (nuevo)
- `reportes/FASE_A1_MODELO.md` (este archivo)

## Verificación (2026-09-02)

Se corrigieron las referencias de ForeignKey que usaban rutas incorrectas
(`'apps.tarjetas.Tarjeta'` / `'tarjetas.Cliente'` con workaround `if False else`)
y se dejaron como referencias relativas simples dentro de la misma app:

- `Tarjeta.cliente` → `models.ForeignKey('Cliente', ...)`
- `Producto.tarjeta` → `models.ForeignKey('Tarjeta', ...)`

La migración `0001_initial.py` se regeneró para reflejar estas referencias
(`to='tarjetas.cliente'` / `to='tarjetas.tarjeta'`) y los cambios de campos de
`Producto` (se removieron `descripcion`, `precio`, `url`, `creado`; se
agregaron `caracteristicas`, `detalle`, `orden`, con `ordering = ['orden']`).

Se verificó el modelo aplicando las migraciones contra Postgres y ejecutando
las pruebas del modelo (creación de Cliente y hasta 3 Tarjetas asociadas, y
rechazo de una 4ª Tarjeta por `ValidationError` desde `Tarjeta.clean()`).

El script de verificación ad-hoc se convirtió en un test permanente de Django:
`backend/apps/tarjetas/tests.py` (`TarjetaLimiteTestCase`), con 2 casos:

- `test_permite_hasta_tres_tarjetas_por_cliente`
- `test_rechaza_cuarta_tarjeta_por_cliente`

Resultado: `python manage.py test apps.tarjetas` → `Ran 2 tests ... OK`.
