import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import Department


class UserRole(models.TextChoices):
    """User roles as defined in the documentation"""
    VENDOR = 'VENDOR', 'Vendor'
    EMP_L1 = 'EMP_L1', 'Employee L1'
    EMP_L2 = 'EMP_L2', 'Employee L2'
    HOD = 'HOD', 'Department Head'
    FIN_L1 = 'FIN_L1', 'Finance L1'
    FIN_L2 = 'FIN_L2', 'Finance L2'
    CFO = 'CFO', 'CFO / Finance Head'
    CEO = 'CEO', 'CEO'
    ADMIN = 'ADMIN', 'Admin'
    AUDITOR = 'AUDITOR', 'Internal Auditor'
    EXTERNAL_CA = 'EXTERNAL_CA', 'External CA'


class UserManager(models.Manager):
    """Custom manager for User model"""
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password"""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with 10+ roles, delegation, and vendor association.
    Based on documentation from docs/plan/03-data-models.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=100)
    last_name = models.CharField(_('last name'), max_length=100)
    
    # Role and department
    role = models.CharField(
        max_length=20, 
        choices=UserRole.choices,
        default=UserRole.EMP_L1
    )
    department = models.ForeignKey(
        Department, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users'
    )
    
    # Active status
    is_active = models.BooleanField(_('active'), default=True)
    is_staff = models.BooleanField(_('staff status'), default=False)
    
    # Vendor-specific (null for internal users)
    vendor = models.ForeignKey(
        'vendors.Vendor', 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL, 
        related_name='users'
    )
    
    # Delegation system
    delegate = models.ForeignKey(
        'self', 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='delegated_from'
    )
    delegate_start = models.DateTimeField(null=True, blank=True)
    delegate_end = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']
    
    class Meta:
        db_table = 'accounts_user'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['department']),
            models.Index(fields=['vendor']),
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_delegated(self):
        """Check if user is currently delegated"""
        if not self.delegate_start or not self.delegate_end:
            return False
        now = timezone.now()
        return self.delegate_start <= now <= self.delegate_end
    
    def get_effective_role(self):
        """Get effective role considering delegation"""
        if self.is_delegated and self.delegate:
            return self.delegate.role
        return self.role


class RefreshToken(models.Model):
    """Blacklisted refresh tokens"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=500, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'accounts_refreshtoken'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['user']),
        ]
    
    def is_expired(self):
        """Check if token is expired"""
        return timezone.now() > self.expires_at