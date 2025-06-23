// Theme management system

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.initialize();
    }

    // Initialize theme system
    initialize() {
        // Load saved theme
        this.currentTheme = AppStorage.loadTheme();
        
        // Apply theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.watchSystemTheme();
        
        console.log(`🎨 Theme initialized: ${this.currentTheme}`);
    }

    // Apply theme to document
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

        // Save theme
        AppStorage.saveTheme(theme);
        
        // Trigger theme change event
        this.dispatchThemeChange(theme);
        
        console.log(`🎨 Theme applied: ${theme}`);
    }

    // Toggle between light and dark
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }

    // Set specific theme
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.warn(`⚠️ Invalid theme: ${theme}`);
        }
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Check if dark theme is active
    isDark() {
        return this.currentTheme === 'dark';
    }

    // Check if light theme is active
    isLight() {
        return this.currentTheme === 'light';
    }

    // Watch for system theme changes
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Auto-switch theme based on system preference (optional)
                // Uncomment if you want automatic theme switching
                // const systemTheme = e.matches ? 'dark' : 'light';
                // this.applyTheme(systemTheme);
            });
        }
    }

    // Dispatch theme change event
    dispatchThemeChange(theme) {
        const event = new CustomEvent('themeChanged', {
            detail: { theme, isDark: theme === 'dark' }
        });
        document.dispatchEvent(event);
    }

    // Get system preferred theme
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // Use system theme
    useSystemTheme() {
        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
        return systemTheme;
    }

    // Setup theme toggle button
    setupToggleButton(buttonSelector) {
        const button = document.querySelector(buttonSelector);
        if (!button) {
            console.warn(`⚠️ Theme toggle button not found: ${buttonSelector}`);
            return;
        }

        // Set initial state
        this.updateToggleButton(button);

        // Add click handler
        button.addEventListener('click', () => {
            this.toggle();
            this.updateToggleButton(button);
        });

        // Listen for theme changes
        document.addEventListener('themeChanged', () => {
            this.updateToggleButton(button);
        });
    }

    // Update toggle button appearance
    updateToggleButton(button) {
        if (this.isDark()) {
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            button.title = 'Switch to light mode';
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
            button.title = 'Switch to dark mode';
        }
    }

    // Setup automatic theme persistence
    setupPersistence() {
        // Save theme when page is about to unload
        window.addEventListener('beforeunload', () => {
            AppStorage.saveTheme(this.currentTheme);
        });
    }

    // Reset theme to default
    reset() {
        this.applyTheme('light');
    }

    // Get theme colors for current theme
    getThemeColors() {
        const colors = {
            light: {
                primary: '#81e6d9',
                secondary: '#81B2E6',
                background: '#ffffff',
                surface: '#f8f9fa',
                text: '#2d3748',
                textSecondary: '#4a5568'
            },
            dark: {
                primary: '#81e6d9',
                secondary: '#81B2E6',
                background: '#1a202c',
                surface: '#2d3748',
                text: '#f7fafc',
                textSecondary: '#e2e8f0'
            }
        };
        return colors[this.currentTheme];
    }
}

// Create global instance
const themeManager = new ThemeManager();

// Helper functions
function toggleTheme() {
    return themeManager.toggle();
}

function setTheme(theme) {
    themeManager.setTheme(theme);
}

function getCurrentTheme() {
    return themeManager.getCurrentTheme();
}

function isDarkTheme() {
    return themeManager.isDark();
}

function isLightTheme() {
    return themeManager.isLight();
}

// Make available globally
if (typeof window !== 'undefined') {
    window.themeManager = themeManager;
    window.toggleTheme = toggleTheme;
    window.setTheme = setTheme;
    window.getCurrentTheme = getCurrentTheme;
    window.isDarkTheme = isDarkTheme;
    window.isLightTheme = isLightTheme;
}

// For Node.js environments
if (typeof module !== 'undefined') {
    module.exports = { 
        ThemeManager, 
        themeManager, 
        toggleTheme, 
        setTheme, 
        getCurrentTheme, 
        isDarkTheme, 
        isLightTheme 
    };
}