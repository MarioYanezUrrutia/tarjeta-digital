# Fix: duplicación del prefijo /api en producción (cPanel/Passenger)

## Problema

En producción, Passenger monta el backend Django bajo la subruta `/api` por
fuera (fuera del control de Django). Como `config/urls.py` también registraba
sus rutas con el prefijo `'api/'` (ej. `path('api/health/', ...)`), el
resultado quedaba duplicado:

- `https://tarjeta.kabymur.com/api/health/` → 404
- `https://tarjeta.kabymur.com/api/api/health/` → `{"status": "ok"}`

## Fix implementado (opción A: prefijo configurable por variable de entorno)

Se agregó `URL_PREFIX` a `backend/config/settings.py`:

```python
URL_PREFIX = env('URL_PREFIX', default='api/')
```

Y `backend/config/urls.py` ahora arma las rutas con ese prefijo en vez de
tenerlo hardcodeado:

```python
prefix = settings.URL_PREFIX

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'{prefix}health/', health),
    path(f'{prefix}auth/', include('apps.cuentas.urls')),
    ...
]
```

(`admin/` queda sin prefijo, igual que antes — no forma parte del problema.)

## Configuración por entorno

- **Dev (local, backend en :8010 sin subruta de Passenger)**: no requiere
  ningún cambio — `URL_PREFIX` usa su default `'api/'`, así que las rutas
  siguen siendo `localhost:8010/api/health/`, etc., igual que siempre. El
  frontend en dev (que ya apunta a `localhost:8010/api`) no se ve afectado.
- **Producción (cPanel/Passenger, app montada bajo `/api` por fuera)**: el
  `.env` del servidor debe declarar `URL_PREFIX=` (vacío). Así las rutas
  internas de Django quedan sin prefijo (`health/`, `auth/`, etc.) y, sumado
  al `/api` que agrega Passenger por fuera, el resultado final visto desde el
  navegador sigue siendo `https://tarjeta.kabymur.com/api/health/` — sin
  duplicar.

Se documentó y agregó la variable en
`backend/.env.production.example` (con el valor vacío y el comentario
explicando el porqué).

## Verificación local

- `python manage.py check` → `System check identified no issues (0 silenced).`
- Resolver de Django confirmado con el default (`URL_PREFIX` sin declarar):
  las rutas siguen resolviendo con el prefijo `api/` (`api/health/`,
  `api/auth/`, `api/mis-tarjetas/`, etc.), idéntico al comportamiento previo
  en dev.

## Archivos modificados

- `backend/config/settings.py` — agrega `URL_PREFIX`.
- `backend/config/urls.py` — usa `URL_PREFIX` en vez del prefijo `'api/'`
  hardcodeado.
- `backend/.env.production.example` — documenta `URL_PREFIX=` vacío para
  producción.
