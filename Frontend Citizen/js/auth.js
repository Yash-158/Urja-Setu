import router from './router.js';
import api from './api.js';

/**
 * Attaches event listeners to the login form and its links.
 */
function initLoginView() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Link to navigate to the registration page
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.showView('register');
        });
    }

    // --- NEW: Link to navigate to the password reset request page ---
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.showView('password-reset-request');
        });
    }
}

/**
 * Attaches event listeners to the registration form and its links.
 */
function initRegisterView() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.showView('login');
        });
    }
}


// --- NEW FUNCTIONS FOR PASSWORD RESET ---

/**
 * Attaches event listeners for the password reset request view.
 */
function initPasswordResetRequestView() {
    const requestForm = document.getElementById('password-reset-request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', handlePasswordResetRequest);
    }
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.showView('login');
        });
    }
}

/**
 * Attaches event listeners for the password reset confirmation view.
 * @param {object} params - Contains the uid and token from the URL.
 */
function initPasswordResetConfirmView(params) {
    const confirmForm = document.getElementById('password-reset-confirm-form');
    if (confirmForm) {
        // Store uid and token on the form element itself to be retrieved on submit
        confirmForm.dataset.uid = params.uid;
        confirmForm.dataset.token = params.token;
        confirmForm.addEventListener('submit', handlePasswordResetConfirm);
    }
}

/**
 * Handles submission of the password reset request form.
 */
async function handlePasswordResetRequest(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';

    const email = form.email.value;

    try {
        await api.requestPasswordReset(email);
        messageEl.style.color = 'var(--success-color)';
        messageEl.textContent = 'If an account with that email exists, a password reset link has been sent.';
        form.reset();
    } catch (error) {
        messageEl.style.color = 'var(--error-color)';
        messageEl.textContent = error.message;
    }
}

/**
 * Handles submission of the password reset confirmation form.
 */
async function handlePasswordResetConfirm(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';
    
    const { uid, token } = form.dataset;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (newPassword !== confirmPassword) {
        messageEl.style.color = 'var(--error-color)';
        messageEl.textContent = 'Passwords do not match.';
        return;
    }

    try {
        await api.confirmPasswordReset(uid, token, newPassword);
        alert('Password has been reset successfully! Please log in with your new password.');
        router.showView('login');
    } catch (error) {
        messageEl.style.color = 'var(--error-color)';
        messageEl.textContent = error.message;
    }
}


// --- EXISTING FUNCTIONS (Unchanged) ---

/**
 * Handles the login form submission.
 */
async function handleLogin(e) {
    e.preventDefault();
    const loginError = document.getElementById('error-message');
    loginError.textContent = '';

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
        const data = await api.login(email, password);
        if (data.role === 'citizen') {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userRole', data.role);
            router.showView('dashboard');
        } else {
            throw new Error('This is a citizen-only portal.');
        }
    } catch (error) {
        loginError.textContent = error.message;
    }
}

/**
 * Handles the registration form submission.
 */
async function handleRegister(e) {
    e.preventDefault();
    const registerError = document.getElementById('error-message');
    registerError.textContent = '';

    const email = e.target.email.value;
    const password = e.target.password.value;
    const fullName = e.target.fullName.value;
    const phoneNumber = e.target.phoneNumber.value;

    try {
        await api.register(email, password, fullName, phoneNumber);
        alert('Registration successful! Please log in with your new account.');
        router.showView('login');
    } catch (error) {
        registerError.textContent = error.message;
    }
}

/**
 * Logs the user out.
 */
function logout() {
    localStorage.clear();
    router.showView('login');
}

// Export all the functions needed by the router.
export { 
    initLoginView, 
    initRegisterView, 
    logout,
    initPasswordResetRequestView,
    initPasswordResetConfirmView
};