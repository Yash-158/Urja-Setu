import router from './router.js';
import api from './api.js';

// --- INITIALIZERS ---

/** Attaches event listeners for the login page */
export function initLoginView() {
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', handleLogin);

    const registerLink = document.getElementById('register-link');
    registerLink?.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('register');
    });

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.navigate('password-reset-request');
        });
    }
}

/** Attaches event listeners for the citizen registration page */
export function initRegisterView() {
    const registerForm = document.getElementById('register-form');
    registerForm?.addEventListener('submit', handleRegister);

    const loginLink = document.getElementById('login-link');
    loginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('login');
    });
}

/** Attaches event listeners for the password reset request page */
export function initPasswordResetRequestView() {
    const requestForm = document.getElementById('password-reset-request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', handlePasswordResetRequest);
    }
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            router.navigate('login');
        });
    }
}

/** Attaches event listeners for the password reset confirmation page */
export function initPasswordResetConfirmView(params) {
    const confirmForm = document.getElementById('password-reset-confirm-form');
    if (confirmForm) {
        confirmForm.dataset.uid = params.uid;
        confirmForm.dataset.token = params.token;
        confirmForm.addEventListener('submit', handlePasswordResetConfirm);
    }
}

/** Logs the user out by calling the central logout handler in the router */
export function logout() {
    router.handleLogout();
}


// --- HANDLER FUNCTIONS ---

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector('.error-message');
    const submitButton = form.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Logging In...';
    errorEl.textContent = '';

    try {
        const email = form.email.value;
        const password = form.password.value;
        const data = await api.login(email, password);

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.role);
        
        // Navigate to the correct dashboard based on the user's role
        if (data.role === 'admin' || data.role === 'technician') {
             router.navigate(data.role);
        } else if (data.role === 'citizen') {
             router.navigate('dashboard');
        } else {
            throw new Error('Unknown user role.');
        }

    } catch (error) {
        errorEl.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector('.error-message');
    const submitButton = form.querySelector('button[type="submit"]');

    // 1. Immediately disable the button and provide visual feedback
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
    errorEl.textContent = '';

    try {
        const fullName = form.fullName.value;
        const phoneNumber = form.phoneNumber.value;
        const email = form.email.value;
        const password = form.password.value;

        // 2. Make the API call using the citizen registration function
        await api.register(email, password, fullName, phoneNumber);

        // 3. On success, show an alert and navigate to the login page
        alert('Registration successful! Please log in to continue.');
        router.navigate('login');

    } catch (error) {
        // 4. On failure, re-enable the button, reset its text, and display the error
        errorEl.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
    }
}

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
        messageEl.style.color = 'var(--danger-color)';
        messageEl.textContent = error.message;
    }
}

async function handlePasswordResetConfirm(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';
    
    const { uid, token } = form.dataset;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (newPassword !== confirmPassword) {
        messageEl.style.color = 'var(--danger-color)';
        messageEl.textContent = 'Passwords do not match.';
        return;
    }

    try {
        await api.confirmPasswordReset(uid, token, newPassword);
        alert('Password has been reset successfully! Please log in with your new password.');
        router.navigate('login');
    } catch (error) {
        messageEl.style.color = 'var(--danger-color)';
        messageEl.textContent = error.message;
    }
}