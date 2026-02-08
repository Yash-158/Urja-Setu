import { logout } from '../auth.js';
import api from '../api.js';
import { renderCategoryChart, renderTimeChart } from './charts.js';
import { renderMap, renderMiniMap } from './map.js';

const adminState = {
    reports: null,
    suggestions: null,
    users: null, // Replaces 'technicians'
};

// --- Cached DOM Elements ---
let mainContentContainer;
let pageTitle;

/**
 * Initializes the admin panel, caches main DOM elements, and sets up listeners.
 */
export function initAdminPanel() {
    mainContentContainer = document.getElementById('admin-main-content');
    pageTitle = document.getElementById('page-title');
    
    setupEventListeners();
    renderDashboardView(); // Load the initial view
}

/**
 * Sets up a single, delegated event listener on the body to handle all clicks.
 */
function setupEventListeners() {
    document.body.addEventListener('click', handleGlobalClick);
}

/**
 * Handles all clicks within the admin panel using event delegation.
 * @param {Event} e The click event.
 */
function handleGlobalClick(e) {
    // Sidebar Navigation
    const navLink = e.target.closest('.sidebar-nav .nav-link');
    if (navLink) {
        e.preventDefault();
        handleNavClick(navLink);
        return;
    }

    // Logout Button
    if (e.target.closest('#admin-logout-btn')) {
        logout();
        return;
    }

    // Report Table Actions
    const editBtn = e.target.closest('.btn-edit-report');
    if (editBtn) {
        e.stopPropagation();
        openEditReportModal(editBtn.dataset.reportId);
        return;
    }
    const deleteBtn = e.target.closest('.btn-delete-report');
    if (deleteBtn) {
        e.stopPropagation();
        handleDeleteReport(deleteBtn.dataset.reportId);
        return;
    }
    const reportRow = e.target.closest('tr[data-report-id]');
    if (reportRow) {
        renderReportDetailView(reportRow.dataset.reportId);
        return;
    }

    // Modal Actions (General)
    const closeModalBtn = e.target.closest('.modal-close, .modal-cancel-btn');
    if (closeModalBtn) {
        closeModal();
        return;
    }
    
    // Report Modal Save
    const saveModalBtn = e.target.closest('.modal-save-btn');
    if (saveModalBtn) {
        handleSaveChangesInModal(saveModalBtn.dataset.reportId);
        return;
    }
    
    // Suggestion Actions
    const updateSuggestionBtn = e.target.closest('.btn-update-suggestion');
    if(updateSuggestionBtn) {
        handleUpdateSuggestionStatus(updateSuggestionBtn.dataset.suggestionId);
    }
    
    // Technician Assignment Actions
    const assignBtn = e.target.closest('#assign-technician-btn');
    if (assignBtn) {
        handleAssignTechnician(assignBtn.dataset.reportId);
    }
    const searchBtn = e.target.closest('#technician-search-btn');
    if (searchBtn) {
        e.preventDefault();
        handleTechnicianSearch();
        return;
    }

    // Report Detail View Actions
    const updateStatusBtn = e.target.closest('.btn-update-detail-status');
    if (updateStatusBtn) {
        handleUpdateStatusFromDetailView(updateStatusBtn.dataset.reportId);
        return;
    }
    const thumbnail = e.target.closest('.thumbnail');
    if (thumbnail) {
        openImageModal(thumbnail.dataset.fullSrc);
        return;
    }
    
    // --- NEW: User Management Actions ---
    const createUserBtn = e.target.closest('.btn-create-user');
    if (createUserBtn) {
        openUserModal(); // Open modal for creation (no user data)
        return;
    }
    const editUserBtn = e.target.closest('.btn-edit-user');
    if (editUserBtn) {
        openUserModal(editUserBtn.dataset.userId); // Open modal for editing
        return;
    }
    const deleteUserBtn = e.target.closest('.btn-delete-user');
    if (deleteUserBtn) {
        handleDeleteUser(deleteUserBtn.dataset.userId);
        return;
    }
    const saveUserBtn = e.target.closest('.modal-save-user-btn');
    if (saveUserBtn) {
        handleSaveUser(saveUserBtn.dataset.userId);
        return;
    }
}

/**
 * Handles navigation clicks, updates the page title, and calls the correct render function.
 * @param {HTMLElement} navLink The clicked navigation link element.
 */
function handleNavClick(navLink) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
    navLink.classList.add('active');

    const viewName = navLink.dataset.view;
    const viewTitle = navLink.querySelector('span').textContent;
    pageTitle.textContent = viewTitle; // Update the static page title

    switch (viewName) {
        case 'dashboard': renderDashboardView(); break;
        case 'all-reports': renderAllReportsView(); break;
        case 'suggestions': renderSuggestionsView(); break;
        case 'users': renderUsersView(); break; // <-- NEW
    }
}

// --- VIEW RENDERING FUNCTIONS ---

async function renderDashboardView() {
    mainContentContainer.innerHTML = `<p>Loading dashboard data...</p>`;
    try {
        const stats = await api.getDashboardStats();
        if (!adminState.reports) { adminState.reports = await api.getAllReports(); }
        
        mainContentContainer.innerHTML = `
            <section class="metrics-grid">
                <div class="card"><h3 class="card-title">Total Reports</h3><p>${stats.key_metrics?.total_reports || '0'}</p></div>
                <div class="card"><h3 class="card-title">New Today</h3><p>${stats.key_metrics?.new_reports_today || '0'}</p></div>
                <div class="card"><h3 class="card-title">In Progress</h3><p>${stats.key_metrics?.in_progress_reports || '0'}</p></div>
                <div class="card"><h3 class="card-title">Resolved</h3><p>${stats.key_metrics?.resolved_reports || '0'}</p></div>
            </section>
            <section class="data-vis-grid">
                <div class="card"><h3 class="card-title">Reports by Category</h3><div class="chart-container"><canvas id="category-chart"></canvas></div></div>
                <div class="card"><h3 class="card-title">Reports Over Time</h3><div class="chart-container"><canvas id="time-chart"></canvas></div></div>
                <div class="card full-width"><h3 class="card-title">Unresolved Reports Map</h3><div id="map"></div></div>
            </section>`;
            
        renderCategoryChart(stats.charts?.reports_by_category);
        renderTimeChart(stats.charts?.daily_reports_last_7_days);
        renderMap(adminState.reports.filter(r => r.status !== 'Resolved'), renderReportDetailView);
    } catch (error) {
        mainContentContainer.innerHTML = `<p class="error-message">Error loading dashboard: ${error.message}</p>`;
    }
}

async function renderAllReportsView() {
    mainContentContainer.innerHTML = `<div class="card"><div id="reports-table-container">Loading reports...</div></div>`;
    try {
        if (!adminState.reports) {
            adminState.reports = await api.getAllReports();
        }
        const container = document.getElementById('reports-table-container');
        container.innerHTML = `<table class="data-table">
            <thead><tr><th>ID</th><th>Category</th><th>Priority</th><th>Status</th><th>Citizen</th><th>Assigned To</th><th>Actions</th></tr></thead>
            <tbody>
            ${adminState.reports.map(report => `
                <tr data-report-id="${report.id}" title="Click to view details">
                    <td>#${report.id}</td>
                    <td>${report.category}</td>
                    <td>${report.priority || 'N/A'}</td>
                    <td><span class="status-badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span></td>
                    <td>${report.citizen.email}</td>
                    <td>${report.assigned_technician?.profile?.full_name || 'Unassigned'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-edit-report" data-report-id="${report.id}">Edit</button>
                            <button class="btn btn-danger btn-sm btn-delete-report" data-report-id="${report.id}">Delete</button>
                        </div>
                    </td>
                </tr>`).join('') || `<tr><td colspan="7">No reports found.</td></tr>`}
            </tbody>
        </table>`;
    } catch(error) {
        console.error("Error rendering reports table:", error);
        document.getElementById('reports-table-container').innerHTML = `<p class="error-message">Error loading reports. Check the console for details.</p>`;
    }
}

async function renderSuggestionsView() {
    mainContentContainer.innerHTML = `<div class="card"><div id="suggestions-list-container">Loading suggestions...</div></div>`;
    try {
        const suggestions = await api.getAllSuggestions();
        const container = document.getElementById('suggestions-list-container');
        if (suggestions.length === 0) {
            container.innerHTML = '<p>No suggestions found.</p>';
            return;
        }
        const statusChoices = ['Submitted', 'In Review', 'Implemented', 'Archived'];
        container.innerHTML = suggestions.map(s => {
            const statusOptions = statusChoices.map(choice => `<option value="${choice}" ${s.status === choice ? 'selected' : ''}>${choice}</option>`).join('');
            return `<div class="suggestion-item">
                <div class="suggestion-content">
                    <p>"${s.suggestion_text}"</p>
                    <footer>Status: <strong>${s.status || 'Submitted'}</strong> | Submitted on ${new Date(s.created_at).toLocaleDateString()}</footer>
                </div>
                <div class="suggestion-actions">
                    <select id="suggestion-status-${s.id}">${statusOptions}</select>
                    <button class="btn btn-sm btn-update-suggestion" data-suggestion-id="${s.id}">Update</button>
                </div>
            </div>`;
        }).join('');
    } catch(error) {
         document.getElementById('suggestions-list-container').innerHTML = `<p class="error-message">Error loading suggestions: ${error.message}</p>`;
    }
}

async function renderReportDetailView(reportId) {
    pageTitle.textContent = `Loading Report Details...`;
    mainContentContainer.innerHTML = `<div class="card"><p>Loading report #${reportId}...</p></div>`;
    try {
        const [report, technicians] = await Promise.all([
            api.getReportById(reportId),
            api.getAllTechnicians()
        ]);
        pageTitle.textContent = `Report #${report.id}: ${report.category}`;

        // --- Media Gallery Logic with Labels ---
        const citizenImage = report.image ? `
            <div class="media-item">
                <img src="${report.image}" alt="Citizen Submission" class="thumbnail" data-full-src="${report.image}">
                <span class="media-label">Citizen</span>
            </div>
        ` : '';
        const technicianImages = report.report_updates
            .filter(update => update.image)
            .map(update => `
                <div class="media-item">
                    <img src="${update.image}" alt="Technician Update" class="thumbnail" data-full-src="${update.image}">
                    <span class="media-label">Technician</span>
                </div>
            `).join('');

        const updatesHTML = report.report_updates.map(update => `
            <div class="timeline-item">
                <div class="timeline-content">
                    <p class="remark-text">"${update.remark}"</p>
                    <span class="timestamp">by ${update.technician?.profile?.full_name || 'System'} on ${new Date(update.created_at).toLocaleString()}</span>
                </div>
            </div>`).join('');
        const technicianOptions = technicians.map(tech => 
            `<option value="${tech.id}" ${report.assigned_technician?.id === tech.id ? 'selected' : ''}>${tech.profile.full_name} (${tech.email})</option>`
        ).join('');
        const statusChoices = ['Received', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
        const statusOptions = statusChoices.map(s => `<option value="${s}" ${report.status === s ? 'selected' : ''}>${s}</option>`).join('');
        mainContentContainer.innerHTML = `
            <div class="detail-grid">
                <div class="detail-main">
                    <div class="card">
                        <h3 class="card-title">Citizen Submission</h3>
                        <div class="detail-section"><h4>Category</h4><p>${report.category}</p></div>
                        <div class="detail-section"><h4>Description</h4><p>${report.description}</p></div>
                        <div class="detail-section"><h4>Address</h4><p>${report.address || 'Not Provided'}</p></div>
                    </div>
                    <div class="card">
                        <h3 class="card-title">Media Gallery</h3>
                        <div class="media-gallery">
                            ${citizenImage || technicianImages ? citizenImage + technicianImages : '<p>No images submitted.</p>'}
                        </div>
                    </div>
                    <div class="card ai-details">
                        <h3 class="card-title">AI Analysis</h3>
                        <div class="detail-section"><h4>AI Classification</h4><p>${report.ai_classification || 'N/A'}</p></div>
                        <div class="detail-section"><h4>AI Suggested Priority</h4><p>${report.ai_priority || 'N/A'}</p></div>
                        <div class="detail-section"><h4>AI Suggestion</h4><p>${report.ai_suggestion || 'N/A'}</p></div>
                    </div>
                    <div class="card">
                        <h3 class="card-title">Timeline & Remarks</h3>
                        <div class="timeline">${updatesHTML || '<p>No updates from technician yet.</p>'}</div>
                    </div>
                </div>
                <div class="detail-sidebar">
                    <div class="card manage-report-card">
                        <h3 class="card-title">Manage Report</h3>
                        <div class="detail-section">
                            <h4>Status</h4>
                            <div class="status-update-form">
                                <select id="detail-status-select">${statusOptions}</select>
                                <button class="btn btn-sm btn-update-detail-status" data-report-id="${report.id}">Update</button>
                            </div>
                        </div>
                         <div class="detail-section"><h4>Current Priority</h4><p>${report.priority || 'Not Set'}</p></div>
                         <div class="detail-section"><h4>Citizen</h4><p>${report.citizen.full_name} (${report.citizen.email})</p></div>
                    </div>
                    <div class="card technician-assignment-card">
                        <h3 class="card-title">Technician Assignment</h3>
                        <div class="detail-section">
                            <h4>Currently Assigned</h4>
                            <p class="assigned-tech-name">${report.assigned_technician?.profile?.full_name || 'Unassigned'}</p>
                        </div>
                        <div class="technician-search">
                            <input type="search" id="technician-search-input" placeholder="Search by name or email...">
                            <button class="btn btn-sm" id="technician-search-btn">Search</button>
                        </div>
                        <div class="assign-group">
                             <select id="technician-select" class="technician-select">${technicianOptions}</select>
                             <button id="assign-technician-btn" data-report-id="${report.id}" class="btn btn-sm">Assign</button>
                        </div>
                    </div>
                    <div class="card">
                        <h3 class="card-title">Location</h3>
                        <div id="mini-map"></div>
                    </div>
                </div>
            </div>`;
        renderMiniMap(report.latitude, report.longitude);
    } catch (error) {
        console.error("Error rendering report detail:", error);
        mainContentContainer.innerHTML = `<p class="error-message">Error loading report: ${error.message}</p>`;
    }
}

// --- NEW: USER MANAGEMENT VIEW ---
async function renderUsersView() {
    mainContentContainer.innerHTML = `
        <div class="page-actions">
            <button class="btn btn-create-user">Create New User</button>
        </div>
        <div class="card">
            <div id="users-table-container">Loading users...</div>
        </div>
    `;
    try {
        const users = await api.getInternalUsers();
        adminState.users = users; // Cache the user data
        
        const container = document.getElementById('users-table-container');
        container.innerHTML = `<table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Specialization</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            ${users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.profile.full_name}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.profile.role}">${user.profile.role}</span></td>
                    <td>${user.profile.specialization || 'N/A'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-edit-user" data-user-id="${user.id}">Edit</button>
                            <button class="btn btn-danger btn-sm btn-delete-user" data-user-id="${user.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="6">No users found.</td></tr>`}
            </tbody>
        </table>`;
    } catch(error) {
        document.getElementById('users-table-container').innerHTML = `<p class="error-message">Error loading users: ${error.message}</p>`;
    }
}


// --- MODAL & ACTION HANDLERS ---

async function openEditReportModal(reportId) {
    const report = adminState.reports.find(r => r.id == reportId);
    if (!report) { alert('Could not find report data. Please refresh.'); return; }
    const categoryChoices = ['Safety Hazard', 'Maintenance', 'Power Theft', 'Other'];
    const statusChoices = ['Received', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    const priorityChoices = ['High', 'Medium', 'Low'];
    const categoryOptions = categoryChoices.map(c => `<option value="${c}" ${report.category === c ? 'selected' : ''}>${c}</option>`).join('');
    const statusOptions = statusChoices.map(s => `<option value="${s}" ${report.status === s ? 'selected' : ''}>${s}</option>`).join('');
    const priorityOptions = priorityChoices.map(p => `<option value="${p}" ${report.priority === p ? 'selected' : ''}>${p}</option>`).join('');

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Edit Report #${report.id}</h2><button class="modal-close">&times;</button></div>
                <div class="modal-body">
                    <div class="input-group"><label for="modal-category">Category</label><select id="modal-category">${categoryOptions}</select></div>
                    <div class="input-group"><label for="modal-description">Description</label><textarea id="modal-description" rows="4">${report.description}</textarea></div>
                    <div class="input-group"><label for="modal-status">Status</label><select id="modal-status">${statusOptions}</select></div>
                    <div class="input-group"><label for="modal-priority">Priority</label><select id="modal-priority">${priorityOptions}</select></div>
                </div>
                <div class="modal-footer">
                    <button class="btn modal-cancel-btn">Cancel</button>
                    <button class="btn modal-save-btn" data-report-id="${report.id}">Save Changes</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- NEW: USER MANAGEMENT MODAL & HANDLERS ---
async function openUserModal(userId) {
    const isEditing = !!userId;
    const user = isEditing ? adminState.users.find(u => u.id == userId) : null;

    const modalTitle = isEditing ? `Edit User #${user.id}` : 'Create New User';
    const passwordFieldHtml = !isEditing ? `
        <div class="input-group">
            <label for="modal-password">Password</label>
            <input type="password" id="modal-password" required autocomplete="new-password">
        </div>
    ` : '';

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header"><h2>${modalTitle}</h2><button class="modal-close">&times;</button></div>
                <form id="user-form">
                    <div class="modal-body">
                        <div class="input-group">
                            <label for="modal-fullname">Full Name</label>
                            <input type="text" id="modal-fullname" value="${user?.profile.full_name || ''}" required>
                        </div>
                        <div class="input-group">
                            <label for="modal-email">Email</label>
                            <input type="email" id="modal-email" value="${user?.email || ''}" required>
                        </div>
                        ${passwordFieldHtml}
                        <div class="input-group">
                            <label for="modal-phone">Phone Number</label>
                            <input type="tel" id="modal-phone" value="${user?.profile.phone_number || ''}" required>
                        </div>
                        <div class="input-group">
                            <label for="modal-role">Role</label>
                            <select id="modal-role" required>
                                <option value="technician" ${user?.profile.role === 'technician' ? 'selected' : ''}>Technician</option>
                                <option value="admin" ${user?.profile.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="modal-specialization">Specialization (if Technician)</label>
                            <input type="text" id="modal-specialization" value="${user?.profile.specialization || ''}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn modal-cancel-btn">Cancel</button>
                        <button type="submit" class="btn modal-save-user-btn" data-user-id="${userId || ''}">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add submit listener to the form itself
    document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveUser(userId);
    });
}

async function handleSaveUser(userId) {
    const isEditing = !!userId;

    const userData = {
        email: document.getElementById('modal-email').value,
        profile: {
            full_name: document.getElementById('modal-fullname').value,
            phone_number: document.getElementById('modal-phone').value,
            role: document.getElementById('modal-role').value,
            specialization: document.getElementById('modal-specialization').value,
        }
    };

    if (!isEditing) {
        userData.password = document.getElementById('modal-password').value;
    }

    try {
        if (isEditing) {
            await api.updateInternalUser(userId, userData);
        } else {
            await api.createInternalUser(userData);
        }
        closeModal();
        alert(`User ${isEditing ? 'updated' : 'created'} successfully!`);
        adminState.users = null; // Invalidate cache
        renderUsersView(); // Refresh the view
    } catch(error) {
        alert(`Error saving user: ${error.message}`);
    }
}

async function handleDeleteUser(userId) {
    const user = adminState.users.find(u => u.id == userId);
    if (!user) return;

    if (confirm(`Are you sure you want to delete ${user.profile.role} ${user.profile.full_name}? This action cannot be undone.`)) {
        try {
            await api.deleteInternalUser(userId);
            alert('User deleted successfully!');
            adminState.users = null; // Invalidate cache
            renderUsersView(); // Refresh the view
        } catch (error) {
            alert(`Error deleting user: ${error.message}`);
        }
    }
}


function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

async function handleSaveChangesInModal(reportId) {
    const dataToUpdate = {
        category: document.getElementById('modal-category').value,
        description: document.getElementById('modal-description').value,
        status: document.getElementById('modal-status').value,
        priority: document.getElementById('modal-priority').value,
    };
    try {
        await api.updateReport(reportId, dataToUpdate);
        closeModal();
        alert('Report updated successfully!');
        adminState.reports = null;
        const activeLink = document.querySelector('.sidebar-nav .nav-link.active');
        if (activeLink) {
            handleNavClick(activeLink);
        }
    } catch(error) {
        alert(`Error updating report: ${error.message}`);
    }
}

async function handleDeleteReport(reportId) {
    if (confirm(`Are you sure you want to permanently delete Report #${reportId}? This cannot be undone.`)) {
        try {
            await api.deleteReport(reportId);
            alert(`Report #${reportId} has been deleted.`);
            adminState.reports = null;
            renderAllReportsView();
        } catch (error) {
            alert(`Error deleting report: ${error.message}`);
        }
    }
}

async function handleTechnicianSearch() {
    const query = document.getElementById('technician-search-input').value;
    try {
        const technicians = await api.getAllTechnicians(query);
        const technicianSelect = document.getElementById('technician-select');
        if (technicians.length === 0) {
            technicianSelect.innerHTML = `<option>No technicians found</option>`;
        } else {
            technicianSelect.innerHTML = technicians.map(tech => 
                `<option value="${tech.id}">${tech.profile.full_name} (${tech.email})</option>`
            ).join('');
        }
    } catch(error) {
        alert(`Error searching technicians: ${error.message}`);
    }
}

async function handleUpdateSuggestionStatus(suggestionId) {
    const select = document.getElementById(`suggestion-status-${suggestionId}`);
    try {
        await api.updateSuggestionStatus(suggestionId, select.value);
        alert('Suggestion status updated!');
        renderSuggestionsView();
    } catch(error) { alert(`Error updating suggestion: ${error.message}`); }
}

async function handleAssignTechnician(reportId) {
    const select = document.getElementById('technician-select');
    const technicianId = select.value;
    if (!technicianId || technicianId === 'No technicians found') {
        alert('Please select a valid technician.');
        return;
    }
    try {
        await api.assignTechnician(reportId, technicianId);
        alert('Technician assigned successfully!');
        adminState.reports = null;
        renderReportDetailView(reportId);
    } catch (error) {
        alert(`Error assigning technician: ${error.message}`);
    }
}

async function handleUpdateStatusFromDetailView(reportId) {
    const status = document.getElementById('detail-status-select').value;
    try {
        await api.updateReport(reportId, { status });
        alert('Status updated successfully!');
        adminState.reports = null;
        renderReportDetailView(reportId);
    } catch(error) {
        alert(`Error updating status: ${error.message}`);
    }
}

function openImageModal(imageUrl) {
    const modalHTML = `
        <div class="image-modal-overlay">
            <span class="image-modal-close">&times;</span>
            <img src="${imageUrl}" alt="Full size view" class="image-modal-content">
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.querySelector('.image-modal-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('image-modal-overlay') || e.target.classList.contains('image-modal-close')) {
            document.querySelector('.image-modal-overlay').remove();
        }
    });
}