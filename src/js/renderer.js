// Main application functionality
const { ipcRenderer } = require('electron');
class MainApp {
    constructor() {
        this.currentImage = null;
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.historySettings = {
            maxEntries: 10,
            showHistory: true
        };
        this.settings = {
            testType: 'general',
            detailLevel: 'detailed',
            language: 'fr',
            theme: 'light'
        };
        this.initialize();
    }
    // Initialize application
    initialize() {
        this.loadSettings();
        this.setupUI();
        this.setupEventListeners();
        this.setupHistoryEventListeners();
        this.syncHistorySelector();
        this.loadHistory();
    }
    // Load settings
    loadSettings() {
        try {
            if (typeof AppStorage !== 'undefined') {
                this.settings = AppStorage.loadSettings();
            }
        } catch (error) {
            // Silent fallback to defaults
        }
    }
    // Setup UI elements
    setupUI() {
        const testTypeSelect = document.getElementById('testTypeSelector');
        if (testTypeSelect) {
            testTypeSelect.value = this.settings.testType || 'general';
        }
        const detailLevelSelect = document.getElementById('detailLevel');
        if (detailLevelSelect) {
            detailLevelSelect.value = this.settings.detailLevel || 'detailed';
        }
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
        // Settings button
        const settingsButton = document.getElementById('openSettings');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
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
                if (!this.isAnalyzing && this.currentImage) {
                    this.analyzeImage();
                }
            });
        }
        // Clear button
        const clearButton = document.getElementById('clearButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearImage();
            });
        }
        // Save button
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                if (this.currentAnalysis) {
                    this.saveAnalysis();
                }
            });
        }
        // Copy button
        const copyButton = document.getElementById('copyButton');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                if (this.currentAnalysis) {
                    this.copyToClipboard();
                }
            });
        }
    }
    // Handle file selection
    handleFileSelect(file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showNotification('Please select a valid image file (PNG, JPG, JPEG, WEBP)', 'error');
            return;
        }
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size too large. Please select an image under 10MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            this.displayImagePreview(file);
            this.enableAnalyzeButton();
        };
        reader.readAsDataURL(file);
    }
    // Display image preview
    displayImagePreview(file) {
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImage = document.getElementById('previewImage');
        const imageSize = document.getElementById('imageSize');
        const imageDimensions = document.getElementById('imageDimensions');
        if (uploadArea) uploadArea.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'block';
        if (previewImage) previewImage.src = this.currentImage;
        // Show file info
        if (imageSize) {
            imageSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        }
        // Get image dimensions
        if (imageDimensions && previewImage) {
            previewImage.onload = () => {
                imageDimensions.textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
            };
        }
        this.showNotification('Image loaded successfully! Ready for analysis.', 'success');
    }
    // Enable analyze button
    enableAnalyzeButton() {
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.disabled = false;
            analyzeButton.textContent = '🔍 Analyze Image';
        }
    }
    // Analyze image
    async analyzeImage() {
        if (!this.currentImage) {
            this.showNotification('Please select an image first', 'error');
            return;
        }
        this.isAnalyzing = true;
        this.showProgress();
        try {
            const testType = document.getElementById('testTypeSelector')?.value || 'general';
            const detailLevel = document.getElementById('detailLevel')?.value || 'detailed';
            // Send to main process for analysis
            ipcRenderer.send('analyze-image', {
                imageData: this.currentImage,
                testType: testType,
                detailLevel: detailLevel
            });
            // Listen for response
            ipcRenderer.once('analysis-result', (event, result) => {
                this.isAnalyzing = false; // This will stop the progress simulation
                if (result.success) {
                    this.currentAnalysis = result.data;
                    this.displayResults(result.data);
                    this.showNotification('Analysis completed successfully!', 'success');
                } else {
                    this.showNotification(`Analysis failed: ${result.error}`, 'error');
                }
            });
        } catch (error) {
            this.isAnalyzing = false; // This will stop the progress simulation
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }
    // Show progress
    showProgress() {
        const analyzeButton = document.getElementById('analyzeButton');
        const progressContainer = document.getElementById('progressContainer');
        if (analyzeButton) {
            analyzeButton.disabled = true;
            analyzeButton.innerHTML = '<div class="loading-spinner"></div> Analyzing...';
        }
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        // Start progress simulation
        this.simulateProgress();
    }
    // Hide progress
    hideProgress() {
        const analyzeButton = document.getElementById('analyzeButton');
        const progressContainer = document.getElementById('progressContainer');
        if (analyzeButton) {
            analyzeButton.disabled = false;
            analyzeButton.textContent = '🔍 Analyze Image';
        }
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    // Simulate dynamic progress
    simulateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (!progressFill || !progressText) return;

        let progress = 0;
        const messages = [
            '🔍 Analyzing image...',
            '🔎 Identifying elements...',
            '⚙️ Generating test scenarios...',
            '✨ Finalizing analysis...'
        ];

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;

            progressFill.style.width = progress + '%';
            progressText.textContent = messages[Math.floor(progress / 25)] || messages[3];

            if (!this.isAnalyzing) {
                clearInterval(interval);
                progressFill.style.width = '100%';
                progressText.textContent = '✅ Analysis complete!';
                setTimeout(() => {
                    this.hideProgress();
                }, 500);
            }
        }, 500);
    }

    // Display results
    displayResults(analysisData, addToHistoryFlag = true) {
        const resultCard = document.getElementById('resultCard');
        const testScenarios = document.getElementById('testScenarios');
        const saveButton = document.getElementById('saveButton');
        const copyButton = document.getElementById('copyButton');
        if (resultCard) resultCard.style.display = 'block';
        
        // Update analysis summary with priority counts
        this.updateAnalysisSummary(analysisData);
        const analysisSummary = document.getElementById('analysisSummary');
        if (analysisSummary) analysisSummary.style.display = 'block';
        
        if (testScenarios) {
            // Use marked if available, otherwise show plain text
            if (typeof marked !== 'undefined') {
                testScenarios.innerHTML = marked.parse(analysisData);
            } else {
                testScenarios.innerHTML = `<pre>${analysisData}</pre>`;
            }
        }
        if (saveButton) saveButton.disabled = false;
        if (copyButton) copyButton.disabled = false;
        
        // Add to history only if flag is true (new analysis, not loading from history)
        if (addToHistoryFlag) {
            this.addToHistory(analysisData);
        }
        
        // Scroll to results
        if (resultCard) {
            resultCard.scrollIntoView({ behavior: 'smooth' });
        }
    }
    // Clear image
    clearImage() {
        this.currentImage = null;
        this.currentAnalysis = null;
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const resultCard = document.getElementById('resultCard');
        const analyzeButton = document.getElementById('analyzeButton');
        const saveButton = document.getElementById('saveButton');
        const copyButton = document.getElementById('copyButton');
        if (uploadArea) uploadArea.style.display = 'flex';
        if (previewContainer) previewContainer.style.display = 'none';
        if (resultCard) resultCard.style.display = 'none';
        // Hide analysis summary too
        const analysisSummary = document.getElementById('analysisSummary');
        if (analysisSummary) analysisSummary.style.display = 'none';
        if (analyzeButton) analyzeButton.disabled = true;
        if (saveButton) saveButton.disabled = true;
        if (copyButton) copyButton.disabled = true;
        this.showNotification('🗑️ Image cleared. Ready for new analysis.', 'info');
    }
    // Save analysis
    saveAnalysis() {
        if (!this.currentAnalysis) return;
        const testType = document.getElementById('testTypeSelector')?.value || 'general';
        ipcRenderer.send('save-analysis', {
            testType: testType,
            results: this.currentAnalysis
        });
        ipcRenderer.once('save-complete', (event, result) => {
            if (result.success) {
                this.showNotification('💾 Analysis saved successfully!', 'success');
            } else {
                this.showNotification('Failed to save analysis', 'error');
            }
        });
    }
    // Copy to clipboard
    async copyToClipboard() {
        if (!this.currentAnalysis) return;
        try {
            await navigator.clipboard.writeText(this.currentAnalysis);
            this.showNotification('📋 Analysis copied to clipboard!', 'success');
        } catch (error) {
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }
    // Show notification
    showNotification(message, type = 'info') {
        try {
            if (typeof showNotification !== 'undefined') {
                showNotification(message, type);
            }
        } catch (error) {
            // Silent fallback
        }
    }

    // History management methods
    loadHistory() {
        try {
            if (typeof AppStorage !== 'undefined') {
                const history = AppStorage.loadHistory();
                this.displayHistory(history);
                
                // Show history section if there are entries
                const historyCard = document.getElementById('historyCard');
                if (historyCard && history.length > 0) {
                    historyCard.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    displayHistory(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No analysis history yet</div>';
        return;
    }

    // Sort by timestamp (newest first)
    const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit display to current maxEntries setting
    const limitedHistory = sortedHistory.slice(0, this.historySettings.maxEntries);
    console.log('📊 Displaying', limitedHistory.length, 'of', sortedHistory.length, 'history entries (limit:', this.historySettings.maxEntries + ')');
    
    // Update height based on number of entries to display
    this.updateHistoryListHeight();
    
    historyList.innerHTML = limitedHistory.map(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
        
        // Count scenarios properly using the same logic as analysis results
        const priorities = this.parseAnalysisPriorities(item.results || '');
        
        return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-content" onclick="window.mainApp.loadHistoryItem(${item.id})">
                    <div class="history-info">
                        <div class="history-date">${formattedDate}</div>
                        <div class="history-meta">Type: ${item.testType || 'general'} | Scénarios: ${priorities.total}</div>
                    </div>
                </div>
                <button class="history-delete" onclick="window.mainApp.deleteHistoryItem(${item.id}); event.stopPropagation();" title="Delete">✕</button>
            </div>
        `;
    }).join('');
}

    countScenarios(text) {
        if (!text) return 0;
        // Count various patterns that indicate test scenarios
        const patterns = [
            /\d+\./g, // Numbered lists
            /[\*\-]\s/g, // Bullet points
            /test case/gi,
            /scénario/gi,
            /scenario/gi
        ];
        
        let count = 0;
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) count = Math.max(count, matches.length);
        });
        
        return count || 'N/A';
    }

    // Update history list height based on selected entries
    updateHistoryListHeight() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        // Dynamic height calculation:
        // 5 entries = 400px (base)
        // 10 entries = 800px (x2)  
        // 50 entries = 1200px (x3)
        // 100 entries = 1600px (x4)
        let newHeight;
        if (this.historySettings.maxEntries <= 5) {
            newHeight = 400;
        } else if (this.historySettings.maxEntries <= 10) {
            newHeight = 800;
        } else if (this.historySettings.maxEntries <= 50) {
            newHeight = 1200;
        } else {
            newHeight = 1600;
        }
        
        historyList.style.maxHeight = newHeight + 'px';
        console.log('📊 Updated history height to', newHeight + 'px', 'for', this.historySettings.maxEntries, 'entries');
    }

    formatHistoryText(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        return `<pre>${text}</pre>`;
    }

    addToHistory(analysisData) {
        try {
            if (typeof AppStorage !== 'undefined') {
                const testType = document.getElementById('testTypeSelector')?.value || 'general';
                const historyItem = {
                    testType: testType,
                    results: analysisData,
                    imageData: this.currentImage, // Store the image data
                    timestamp: new Date().toISOString()
                };
                
                AppStorage.addToHistory(historyItem); // Remove the limit parameter
                this.loadHistory(); // Refresh display
            }
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    }

    deleteHistoryItem(id) {
        try {
            if (typeof AppStorage !== 'undefined') {
                AppStorage.removeFromHistory(id);
                this.loadHistory(); // Refresh display
                this.showNotification('History item deleted', 'info');
            }
        } catch (error) {
            console.error('Error deleting history item:', error);
        }
    }

loadHistoryItem(id) {
    try {
        if (typeof AppStorage !== 'undefined') {
            const history = AppStorage.loadHistory();
            const item = history.find(h => h.id === id);
            
            if (item) {
                // Load image into Upload Image section
                if (item.imageData) {
                    this.currentImage = item.imageData;
                    this.currentAnalysis = item.results;
                    
                    // Show image preview
                    const uploadArea = document.getElementById('uploadArea');
                    const previewContainer = document.getElementById('imagePreviewContainer');
                    const previewImage = document.getElementById('previewImage');
                    
                    if (uploadArea) uploadArea.style.display = 'none';
                    if (previewContainer) previewContainer.style.display = 'block';
                    if (previewImage) previewImage.src = item.imageData;
                    
                    // Enable buttons
                    const analyzeButton = document.getElementById('analyzeButton');
                    const saveButton = document.getElementById('saveButton');
                    const copyButton = document.getElementById('copyButton');
                    if (analyzeButton) analyzeButton.disabled = false;
                    if (saveButton) saveButton.disabled = false;
                    if (copyButton) copyButton.disabled = false;
                }
                
                // Load analysis into Analysis Results section
                if (item.results) {
                    this.displayResults(item.results, false); // Don't add to history when loading from history
                }
                
                this.showNotification('📜 History item loaded!', 'success');
            }
        }
    } catch (error) {
        console.error('Error loading history item:', error);
    }
}

    clearHistory() {
        try {
            if (typeof AppStorage !== 'undefined') {
                AppStorage.saveHistory([]);
                this.loadHistory();
                this.showNotification('History cleared', 'info');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    // Setup history event listeners
    setupHistoryEventListeners() {
        // History controls
        const historyLimit = document.getElementById('historyLimit');
        if (historyLimit) {
            historyLimit.addEventListener('change', (e) => {
                // console.log('📊 History limit changed from', this.historySettings.maxEntries, 'to', e.target.value);
                this.historySettings.maxEntries = parseInt(e.target.value);
                this.updateHistoryLimit();
            });
        }
        
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all analysis history?')) {
                    this.clearHistory();
                }
            });
        }
    }

    // Update history limit based on selector
    updateHistoryLimit() {
        try {
            if (typeof AppStorage !== 'undefined') {
                // console.log('📊 Updating history limit to:', this.historySettings.maxEntries);
                this.loadHistory(); // Just reload with new limit, don't modify stored history
            }
        } catch (error) {
            console.error('Error updating history limit:', error);
        }
    }

    // Sync history selector with JS settings
    syncHistorySelector() {
        const historyLimit = document.getElementById('historyLimit');
        if (historyLimit) {
            historyLimit.value = this.historySettings.maxEntries.toString();
        }
    }

    // Analysis summary methods
    updateAnalysisSummary(analysisData) {
        const totalScenarios = document.getElementById('totalScenarios');
        const highPriority = document.getElementById('highPriority');
        const mediumPriority = document.getElementById('mediumPriority');
        const lowPriority = document.getElementById('lowPriority');

        // Parse analysis data to count priorities
        const priorities = this.parseAnalysisPriorities(analysisData);
        
        if (totalScenarios) totalScenarios.textContent = priorities.total;
        if (highPriority) highPriority.textContent = priorities.high;
        if (mediumPriority) mediumPriority.textContent = priorities.medium;
        if (lowPriority) lowPriority.textContent = priorities.low;
    }

    parseAnalysisPriorities(text) {
        if (!text) return { total: 0, high: 0, medium: 0, low: 0 };
        
        // More precise priority detection - count actual scenarios with priorities
        const lines = text.split('\n');
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        
        // Count scenarios with priorities line by line
        lines.forEach(line => {
            const trimmedLine = line.trim().toLowerCase();
            if (trimmedLine.includes('🔴') || trimmedLine.includes('priorité haute') || trimmedLine.includes('high priority') || trimmedLine.includes('critique')) {
                highCount++;
            } else if (trimmedLine.includes('🟡') || trimmedLine.includes('priorité moyenne') || trimmedLine.includes('medium priority') || trimmedLine.includes('moyenne')) {
                mediumCount++;
            } else if (trimmedLine.includes('🟢') || trimmedLine.includes('priorité basse') || trimmedLine.includes('low priority') || trimmedLine.includes('faible')) {
                lowCount++;
            }
        });
        
        // Calculate total: sum of priorities or fallback to numbered scenarios
        let total = highCount + mediumCount + lowCount;
        if (total === 0) {
            const numberedScenarios = (text.match(/^\d+\./gm) || []).length;
            const bulletScenarios = (text.match(/^[\*\-]\s/gm) || []).length;
            total = Math.max(numberedScenarios, bulletScenarios);
        }
        
        return {
            total: total,
            high: highCount,
            medium: mediumCount,
            low: lowCount
        };
    }
}
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mainApp = new MainApp();
});
// Export for global access
if (typeof window !== 'undefined') {
    window.MainApp = MainApp;
}
