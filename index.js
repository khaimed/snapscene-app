const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const SecureKeyManager = require('./src/utils/secureKeyManager');

// Remove menu bar completely
Menu.setApplicationMenu(null);

let mainWindow;
let settingsWindow;
const configPath = path.join(__dirname, 'app-config.json');
const secureKeyManager = new SecureKeyManager();

// Unified config management
function loadAppConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error handling for production
    }
    
    // Return default config
    return {
        api: { key: '', model: 'gemini-2.5-flash' },
        app: { theme: 'light', windowBounds: { x: 0, y: 0, width: 1200, height: 800 } },
        analysis: { defaultTestType: 'general', responseLanguage: 'fr', detailLevel: 'detailed' },
        version: '0.1.0'
    };
}

function saveAppConfig(config) {
    try {
        config.lastModified = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Get API key from unified config (decrypted)
function getApiKey() {
    const config = loadAppConfig();
    const encryptedKey = config.api.key || '';
    
    try {
        return secureKeyManager.secureRetrieve(encryptedKey);
    } catch (error) {
        return ''; // Return empty if decryption fails
    }
}

// Get platform-specific app icon
function getAppIcon() {
    const iconBasePath = path.join(__dirname, 'build', 'icon');
    let iconPath;
    
    if (process.platform === 'win32') {
        iconPath = iconBasePath + '.ico';
    } else if (process.platform === 'darwin') {
        iconPath = iconBasePath + '.icns';
    } else {
        // Linux and other platforms
        iconPath = iconBasePath + '.png';
    }
    
    console.log('🎨 Loading app icon:', iconPath);
    console.log('📁 Icon exists:', fs.existsSync(iconPath));
    
    return iconPath;
}

// Create main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        icon: getAppIcon(), // Add icon for all platforms
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        show: false
    });

    mainWindow.loadFile('src/views/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create settings window
function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 500,
        height: 600,
        parent: mainWindow,
        modal: true,
        resizable: false,
        icon: getAppIcon(), // Add icon to settings window too
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false
    });

    settingsWindow.loadFile('src/views/settings.html');

    settingsWindow.once('ready-to-show', () => {
        settingsWindow.show();
    });

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// App ready
app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Open settings
ipcMain.on('open-settings', () => {
    createSettingsWindow();
});

// Analyze image with Gemini
ipcMain.on('analyze-image', async (event, data) => {
    try {
        // Get API key from unified config
        const apiKey = getApiKey();
        
        if (!apiKey) {
            event.reply('analysis-result', { 
                success: false, 
                error: 'API key not found. Please set it in Settings.' 
            });
            return;
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Extract base64 data
        const base64Data = data.imageData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

        // Create prompt
        const prompt = `Analyze this image and identify software testing scenarios.
        
Test Type: ${data.testType}
Detail Level: ${data.detailLevel}

Please provide:
- Clear test scenarios with priorities (🔴 High, 🟡 Medium, 🟢 Low)
- Step-by-step instructions for each test
- Use markdown formatting
- Be specific and actionable

Response in French.`;

        // Send to Gemini
        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: base64Data } }
        ]);

        const responseText = await result.response.text();
        
        event.reply('analysis-result', { 
            success: true, 
            data: responseText 
        });

    } catch (error) {
        let errorMessage = 'Analysis failed: ';
        if (error.message.includes('API key')) {
            errorMessage += 'Invalid API key. Check your settings.';
        } else if (error.message.includes('quota')) {
            errorMessage += 'API quota exceeded. Try again later.';
        } else {
            errorMessage += error.message;
        }
        
        event.reply('analysis-result', { 
            success: false, 
            error: errorMessage 
        });
    }
});

// Save analysis to file
ipcMain.on('save-analysis', async (event, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: "Save Analysis",
            defaultPath: `analysis_${new Date().toISOString().split('T')[0]}.md`,
            filters: [
                { name: "Markdown files", extensions: ["md"] },
                { name: "Text files", extensions: ["txt"] },
                { name: "All files", extensions: ["*"] }
            ]
        });

        if (!filePath) return;

        const content = `# Image Analysis - UI Testing
## Date: ${new Date().toLocaleString()}
## Test Type: ${data.testType}

### Analysis Results:
${data.results}

---
Generated by SnapScene APP v0.1.0
`;

        fs.writeFileSync(filePath, content, 'utf-8');
        
        event.reply('save-complete', { 
            success: true, 
            path: filePath 
        });

    } catch (error) {
        event.reply('save-complete', { 
            success: false, 
            error: error.message 
        });
    }
});

// Test API key
ipcMain.on('test-api-key', async (event, apiKey) => {
    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Test with a simple prompt
        const result = await model.generateContent("Hello, just testing the API key. Please respond with 'API key works!'");
        const response = await result.response.text();
        
        // Send success result
        event.reply('api-test-result', { 
            success: true, 
            response: response 
        });

    } catch (error) {
        // Send error result
        event.reply('api-test-result', { 
            success: false, 
            error: error.message 
        });
    }
});

// Save API key and settings (with encryption)
ipcMain.on('save-api-key', (event, apiKey) => {
    try {
        // Validate API key first
        if (!secureKeyManager.isValidApiKey(apiKey)) {
            event.reply('api-key-saved', { 
                success: false, 
                error: 'Invalid API key format' 
            });
            return;
        }
        
        // Encrypt API key before storing
        const encryptedKey = secureKeyManager.secureStore(apiKey);
        
        const config = loadAppConfig();
        config.api.key = encryptedKey;
        
        if (saveAppConfig(config)) {
            event.reply('api-key-saved', { success: true });
        } else {
            event.reply('api-key-saved', { 
                success: false, 
                error: 'Failed to save encrypted API key' 
            });
        }
    } catch (error) {
        event.reply('api-key-saved', { 
            success: false, 
            error: error.message 
        });
    }
});

// Get API key
ipcMain.on('get-api-key', (event) => {
    const apiKey = getApiKey();
    event.reply('send-api-key', apiKey);
});

// Save all settings
ipcMain.on('save-settings', (event, settings) => {
    const config = loadAppConfig();
    
    // Update config with new settings
    if (settings.apiKey) {
        // Encrypt API key before storing
        if (secureKeyManager.isValidApiKey(settings.apiKey)) {
            config.api.key = secureKeyManager.secureStore(settings.apiKey);
        } else {
            config.api.key = settings.apiKey;
        }
    }
    if (settings.theme) config.app.theme = settings.theme;
    if (settings.testType) config.analysis.defaultTestType = settings.testType;
    if (settings.detailLevel) config.analysis.detailLevel = settings.detailLevel;
    if (settings.language) config.analysis.responseLanguage = settings.language;
    
    if (saveAppConfig(config)) {
        event.reply('settings-saved', { success: true });
    } else {
        event.reply('settings-saved', { 
            success: false, 
            error: 'Failed to save settings' 
        });
    }
});

// Get all settings
ipcMain.on('get-settings', (event) => {
    const config = loadAppConfig();
    const settings = {
        apiKey: config.api.key || '',
        theme: config.app.theme || 'light',
        testType: config.analysis.defaultTestType || 'general',
        detailLevel: config.analysis.detailLevel || 'detailed',
        language: config.analysis.responseLanguage || 'fr'
    };
    event.reply('send-settings', settings);
});

// Broadcast theme change to all windows
ipcMain.on('broadcast-theme-change', (event, newTheme) => {
    // Send theme change to main window
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('theme-changed', newTheme);
    }
    
    // Send theme change to settings window (if open)
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('theme-changed', newTheme);
    }
});

// Get app information (including dynamic version)
ipcMain.on('get-app-info', (event) => {
    try {
        // Read version from package.json
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const appInfo = {
            name: packageData.name || 'SnapScene APP',
            version: packageData.version || '0.1.0',
            description: packageData.description || 'Intelligent image analysis for software testing',
            author: packageData.author || 'KhAiMed',
            homepage: packageData.homepage || '',
            lastUpdated: new Date().toISOString()
        };
        
        event.reply('send-app-info', appInfo);
    } catch (error) {
        // Fallback app info if package.json reading fails
        const fallbackInfo = {
            name: 'SnapScene APP',
            version: '0.1.0',
            description: 'Intelligent image analysis for software testing',
            author: 'KhAiMed',
            homepage: '',
            lastUpdated: new Date().toISOString()
        };
        
        event.reply('send-app-info', fallbackInfo);
    }
});
