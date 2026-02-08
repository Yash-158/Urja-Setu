# api/serializers.py

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Profile, Report, Suggestion, ReportUpdate

# ================================================================
# AUTHENTICATION & USER MANAGEMENT SERIALIZERS
# ================================================================

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    def validate(self, data):
        user = authenticate(username=data.get('email'), password=data.get('password'))
        if user and user.is_active: return user
        raise serializers.ValidationError("Incorrect Credentials")

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['full_name', 'phone_number', 'role', 'gender', 'department', 'specialization']

class RegisterSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    class Meta:
        model = User
        fields = ['email', 'password', 'profile']
        extra_kwargs = {'password': {'write_only': True}}
    def create(self, validated_data):
        profile_data = validated_data.pop('profile')
        user = User.objects.create_user(username=validated_data['email'], email=validated_data['email'], password=validated_data['password'])
        Profile.objects.create(user=user, **profile_data)
        return user

class UserManagementSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'profile']
    def create(self, validated_data):
        profile_data = validated_data.pop('profile')
        password = validated_data.pop('password', 'DefaultPassword123')
        user = User.objects.create_user(username=validated_data['email'], email=validated_data['email'], password=password)
        Profile.objects.create(user=user, **profile_data)
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

# ================================================================
# APP SERIALIZERS
# ================================================================

class UserDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone_number']

class ReportUpdateSerializer(serializers.ModelSerializer):
    technician = UserDetailSerializer(read_only=True)
    class Meta:
        model = ReportUpdate
        fields = ['id', 'remark', 'image', 'technician', 'created_at']
        read_only_fields = ['id', 'technician', 'created_at']

class TechnicianSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    class Meta:
        model = User
        fields = ['id', 'email', 'profile']

class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['category', 'description', 'image', 'latitude', 'longitude', 'address','ai_priority']

class ReportListDetailSerializer(serializers.ModelSerializer):
    citizen = UserDetailSerializer(read_only=True)
    assigned_technician = UserDetailSerializer(read_only=True)
    report_updates = ReportUpdateSerializer(many=True, read_only=True, source='reportupdate_set')
    class Meta:
        model = Report
        fields = [
            'id', 'citizen', 'assigned_technician', 'category', 'description', 
            'image', 'latitude', 'longitude', 'address', 'status', 
            'ai_classification', 'ai_priority', 'ai_suggestion', 'created_at', 
            'updated_at', 'resolved_at', 'report_updates'
        ]

class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ['id', 'suggestion_text', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['status']

class ReportAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['assigned_technician']

class AdminReportUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'category', 'description', 'status', 'assigned_technician',
            'ai_classification', 'ai_priority', 'ai_suggestion'
        ]

class SuggestionStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ['status']