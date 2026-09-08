# backend/config/pg_backend/base.py
"""
Backend de PostgreSQL personalizado -- bypass del chequeo de versión
mínima de Django 6 (PostgreSQL 14+) para el servidor de producción
(cPanel), que corre PostgreSQL 13.23 (confirmado del hosting, ver
reportes/DEPLOY_PREP.md).

Portado tal cual desde bot_ia (backend/config/pg_backend/base.py), que ya
aplicó y validó este mismo workaround para el mismo hosting. Motivo, con
evidencia: el piso de PG14 en Django 6 es una decisión de política de
soporte -- la propia nota de lanzamiento de Django 5.2 dice textualmente
"Upstream support for PostgreSQL 13 ends in November 2025" -- no una
dependencia técnica real. Ninguna característica usada por este proyecto
distingue de verdad la versión 14 de la 13.

Riesgo aceptado y documentado: este override solo evita la excepción de
arranque -- no valida que cada característica puntual de Django siga
funcionando sobre PG13. Si en el futuro se actualiza Django a una versión
que sí dependa de una característica exclusiva de PostgreSQL 14+, este
archivo no lo va a advertir. Revisar de nuevo este análisis antes de subir
la versión de Django mientras el servidor de producción siga en
PostgreSQL 13.

Todo lo demás (vendor, operaciones, tipos, introspección, etc.) se hereda
sin cambios del backend real de Django -- esto NO es un backend nuevo, es
el mismo con un único método neutralizado.

Nota técnica: Django exige que ENGINE sea un PAQUETE con un módulo
`base.py` adentro (ver django.db.utils.load_backend, que siempre importa
"<ENGINE>.base") -- por eso este archivo vive en config/pg_backend/base.py
y no en config/pg_backend.py suelto.
"""
from django.db.backends.postgresql.base import (
    DatabaseWrapper as PostgresDatabaseWrapper,
)


class DatabaseWrapper(PostgresDatabaseWrapper):
    def check_database_version_supported(self):
        # Bypass intencional -- ver docstring del módulo para el motivo
        # y el riesgo aceptado. No se llama a super().
        pass
