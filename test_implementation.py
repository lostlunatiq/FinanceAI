#!/usr/bin/env python
"""
Test script to verify the FinanceAI implementation.
This script tests the core functionality of the implemented features.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.core.models import Department, AuditLog, FileRef
from apps.core.audit import AuditWriter
from apps.core.file_service import FileService

User = get_user_model()


def test_authentication_system():
    """Test the authentication system"""
    print("Testing Authentication System...")
    
    # Test User model
    user = User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User',
        role=UserRole.EMP_L1
    )
    
    assert user.email == 'test@example.com'
    assert user.first_name == 'Test'
    assert user.last_name == 'User'
    assert user.role == UserRole.EMP_L1
    assert user.is_active == True
    assert user.is_staff == False
    assert user.full_name == 'Test User'
    
    print("  ✓ User model created successfully")
    
    # Test superuser
    admin = User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123'
    )
    
    assert admin.email == 'admin@example.com'
    assert admin.is_staff == True
    assert admin.is_superuser == True
    assert admin.role == UserRole.ADMIN
    
    print("  ✓ Superuser created successfully")
    
    # Test roles
    assert len(UserRole.choices) == 11  # Should have 11 roles
    
    print("  ✓ User roles configured correctly")
    
    return True


def test_department_model():
    """Test Department model"""
    print("Testing Department Model...")
    
    department = Department.objects.create(
        name='Engineering',
        cost_centre_code='ENG001'
    )
    
    assert department.name == 'Engineering'
    assert department.cost_centre_code == 'ENG001'
    assert str(department) == 'Engineering'
    
    print("  ✓ Department model created successfully")
    
    return True


def test_audit_log():
    """Test audit log system"""
    print("Testing Audit Log System...")
    
    user = User.objects.create_user(
        email='audit@example.com',
        password='auditpass123',
        first_name='Audit',
        last_name='User',
        role=UserRole.AUDITOR
    )
    
    # Test AuditWriter
    audit_log = AuditWriter.log(
        action='test.action',
        target_type='test',
        target_id='123e4567-e89b-12d3-a456-426614174000',
        actor=user,
        before={'old': 'value'},
        after={'new': 'value'},
        reason='Test audit'
    )
    
    assert audit_log.action == 'test.action'
    assert audit_log.entity_type == 'test'
    assert audit_log.user == user
    assert audit_log.masked_before == {'old': 'value'}
    assert audit_log.masked_after == {'new': 'value'}
    assert len(audit_log.entry_hash) == 64  # SHA256 hash length
    
    print("  ✓ Audit log entry created successfully")
    
    # Test hash chain verification
    assert AuditWriter.verify_chain() == True
    
    print("  ✓ Hash chain verification passed")
    
    return True


def test_file_service():
    """Test file service"""
    print("Testing File Service...")
    
    user = User.objects.create_user(
        email='file@example.com',
        password='filepass123',
        first_name='File',
        last_name='User',
        role=UserRole.EMP_L1
    )
    
    file_service = FileService()
    
    # Test SHA256 computation
    content = b'test file content'
    sha256 = file_service.compute_sha256(content)
    
    assert len(sha256) == 64
    assert sha256 == '6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72'
    
    print("  ✓ SHA256 computation working")
    
    # Test FileRef model
    file_ref = FileRef.objects.create(
        sha256=sha256,
        bucket='test-bucket',
        key='test/key.txt',
        size_bytes=len(content),
        mime_type='text/plain',
        original_filename='test.txt',
        uploaded_by=user
    )
    
    assert file_ref.sha256 == sha256
    assert file_ref.bucket == 'test-bucket'
    assert file_ref.original_filename == 'test.txt'
    assert file_ref.uploaded_by == user
    assert file_ref.file_size_human == '18.00 B'
    
    print("  ✓ FileRef model working")
    
    return True


def test_state_machine():
    """Test state machine engine"""
    print("Testing State Machine Engine...")
    
    from apps.core.state_machine import StateMachineEngine, StateMachine, Transition
    
    engine = StateMachineEngine()
    
    # Create a simple test model class
    class TestModel:
        def __init__(self):
            self.id = '123e4567-e89b-12d3-a456-426614174000'
            self.status = 'DRAFT'
            self.version = 1
            self._before_state = {'status': 'DRAFT', 'version': 1}
        
        def refresh_from_db(self):
            pass
    
    test_model = TestModel()
    
    # Create and register state machine
    machine = StateMachine('test')
    machine.add_state('DRAFT')
    machine.add_state('SUBMITTED')
    machine.add_state('APPROVED')
    
    transition = Transition(
        source='DRAFT',
        target='SUBMITTED',
        action='submit',
        description='Submit for approval'
    )
    
    machine.add_transition(transition)
    engine.register_machine(type(test_model), machine)
    
    # Test transition validation
    user = User.objects.create_user(
        email='state@example.com',
        password='statepass123',
        first_name='State',
        last_name='User',
        role=UserRole.EMP_L1
    )
    
    can_transition = engine.can_transition(test_model, 'SUBMITTED', user)
    assert can_transition == True
    
    cannot_transition = engine.can_transition(test_model, 'APPROVED', user)
    assert cannot_transition == False
    
    print("  ✓ State machine engine working")
    
    return True


def test_seed_command():
    """Test the seed command"""
    print("Testing Seed Command...")
    
    from apps.accounts.management.commands.seed_demo import Command
    
    command = Command()
    
    # Test that command can be instantiated
    assert command is not None
    assert command.help == 'Seed demo data with departments and users for all roles'
    
    print("  ✓ Seed command available")
    
    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("FinanceAI Implementation Test")
    print("=" * 60)
    
    tests = [
        ('Authentication System', test_authentication_system),
        ('Department Model', test_department_model),
        ('Audit Log System', test_audit_log),
        ('File Service', test_file_service),
        ('State Machine Engine', test_state_machine),
        ('Seed Command', test_seed_command),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                print(f"\n✓ {test_name}: PASSED")
                passed += 1
            else:
                print(f"\n✗ {test_name}: FAILED")
                failed += 1
        except Exception as e:
            print(f"\n✗ {test_name}: ERROR - {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("All tests passed! ✓")
        return 0
    else:
        print(f"{failed} test(s) failed.")
        return 1


if __name__ == '__main__':
    sys.exit(main())