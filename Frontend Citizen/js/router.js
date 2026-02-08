// We import the new password reset initializers from auth.js
import { initLoginView, initRegisterView, initPasswordResetRequestView, initPasswordResetConfirmView } from './auth.js';
import { initCitizenDashboard } from './citizen.js';

// A simple cache to store fetched HTML views.
const viewCache = new Map();
const appRoot = document.getElementById('app-root');

/**
 * Fetches an HTML view from the /views/ folder and caches it.
 * @param {string} viewName - The name of the HTML file (e.g., 'login').
 * @returns {Promise<string>} The HTML content of the view.
 */
async function loadView(viewName) {
    if (viewCache.has(viewName)) {
        return viewCache.get(viewName);
    }
    try {
        const response = await fetch(`views/${viewName}.html`);
        if (!response.ok) throw new Error(`View not found: ${viewName}`);
        const html = await response.text();
        viewCache.set(viewName, html);
        return html;
    } catch (error) {
        console.error('Failed to load view:', error);
        return `<p class="error-message">Error: Could not load page content.</p>`;
    }
}

/**
 * Renders a view and then executes its corresponding initialization script.
 * @param {string} viewName - The name of the view to display.
 * @param {object} [params={}] - Optional parameters to pass to the view's initializer.
 */
async function showView(viewName, params = {}) {
    const html = await loadView(viewName);
    appRoot.innerHTML = html;

    // After injecting the HTML, run the corresponding JavaScript for that view.
    switch (viewName) {
        case 'login':
            initLoginView();
            break;
        case 'register':
            initRegisterView();
            break;
        case 'dashboard':
            initCitizenDashboard();
            break;
        // --- NEW CASES FOR PASSWORD RESET ---
        case 'password-reset-request':
            initPasswordResetRequestView();
            break;
        case 'password-reset-confirm':
            initPasswordResetConfirmView(params); // Pass the uid and token
            break;
    }
}

/**
 * Initializes the application, now with logic to handle password reset URLs.
 */
function init() {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const token = params.get('token');

    // If uid and token are in the URL, the user came from a password reset email.
    if (uid && token) {
        showView('password-reset-confirm', { uid, token });
    } else {
        // Otherwise, proceed with the normal login check.
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('userRole');

        if (authToken && role === 'citizen') {
            showView('dashboard');
        } else {
            showView('login');
        }
    }
}

// Export the functions that need to be accessible from other modules.
export default {
    init,
    showView,
};