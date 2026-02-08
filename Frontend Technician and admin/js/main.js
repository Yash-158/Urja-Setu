// Import the router module, which will handle all view loading and navigation.
import router from './router.js';

/**
 * This event listener waits for the initial HTML document to be completely loaded and parsed.
 * It's the official start of our application's execution.
 */
document.addEventListener('DOMContentLoaded', () => {
    // We call the init function on our router to kick things off.
    router.init();
});