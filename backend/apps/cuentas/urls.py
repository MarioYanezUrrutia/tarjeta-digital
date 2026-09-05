# apps/cuentas/urls.py
from django.urls import path

from .views import google_login_view, login_view, logout_view, me_view, registro_view

urlpatterns = [
    path('registro/', registro_view, name='auth_registro'),
    path('login/', login_view, name='auth_login'),
    path('google/', google_login_view, name='auth_google'),
    path('me/', me_view, name='auth_me'),
    path('logout/', logout_view, name='auth_logout'),
]
