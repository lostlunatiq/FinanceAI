"""
URL configuration for FinanceAI project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.http import FileResponse, Http404
import os

def serve_frontend(request, path=""):
    """Serve frontend HTML/JS/CSS files from the frontend/ directory."""
    if not path or path.endswith('/'):
        path = path.rstrip('/') + '/code.html' if path else 'financeai_login/code.html'

    file_path = os.path.join(settings.BASE_DIR, 'frontend', path)

    if os.path.isfile(file_path):
        content_types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
        }
        ext = os.path.splitext(file_path)[1].lower()
        content_type = content_types.get(ext, 'application/octet-stream')
        return FileResponse(open(file_path, 'rb'), content_type=content_type)

    raise Http404(f"Frontend file not found: {path}")


urlpatterns = [
    path("admin/", admin.site.urls),

    # API routes
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/invoices/", include("apps.invoices.urls")),

    # Frontend routes
    path("", RedirectView.as_view(url="/frontend/financeai_login/code.html", permanent=False)),
    path("frontend/<path:path>", serve_frontend, name="frontend"),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
