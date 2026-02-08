# urja_setu_backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings # <-- Add this import
from django.conf.urls.static import static # <-- Add this import
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView # <-- Add these imports

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    
    # --- ADD THESE URLS FOR API DOCUMENTATION ---
    # Your API schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
# Add this line to serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)