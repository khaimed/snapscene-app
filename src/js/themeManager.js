// Unified Theme Manager - Works for all windows
// Handles theme loading, switching, and persistence across the entire app
class UnifiedThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.isMainWindow = !document.getElementById('themeToggle'); // Settings has toggle, main doesn't
        this.initialize();
    }
    // Initialize theme system for any window
    initialize() {
        ;
        // Load theme from unified config
        this.loadThemeFromConfig();
        // Setup window-specific features
        if (this.isMainWindow) {
            this.setupMainWindow();
        } else {
            this.setupSettingsWindow();
        }
        // Listen for theme changes from other windows
        this.setupThemeListener();
    }
    // Load theme from unified config via IPC
    loadThemeFromConfig() {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('get-settings');
            ipcRenderer.once('send-settings', (event, settings) => {
                const theme = settings.theme || 'light';
                ;
                this.applyTheme(theme);
                // Update toggle button state if in settings
                if (!this.isMainWindow) {
                    this.updateToggleButton();
                }
            });
        } catch (error) {
            console.error('IPC not available, using default theme');
            this.applyTheme('light');
        }
    }
    // Setup main window theme features
    setupMainWindow() {
        ;
    }
    // Setup settings window theme features (toggle button)
    setupSettingsWindow() {
        ;
        // Wait for DOM elements to load
        setTimeout(() => {
            this.setupThemeToggle();
        }, 1000);
    }
    // Setup theme toggle button (settings window only)
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) {
            console.error('❌ Theme toggle button not found');
            return;
        }
        ;
        // Remove any existing listeners by cloning
        const newToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newToggle, themeToggle);
        // Add click handler
        newToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        // Set initial visual state
        this.updateToggleButton();
    }
    // Toggle between light and dark themes
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        ;
        // Apply theme locally
        this.applyTheme(newTheme);
        // Save to config and broadcast to all windows
        this.saveAndBroadcastTheme(newTheme);
        // Update toggle button
        if (!this.isMainWindow) {
            this.updateToggleButton();
        }
    }
    // Apply theme to current window
    applyTheme(theme) {
        this.currentTheme = theme;
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        }
        // console.log(`Applied ${theme} theme to ${this.isMainWindow ? 'main' : 'settings'} window`);
    }
    // Update toggle button visual state (settings window only)
    updateToggleButton() {
        if (this.isMainWindow) return;
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            if (this.currentTheme === 'dark') {
                themeToggle.classList.add('active');
            } else {
                themeToggle.classList.remove('active');
            }
        }
    }
    // Save theme and broadcast to all windows
    saveAndBroadcastTheme(theme) {
        try {
            const { ipcRenderer } = require('electron');
            // Save to unified config
            ipcRenderer.send('save-settings', { theme });
            // Broadcast to all windows
            ipcRenderer.send('broadcast-theme-change', theme);
            ;
        } catch (error) {
            console.error('Fallback: saving to localStorage');
            localStorage.setItem('theme', theme);
        }
    }
    // Listen for theme changes from other windows
    setupThemeListener() {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('theme-changed', (event, newTheme) => {
                ;
                this.applyTheme(newTheme);
                if (!this.isMainWindow) {
                    this.updateToggleButton();
                }
            });
        } catch (error) {
            console.error('IPC theme listener not available');
        }
    }
    // Public API methods
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        }
    }
    getCurrentTheme() {
        return this.currentTheme;
    }
    isDark() {
        return this.currentTheme === 'dark';
    }
    isLight() {
        return this.currentTheme === 'light';
    }
}
// Initialize theme manager when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    ;
    window.themeManager = new UnifiedThemeManager();
});
// Global convenience functions for backward compatibility
function toggleTheme() {
    return window.themeManager?.toggleTheme();
}
function setTheme(theme) {
    window.themeManager?.setTheme(theme);
}
function getCurrentTheme() {
    return window.themeManager?.getCurrentTheme();
}
function isDarkTheme() {
    return window.themeManager?.isDark();
}
function isLightTheme() {
    return window.themeManager?.isLight();
}
// Export for Node.js if needed
if (typeof module !== 'undefined') {
    module.exports = { 
        UnifiedThemeManager,
        toggleTheme,
        setTheme,
        getCurrentTheme,
        isDarkTheme,
        isLightTheme
    };
}
