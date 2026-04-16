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


class FileDownloadView(APIView):
    """
    GET /api/v1/files/<uuid:pk>/
    Download a file by its FileRef ID.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            file_ref = FileRef.objects.get(pk=pk)
        except FileRef.DoesNotExist:
            raise Http404("File not found.")

        full_path = os.path.join(settings.MEDIA_ROOT, file_ref.path)
        if not os.path.exists(full_path):
            raise Http404("File not found on disk.")

        return FileResponse(
            open(full_path, "rb"),
            as_attachment=True,
            filename=file_ref.original_filename,
        )
