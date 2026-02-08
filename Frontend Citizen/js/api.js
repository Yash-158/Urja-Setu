import { logout } from './auth.js';
import CONFIG from './config.js';

const BASE_URL = CONFIG.BASE_URL;
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * A generic helper function for making API requests to our backend.
 * @param {string} endpoint - The API endpoint to call.
 * @param {object} options - Optional fetch options.
 * @returns {Promise<any>} The JSON response from the API.
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
            const errorData = await response.json().catch(() => null);
            if (errorData) {
                if (errorData.detail) { throw new Error(errorData.detail); }
                let messages = [];
                for (const key in errorData) {
                    const value = errorData[key];
                    if (Array.isArray(value)) { messages.push(`${key}: ${value.join(', ')}`); }
                    else { messages.push(`${key}: ${value}`); }
                }
                if (messages.length > 0) { throw new Error(messages.join(' | ')); }
            }
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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
    // --- Methods for our backend ---
    login: (email, password) => apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password, fullName, phoneNumber) => apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify({ email, password, profile: { full_name: fullName, phone_number: phoneNumber, role: "citizen" } }) }),
    getMyReports: () => apiFetch('/reports/my-reports/'),
    getReportById: (reportId) => apiFetch(`/reports/${reportId}/`),
    createReport: (formData) => apiFetch('/reports/create/', { method: 'POST', body: formData }),
    createSuggestion: (suggestionText) => apiFetch('/suggestions/create/', { method: 'POST', body: JSON.stringify({ suggestion_text: suggestionText }) }),
    getMySuggestions: () => apiFetch('/suggestions/my-suggestions/'),
    requestPasswordReset: (email) => apiFetch('/auth/password-reset/', { method: 'POST', body: JSON.stringify({ email }) }),
    confirmPasswordReset: (uid, token, password) => apiFetch('/auth/password-reset/confirm/', { method: 'POST', body: JSON.stringify({ uid, token, password }) }),

    // --- Methods for the external Nominatim API ---

    /**
     * Fetches a human-readable address from a given latitude and longitude.
     * @param {number} lat - The latitude.
     * @param {number} lon - The longitude.
     * @returns {Promise<object>} The address data from Nominatim.
     */
    getAddressFromCoords: async (lat, lon) => {
        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            throw new Error('Failed to fetch address from coordinates.');
        }
        return response.json();
    },

    /**
     * Searches for locations based on a query string.
     * @param {string} query - The search term (e.g., "Maninagar, Ahmedabad").
     * @returns {Promise<object>} The search results from Nominatim.
     */
    searchLocation: async (query) => {
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&viewbox=68.1,20.1,74.5,24.7&bounded=1`);
        if (!response.ok) {
            throw new Error('Failed to search for location.');
        }
        return response.json();
    }
};