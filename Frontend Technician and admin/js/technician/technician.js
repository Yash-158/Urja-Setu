import { logout } from '../auth.js';
import api from '../api.js';

const technicianState = {
    reports: null,
};
let mainContentContainer;
let viewContainer;

export function initTechnicianPanel() {
    viewContainer = document.getElementById('technician-view');
    mainContentContainer = document.getElementById('technician-main-content');
    
    viewContainer.addEventListener('click', handleGlobalClick);
    renderListView();
}

function handleGlobalClick(e) {
    if (e.target.closest('#tech-logout-btn')) {
        logout();
        return;
    }
    const viewSwitchBtn = e.target.closest('.view-switch-btn');
    if (viewSwitchBtn) {
        handleViewSwitch(viewSwitchBtn);
        return;
    }
    const reportCard = e.target.closest('.report-card');
    if (reportCard) {
        handleCardAction(e);
    }
}

function handleViewSwitch(clickedButton) {
    const newView = clickedButton.dataset.view;
    if (clickedButton.classList.contains('active')) return;

    document.querySelectorAll('.view-switch-btn').forEach(btn => btn.classList.remove('active'));
    clickedButton.classList.add('active');

    if (newView === 'list') {
        renderListView();
    } else if (newView === 'map') {
        renderMapView();
    }
}

async function renderListView() {
    mainContentContainer.innerHTML = `<p>Loading assigned reports...</p>`;
    try {
        if (technicianState.reports === null) {
            technicianState.reports = await api.getAssignedReports();
        }
        const reports = technicianState.reports;

        if (reports.length === 0) {
            mainContentContainer.innerHTML = '<div class="card"><p>No reports are currently assigned to you.</p></div>';
            return;
        }
        
        mainContentContainer.innerHTML = `<div class="reports-list-grid"></div>`;
        const reportsGrid = mainContentContainer.querySelector('.reports-list-grid');

        reportsGrid.innerHTML = reports.map(report => {
            const currentStatus = report.status;
            return `
            <div class="report-card">
                <div class="report-card-header">
                    <h3>Report #${report.id}</h3>
                    <span class="status-badge status-${currentStatus.toLowerCase().replace(' ', '-')}">${currentStatus}</span>
                </div>
                <div class="report-card-body">
                    <p class="report-description">${report.description}</p>
                    <div class="report-meta">
                        <div class="meta-item"><strong>Category:</strong> ${report.category}</div>
                        <div class="meta-item"><strong>Priority:</strong> ${report.priority || 'Medium'}</div>
                        <div class="meta-item"><strong>Address:</strong> ${report.address || 'Not specified'}</div>
                        <div class="meta-item"><strong>Citizen:</strong> ${report.citizen.full_name}</div>
                    </div>
                </div>
                <div class="report-card-actions">
                    <details class="actions-accordion">
                        <summary>Update & Add Remark</summary>
                        <div class="actions-content">
                            <div class="status-update-group">
                                <label>Update Status</label>
                                <div class="input-with-button">
                                    <select class="status-select" data-report-id="${report.id}">
                                        <option value="Assigned" ${currentStatus === 'Assigned' ? 'selected' : ''}>Assigned</option>
                                        <option value="In Progress" ${currentStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="Resolved" ${currentStatus === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                    </select>
                                    <button class="btn btn-sm btn-update-status" data-report-id="${report.id}">Update</button>
                                </div>
                            </div>
                            <div class="remark-form">
                                <label>Add Remark / Proof of Work</label>
                                <textarea class="remark-text" placeholder="Enter work update..."></textarea>
                                <input type="file" class="remark-image" accept="image/*">
                                <button class="btn btn-sm btn-add-remark" data-report-id="${report.id}">Submit Remark</button>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        mainContentContainer.innerHTML = `<p class="error-message">Error loading reports: ${error.message}</p>`;
    }
}

async function renderMapView() {
    mainContentContainer.innerHTML = `<div id="technician-map-container"></div>`;
    try {
        if (technicianState.reports === null) {
            technicianState.reports = await api.getAssignedReports();
        }
        const reports = technicianState.reports;
        const mapElement = document.getElementById('technician-map-container');

        if (reports.length === 0) {
            mapElement.innerHTML = '<p>No report locations to display.</p>';
            return;
        }

        const map = L.map(mapElement).setView([23.0225, 72.5714], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        reports.forEach(report => {
            if (report.latitude && report.longitude) {
                const marker = L.marker([report.latitude, report.longitude]).addTo(map);
                marker.bindPopup(`<b>Report #${report.id}</b><br><b>Category:</b> ${report.category}<br><b>Status:</b> ${report.status}<br><b>Address:</b> ${report.address || 'N/A'}`);
            }
        });
    } catch (error) {
        mainContentContainer.innerHTML = `<p class="error-message">Error loading map data: ${error.message}</p>`;
    }
}

async function handleCardAction(e) {
    const reportId = e.target.dataset.reportId;
    if (!reportId) return;

    if (e.target.classList.contains('btn-update-status')) {
        const statusSelect = viewContainer.querySelector(`.status-select[data-report-id="${reportId}"]`);
        const newStatus = statusSelect.value;
        try {
            await api.updateTechnicianReportStatus(reportId, newStatus);
            alert('Status updated successfully!');
            
            // --- BUG FIX IS HERE ---
            // Invalidate the cache by setting reports to null.
            // This forces renderListView to fetch fresh data from the server.
            technicianState.reports = null; 
            
            renderListView(); // Refresh the list with new data
        } catch (error) {
            alert(`Error updating status: ${error.message}`);
        }
    }

    if (e.target.classList.contains('btn-add-remark')) {
        const card = e.target.closest('.report-card');
        const remarkText = card.querySelector('.remark-text').value;
        const imageFile = card.querySelector('.remark-image').files[0];
        if (!remarkText) {
            alert('Please enter a remark before submitting.');
            return;
        }
        const formData = new FormData();
        formData.append('remark', remarkText);
        if (imageFile) {
            formData.append('image', imageFile);
        }
        try {
            await api.addReportRemark(reportId, formData);
            alert('Remark added successfully!');
            
            // Invalidate cache here as well for consistency
            technicianState.reports = null; 
            
            renderListView();
        } catch (error) {
            alert(`Error adding remark: ${error.message}`);
        }
    }
}