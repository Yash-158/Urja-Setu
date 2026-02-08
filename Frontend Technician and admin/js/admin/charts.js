// These variables hold the instances of our charts to prevent rendering issues.
let categoryChartInstance;
let timeChartInstance;

/**
 * Renders the "Reports by Category" pie chart with a blue theme.
 * @param {object} data - An object where keys are categories and values are counts.
 */
function renderCategoryChart(data = {}) {
    const ctx = document.getElementById('category-chart')?.getContext('2d');
    if (!ctx) return;

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    // Blue and white theme color palette
    const themeColors = [
        '#0d6efd', // Primary Blue
        '#6c757d', // Grey
        '#79a6fb', // Lighter Blue
        '#adb5bd', // Lighter Grey
        '#4f8bf9', // Medium Blue
    ];

    categoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Reports',
                data: Object.values(data),
                backgroundColor: themeColors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

/**
 * Renders the "Reports Over Time" bar chart with a blue theme.
 * @param {object} data - An object where keys are dates and values are report counts.
 */
function renderTimeChart(data = {}) {
    const ctx = document.getElementById('time-chart')?.getContext('2d');
    if (!ctx) return;

    if (timeChartInstance) {
        timeChartInstance.destroy();
    }
    
    timeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Reports per Day',
                data: Object.values(data),
                backgroundColor: '#79a6fb', // Lighter theme blue
                borderColor: '#0d6efd',   // Primary theme blue
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

export { renderCategoryChart, renderTimeChart };