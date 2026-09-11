import os
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, True)
)
# read .env file if present
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY', default='replace-this-with-secure-key')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# En dev el backend corre solo (localhost:8010) y el frontend pega a
# localhost:8010/api/, por lo que las rutas necesitan el prefijo 'api/'.
# En producción (cPanel/Passenger) la app ya queda montada bajo /api por
# fuera, así que dejar el prefijo interno también lo duplicaría
# (/api/api/health/) — ahí el .env de producción debe poner URL_PREFIX=
# (vacío).
URL_PREFIX = env('URL_PREFIX', default='api/')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.tarjetas',
    'apps.cuentas',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{os.path.join(BASE_DIR, "db.sqlite3")}')
}
# Producción (cPanel) corre PostgreSQL 13.23; Django 6 exige 14+ por
# defecto. ENGINE apunta a nuestro wrapper propio, que hereda TODO del
# backend real de Django y solo neutraliza el chequeo de versión mínima --
# ver config/pg_backend/base.py y reportes/DEPLOY_PREP.md para el motivo y
# el riesgo aceptado. Solo se reemplaza el ENGINE si la base es Postgres:
# el fallback a sqlite (sin DATABASE_URL, ej. dev sin Postgres instalado)
# debe seguir siendo sqlite de verdad.
if DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default']['ENGINE'] = 'config.pg_backend'

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# CORS
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=['http://localhost:5173'])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=['http://localhost:5173'])
# El login intermediario (apps.cuentas) guarda el token de Banexa en una
# cookie httpOnly: el navegador debe poder enviarla en cross-origin
# (frontend en :5173, backend en :8010), lo que exige credentials.
CORS_ALLOW_CREDENTIALS = True

# --- Banexa (bot_ia): backend de autenticación y banco de Terras ---
# dev: http://localhost:8000/api. Producción: https://api.kabymur.com/api
# (se setea en el .env de cada entorno, nunca hardcodeado acá).
BANEXA_API_URL = env('BANEXA_API_URL', default='http://localhost:8000/api')

# --- Suscripción de tarjetas (Cobro) ---
# El cobro real es Cobro-2; acá solo viven las constantes que va a usar (el
# modelo Tarjeta.esta_vigente()/dias_para_vencer(), la vista pública, y
# después el cobro y el aviso previo).
TARJETA_PRECIO_TERRAS = env.int('TARJETA_PRECIO_TERRAS', default=5)
TARJETA_DIAS_SUSCRIPCION = env.int('TARJETA_DIAS_SUSCRIPCION', default=30)
TARJETA_DIAS_AVISO_PREVIO = env.int('TARJETA_DIAS_AVISO_PREVIO', default=5)

# Bypass de desarrollo: todavía no existe el cobro real (Cobro-2), así que
# TODAS las tarjetas nacen en 'borrador' y se quedan ahí para siempre — sin
# este flag, la regla "solo se muestra la tarjeta vigente" (Parte 2) dejaría
# de poder verse cualquier tarjeta en desarrollo. Con TARJETA_MODO_DEV=True,
# TarjetaPublicaView.get() se salta el chequeo de vigencia por completo.
# DEBE quedar en False en producción — ahí sí se debe respetar el pago.
TARJETA_MODO_DEV = env.bool('TARJETA_MODO_DEV', default=True)

# --- Email (avisos de vencimiento, corte y pago — Cobro-3a) ---
# Dev: backend de consola — send_mail() imprime el correo en la terminal,
# no manda nada de verdad. Producción: se cambia por variable de entorno a
# 'django.core.mail.backends.smtp.EmailBackend' + las credenciales SMTP de
# abajo (ver .env.example) — nunca hardcodeadas acá.
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='Tarjeta Digital <no-reply@kabymur.com>')

# URL pública del frontend — para armar el link de pago en los correos
# (apps.tarjetas.correos._link_pago). Mismo propósito que
# VITE_PUBLIC_BASE_URL del frontend, pero configurada aparte porque backend
# y frontend son procesos (y .env) distintos. Nunca localhost hardcodeado
# en el código: en producción esta variable apunta al dominio real.
PUBLIC_BASE_URL = env('PUBLIC_BASE_URL', default='http://localhost:5173')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Sin throttle global (DEFAULT_THROTTLE_CLASSES vacío) — solo se aplica
# por-vista con ScopedRateThrottle donde hace falta (ej. el formulario de
# contacto público de la landing Pro, Fase 3 bloque 5).
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {
        'contacto_publico': '5/hour',
    },
}
