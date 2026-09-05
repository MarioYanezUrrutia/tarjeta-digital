# apps/cuentas/urls.py
from django.urls import path

from .views import google_login_view, login_view, logout_view, me_view

urlpatterns = [
    path('login/', login_view, name='auth_login'),
    path('google/', google_login_view, name='auth_google'),
    path('me/', me_view, name='auth_me'),
    path('logout/', logout_view, name='auth_logout'),
]
