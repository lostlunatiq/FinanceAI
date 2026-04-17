import os
import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.http import FileResponse, Http404

from apps.invoices.models import FileRef
from .permissions import CanDownloadFile


class FileUploadView(APIView):
    """
    POST /api/v1/files/upload/
    Upload a file (invoice image/PDF) and return a FileRef ID.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ]
        if file_obj.content_type not in allowed_types:
            return Response(
                {"error": f"File type '{file_obj.content_type}' not allowed. Allowed: {', '.join(allowed_types)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 10MB)
        if file_obj.size > 10 * 1024 * 1024:
            return Response(
                {"error": "File size exceeds 10MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save file to media directory
        file_ext = os.path.splitext(file_obj.name)[1].lower()
        file_id = uuid.uuid4()
        relative_path = f"invoices/{file_id}{file_ext}"
        full_path = os.path.join(settings.MEDIA_ROOT, relative_path)

        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Write file
        with open(full_path, "wb+") as dest:
            for chunk in file_obj.chunks():
                dest.write(chunk)

        # Create FileRef record
        file_ref = FileRef.objects.create(
            id=file_id,
            path=relative_path,
            original_filename=file_obj.name,
            uploaded_by=request.user,
        )

        return Response(
            {
                "id": str(file_ref.id),
                "filename": file_ref.original_filename,
                "path": file_ref.path,
                "uploaded_at": file_ref.uploaded_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class OCRSyncView(APIView):
    """
    POST /api/v1/files/ocr/
    Synchronous OCR — no Celery required.
    Body: {"file_id": "uuid"}
    Returns extracted fields immediately.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("file_id")
        if not file_id:
            return Response({"error": "file_id required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_ref = FileRef.objects.get(pk=file_id)
        except FileRef.DoesNotExist:
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        full_path = os.path.join(settings.MEDIA_ROOT, file_ref.path)
        if not os.path.exists(full_path):
            return Response({"error": "File not found on disk."}, status=status.HTTP_404_NOT_FOUND)

        try:
            from ai.pipelines.ocr_pipeline import run as run_ocr
            result = run_ocr(full_path)
            return Response({
                "status": "COMPLETE" if result.success else ("FAILED" if result.error else "LOW_CONFIDENCE"),
                "confidence": result.confidence,
                "extracted_fields": result.extracted_fields,
                "validation_errors": result.validation_errors,
                "flagged_manual": result.flagged_manual,
                "raw_text": result.raw_text[:500] if result.raw_text else "",
                "model_used": result.model_used,
                "pages_processed": result.pages_processed,
                "error": result.error,
            })
        except Exception as e:
            return Response({"status": "FAILED", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileDownloadView(APIView):
    """
    GET /api/v1/files/<uuid:pk>/
    Download a file by its FileRef ID.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            file_ref = FileRef.objects.select_related("uploaded_by").get(pk=pk)
        except FileRef.DoesNotExist:
            raise Http404("File not found.")

        # Object-level permission: vendors may only download files they uploaded
        can_download = CanDownloadFile()
        if not can_download.has_object_permission(request, self, file_ref):
            from rest_framework.response import Response
            return Response({"error": can_download.message}, status=403)

        full_path = os.path.join(settings.MEDIA_ROOT, file_ref.path)
        if not os.path.exists(full_path):
            raise Http404("File not found on disk.")

        return FileResponse(
            open(full_path, "rb"),
            as_attachment=True,
            filename=file_ref.original_filename,
        )
