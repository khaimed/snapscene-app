// Settings page functionality

class SettingsManager {
    constructor() {
        this.settings = null;
        this.initialize();
    }

    // Initialize settings page
    initialize() {
        console.log('⚙️ Initializing settings...');
        
        // Load settings
        this.loadSettings();
        
        // Setup UI
        this.setupUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Settings initialized');
    }

    // Load settings from storage
    loadSettings() {
        this.settings = AppStorage.loadSettings();
        console.log('📥 Loaded settings:', this.settings);
    }

    // Save settings to storage
    saveSettings() {
        AppStorage.saveSettings(this.settings);
        console.log('💾 Saved settings:', this.settings);
    }

    // Setup UI elements
    setupUI() {
        // Load values into form
        this.updateUI();
        
        // Setup theme toggle
        themeManager.setupToggleButton('#themeToggle');
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

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = themeManager.toggle();
                this.settings.theme = newTheme;
            });
        }

        // Listen for theme changes
        document.addEventListener('themeChanged', (e) => {
            this.settings.theme = e.detail.theme;
        });

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
            
            // Show success
            showSuccess('✅ Settings saved successfully!');
            
            // Update UI
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Save error:', error);
            showError('❌ Failed to save settings');
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
            themeManager.setTheme('light');

            // Save and update UI
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
            // Use IPC to test API key in main process
            const { ipcRenderer } = require('electron');
            
            // Send test request to main process
            ipcRenderer.send('test-api-key', apiKey);
            
            // Listen for response
            ipcRenderer.once('api-test-result', (event, result) => {
                // Remove loading notification
                notify.remove(loadingNotification);
                
                if (result.success) {
                    showSuccess('✅ API key is working correctly!');
                } else {
                    if (result.error.includes('API key')) {
                        showError('❌ Invalid API key. Please check your key.');
                    } else if (result.error.includes('quota')) {
                        showWarning('⚠️ API quota exceeded. Key might be valid but quota is exhausted.');
                    } else {
                        showError('❌ API test failed: ' + result.error);
                    }
                }
            });

        } catch (error) {
            // Remove loading notification
            notify.remove(loadingNotification);
            console.error('❌ API test error:', error);
            showError('❌ Failed to test API key: ' + error.message);
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
            a.download = `uit-app-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showSuccess('✅ Settings exported successfully!');
            
        } catch (error) {
            console.error('❌ Export error:', error);
            showError('❌ Failed to export settings');
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
                    // Reload settings
                    this.loadSettings();
                    
                    // Apply theme
                    if (data.theme) {
                        themeManager.setTheme(data.theme);
                    }
                    
                    // Update UI
                    this.updateUI();
                    
                    showSuccess('✅ Settings imported successfully!');
                } else {
                    showError('❌ Failed to import settings');
                }
                
            } catch (error) {
                console.error('❌ Import error:', error);
                showError('❌ Invalid settings file');
            }
        };
        
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    }

    // Get current settings
    getSettings() {
        return { ...this.settings };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load utilities first
    const scriptsToLoad = [
        '../utils/storage.js',
        '../utils/notifications.js',
        'themeManager.js'
    ];

    let loadedScripts = 0;

    scriptsToLoad.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedScripts++;
            if (loadedScripts === scriptsToLoad.length) {
                // All scripts loaded, initialize settings
                window.settingsManager = new SettingsManager();
            }
        };
        script.onerror = () => {
            console.error(`❌ Failed to load script: ${src}`);
        };
        document.head.appendChild(script);
    });
});

// Make available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}