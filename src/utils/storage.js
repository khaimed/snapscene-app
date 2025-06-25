// Storage utility for localStorage management

class Storage {
    // Save data to localStorage
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`💾 Saved ${key}:`, data);
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${key}:`, error);
            return false;
        }
    }

    // Load data from localStorage
    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) return defaultValue;
            
            const parsed = JSON.parse(data);
            console.log(`📥 Loaded ${key}:`, parsed);
            return parsed;
        } catch (error) {
            console.error(`❌ Error loading ${key}:`, error);
            return defaultValue;
        }
    }

    // Remove data from localStorage
    static remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Error removing ${key}:`, error);
            return false;
        }
    }

    // Clear all app data
    static clearAll() {
        try {
            const keys = ['settings', 'history', 'theme'];
            keys.forEach(key => this.remove(key));
            console.log('🗑️ Cleared all app data');
            return true;
        } catch (error) {
            console.error('❌ Error clearing data:', error);
            return false;
        }
    }

    // Check if key exists
    static exists(key) {
        return localStorage.getItem(key) !== null;
    }
}

// App-specific storage methods
class AppStorage {
    // Settings management
    static saveSettings(settings) {
        return Storage.save('settings', settings);
    }

    static loadSettings() {
        return Storage.load('settings', {
            apiKey: '',
            theme: 'light',
            testType: 'general',
            detailLevel: 'detailed',
            language: 'fr'
        });
    }

    // History management
    static saveHistory(history) {
        // Always save complete history, never truncate
        return Storage.save('history', history);
    }

    static loadHistory() {
        return Storage.load('history', []);
    }

    static addToHistory(item) {
        const history = this.loadHistory();
        history.push({
            ...item,
            id: Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Keep maximum 100 entries in storage to prevent infinite growth
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        return this.saveHistory(history);
    }

    static removeFromHistory(id) {
        const history = this.loadHistory();
        const filtered = history.filter(item => item.id !== id);
        return this.saveHistory(filtered);
    }

    // Theme management
    static saveTheme(theme) {
        return Storage.save('theme', theme);
    }

    static loadTheme() {
        return Storage.load('theme', 'light');
    }

    // Export all data
    static exportData() {
        return {
            settings: this.loadSettings(),
            history: this.loadHistory(),
            theme: this.loadTheme(),
            exportDate: new Date().toISOString()
        };
    }

    // Import data
    static importData(data) {
        try {
            if (data.settings) this.saveSettings(data.settings);
            if (data.history) this.saveHistory(data.history);
            if (data.theme) this.saveTheme(data.theme);
            console.log('✅ Data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Import error:', error);
            return false;
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Storage = Storage;
    window.AppStorage = AppStorage;
}

// For Node.js environments
if (typeof module !== 'undefined') {
    module.exports = { Storage, AppStorage };
}