// Import all initializer functions
import { initLoginView, initRegisterView, initPasswordResetRequestView, initPasswordResetConfirmView } from './auth.js';
import { initAdminPanel } from './admin/admin.js';
import { initTechnicianPanel } from './technician/technician.js';
// import { initCitizenDashboard } from './citizen.js';

const viewCache = new Map();
const appRoot = document.getElementById('app-root');

/**
 * Fetches an HTML view from the /views/ folder and caches it.
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
 * Renders a view and runs its initializer.
 */
async function showView(viewName, params = {}) {
    const html = await loadView(viewName);
    appRoot.innerHTML = html;

    switch (viewName) {
        case 'login':
            initLoginView();
            break;
        case 'register':
            initRegisterView();
            break;
        case 'admin':
            initAdminPanel();
            break;
        case 'technician':
            initTechnicianPanel();
            break;
        case 'dashboard': // For the citizen dashboard
            initCitizenDashboard();
            break;
        case 'password-reset-request':
            initPasswordResetRequestView();
            break;
        case 'password-reset-confirm':
            initPasswordResetConfirmView(params);
            break;
    }
}

/**
 * Initializes the application on first load.
 */
function init() {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const token = params.get('token');

    if (uid && token) {
        showView('password-reset-confirm', { uid, token });
        return;
    }
    
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (authToken && role) {
        if (role === 'citizen') {
            showView('dashboard');
        } else {
            showView(role); // 'admin' or 'technician'
        }
    } else {
        showView('login');
    }
}


/**
 * Handles navigation between views.
 */
function navigate(viewName, params = {}) {
    showView(viewName, params);
}

/**
 * Clears the session and reloads the page to the login screen.
 */
function handleLogout() {
    localStorage.clear();
    window.location.reload();
}

export default {
    init,
    navigate,
    handleLogout,
};