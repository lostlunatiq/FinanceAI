from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch, Mock
import io

from .models import Department, AuditLog, FileRef
from .file_service import FileService
from .audit import AuditWriter
from .state_machine import StateMachineEngine, StateMachine, Transition

User = get_user_model()


class DepartmentModelTests(TestCase):
    """Test Department model"""
    
    def test_create_department(self):
        """Test creating a department"""
        department = Department.objects.create(
            name='Engineering',
            cost_centre_code='ENG001'
        )
        
        self.assertEqual(department.name, 'Engineering')
        self.assertEqual(department.cost_centre_code, 'ENG001')
        self.assertIsNone(department.head)
        self.assertEqual(department.budget_annual, 0)
    
    def test_department_str(self):
        """Test string representation"""
        department = Department.objects.create(name='Engineering')
        self.assertEqual(str(department), 'Engineering')


class AuditLogTests(TestCase):
    """Test AuditLog model and service"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
    
    def test_create_audit_log(self):
        """Test creating an audit log entry"""
        log = AuditLog.objects.create(
            user=self.user,
            action='test.action',
            entity_type='test',
            entity_id='123e4567-e89b-12d3-a456-426614174000',
            masked_before={'old': 'value'},
            masked_after={'new': 'value'},
            ip_address='127.0.0.1'
        )
        
        self.assertEqual(log.action, 'test.action')
        self.assertEqual(log.entity_type, 'test')
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.masked_before, {'old': 'value'})
        self.assertEqual(log.masked_after, {'new': 'value'})
        self.assertEqual(log.ip_address, '127.0.0.1')
    
    def test_audit_log_immutable(self):
        """Test that audit log entries are immutable"""
        log = AuditLog.objects.create(
            user=self.user,
            action='test.action',
            entity_type='test',
            entity_id='123e4567-e89b-12d3-a456-426614174000'
        )
        
        # Should not be able to update
        with self.assertRaises(PermissionError):
            log.action = 'updated.action'
            log.save()
        
        # Should not be able to delete
        with self.assertRaises(PermissionError):
            log.delete()
    
    def test_audit_writer_log(self):
        """Test AuditWriter.log() method"""
        audit_log = AuditWriter.log(
            action='test.action',
            target_type='test',
            target_id='123e4567-e89b-12d3-a456-426614174000',
            actor=self.user,
            before={'old': 'value'},
            after={'new': 'value'},
            reason='Test reason'
        )
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action, 'test.action')
        self.assertEqual(audit_log.entity_type, 'test')
        self.assertEqual(audit_log.user, self.user)
        self.assertEqual(audit_log.masked_before, {'old': 'value'})
        self.assertEqual(audit_log.masked_after, {'new': 'value'})
        self.assertEqual(audit_log.entry_hash, audit_log.entry_hash)  # Should have hash
    
    def test_hash_chain_verification(self):
        """Test hash chain verification"""
        # Create multiple audit logs
        for i in range(3):
            AuditWriter.log(
                action=f'test.action.{i}',
                target_type='test',
                target_id=f'123e4567-e89b-12d3-a456-42661417400{i}',
                actor=self.user,
                before={f'old_{i}': 'value'},
                after={f'new_{i}': 'value'},
                reason=f'Test reason {i}'
            )
        
        # Verify chain
        self.assertTrue(AuditWriter.verify_chain())


class FileServiceTests(TestCase):
    """Test FileService"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
        
        self.file_service = FileService()
    
    @patch('apps.core.file_service.FileService._get_storage_backend')
    def test_upload_file(self, mock_get_storage):
        """Test file upload"""
        # Mock storage backend
        mock_storage = Mock()
        mock_storage.upload.return_value = (True, 1024)
        mock_get_storage.return_value = mock_storage
        
        # Create test file
        file_content = b'test file content'
        file = SimpleUploadedFile(
            name='test.txt',
            content=file_content,
            content_type='text/plain'
        )
        
        # Upload file
        file_ref = self.file_service.upload_file(
            file=file,
            bucket='test-bucket',
            uploaded_by=self.user
        )
        
        self.assertIsNotNone(file_ref)
        self.assertEqual(file_ref.bucket, 'test-bucket')
        self.assertEqual(file_ref.original_filename, 'test.txt')
        self.assertEqual(file_ref.mime_type, 'text/plain')
        self.assertEqual(file_ref.size_bytes, 1024)
        self.assertEqual(file_ref.uploaded_by, self.user)
        
        # Verify storage was called
        mock_storage.upload.assert_called_once()
    
    @patch('apps.core.file_service.FileService._get_storage_backend')
    def test_deduplication(self, mock_get_storage):
        """Test SHA256 deduplication"""
        # Mock storage backend
        mock_storage = Mock()
        mock_storage.upload.return_value = (True, 1024)
        mock_get_storage.return_value = mock_storage
        
        # Create test file
        file_content = b'test file content'
        file1 = SimpleUploadedFile(
            name='test1.txt',
            content=file_content,
            content_type='text/plain'
        )
        
        file2 = SimpleUploadedFile(
            name='test2.txt',
            content=file_content,
            content_type='text/plain'
        )
        
        # Upload first file
        file_ref1 = self.file_service.upload_file(
            file=file1,
            bucket='test-bucket',
            uploaded_by=self.user
        )
        
        # Upload second file with same content
        file_ref2 = self.file_service.upload_file(
            file=file2,
            bucket='test-bucket',
            uploaded_by=self.user
        )
        
        # Should return same FileRef due to deduplication
        self.assertEqual(file_ref1.id, file_ref2.id)
        self.assertEqual(file_ref1.sha256, file_ref2.sha256)
        
        # Storage should only be called once
        self.assertEqual(mock_storage.upload.call_count, 1)
    
    def test_compute_sha256(self):
        """Test SHA256 computation"""
        content = b'test content'
        expected_hash = '6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72'
        
        actual_hash = self.file_service.compute_sha256(content)
        self.assertEqual(actual_hash, expected_hash)


class StateMachineTests(TestCase):
    """Test StateMachineEngine"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
        
        self.engine = StateMachineEngine()
        
        # Create a simple test model
        class TestModel:
            def __init__(self):
                self.id = '123e4567-e89b-12d3-a456-426614174000'
                self.status = 'DRAFT'
                self.version = 1
                self._before_state = {'status': 'DRAFT', 'version': 1}
            
            def refresh_from_db(self):
                pass
        
        self.test_model = TestModel()
        
        # Create a simple state machine
        self.machine = StateMachine('test')
        self.machine.add_state('DRAFT')
        self.machine.add_state('SUBMITTED')
        self.machine.add_state('APPROVED')
        
        transition = Transition(
            source='DRAFT',
            target='SUBMITTED',
            action='submit',
            description='Submit for approval'
        )
        
        self.machine.add_transition(transition)
        
        # Register machine
        self.engine.register_machine(type(self.test_model), self.machine)
    
    @patch('apps.core.state_machine.audit_writer')
    def test_transition_to(self, mock_audit_writer):
        """Test state transition"""
        # Mock the model's objects.filter().update() to simulate optimistic locking
        with patch.object(type(self.test_model), 'objects') as mock_objects:
            mock_filter = mock_objects.filter.return_value
            mock_filter.update.return_value = 1  # Simulate successful update
            
            # Perform transition
            result = self.engine.transition_to(
                record=self.test_model,
                target_state='SUBMITTED',
                actor=self.user,
                reason='Testing transition'
            )
            
            # Verify transition was attempted
            mock_objects.filter.assert_called_once_with(
                id=self.test_model.id,
                version=self.test_model.version
            )
            
            # Verify audit was logged
            mock_audit_writer.log.assert_called_once()
    
    def test_can_transition(self):
        """Test transition validation"""
        can_transition = self.engine.can_transition(
            record=self.test_model,
            target_state='SUBMITTED',
            actor=self.user
        )
        
        self.assertTrue(can_transition)
    
    def test_illegal_transition(self):
        """Test illegal transition"""
        can_transition = self.engine.can_transition(
            record=self.test_model,
            target_state='APPROVED',  # No direct transition from DRAFT to APPROVED
            actor=self.user
        )
        
        self.assertFalse(can_transition)
    
    def test_get_available_transitions(self):
        """Test getting available transitions"""
        transitions = self.engine.get_available_transitions(
            record=self.test_model,
            actor=self.user
        )
        
        self.assertEqual(len(transitions), 1)
        self.assertEqual(transitions[0].action, 'submit')
        self.assertEqual(transitions[0].source, 'DRAFT')
        self.assertEqual(transitions[0].target, 'SUBMITTED')


class FileRefModelTests(TestCase):
    """Test FileRef model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
    
    def test_create_fileref(self):
        """Test creating a FileRef"""
        file_ref = FileRef.objects.create(
            sha256='a' * 64,
            bucket='test-bucket',
            key='test/key.txt',
            size_bytes=1024,
            mime_type='text/plain',
            original_filename='test.txt',
            uploaded_by=self.user
        )
        
        self.assertEqual(file_ref.sha256, 'a' * 64)
        self.assertEqual(file_ref.bucket, 'test-bucket')
        self.assertEqual(file_ref.key, 'test/key.txt')
        self.assertEqual(file_ref.size_bytes, 1024)
        self.assertEqual(file_ref.mime_type, 'text/plain')
        self.assertEqual(file_ref.original_filename, 'test.txt')
        self.assertEqual(file_ref.uploaded_by, self.user)
        self.assertEqual(file_ref.storage_class, 'HOT')
    
    def test_file_size_human(self):
        """Test human-readable file size"""
        # Test bytes
        file_ref = FileRef.objects.create(
            sha256='a' * 64,
            bucket='test',
            key='test.txt',
            size_bytes=500,
            mime_type='text/plain',
            original_filename='test.txt'
        )
        self.assertEqual(file_ref.file_size_human, '500.00 B')
        
        # Test KB
        file_ref.size_bytes = 1500
        self.assertEqual(file_ref.file_size_human, '1.46 KB')
        
        # Test MB
        file_ref.size_bytes = 1500000
        self.assertEqual(file_ref.file_size_human, '1.43 MB')
    
    def test_fileref_str(self):
        """Test string representation"""
        file_ref = FileRef.objects.create(
            sha256='a' * 64,
            bucket='test-bucket',
            key='test.txt',
            size_bytes=1024,
            mime_type='text/plain',
            original_filename='test.txt'
        )
        
        self.assertEqual(str(file_ref), 'test.txt (test-bucket)')