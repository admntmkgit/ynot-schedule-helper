"""
URL configuration for myproject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from . import views
from django.conf.urls.static import static 
from django.conf import settings 
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from technicians.views import TechnicianViewSet
from services.views import ServiceViewSet, TechSkillViewSet
from days.views import DayViewSet, SettingsViewSet

# Create a router for DRF ViewSets
router = DefaultRouter()
router.register(r'techs', TechnicianViewSet, basename='technician')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'tech-skills', TechSkillViewSet, basename='tech-skill')
router.register(r'days', DayViewSet, basename='day')
router.register(r'settings', SettingsViewSet, basename='settings')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('api/hello/', views.hello_world, name='hello_world'),
    path('api/', include(router.urls)),
]


