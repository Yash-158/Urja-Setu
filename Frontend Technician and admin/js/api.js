import { logout } from './auth.js';

const BASE_URL = 'http://127.0.0.1:8001/api';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * A generic helper function for making API requests that expect a JSON response.
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = options.headers || {};

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { logout(); }
            const errorData = await response.json().catch(() => ({ detail: `HTTP Error: ${response.status} ${response.statusText}` }));
            let errorMessage = "An unknown error occurred.";
            if (errorData) {
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else {
                    const messages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
                    if (messages.length > 0) errorMessage = messages.join(' | ');
                }
            }
            throw new Error(errorMessage);
        }

        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
            return { success: true };
        }

        return response.json();
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        throw error;
    }
}

// Export a single object containing all our API methods.
export default {
    // --- Authentication ---
    login: (email, password) => apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password, fullName, phoneNumber) => apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify({ email, password, profile: { full_name: fullName, phone_number: phoneNumber, role: "citizen" } }) }),
    requestPasswordReset: (email) => apiFetch('/auth/password-reset/', { method: 'POST', body: JSON.stringify({ email }) }),
    confirmPasswordReset: (uid, token, password) => apiFetch('/auth/password-reset/confirm/', { method: 'POST', body: JSON.stringify({ uid, token, password }) }),

    // --- Citizen Functions ---
    getMyReports: () => apiFetch('/reports/my-reports/'),
    createReport: (formData) => apiFetch('/reports/create/', { method: 'POST', body: formData }),
    createSuggestion: (suggestionText) => apiFetch('/suggestions/create/', { method: 'POST', body: JSON.stringify({ suggestion_text: suggestionText }) }),
    getMySuggestions: () => apiFetch('/suggestions/my-suggestions/'),

    // --- Admin Functions ---
    getDashboardStats: () => apiFetch('/stats/dashboard/'),
    getAllReports: () => apiFetch('/reports/'),
    getReportById: (reportId) => apiFetch(`/reports/${reportId}/`),
    getAllSuggestions: () => apiFetch('/suggestions/'),
    assignTechnician: (reportId, technicianId) => apiFetch(`/reports/${reportId}/assign/`, { method: 'PATCH', body: JSON.stringify({ assigned_technician: technicianId }) }),
    updateReport: (reportId, data) => apiFetch(`/admin/reports/${reportId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteReport: (reportId) => apiFetch(`/admin/reports/${reportId}/`, { method: 'DELETE' }),
    updateSuggestionStatus: (suggestionId, status) => apiFetch(`/admin/suggestions/${suggestionId}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),

    // --- Technician Management (Admin-only) ---
    getAllTechnicians: (searchQuery = '') => apiFetch(searchQuery ? `/technicians/?search=${encodeURIComponent(searchQuery)}` : '/technicians/'),
    // CORRECTED: The endpoint now points to the correct registration URL
    createInternalUser: (userData) => apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(userData) }),
    updateInternalUser: (userId, userData) => apiFetch(`/admin/users/${userId}/`, { method: 'PATCH', body: JSON.stringify(userData) }),
    deleteInternalUser: (userId) => apiFetch(`/admin/users/${userId}/`, { method: 'DELETE' }),

    // --- Report Download (Admin-only) ---
    downloadReportPDF: async (reportId) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Token ${token}` };
        try {
            const response = await fetch(`${BASE_URL}/admin/reports/${reportId}/download/`, { headers });
            if (!response.ok) { throw new Error('Could not download report.'); }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `UrjaSetu_Report_${reportId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Download Error:', error);
            throw error;
        }
    },

    // --- Technician Functions ---
    getAssignedReports: () => apiFetch('/reports/assigned/'),
    updateTechnicianReportStatus: (reportId, status) => apiFetch(`/reports/${reportId}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    addReportRemark: (reportId, formData) => apiFetch(`/reports/${reportId}/remarks/`, { method: 'POST', body: formData }),

    // --- External Location API (Nominatim) ---
    getAddressFromCoords: async (lat, lon) => {
        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) { throw new Error('Failed to fetch address from coordinates.'); }
        return response.json();
    },
    searchLocation: async (query) => {
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&viewbox=68.1,20.1,74.5,24.7&bounded=1`);
        if (!response.ok) { throw new Error('Failed to search for location.'); }
        return response.json();
    }
};