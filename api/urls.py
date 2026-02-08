# api/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    # --- AUTHENTICATION ---
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/password/change/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # --- CITIZEN ACTIONS ---
    path('reports/create/', ReportCreateView.as_view(), name='report-create'),
    path('reports/my-reports/', MyReportsListView.as_view(), name='my-reports-list'),
    path('suggestions/create/', SuggestionCreateView.as_view(), name='suggestion-create'),
    path('suggestions/my-suggestions/', MySuggestionsListView.as_view(), name='my-suggestions-list'),
    
    # --- ADMIN ACTIONS ---
    path('reports/', ReportListView.as_view(), name='report-list-all'), # Admin list
    path('technicians/', TechnicianListView.as_view(), name='technician-list'),
    path('suggestions/', SuggestionListView.as_view(), name='suggestion-list'),
    path('stats/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('admin/reports/<int:pk>/', ReportAdminDetailView.as_view(), name='admin-report-detail-manage'),
    path('admin/suggestions/<int:pk>/status/', SuggestionStatusUpdateView.as_view(), name='admin-suggestion-status-update'),
    path('admin/reports/<int:pk>/download/', ReportPDFDownloadView.as_view(), name='admin-report-download'),
    path('admin/users/', UserListView.as_view(), name='admin-user-list-create'),
    path('admin/users/<int:pk>/', UserDetailView.as_view(), name='admin-user-detail-manage'),

    # --- TECHNICIAN ACTIONS ---
    path('reports/assigned/', AssignedReportListView.as_view(), name='report-assigned-list'),

    # --- SHARED & ACTION URLS ---
    path('reports/<int:pk>/', ReportDetailView.as_view(), name='report-detail-view'),
    path('reports/<int:pk>/assign/', ReportAssignView.as_view(), name='report-assign'),
    path('reports/<int:pk>/status/', ReportStatusUpdateView.as_view(), name='report-status-update'),
    path('reports/<int:pk>/remarks/', ReportUpdateCreateView.as_view(), name='report-remark-create'),
]