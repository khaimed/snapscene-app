// Main application functionality (renderer.js)

const { ipcRenderer } = require('electron');
const marked = require('marked');

class MainApp {
    constructor() {
        this.currentImage = null;
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.settings = null;
        
        this.initialize();
    }

    // Initialize application
    async initialize() {
        console.log('🚀 Initializing main app...');
        
        // Wait for utilities to load
        await this.loadUtilities();
        
        // Load settings
        this.loadSettings();
        
        // Setup UI
        this.setupUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load history
        this.loadHistory();
        
        console.log('✅ Main app initialized');
    }

    // Load utility scripts
    async loadUtilities() {
        return new Promise((resolve) => {
            const scripts = [
                '../utils/storage.js',
                '../utils/notifications.js',
                'themeManager.js'  // ← Your file name
            ];

            let loadedCount = 0;

            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === scripts.length) {
                        resolve();
                    }
                };
                script.onerror = (e) => {
                    console.error(`❌ Failed to load: ${src}`, e);
                    loadedCount++;
                    if (loadedCount === scripts.length) {
                        resolve();
                    }
                };
                document.head.appendChild(script);
            });
        });
    }

    // Load settings
    loadSettings() {
        this.settings = AppStorage.loadSettings();
        console.log('📥 Loaded settings:', this.settings);
    }

    // Setup UI elements
    setupUI() {
        // Set initial values from settings
        const testTypeSelect = document.getElementById('testTypeSelector');
        if (testTypeSelect && this.settings) {
            testTypeSelect.value = this.settings.testType || 'general';
        }

        const detailLevelSelect = document.getElementById('detailLevel');
        if (detailLevelSelect && this.settings) {
            detailLevelSelect.value = this.settings.detailLevel || 'detailed';
        }

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    // Setup drag and drop
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            });
        });

        // Handle drop
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Handle click
        uploadArea.addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });
    }

    // Setup event listeners
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Settings button
        const settingsButton = document.getElementById('openSettings');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                console.log('⚙️ Opening settings...');
                ipcRenderer.send('open-settings');
            });
        }

        // File input
        const imageUpload = document.getElementById('imageUpload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        // Analyze button
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.addEventListener('click', () => {
                console.log('🔍 Analyze button clicked');
                this.analyzeImage();
            });
        }

        // Clear button
        const clearButton = document.getElementById('clearButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                console.log('🗑️ Clear button clicked');
                this.clearImage();
            });
        }

        // Save button
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveAnalysis());
        }

        // Copy button
        const copyButton = document.getElementById('copyButton');
        if (copyButton) {
            copyButton.addEventListener('click', () => this.copyResults());
        }

        // Settings change listeners
        const testTypeSelect = document.getElementById('testTypeSelector');
        if (testTypeSelect) {
            testTypeSelect.addEventListener('change', (e) => {
                this.settings.testType = e.target.value;
                AppStorage.saveSettings(this.settings);
            });
        }

        const detailLevelSelect = document.getElementById('detailLevel');
        if (detailLevelSelect) {
            detailLevelSelect.addEventListener('change', (e) => {
                this.settings.detailLevel = e.target.value;
                AppStorage.saveSettings(this.settings);
            });
        }

        // IPC listeners
        this.setupIpcListeners();

        // Image click to change
        this.setupImageClickToChange();

        console.log('✅ Event listeners set up');
    }

    // Setup IPC listeners
    setupIpcListeners() {
        // Analysis result
        ipcRenderer.on('analysis-result', (event, result) => {
            console.log('📊 Analysis result received:', result);
            this.handleAnalysisResult(result);
        });

        // Save complete
        ipcRenderer.on('save-complete', (event, result) => {
            if (result.success) {
                showSuccess('💾 Analysis saved successfully!');
            } else {
                showError('❌ Failed to save analysis: ' + result.error);
            }
        });
    }

    // Setup image click to change
    setupImageClickToChange() {
        const previewImage = document.getElementById('previewImage');
        if (previewImage) {
            previewImage.addEventListener('click', () => {
                if (this.currentImage) {
                    document.getElementById('imageUpload').click();
                }
            });
            previewImage.style.cursor = 'pointer';
            previewImage.title = 'Click to change image';
        }
    }

    // Handle file selection
    handleFileSelect(file) {
        console.log('📁 File selected:', file.name);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError('⚠️ Please select a valid image file!');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('⚠️ File size must be less than 10MB!');
            return;
        }

        console.log('🖼️ Image selected:', file.name, this.formatFileSize(file.size));

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImage(e.target.result, file);
        };
        reader.readAsDataURL(file);
    }

    // Display image
    displayImage(imageSrc, file) {
        console.log('🖼️ Displaying image...');

        this.currentImage = {
            src: imageSrc,
            name: file.name,
            size: file.size
        };

        // Show preview
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImage = document.getElementById('previewImage');
        const uploadArea = document.getElementById('uploadArea');

        if (previewImage) previewImage.src = imageSrc;
        if (previewContainer) previewContainer.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';

        // Update image info
        this.updateImageInfo(file);

        // Enable analyze button
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.disabled = false;
            console.log('✅ Analyze button enabled');
        }

        // Setup click to change
        this.setupImageClickToChange();

        showSuccess('✅ Image loaded successfully!');
    }

    // Update image info
    updateImageInfo(file) {
        const imageSize = document.getElementById('imageSize');
        const imageDimensions = document.getElementById('imageDimensions');

        if (imageSize) imageSize.textContent = this.formatFileSize(file.size);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
            if (imageDimensions) {
                imageDimensions.textContent = `${img.width} × ${img.height}px`;
            }
        };
        img.src = this.currentImage.src;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Analyze image
    analyzeImage() {
        console.log('🔍 Starting image analysis...');

        if (!this.currentImage || this.isAnalyzing) {
            console.log('❌ No image or already analyzing');
            return;
        }

        // Check API key
        if (!this.settings || !this.settings.apiKey) {
            showError('❌ API key not set. Please configure it in Settings.');
            return;
        }

        this.isAnalyzing = true;
        this.updateAnalysisUI(true);

        // Get configuration
        const testType = document.getElementById('testTypeSelector').value || 'general';
        const detailLevel = document.getElementById('detailLevel').value || 'detailed';

        console.log('🔍 Analysis config:', { testType, detailLevel });

        // Send to main process
        ipcRenderer.send('analyze-image', {
            imageData: this.currentImage.src,
            apiKey: this.settings.apiKey,
            testType: testType,
            detailLevel: detailLevel
        });

        // Start progress simulation
        this.simulateProgress();
    }

    // Update analysis UI
    updateAnalysisUI(analyzing) {
        const analyzeButton = document.getElementById('analyzeButton');
        const analyzeText = document.getElementById('analyzeText');
        const analyzeSpinner = document.getElementById('analyzeSpinner');
        const progressContainer = document.getElementById('progressContainer');

        if (analyzing) {
            if (analyzeButton) analyzeButton.disabled = true;
            if (analyzeText) analyzeText.style.display = 'none';
            if (analyzeSpinner) analyzeSpinner.style.display = 'inline-block';
            if (progressContainer) progressContainer.style.display = 'block';
        } else {
            if (analyzeButton) analyzeButton.disabled = false;
            if (analyzeText) analyzeText.style.display = 'inline';
            if (analyzeSpinner) analyzeSpinner.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';
            this.isAnalyzing = false;
        }
    }

    // Simulate progress
    simulateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (!progressFill || !progressText) return;

        let progress = 0;
        const messages = [
            'Analyzing image...',
            'Identifying elements...',
            'Generating test scenarios...',
            'Finalizing analysis...'
        ];

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;

            progressFill.style.width = progress + '%';
            progressText.textContent = messages[Math.floor(progress / 25)] || messages[3];

            if (!this.isAnalyzing) {
                clearInterval(interval);
                progressFill.style.width = '100%';
                progressText.textContent = 'Analysis complete!';
            }
        }, 500);
    }

    // Handle analysis result
    handleAnalysisResult(result) {
        console.log('📊 Handling analysis result:', result);
        this.updateAnalysisUI(false);

        if (result.success) {
            this.displayResults(result.data);
            this.addToHistory();
            showSuccess('✅ Analysis completed successfully!');
        } else {
            showError(result.error);
        }
    }

    // Display results
    displayResults(text) {
        console.log('📄 Displaying results...');
        this.currentAnalysis = text;

        const resultCard = document.getElementById('resultCard');
        const testScenarios = document.getElementById('testScenarios');

        if (testScenarios) {
            testScenarios.innerHTML = marked.parse(text);
        }

        if (resultCard) {
            resultCard.style.display = 'block';
            resultCard.scrollIntoView({ behavior: 'smooth' });
        }

        // Enable buttons
        const saveButton = document.getElementById('saveButton');
        const copyButton = document.getElementById('copyButton');
        if (saveButton) saveButton.disabled = false;
        if (copyButton) copyButton.disabled = false;

        // Generate summary
        this.generateSummary(text);
    }

    // Generate analysis summary
    generateSummary(text) {
        const highPriority = (text.match(/🔴|high.*priority|priorité.*haute/gi) || []).length;
        const mediumPriority = (text.match(/🟡|medium.*priority|priorité.*moyenne/gi) || []).length;
        const lowPriority = (text.match(/🟢|low.*priority|priorité.*basse/gi) || []).length;
        const totalScenarios = highPriority + mediumPriority + lowPriority;

        // Update summary display
        const totalEl = document.getElementById('totalScenarios');
        const highEl = document.getElementById('highPriority');
        const mediumEl = document.getElementById('mediumPriority');
        const lowEl = document.getElementById('lowPriority');

        if (totalEl) totalEl.textContent = totalScenarios || 'N/A';
        if (highEl) highEl.textContent = highPriority;
        if (mediumEl) mediumEl.textContent = mediumPriority;
        if (lowEl) lowEl.textContent = lowPriority;

        // Show summary
        const summary = document.getElementById('analysisSummary');
        if (summary) summary.style.display = 'block';
    }

    // Clear image
    clearImage() {
        console.log('🗑️ Clearing image and results...');
        
        this.currentImage = null;
        this.currentAnalysis = null;

        // Reset file input
        const imageUpload = document.getElementById('imageUpload');
        if (imageUpload) imageUpload.value = '';

        // Show upload area
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImage = document.getElementById('previewImage');

        if (uploadArea) uploadArea.style.display = 'flex';
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImage) previewImage.src = '';

        // Clear results
        const resultCard = document.getElementById('resultCard');
        const testScenarios = document.getElementById('testScenarios');
        const summary = document.getElementById('analysisSummary');

        if (resultCard) resultCard.style.display = 'none';
        if (testScenarios) testScenarios.innerHTML = '';
        if (summary) summary.style.display = 'none';

        // Disable buttons
        const analyzeButton = document.getElementById('analyzeButton');
        const saveButton = document.getElementById('saveButton');
        const copyButton = document.getElementById('copyButton');

        if (analyzeButton) analyzeButton.disabled = true;
        if (saveButton) saveButton.disabled = true;
        if (copyButton) copyButton.disabled = true;

        showInfo('🗑️ Interface cleared!');
    }

    // Save analysis
    saveAnalysis() {
        if (!this.currentAnalysis) {
            showWarning('⚠️ No analysis to save!');
            return;
        }

        ipcRenderer.send('save-analysis', {
            results: this.currentAnalysis,
            testType: document.getElementById('testTypeSelector').value,
            timestamp: new Date().toISOString()
        });
    }

    // Copy results
    copyResults() {
        if (!this.currentAnalysis) {
            showWarning('⚠️ No results to copy!');
            return;
        }

        navigator.clipboard.writeText(this.currentAnalysis).then(() => {
            showSuccess('📋 Results copied to clipboard!');
        }).catch(() => {
            showError('❌ Failed to copy results');
        });
    }

    // Add to history
    addToHistory() {
        if (!this.currentImage || !this.currentAnalysis) return;

        AppStorage.addToHistory({
            image: this.currentImage,
            analysis: this.currentAnalysis,
            testType: document.getElementById('testTypeSelector').value,
            detailLevel: document.getElementById('detailLevel').value
        });

        this.loadHistory();
    }

    // Load and display history
    loadHistory() {
        const history = AppStorage.loadHistory();
        const historyCard = document.getElementById('historyCard');
        const historyList = document.getElementById('historyList');

        if (!historyCard || !historyList) return;

        if (history.length > 0) {
            historyCard.style.display = 'block';
            historyList.innerHTML = '';

            history.slice(-5).reverse().forEach(item => {
                const historyItem = this.createHistoryItem(item);
                historyList.appendChild(historyItem);
            });
        } else {
            historyCard.style.display = 'none';
        }
    }

    // Create history item element
    createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'history-item';

        const date = new Date(item.timestamp).toLocaleString();
        const scenarioCount = this.countScenarios(item.analysis);

        div.innerHTML = `
            <div class="history-content">
                <strong>${date}</strong><br>
                <small>Type: ${item.testType} | Scenarios: ${scenarioCount}</small>
            </div>
            <button class="history-delete" title="Delete this item">✕</button>
        `;

        // Load on content click
        div.querySelector('.history-content').addEventListener('click', () => {
            this.loadHistoryItem(item);
        });

        // Delete on button click
        div.querySelector('.history-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteHistoryItem(item.id);
        });

        return div;
    }

    // Count scenarios in text
    countScenarios(text) {
        const high = (text.match(/🔴|high.*priority|priorité.*haute/gi) || []).length;
        const medium = (text.match(/🟡|medium.*priority|priorité.*moyenne/gi) || []).length;
        const low = (text.match(/🟢|low.*priority|priorité.*basse/gi) || []).length;
        return high + medium + low || 'N/A';
    }

    // Load history item
    loadHistoryItem(item) {
        if (item.image) {
            this.currentImage = item.image;
            this.displayImage(item.image.src, { 
                name: item.image.name, 
                size: item.image.size 
            });
        }

        if (item.analysis) {
            this.displayResults(item.analysis);
        }

        showInfo('📜 History item loaded!');
    }

    // Delete history item
    deleteHistoryItem(id) {
        if (confirm('Are you sure you want to delete this history item?')) {
            AppStorage.removeFromHistory(id);
            this.loadHistory();
            showSuccess('🗑️ History item deleted!');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, starting app...');
    try {
        window.mainApp = new MainApp();
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
    }
});

// Make available globally
if (typeof window !== 'undefined') {
    window.MainApp = MainApp;
}