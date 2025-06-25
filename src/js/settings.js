// Settings page functionality
class SettingsManager {
    constructor() {
        this.settings = null;
        this.initialize();
    }
    // Initialize settings page
    initialize() {
        this.loadSettings();
        this.setupUI();
        this.setupEventListeners();
        this.loadAppInfo();
    }
    // Load settings from storage
    loadSettings() {
        try {
            this.settings = AppStorage.loadSettings();
        } catch (error) {
            this.settings = {
                apiKey: '',
                theme: 'light',
                testType: 'general',
                detailLevel: 'detailed',
                language: 'fr'
            };
        }
    }
    // Save settings to storage
    saveSettings() {
        try {
            AppStorage.saveSettings(this.settings);
        } catch (error) {
            // Silent fallback
        }
    }
    // Setup UI elements
    setupUI() {
        this.updateUI();
    }
    // Update UI with current settings
    updateUI() {
        // API Key
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.value = this.settings.apiKey || '';
        }
        // Test Type
        const testTypeSelect = document.getElementById('defaultTestType');
        if (testTypeSelect) {
            testTypeSelect.value = this.settings.testType || 'general';
        }
        // Detail Level
        const detailLevelSelect = document.getElementById('detailLevel');
        if (detailLevelSelect) {
            detailLevelSelect.value = this.settings.detailLevel || 'detailed';
        }
        // Language
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = this.settings.language || 'fr';
        }
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            if (this.settings.theme === 'dark') {
                themeToggle.classList.add('active');
            } else {
                themeToggle.classList.remove('active');
            }
        }
    }
    // Setup event listeners
    setupEventListeners() {
        // Save button
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.handleSave());
        }
        // Reset button
        const resetButton = document.getElementById('resetSettings');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.handleReset());
        }
        // API Key input
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.settings.apiKey = e.target.value.trim();
            });
        }
        // Test Type select
        const testTypeSelect = document.getElementById('defaultTestType');
        if (testTypeSelect) {
            testTypeSelect.addEventListener('change', (e) => {
                this.settings.testType = e.target.value;
            });
        }
        // Detail Level select
        const detailLevelSelect = document.getElementById('detailLevel');
        if (detailLevelSelect) {
            detailLevelSelect.addEventListener('change', (e) => {
                this.settings.detailLevel = e.target.value;
            });
        }
        // Language select
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.settings.language = e.target.value;
            });
        }
        // Theme is now handled automatically by unified themeManager.js
        // Test API key button
        const testApiButton = document.getElementById('testApiKey');
        if (testApiButton) {
            testApiButton.addEventListener('click', () => this.testApiKey());
        }
        // Export settings
        const exportButton = document.getElementById('exportSettings');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSettings());
        }
        // Import settings
        const importButton = document.getElementById('importSettings');
        const importInput = document.getElementById('importInput');
        if (importButton && importInput) {
            importButton.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', (e) => this.importSettings(e));
        }
    }
    // Handle save
    handleSave() {
        try {
            // Validate API key
            if (!this.settings.apiKey || this.settings.apiKey.length < 10) {
                showWarning('⚠️ Please enter a valid Google Gemini API key');
                return;
            }
            // Save settings
            this.saveSettings();
            // Save to unified config via IPC
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('save-settings', this.settings);
            } catch (ipcError) {
                // Silent fallback if IPC not available
            }
            showSuccess('Settings saved successfully!');
            this.updateUI();
        } catch (error) {
            showError('Failed to save settings');
        }
    }
    // Handle reset
    handleReset() {
        if (confirm('🔄 Are you sure you want to reset all settings to default?')) {
            // Reset to defaults
            this.settings = {
                apiKey: '',
                theme: 'light',
                testType: 'general',
                detailLevel: 'detailed',
                language: 'fr'
            };
            // Apply theme
            try {
                if (typeof themeManager !== 'undefined') {
                    themeManager.setTheme('light');
                }
            } catch (error) {
                // Silent fallback
            }
            this.saveSettings();
            this.updateUI();
            showInfo('🔄 Settings reset to default');
        }
    }
    // Test API key
    async testApiKey() {
        const apiKey = this.settings.apiKey;
        if (!apiKey) {
            showWarning('⚠️ Please enter an API key first');
            return;
        }
        const loadingNotification = showLoading('🔍 Testing API key...');
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('test-api-key', apiKey);
            ipcRenderer.once('api-test-result', (event, result) => {
                if (typeof notify !== 'undefined') {
                    notify.remove(loadingNotification);
                }
                if (result.success) {
                    showSuccess('API key is working correctly!');
                } else {
                    if (result.error.includes('API key')) {
                        showError('Invalid API key. Please check your key.');
                    } else if (result.error.includes('quota')) {
                        showWarning('API quota exceeded. Key might be valid but quota is exhausted.');
                    } else {
                        showError('API test failed: ' + result.error);
                    }
                }
            });
        } catch (error) {
            if (typeof notify !== 'undefined') {
                notify.remove(loadingNotification);
            }
            showError('Failed to test API key: ' + error.message);
        }
    }

    // Load dynamic app information
    loadAppInfo() {
        try {
            const { ipcRenderer } = require('electron');
            
            // Request app info from main process
            ipcRenderer.send('get-app-info');
            
            // Listen for app info response
            ipcRenderer.once('send-app-info', (event, appInfo) => {
                this.updateAppInfo(appInfo);
            });
        } catch (error) {
            console.error('Failed to load app info:', error);
            // Fallback to default values already in HTML
        }
    }

    // Update app info in the UI
    updateAppInfo(appInfo) {
        try {
            const appName = document.getElementById('appName');
            const appVersion = document.getElementById('appVersion');
            const appAuthor = document.getElementById('appAuthor');
            const appDescription = document.getElementById('appDescription');

            if (appName && appInfo.name) {
                appName.textContent = appInfo.name;
            }
            
            if (appVersion && appInfo.version) {
                appVersion.textContent = `v${appInfo.version}`;
            }
            
            if (appAuthor && appInfo.author) {
                appAuthor.textContent = appInfo.author;
            }
            
            if (appDescription && appInfo.description) {
                appDescription.textContent = appInfo.description;
            }
        } catch (error) {
            console.error('Failed to update app info:', error);
        }
    }

    // Export settings
    exportSettings() {
        try {
            const data = AppStorage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `snapscene-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showSuccess('Settings exported successfully!');
        } catch (error) {
            showError('Failed to export settings');
        }
    }
    // Import settings
    importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (AppStorage.importData(data)) {
                    this.loadSettings();
                    if (data.theme && typeof themeManager !== 'undefined') {
                        themeManager.setTheme(data.theme);
                    }
                    this.updateUI();
                    showSuccess('Settings imported successfully!');
                } else {
                    showError('Failed to import settings');
                }
            } catch (error) {
                showError('Invalid settings file');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    // Get current settings
    getSettings() {
        return { ...this.settings };
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // All scripts are loaded via HTML, initialize settings directly
    window.settingsManager = new SettingsManager();
});
// Make available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}
