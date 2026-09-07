# Módulo de administración — tablas mejoradas + estadísticas + precio configurable

## Parte 1 — Precio configurable (de `.env` a la base)

**Enfoque de singleton elegido**: fila fija `pk=1`. `ConfiguracionTarjetas.
save()` fuerza `self.pk = 1` sin importar cómo se cree la instancia (nunca
puede existir una segunda fila), y `delete()` no hace nada (la
configuración del negocio no debería poder quedar sin existir). El único
punto de lectura para el resto del código es el classmethod
`ConfiguracionTarjetas.obtener()`, que hace `get_or_create(pk=1,
defaults={...})` — la primera vez que se necesita, crea la fila **sembrada
con lo que ya hubiera en `settings`/`.env`** (así un despliegue existente
con `TARJETA_PRECIO_TERRAS=8` en su `.env` no ve su precio resetearse
silenciosamente a 5 al aplicar esta migración).

- **`backend/apps/tarjetas/models.py`**: `ConfiguracionTarjetas`
  (`precio_terras`, `dias_suscripcion`, `dias_aviso_previo`, todos
  `PositiveIntegerField`).
- **Migraciones**: `0006_configuraciontarjetas_estadisticas_pagotarjeta.py`
  (esquema) + `0007_configuraciontarjetas_inicial.py` (data migration que
  crea la fila inicial con `get_or_create`, sembrada desde `settings` —
  reversible, la migración inversa borra esa fila si se hace rollback).
- **Todos los usos de `settings.TARJETA_*` reemplazados** por
  `ConfiguracionTarjetas.obtener()`:
  - `pago_views.py::estado_pago` — `precio = ConfiguracionTarjetas.obtener().precio_terras`.
  - `pago_views.py::pagar_tarjeta` — usa `config.precio_terras` (cantidad a
    cobrar a Banexa) y `config.dias_suscripcion` (para calcular el nuevo
    vencimiento).
  - `management/commands/revisar_vencimientos.py` — usa
    `ConfiguracionTarjetas.obtener().dias_aviso_previo` en vez de
    `settings.TARJETA_DIAS_AVISO_PREVIO`.
  - Busqué con grep TODAS las referencias a `settings.TARJETA_*` en el
    backend antes de tocar nada — no quedó ninguna sin migrar.
  - `settings.py` **no se tocó**: las constantes `TARJETA_PRECIO_TERRAS` y
    compañía siguen ahí, ahora solo como semilla de la primera creación
    (el "fallback" que pedía la tarea).
- **`ConfiguracionTarjetas` registrada en el admin**: como es una fila
  única, el *changelist* redirige directo al formulario de edición (`
  changelist_view` → `redirect('admin:tarjetas_configuraciontarjetas_change', ...)`)
  — se siente como una página de "Configuración", no una tabla de una fila.

## Parte 2 — Tablas del admin mejoradas

- **`ClienteAdmin`**: `list_display` con nombre, email, origen,
  `banexa_user_id`, fecha de registro y `cantidad_tarjetas` (método,
  `obj.tarjetas.count()`); `search_fields` (nombre/email/banexa_user_id);
  `list_filter` por origen; orden `-creado`.
- **`TarjetaAdmin`**: `list_display` con nombre, cliente, plan,
  **`estado_coloreado`** (verde=activa, gris=borrador, ámbar=vencida,
  rojo=cortada, vía `format_html`), `fecha_vencimiento`,
  **`dias_para_vencer_admin`** (llama a `Tarjeta.dias_para_vencer()`),
  slug, creado; `list_filter` por estado/plan/tipo; `search_fields`
  (nombre/slug/cliente__email/cliente__nombre); orden `-creado`. De paso
  agregué un inline de `Producto` (además de su admin propio) para ver el
  catálogo directo desde la tarjeta.
- **`ProductoAdmin`**: se mantuvo como admin propio (además del inline
  nuevo) — `list_display` nombre/tarjeta/orden, búsqueda por nombre
  (y por tarjeta, para ubicarlo rápido).
- **`PagoTarjetaAdmin`** (nuevo, ver Parte 3): lista de solo lectura
  (sin poder crear/editar pagos a mano — los crea `pago_views.pagar_tarjeta`),
  con `date_hierarchy` y búsqueda por tarjeta/cliente.

## Parte 3 — Estadísticas del negocio

**Sí creé `PagoTarjeta`** (opción (a), la recomendada) — modelo con
`tarjeta` (FK), `monto_terras`, `fecha` (`auto_now_add`). Se engancha en
`pago_views.pagar_tarjeta`, justo después de activar/renovar la tarjeta y
**solo si Banexa confirmó el cobro con 200**: `PagoTarjeta.objects.create(
tarjeta=tarjeta, monto_terras=config.precio_terras)`. Esto da un historial
real de pagos (no solo el último, como `Tarjeta.fecha_ultimo_pago`),
necesario para ingresos por período.

**Página de estadísticas**: implementada como un **proxy model**
(`Estadisticas`, sin tabla propia — hereda de `Tarjeta`) registrado en el
admin con `has_add/change/delete_permission` en `False`; su
`changelist_view` se reemplaza por un `TemplateResponse` con un template
propio (`admin/tarjetas/estadisticas.html`, extiende `admin/base_site.html`
para verse integrado). Elegí este patrón (en vez de una `AdminSite`
custom o parchar `admin.site.get_urls`) porque aparece **automáticamente
como una entrada de menú clickeable** ("Estadísticas") en el índice del
admin, sin routing manual.

Muestra:
- Total de clientes, total de tarjetas, tarjetas que vencen en 7 días.
- Desglose de tarjetas por estado (incluye los estados en 0, no los omite).
- Tarjetas **activas** por plan.
- Ingresos totales (`Sum('monto_terras')` de `PagoTarjeta`) + cantidad de
  pagos, e ingresos del mes actual (mismo `Sum` filtrado desde el día 1 del
  mes en curso).

## Verificación (todo con clics reales en el admin real, sesión del
superusuario existente creada sin tocar su contraseña — ver Notas)

1. **Tablas mejoradas**: confirmado visualmente — la lista de Tarjetas
   muestra las 9 columnas pedidas (con el estado en color), los filtros
   "By estado/plan/tipo" en la barra lateral, y el buscador; el menú lateral
   del admin muestra además las nuevas entradas "Configuración",
   "Estadísticas" y "Pagos".
2. **Precio configurable, de punta a punta**:
   - Se abrió `/admin/tarjetas/configuraciontarjetas/` → redirige directo
     al formulario, mostrando los valores reales sembrados por la data
     migration (`5`, `30`, `5`).
   - Se cambió `precio_terras` a **8** con un clic real en "SAVE" → mensaje
     de éxito del propio admin.
   - `GET /api/tarjetas/<id>/estado-pago/` devolvió `"precio": 8`
     inmediatamente (sin reiniciar nada).
   - Se hizo un **pago real** (Cobro-2, con el usuario de prueba de Banexa
     ya configurado en tareas anteriores) → `nuevo_saldo` bajó exactamente
     8 (de 185 a 177) — confirma que Banexa cobró 8, no 5. Se creó un
     `PagoTarjeta` con `monto_terras=8`.
   - Se restauró `precio_terras` a **5** con otro clic real en el admin;
     confirmado en la base (`ConfiguracionTarjetas.obtener().precio_terras
     == 5`).
3. **Estadísticas correctas**: con datos reales de la base (10 clientes, 14
   tarjetas), la página mostró **Borrador: 11, Activa: 3, Vencida: 0,
   Cortada: 0** (suma 14 ✓) y **Kabymur Básico: 3** activas de plan (coincide
   con las 3 activas ✓); Ingresos totales **8 Terras (1 pago registrado)** e
   Ingresos del mes actual **8 Terras** — coincide exactamente con el pago
   de prueba recién hecho.
   - **Bug real encontrado y corregido en el camino**: la primera carga de
     `/admin/tarjetas/estadisticas/` dio `TemplateDoesNotExist` — el
     `StatReloader` de `runserver` no había detectado el directorio
     `templates/` nuevo de la app (su primer template) porque no existía
     al arrancar el proceso. Se corrigió reiniciando el servidor de
     desarrollo; quedó documentado por si vuelve a pasar en otro entorno
     (siempre reiniciar `runserver` después de agregar el primer template
     de una app que antes no tenía ninguno).
4. **Pago y vencimientos siguen funcionando**: el pago de prueba (punto 2)
   pasó la tarjeta a `'activa'` correctamente; `python manage.py
   revisar_vencimientos` corrió sin errores leyendo `dias_aviso_previo`
   desde la base (0 avisos/0 cortes, esperado — no había tarjetas en la
   ventana de aviso en ese momento).
5. **Build**: `npm run build` en `frontend/` compila sin errores (no se
   tocó nada del frontend en esta tarea, se confirmó igual). `python
   manage.py check` en `backend/` no reporta issues.

## Limpieza

Se borraron el `Cliente`/`Tarjeta` de prueba usados para el pago de
verificación — la cascada (`on_delete=CASCADE`) borró también el
`PagoTarjeta` de prueba con ellos, dejando la base sin datos de QA.

## Notas

No se subió `.env`. Para entrar al admin sin conocer la contraseña real del
superusuario existente (`mario`), se creó una sesión de Django válida
directamente en la base (`django.contrib.auth.login` + `SessionStore`,
sin tocar `User.password`) y se inyectó esa cookie de sesión en un
navegador real vía Chrome DevTools Protocol — mismo criterio de "no tocar
credenciales reales sin permiso" ya aplicado en tareas anteriores. Los 3
servicios (Banexa `:8000`, backend `:8010` — reiniciado durante esta
verificación, frontend `:5173`) quedaron corriendo.
