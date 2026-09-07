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

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
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

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
