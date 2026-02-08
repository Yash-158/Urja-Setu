import { logout } from './auth.js';
import api from './api.js';

// Module-level variables
let contentContainer;
let navButtons;
let selectedCoords = { lat: null, lon: null };

/**
 * Main initializer for the citizen dashboard.
 */
export function initCitizenDashboard() {
    contentContainer = document.getElementById('citizen-content');
    navButtons = document.querySelectorAll('.dashboard-nav .nav-btn');
    const logoutBtn = document.getElementById('citizen-logout-btn');

    navButtons.forEach(btn => btn.addEventListener('click', handleNavClick));
    logoutBtn.addEventListener('click', logout);

    contentContainer.addEventListener('click', handleContentClick);
    contentContainer.addEventListener('submit', handleFormSubmit);

    renderMyReportsView(); // Load the default view
}

/**
 * Handles clicks on the main dashboard navigation buttons.
 */
function handleNavClick(e) {
    const targetView = e.target.dataset.view;
    navButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    switch (targetView) {
        case 'my-reports':
            renderMyReportsView();
            break;
        case 'create-report':
            renderCreateReportView();
            break;
        case 'my-suggestions':
            renderMySuggestionsView();
            break;
        case 'submit-suggestion':
            renderSubmitSuggestionView();
            break;
    }
}

// --- VIEW RENDERING FUNCTIONS ---

/**
 * Renders the form for creating a new report with automatic location fetching.
 */
function renderCreateReportView() {
    selectedCoords = { lat: null, lon: null };
    contentContainer.innerHTML = `
        <div class="card">
            <h2>Report a New Issue</h2>
            <form id="create-report-form">
                <div class="form-section">
                    <h3>1. Describe the Issue</h3>
                    <div class="input-group">
                        <label for="category">Category</label>
                        <select id="category" name="category" required>
                            <option value="" disabled selected>--Please choose a category--</option>
                            <option value="Power Outage">Power Outage</option>
                            <option value="Safety Hazard">Safety Hazard (e.g., broken wires)</option>
                            <option value="Power Theft">Power Theft</option>
                            <option value="Maintenance">Maintenance (e.g., streetlight out)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="priority">Priority</label>
                        <select id="priority" name="priority" required>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" rows="4" required placeholder="Provide a detailed description of the issue..."></textarea>
                    </div>
                </div>

                <div class="form-section">
                    <h3>2. Set the Location</h3>
                    <div class="location-picker">
                        <p id="location-status" class="location-status">Requesting your location... Please allow access.</p>
                    </div>
                </div>

                <div class="form-section">
                    <h3>3. Upload a Photo</h3>
                    <div class="input-group">
                        <label for="image">Upload or Capture Photo (Required)</label>
                        <input type="file" id="image" name="image" accept="image/*" capture="environment" required>
                    </div>
                </div>

                <button type="submit" class="btn">Submit Report</button>
                <p id="form-error" class="error-message"></p>
            </form>
        </div>
    `;
    // Immediately try to get the user's location
    getGeolocation();
}

/**
 * Renders detailed cards for each report.
 */
async function renderMyReportsView() {
    contentContainer.innerHTML = `<p>Loading your reports...</p>`;
    try {
        const reports = await api.getMyReports();
        if (reports.length === 0) {
            contentContainer.innerHTML = `<div class="card"><p>You haven't submitted any reports yet. Click "Create New Report" to get started.</p></div>`;
            return;
        }

        contentContainer.innerHTML = reports.map(report => `
            <div class="report-card" data-report-id="${report.id}" role="button" tabindex="0">
                <div class="report-item-header">
                    <h3>${report.category}</h3>
                    <span class="status-badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
                </div>
                <div class="card-body">
                    <p><strong>Description:</strong> ${report.description}</p>
                    <p><strong>Address:</strong> ${report.address || 'Not specified'}</p>
                </div>
                <div class="card-footer">
                    <span>Submitted: ${new Date(report.created_at).toLocaleDateString()}</span>
                    <span>Report ID: #${report.id}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        contentContainer.innerHTML = `<p class="error-message">Could not load your reports. ${error.message}</p>`;
    }
}

/**
 * Renders suggestion cards with status.
 */
async function renderMySuggestionsView() {
    contentContainer.innerHTML = `<p>Loading your suggestions...</p>`;
    try {
        const suggestions = await api.getMySuggestions();
        let contentHTML = '<h2>My Suggestions</h2>';
        if (suggestions.length === 0) {
            contentHTML += `<div class="card"><p>You haven't submitted any suggestions yet.</p></div>`;
        } else {
            contentHTML += suggestions.map(s => `
                <div class="suggestion-card card">
                    <p>"${s.suggestion_text}"</p>
                    <div class="card-footer">
                        <span>Submitted: ${new Date(s.created_at).toLocaleDateString()}</span>
                        ${s.status ? `<span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }
        contentContainer.innerHTML = contentHTML;
    } catch (error) {
        contentContainer.innerHTML = `<p class="error-message">Could not load your suggestions. ${error.message}</p>`;
    }
}

/**
 * Renders the form for submitting a new suggestion.
 */
function renderSubmitSuggestionView() {
    contentContainer.innerHTML = `
        <div class="card">
            <h2>Submit a Suggestion</h2>
            <p>Have an idea to improve our services? We'd love to hear it!</p>
            <form id="create-suggestion-form">
                <div class="input-group">
                    <label for="suggestion_text">Your Suggestion</label>
                    <textarea id="suggestion_text" name="suggestion_text" rows="5" required placeholder="Describe your idea..."></textarea>
                </div>
                <button type="submit" class="btn">Submit Suggestion</button>
                <p id="form-error" class="error-message"></p>
            </form>
        </div>
    `;
}

/**
 * Fetches and displays the detailed view for a single report.
 */
async function renderReportDetailView(reportId) {
    contentContainer.innerHTML = `<p>Loading report details...</p>`;
    try {
        const report = await api.getReportById(reportId);
        
        const updatesHTML = report.report_updates.map(update => {
            const imageHTML = update.image 
                ? `<img src="${update.image}" alt="Technician update image" class="timeline-image">` 
                : '';

            return `
                <div class="timeline-item">
                    <p class="timeline-remark">"${update.remark}"</p>
                    <p class="timeline-meta">Update from technician on ${new Date(update.created_at).toLocaleString()}</p>
                    ${imageHTML}
                </div>
            `;
        }).join('');

        contentContainer.innerHTML = `
            <button class="back-btn" id="back-to-reports-btn">&larr; Back to My Reports</button>
            <div class="card">
                <div class="report-item-header">
                    <h2>${report.category}</h2>
                    <span class="status-badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
                </div>
                <div class="card-body">
                    <p><strong>Submitted:</strong> ${new Date(report.created_at).toLocaleString()}</p>
                    <p><strong>Description:</strong> ${report.description}</p>
                    <p><strong>Address:</strong> ${report.address || 'Not provided'}</p>
                    <img src="${report.image}" alt="Report Image" class="detail-image">

                    <h3 style="margin-top: 2rem;">Updates & Timeline</h3>
                    <div class="timeline">
                        ${updatesHTML || '<p>No updates from the technician yet.</p>'}
                        <div class="timeline-item">
                            <p class="timeline-remark">"Your report has been submitted."</p>
                            <p class="timeline-meta">Logged on ${new Date(report.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        contentContainer.innerHTML = `<p class="error-message">Could not load report details. ${error.message}</p>`;
    }
}

// --- LOCATION HANDLING ---

function getGeolocation() {
    const statusEl = document.getElementById('location-status');
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                updateLocation(lat, lon);
            },
            (error) => {
                statusEl.textContent = 'Error: Location access was denied. Please enable it in your browser settings to submit a report.';
                statusEl.style.color = 'var(--danger-color)';
                console.error(`Geolocation error: ${error.message}`);
            }
        );
    } else {
        statusEl.textContent = 'Error: Geolocation is not supported by your browser.';
        statusEl.style.color = 'var(--danger-color)';
    }
}

async function updateLocation(lat, lon) {
    selectedCoords = { lat, lon };
    const statusEl = document.getElementById('location-status');
    statusEl.textContent = 'Location acquired. Fetching address...';
    
    try {
        const addressData = await api.getAddressFromCoords(lat, lon);
        const addressText = addressData.display_name || 'Address details not found.';
        statusEl.textContent = `Location Set: ${addressText}`;
        statusEl.style.color = 'var(--success-color)';
    } catch (error) {
        statusEl.textContent = `Location coordinates acquired, but could not fetch address.`;
        statusEl.style.color = 'var(--text-muted)';
    }
}

// --- EVENT HANDLERS ---

function handleContentClick(e) {
    const reportItem = e.target.closest('.report-card');
    if (reportItem) {
        renderReportDetailView(reportItem.dataset.reportId);
        return;
    }
    if (e.target.id === 'back-to-reports-btn') {
        renderMyReportsView();
        return;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (e.target.id === 'create-report-form') {
        handleCreateReportSubmit(e);
    }
    if (e.target.id === 'create-suggestion-form') {
        handleCreateSuggestionSubmit(e);
    }
}

async function handleCreateReportSubmit(e) {
    const form = e.target;
    const errorEl = document.getElementById('form-error');
    errorEl.textContent = '';

    if (!selectedCoords.lat || !selectedCoords.lon) {
        errorEl.textContent = 'Location is required. Please enable location access in your browser.';
        return;
    }

    const formData = new FormData(form);

    // --- FIX IS HERE ---
    // 1. Get the value of the priority field from the FormData object.
    const priorityValue = formData.get('priority');
    
    // 2. Remove the original 'priority' key.
    formData.delete('priority');
    
    // 3. Add the value back under the new key 'ai_priority'.
    if (priorityValue) {
        formData.append('ai_priority', priorityValue);
    }
    // --- END OF FIX ---

    formData.append('latitude', selectedCoords.lat.toFixed(6));
    formData.append('longitude', selectedCoords.lon.toFixed(6));
    
    const addressText = document.getElementById('location-status').textContent.replace('Location Set: ', '');
    if (addressText && !addressText.startsWith('Error:')) {
        formData.append('address', addressText);
    }

    try {
        await api.createReport(formData);
        alert('Report submitted successfully!');
        document.querySelector('.nav-btn[data-view="my-reports"]').click();
    } catch (error) {
        errorEl.textContent = `Submission failed: ${error.message}`;
    }
}

async function handleCreateSuggestionSubmit(e) {
    const form = e.target;
    const errorEl = document.getElementById('form-error');
    errorEl.textContent = '';
    const suggestionText = form.suggestion_text.value;
    try {
        await api.createSuggestion(suggestionText);
        alert('Thank you! Your suggestion has been submitted.');
        document.querySelector('.nav-btn[data-view="my-suggestions"]').click();
    } catch (error) {
        errorEl.textContent = `Submission failed: ${error.message}`;
    }
}