const API_BASE_URL = 'http://127.0.0.1:8001/api/auth'; // Your Django API base URL

const requestForm = document.getElementById('request-reset-form');
const confirmForm = document.getElementById('confirm-reset-form');
const messageDiv = document.getElementById('message');

// --- Logic for the Request Reset Page ---
if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        messageDiv.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }),
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.className = 'success';
                messageDiv.textContent = data.message + " Please check your Django console for the reset link details.";
            } else {
                messageDiv.className = 'error';
                messageDiv.textContent = data.error || 'An error occurred.';
            }
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Failed to connect to the server.';
        }
    });
}

// --- Logic for the Confirm Reset Page ---
if (confirmForm) {
    confirmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get uid and token from the URL
        const params = new URLSearchParams(window.location.search);
        const uid = params.get('uid');
        const token = params.get('token');

        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        messageDiv.textContent = '';

        if (password !== passwordConfirm) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Passwords do not match.';
            return;
        }

        if (!uid || !token) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Missing UID or Token from URL. Please use the link from the console.';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uid, token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.className = 'success';
                messageDiv.textContent = data.message;
            } else {
                messageDiv.className = 'error';
                messageDiv.textContent = data.error || 'An error occurred. The link may be invalid or expired.';
            }
        } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Failed to connect to the server.';
        }
    });
}