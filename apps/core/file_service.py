import hashlib
import os
import uuid
from io import BytesIO
from typing import Optional, Tuple
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from .models import FileRef


class FileService:
    """
    File service with SHA256 deduplication and storage abstraction.
    Supports MinIO/S3 with local fallback.
    """
    
    def __init__(self):
        self.storage_backend = self._get_storage_backend()
    
    def _get_storage_backend(self):
        """Get appropriate storage backend based on configuration"""
        try:
            # Try to use MinIO/S3 if configured
            if hasattr(settings, 'MINIO_ENDPOINT') and settings.MINIO_ENDPOINT:
                from minio import Minio
                from minio.error import S3Error
                
                client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=getattr(settings, 'MINIO_SECURE', False)
                )
                return MinioStorage(client)
        except (ImportError, AttributeError):
            pass
        
        # Fall back to Django's default storage
        from django.core.files.storage import default_storage
        return DjangoStorage(default_storage)
    
    def compute_sha256(self, file_content: bytes) -> str:
        """Compute SHA256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def upload_file(
        self, 
        file: InMemoryUploadedFile, 
        bucket: str,
        uploaded_by,
        storage_class: str = 'HOT',
        original_filename: Optional[str] = None
    ) -> FileRef:
        """
        Upload a file with SHA256 deduplication.
        
        Args:
            file: Django uploaded file object
            bucket: Storage bucket name
            uploaded_by: User who uploaded the file
            storage_class: Storage class (HOT, WARM, COLD)
            original_filename: Original filename (defaults to file.name)
            
        Returns:
            FileRef object
        """
        # Read file content
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        
        # Compute SHA256 hash
        sha256 = self.compute_sha256(file_content)
        
        # Check for existing file with same hash
        existing_file = FileRef.objects.filter(sha256=sha256).first()
        if existing_file:
            # Update metadata if needed
            if existing_file.storage_class != storage_class:
                existing_file.storage_class = storage_class
                existing_file.save(update_fields=['storage_class'])
            return existing_file
        
        # Generate unique key
        filename = original_filename or file.name
        file_extension = os.path.splitext(filename)[1]
        key = f"{bucket}/{uuid.uuid4()}{file_extension}"
        
        # Upload to storage
        success, size_bytes = self.storage_backend.upload(
            bucket=bucket,
            key=key,
            content=file_content,
            content_type=file.content_type
        )
        
        if not success:
            raise Exception("Failed to upload file to storage")
        
        # Create FileRef record
        file_ref = FileRef.objects.create(
            sha256=sha256,
            bucket=bucket,
            key=key,
            size_bytes=size_bytes,
            mime_type=file.content_type,
            original_filename=filename,
            uploaded_by=uploaded_by,
            storage_class=storage_class
        )
        
        return file_ref
    
    def get_download_url(self, file_ref: FileRef, ttl_seconds: int = 900) -> str:
        """
        Get a download URL for a file.
        
        Args:
            file_ref: FileRef object
            ttl_seconds: Time-to-live for the URL in seconds
            
        Returns:
            Download URL
        """
        return self.storage_backend.get_download_url(
            bucket=file_ref.bucket,
            key=file_ref.key,
            ttl_seconds=ttl_seconds,
            filename=file_ref.original_filename
        )
    
    def delete_file(self, file_ref: FileRef) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_ref: FileRef object
            
        Returns:
            True if successful, False otherwise
        """
        success = self.storage_backend.delete(
            bucket=file_ref.bucket,
            key=file_ref.key
        )
        
        if success:
            file_ref.delete()
        
        return success
    
    def get_file_content(self, file_ref: FileRef) -> bytes:
        """
        Get file content as bytes.
        
        Args:
            file_ref: FileRef object
            
        Returns:
            File content as bytes
        """
        return self.storage_backend.get_content(
            bucket=file_ref.bucket,
            key=file_ref.key
        )
    
    def list_files(self, bucket: Optional[str] = None, prefix: str = "") -> list:
        """
        List files in storage.
        
        Args:
            bucket: Optional bucket filter
            prefix: Optional prefix filter
            
        Returns:
            List of FileRef objects
        """
        query = FileRef.objects.all()
        
        if bucket:
            query = query.filter(bucket=bucket)
        
        if prefix:
            query = query.filter(key__startswith=prefix)
        
        return query.order_by('-uploaded_at')


class MinioStorage:
    """MinIO/S3 storage backend"""
    
    def __init__(self, minio_client):
        self.client = minio_client
    
    def upload(self, bucket: str, key: str, content: bytes, content_type: str) -> Tuple[bool, int]:
        """Upload to MinIO/S3"""
        try:
            # Ensure bucket exists
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)
            
            # Upload file
            self.client.put_object(
                bucket_name=bucket,
                object_name=key,
                data=BytesIO(content),
                length=len(content),
                content_type=content_type
            )
            
            return True, len(content)
        except Exception as e:
            print(f"MinIO upload error: {e}")
            return False, 0
    
    def get_download_url(self, bucket: str, key: str, ttl_seconds: int, filename: str) -> str:
        """Get presigned URL from MinIO/S3"""
        try:
            return self.client.presigned_get_object(
                bucket_name=bucket,
                object_name=key,
                expires=timedelta(seconds=ttl_seconds),
                response_headers={
                    'response-content-disposition': f'attachment; filename="{filename}"'
                }
            )
        except Exception as e:
            print(f"MinIO URL generation error: {e}")
            return f"/files/{bucket}/{key}"  # Fallback URL
    
    def delete(self, bucket: str, key: str) -> bool:
        """Delete from MinIO/S3"""
        try:
            self.client.remove_object(bucket_name=bucket, object_name=key)
            return True
        except Exception as e:
            print(f"MinIO delete error: {e}")
            return False
    
    def get_content(self, bucket: str, key: str) -> bytes:
        """Get file content from MinIO/S3"""
        try:
            response = self.client.get_object(bucket_name=bucket, object_name=key)
            return response.read()
        except Exception as e:
            print(f"MinIO get content error: {e}")
            raise


class DjangoStorage:
    """Django default storage backend"""
    
    def __init__(self, storage):
        self.storage = storage
    
    def upload(self, bucket: str, key: str, content: bytes, content_type: str) -> Tuple[bool, int]:
        """Upload using Django storage"""
        try:
            full_path = f"{bucket}/{key}"
            self.storage.save(full_path, BytesIO(content))
            return True, len(content)
        except Exception as e:
            print(f"Django storage upload error: {e}")
            return False, 0
    
    def get_download_url(self, bucket: str, key: str, ttl_seconds: int, filename: str) -> str:
        """Get URL from Django storage"""
        full_path = f"{bucket}/{key}"
        if hasattr(self.storage, 'url'):
            return self.storage.url(full_path)
        return f"/media/{full_path}"  # Default media URL
    
    def delete(self, bucket: str, key: str) -> bool:
        """Delete using Django storage"""
        try:
            full_path = f"{bucket}/{key}"
            self.storage.delete(full_path)
            return True
        except Exception as e:
            print(f"Django storage delete error: {e}")
            return False
    
    def get_content(self, bucket: str, key: str) -> bytes:
        """Get file content from Django storage"""
        try:
            full_path = f"{bucket}/{key}"
            with self.storage.open(full_path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"Django storage get content error: {e}")
            raise


# Singleton instance
file_service = FileService()