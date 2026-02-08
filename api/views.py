# api/views.py

# --- Django & Python Imports ---
import threading
from datetime import timedelta
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Count
from django.http import HttpResponse
from django.template.loader import get_template
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.html import strip_tags

# --- Third-Party Imports ---
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from xhtml2pdf import pisa

# --- Local Imports ---
from .models import Report, Suggestion, ReportUpdate
from .permissions import IsAdminUser, IsTechnicianUser, IsOwnerAdminOrAssignedTechnician, IsAdminOrAssignedTechnician
from .serializers import * 
from .tasks import analyze_report_image_task

# ================================================================
# AUTHENTICATION & USER MANAGEMENT
# ================================================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    def get_serializer_context(self):
        context = super(RegisterView, self).get_serializer_context()
        context.update({"request": self.request})
        return context

class LoginView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        token, created = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user_id": user.pk, "email": user.email, "role": user.profile.role})

class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self, queryset=None):
        return self.request.user
    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get("email")
        if not email: return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        try: user = User.objects.get(email__iexact=email)
        except User.DoesNotExist: return Response({"message": "If an account with this email exists, a reset link has been sent."}, status=status.HTTP_200_OK)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"http://localhost:3000/confirm_reset.html?uid={uid}&token={token}"
        subject = "Password Reset for Urja Setu"
        html_message = f'<p>Please click the link below to reset your password:</p><p><a href="{reset_url}">Reset Password</a></p>'
        send_mail(subject, strip_tags(html_message), 'noreply@urjasetu.com', [user.email], html_message=html_message)
        return Response({"message": "If an account with this email exists, a reset link has been sent."}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        uidb64, token, password = request.data.get('uid'), request.data.get('token'), request.data.get('password')
        if not all([uidb64, token, password]): return Response({"error": "uid, token, and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except: user = None
        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid token or user ID."}, status=status.HTTP_400_BAD_REQUEST)

# ================================================================
# CITIZEN VIEWS
# ================================================================

class ReportCreateView(generics.CreateAPIView):
    
    queryset = Report.objects.all()
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def perform_create(self, serializer):
        report = serializer.save(citizen=self.request.user, status="Pending Analysis")
        thread = threading.Thread(target=analyze_report_image_task, args=[report.id])
        thread.start()

class SuggestionCreateView(generics.CreateAPIView):
    queryset = Suggestion.objects.all()
    serializer_class = SuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)

class MyReportsListView(generics.ListAPIView):
    serializer_class = ReportListDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Report.objects.filter(citizen=self.request.user).order_by('-created_at')

class MySuggestionsListView(generics.ListAPIView):
    serializer_class = SuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Suggestion.objects.filter(citizen=self.request.user).order_by('-created_at')

# ================================================================
# ADMIN VIEWS
# ================================================================

class ReportListView(generics.ListAPIView):
    queryset = Report.objects.all().order_by('-created_at')
    serializer_class = ReportListDetailSerializer
    permission_classes = [IsAdminUser]

class TechnicianListView(generics.ListAPIView):
    queryset = User.objects.filter(profile__role='technician')
    serializer_class = TechnicianSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['email', 'profile__full_name']

class SuggestionListView(generics.ListAPIView):
    queryset = Suggestion.objects.all().order_by('-created_at')
    serializer_class = SuggestionSerializer
    permission_classes = [IsAdminUser]

class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, *args, **kwargs):
        total_reports = Report.objects.count()
        in_progress_reports = Report.objects.filter(status='In Progress').count()
        resolved_reports = Report.objects.filter(status='Resolved').count()
        today = timezone.now().date()
        new_reports_today = Report.objects.filter(created_at__date=today).count()
        category_counts = Report.objects.values('category').annotate(count=Count('category')).order_by('-count')
        reports_by_category = {item['category']: item['count'] for item in category_counts if item['category']}
        seven_days_ago = today - timedelta(days=6)
        daily_counts_qs = Report.objects.filter(created_at__date__gte=seven_days_ago).values('created_at__date').annotate(count=Count('id')).order_by('created_at__date')
        daily_reports_last_7_days = { (seven_days_ago + timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(7) }
        for item in daily_counts_qs: daily_reports_last_7_days[item['created_at__date'].strftime('%Y-%m-%d')] = item['count']
        data = {"key_metrics": {"total_reports": total_reports,"new_reports_today": new_reports_today,"in_progress_reports": in_progress_reports,"resolved_reports": resolved_reports,},"charts": {"reports_by_category": reports_by_category,"daily_reports_last_7_days": daily_reports_last_7_days}}
        return Response(data, status=status.HTTP_200_OK)

class ReportAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Report.objects.all()
    permission_classes = [IsAdminUser]
    def get_serializer_class(self):
        if self.request.method == 'GET': return ReportListDetailSerializer
        return AdminReportUpdateSerializer

class ReportAssignView(generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportAssignmentSerializer
    permission_classes = [IsAdminUser]
    def perform_update(self, serializer):
        if serializer.instance.status in ['Received', 'Pending Analysis']:
            serializer.save(status='Assigned')
        else: serializer.save()

class SuggestionStatusUpdateView(generics.UpdateAPIView):
    queryset = Suggestion.objects.all()
    serializer_class = SuggestionStatusUpdateSerializer
    permission_classes = [IsAdminUser]

class ReportPDFDownloadView(generics.GenericAPIView):
    queryset = Report.objects.all()
    permission_classes = [IsAdminUser]
    def get(self, request, *args, **kwargs):
        report = self.get_object()
        template = get_template('api/report_template.html')
        context = {'report': report}
        html = template.render(context)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_{report.id}.pdf"'
        pisa_status = pisa.CreatePDF(html, dest=response)
        if pisa_status.err: return HttpResponse('We had some errors <pre>' + html + '</pre>')
        return response

class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.filter(profile__role='technician')
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdminUser]

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(profile__role='technician')
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdminUser]

# ================================================================
# TECHNICIAN VIEWS
# ================================================================

class AssignedReportListView(generics.ListAPIView):
    serializer_class = ReportListDetailSerializer
    permission_classes = [IsTechnicianUser]
    def get_queryset(self):
        user = self.request.user
        return Report.objects.filter(assigned_technician=user, status__in=['Assigned', 'In Progress']).order_by('-created_at')

class ReportUpdateCreateView(generics.CreateAPIView):
    queryset = ReportUpdate.objects.all()
    serializer_class = ReportUpdateSerializer
    permission_classes = [IsTechnicianUser]
    parser_classes = [MultiPartParser, FormParser]
    def perform_create(self, serializer):
        report_id = self.kwargs.get('pk')
        try: report = Report.objects.get(pk=report_id)
        except Report.DoesNotExist: raise Response({"error": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        if report.assigned_technician != self.request.user: raise permissions.PermissionDenied("You are not assigned to this report.")
        serializer.save(technician=self.request.user, report=report)

# ================================================================
# SHARED VIEWS (Used by multiple roles)
# ================================================================

class ReportDetailView(generics.RetrieveAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportListDetailSerializer
    permission_classes = [IsOwnerAdminOrAssignedTechnician]

class ReportStatusUpdateView(generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportStatusSerializer
    permission_classes = [IsAdminOrAssignedTechnician]
    def update(self, request, *args, **kwargs):
        report, user_profile = self.get_object(), request.user.profile
        current_status, requested_status = report.status, request.data.get('status')
        valid_transitions = {'technician': {'Assigned': ['In Progress'],'In Progress': ['Resolved']},'admin': {'Resolved': ['Closed', 'Assigned'], 'Received': ['Assigned', 'Closed']}}
        if user_profile.role not in valid_transitions: return Response({"error": "You do not have a role that can change status."}, status=status.HTTP_403_FORBIDDEN)
        allowed_next_statuses = valid_transitions[user_profile.role].get(current_status)
        if not allowed_next_statuses or requested_status not in allowed_next_statuses: return Response({"error": f"Cannot change status from '{current_status}' to '{requested_status}'.", "allowed_next_statuses": allowed_next_statuses or []}, status=status.HTTP_400_BAD_REQUEST)
        if requested_status == 'Resolved': report.resolved_at = timezone.now()
        return super().update(request, *args, **kwargs)