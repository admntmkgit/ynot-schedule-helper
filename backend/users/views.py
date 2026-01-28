"""
Phase 10: User Views
API endpoints for user management and PIN-based authentication
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.contrib.sessions.backends.db import SessionStore

from .models import AppUser
from .serializers import (
    AppUserSerializer, 
    AppUserListSerializer, 
    AppUserUpdateSerializer,
    PINLoginSerializer
)


class AppUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for AppUser CRUD operations.
    
    list: GET /api/users/ - List all users (names only, no PINs)
    create: POST /api/users/ - Create new user with name and PIN
    retrieve: GET /api/users/{id}/ - Get user details
    update: PUT /api/users/{id}/ - Update user (name and/or PIN)
    partial_update: PATCH /api/users/{id}/ - Partial update
    destroy: DELETE /api/users/{id}/ - Delete user
    """
    queryset = AppUser.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AppUserListSerializer
        elif self.action in ['update', 'partial_update']:
            return AppUserUpdateSerializer
        return AppUserSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete - mark user as inactive rather than deleting."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def count(self, request):
        """GET /api/users/count/ - Check if any users exist (for initial setup)."""
        count = AppUser.objects.filter(is_active=True).count()
        return Response({'count': count, 'has_users': count > 0})


@api_view(['POST'])
def login_by_pin(request):
    """
    POST /api/auth/login/
    
    Authenticate user by PIN only. Returns user info on success.
    Stores user ID in session for persistent login.
    """
    serializer = PINLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    pin = serializer.validated_data['pin']
    user = AppUser.authenticate_by_pin(pin)
    
    if user is None:
        return Response(
            {'error': 'Invalid PIN. No user found with this PIN.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Store user in session
    request.session['user_id'] = user.id
    request.session['user_name'] = user.name
    request.session.modified = True
    
    return Response({
        'id': user.id,
        'name': user.name,
        'message': 'Login successful'
    })


@api_view(['POST'])
def logout(request):
    """
    POST /api/auth/logout/
    
    Clear user session.
    """
    request.session.flush()
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
def current_user(request):
    """
    GET /api/auth/me/
    
    Get currently logged-in user from session.
    Returns null if no user is logged in.
    """
    user_id = request.session.get('user_id')
    user_name = request.session.get('user_name')
    
    if user_id:
        try:
            user = AppUser.objects.get(id=user_id, is_active=True)
            return Response({
                'id': user.id,
                'name': user.name,
                'logged_in': True
            })
        except AppUser.DoesNotExist:
            # User was deleted, clear session
            request.session.flush()
    
    return Response({
        'id': None,
        'name': None,
        'logged_in': False
    })


@api_view(['POST'])
def quick_switch(request):
    """
    POST /api/auth/switch/
    
    Quick switch to another user by PIN.
    Similar to login but designed for seamless switching.
    """
    serializer = PINLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    pin = serializer.validated_data['pin']
    user = AppUser.authenticate_by_pin(pin)
    
    if user is None:
        return Response(
            {'error': 'Invalid PIN'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Update session with new user
    request.session['user_id'] = user.id
    request.session['user_name'] = user.name
    request.session.modified = True
    
    return Response({
        'id': user.id,
        'name': user.name,
        'message': 'Switched user successfully'
    })
