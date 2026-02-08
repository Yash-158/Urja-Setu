# api/permissions.py

from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'admin'

class IsTechnicianUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'technician'

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        return obj.citizen == request.user

class IsAdminOrAssignedTechnician(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.profile.role == 'admin':
            return True
        if request.user.profile.role == 'technician' and obj.assigned_technician == request.user:
            return True
        return False

# NEW permission for the detail view
class IsOwnerAdminOrAssignedTechnician(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated and hasattr(user, 'profile')):
            return False
        if user.profile.role == 'admin':
            return True
        if obj.citizen == user:
            return True
        if obj.assigned_technician == user:
            return True
        return False