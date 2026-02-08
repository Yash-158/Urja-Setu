// A simple cache to prevent re-initializing maps on the same element
const mapInstances = new Map();

/**
 * Renders the main, interactive map on the dashboard.
 * @param {Array} reports - An array of report objects to plot as markers.
 * @param {Function} onMarkerClick - A callback function to run when a marker is clicked.
 */
export function renderMap(reports, onMarkerClick) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Default view coordinates (e.g., center of your operational area)
    const viewLat = 23.0225;
    const viewLng = 72.5714;
    const map = L.map(mapElement).setView([viewLat, viewLng], 12);

    // Use OpenStreetMap tiles - free and no API key required
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add markers for each report
    reports.forEach(report => {
        if (report.latitude && report.longitude) {
            const marker = L.marker([report.latitude, report.longitude]).addTo(map);
            marker.bindPopup(`<b>Report #${report.id}</b><br>${report.category}`);
            marker.on('click', () => onMarkerClick(report.id));
        }
    });
}

/**
 * Renders a small, non-interactive "mini-map" for the report detail view.
 * @param {number} lat - The latitude for the map's center.
 * @param {number} lng - The longitude for the map's center.
 */
export function renderMiniMap(lat, lng) {
    const mapElement = document.getElementById('mini-map');
    if (!mapElement || !lat || !lng) {
        if (mapElement) mapElement.innerHTML = '<p>Location not provided.</p>';
        return;
    }

    // If a map already exists on this element, remove it before creating a new one
    if (mapInstances.has(mapElement)) {
        mapInstances.get(mapElement).remove();
    }

    const map = L.map(mapElement, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
    }).setView([lat, lng], 16);

    // Use OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add a single marker for the report's location
    L.marker([lat, lng]).addTo(map);

    // Cache the map instance
    mapInstances.set(mapElement, map);
}