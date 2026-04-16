from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

User = get_user_model()


class UserModelTests(TestCase):
    """Test the custom User model"""
    
    def test_create_user(self):
        """Test creating a regular user"""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.role, 'EMP_L1')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        user = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        
        self.assertEqual(user.email, 'admin@example.com')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.role, 'ADMIN')
    
    def test_user_str(self):
        """Test string representation"""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
        
        self.assertEqual(str(user), 'Test User (test@example.com)')
    
    def test_full_name_property(self):
        """Test full_name property"""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
        
        self.assertEqual(user.full_name, 'Test User')


class AuthenticationAPITests(APITestCase):
    """Test authentication API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='EMP_L1'
        )
    
    def test_login_success(self):
        """Test successful login"""
        url = reverse('accounts:login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('accounts:login')
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
    
    def test_me_endpoint_authenticated(self):
        """Test /me endpoint with authenticated user"""
        url = reverse('accounts:me')
        
        # Login first
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['first_name'], 'Test')
        self.assertEqual(response.data['last_name'], 'User')
    
    def test_me_endpoint_unauthenticated(self):
        """Test /me endpoint without authentication"""
        url = reverse('accounts:me')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_whoami_endpoint(self):
        """Test /whoami endpoint"""
        url = reverse('accounts:whoami')
        
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['role'], 'EMP_L1')
        self.assertIn('permissions', response.data)
    
    def test_refresh_token(self):
        """Test token refresh"""
        # First login to get tokens
        login_url = reverse('accounts:login')
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        login_response = self.client.post(login_url, login_data, format='json')
        refresh_token = login_response.data['tokens']['refresh']
        
        # Test refresh
        refresh_url = reverse('accounts:refresh')
        refresh_data = {
            'refresh': refresh_token
        }
        
        response = self.client.post(refresh_url, refresh_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class DepartmentAPITests(APITestCase):
    """Test department API endpoints"""
    
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        
        self.user = User.objects.create_user(
            email='user@example.com',
            password='userpass123',
            first_name='Regular',
            last_name='User',
            role='EMP_L1'
        )
    
    def test_create_department_authenticated(self):
        """Test creating department as authenticated user"""
        url = reverse('accounts:department-list')
        data = {
            'name': 'Test Department',
            'cost_centre_code': 'TEST001'
        }
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Department')
        self.assertEqual(response.data['cost_centre_code'], 'TEST001')
    
    def test_list_departments(self):
        """Test listing departments"""
        url = reverse('accounts:department-list')
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)