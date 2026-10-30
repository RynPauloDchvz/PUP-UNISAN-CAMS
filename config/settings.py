
import os
import sys
import socket
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('DJANGO_SECRET_KEY') or 'django-insecure-4i^o6dlokz8$qjj*)hzy3-n2kdw5wm4e2s*@n3gevmez6ek^0k'

# SECURITY WARNING: don't run with debug turned on in production!
raw_debug = os.environ.get('DEBUG') if os.environ.get('DEBUG') is not None else os.environ.get('DJANGO_DEBUG', 'True')
DEBUG = str(raw_debug).lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://0.0.0.0:8000',
    'https://CHEESEC4KE.pythonanywhere.com',
    'https://*.pythonanywhere.com',
    'https://*.onrender.com',
]

# Debugging local IP
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    IP_ADDRESS = s.getsockname()[0]
    s.close()
    print(f"\n[DEBUG] Local IP detected: {IP_ADDRESS}")
    print(f"[DEBUG] Use this on your phone: http://{IP_ADDRESS}:8000\n")
    CSRF_TRUSTED_ORIGINS.append(f'http://{IP_ADDRESS}:8000')
except Exception as e:
    print(f"[DEBUG] Could not detect local IP: {e}")

# Development Overrides for Easier Local Testing
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = False


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    'storages',
    'campus_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'campus_app.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'campus_app.utils.student_org_context_processor',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url
    # For Neon and Supabase serverless poolers or in development, conn_max_age=0 prevents stale connection drops
    is_pooler = '-pooler' in DATABASE_URL or 'pooler.' in DATABASE_URL
    conn_age = 0 if (DEBUG or is_pooler) else 600
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=conn_age,
            conn_health_checks=True,
            ssl_require=True
        )
    }
    DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
    DATABASES['default'].setdefault('OPTIONS', {})
    DATABASES['default']['OPTIONS'].update({
        'connect_timeout': 10,
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
    })

    # Automatically retry transient SSL EOF / pooler handshake drops on PostgreSQL connect
    try:
        import time
        from django.db.backends.postgresql.base import DatabaseWrapper as PgDatabaseWrapper
        if not getattr(PgDatabaseWrapper, '_cams_retry_patched', False):
            _orig_get_new_connection = PgDatabaseWrapper.get_new_connection

            def _retry_get_new_connection(self, conn_params):
                last_err = None
                for attempt in range(3):
                    try:
                        return _orig_get_new_connection(self, conn_params)
                    except Exception as err:
                        last_err = err
                        if attempt < 2:
                            time.sleep(0.2 * (attempt + 1))
                raise last_err

            PgDatabaseWrapper.get_new_connection = _retry_get_new_connection
            PgDatabaseWrapper._cams_retry_patched = True
    except Exception:
        pass
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Manila'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
WHITENOISE_MANIFEST_STRICT = False
WHITENOISE_USE_FINDERS = True

APPEND_SLASH = False

# ==========================================
# EMAIL CONFIGURATION
# ==========================================
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', 10))

EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'pupuqcams2526@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'nbat affu cqed wton')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'pupuqcams2526@gmail.com')

# ==========================================
# MEDIA / FILE STORAGE (CLOUDINARY)
# ==========================================
cloudinary_cloud = os.environ.get('CLOUDINARY_CLOUD_NAME', 'ah8nbjfr')
cloudinary_key = os.environ.get('CLOUDINARY_API_KEY', '197794895653581')
cloudinary_secret = os.environ.get('CLOUDINARY_API_SECRET', 'Z4iGw14uPszUHVbSmejdVYLt_L0')
cloudinary_url = os.environ.get('CLOUDINARY_URL')

if cloudinary_url:
    try:
        from urllib.parse import urlparse
        parsed = urlparse(cloudinary_url)
        cloudinary_key = parsed.username or cloudinary_key
        cloudinary_secret = parsed.password or cloudinary_secret
        cloudinary_cloud = parsed.hostname or cloudinary_cloud
    except Exception:
        pass

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': cloudinary_cloud,
    'API_KEY': cloudinary_key,
    'API_SECRET': cloudinary_secret,
}

try:
    import cloudinary
    cloudinary.config(
        cloud_name=cloudinary_cloud,
        api_key=cloudinary_key,
        api_secret=cloudinary_secret,
        secure=True
    )
except Exception:
    pass

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
STORAGES = {
    'default': {
        'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ==========================================
# SITE URL & CANONICAL DOMAIN
# ==========================================
SITE_URL = os.environ.get('SITE_URL', 'https://pup-unisan-cams.onrender.com').rstrip('/')

# ==========================================
# PROXY & SSL SETTINGS (RENDER)
# ==========================================
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

# ==========================================
# PRODUCTION SECURITY HARDENING
# ==========================================
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'SAMEORIGIN'
    SESSION_COOKIE_HTTPONLY = True

X_FRAME_OPTIONS = 'SAMEORIGIN'