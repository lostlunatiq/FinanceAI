"""
URL configuration for FinanceAI project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404
import os

CONTENT_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.json': 'application/json',
}


def serve_app(request):
    """Serve Tijori AI HTML shell."""
    file_path = os.path.join(settings.BASE_DIR, 'Tijori AI.html')
    if os.path.isfile(file_path):
        return FileResponse(open(file_path, 'rb'), content_type='text/html')
    raise Http404("App not found")


def serve_js(request, path):
    """Serve js/ assets (JSX, JS files) for the Tijori AI app."""
    file_path = os.path.join(settings.BASE_DIR, 'js', path)
    if os.path.isfile(file_path):
        ext = os.path.splitext(file_path)[1].lower()
        content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')
        return FileResponse(open(file_path, 'rb'), content_type=content_type)
    raise Http404(f"Not found: js/{path}")


def serve_legacy_frontend(request, path=""):
    """Serve old frontend pages (kept for reference)."""
    if not path or path.endswith('/'):
        path = path.rstrip('/') + '/code.html' if path else 'financeai_login/code.html'
    file_path = os.path.join(settings.BASE_DIR, 'frontend', path)
    if os.path.isfile(file_path):
        ext = os.path.splitext(file_path)[1].lower()
        content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')
        return FileResponse(open(file_path, 'rb'), content_type=content_type)
    raise Http404(f"Frontend file not found: {path}")


urlpatterns = [
    path("admin/", admin.site.urls),

    # API routes
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/invoices/", include("apps.invoices.urls")),

    # New Tijori AI UI — served at root
    path("", serve_app, name="app-root"),
    path("js/<path:path>", serve_js, name="app-js"),

    # Legacy frontend (kept for reference)
    path("frontend/<path:path>", serve_legacy_frontend, name="frontend"),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
