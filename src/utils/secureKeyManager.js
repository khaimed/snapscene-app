// Simple Secure API Key Manager
const crypto = require('crypto');
const os = require('os');

class SecureKeyManager {
    constructor() {
        // Simple machine-specific key
        this.key = this.generateKey();
    }

    generateKey() {
        const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`;
        return crypto.createHash('sha256').update(machineInfo).digest('hex').slice(0, 32);
    }

    // Simple XOR encryption
    encrypt(text) {
        if (!text) return '';
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
            result += String.fromCharCode(charCode);
        }
        return Buffer.from(result, 'binary').toString('base64');
    }

    // Simple XOR decryption
    decrypt(encryptedText) {
        if (!encryptedText) return '';
        
        try {
            const decoded = Buffer.from(encryptedText, 'base64').toString('binary');
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (error) {
            // If decryption fails, assume it's plain text
            return encryptedText;
        }
    }

    // Check if string looks encrypted (base64)
    isEncrypted(data) {
        if (!data || typeof data !== 'string') return false;
        
        // Check if it's valid base64 and doesn't look like an API key
        try {
            const decoded = Buffer.from(data, 'base64').toString('binary');
            return data.length > 20 && !data.startsWith('AIza') && !data.startsWith('sk-');
        } catch {
            return false;
        }
    }

    // Validate API key format
    isValidApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return false;
        
        // Support multiple AI API formats
        return (
            apiKey.startsWith('AIza') && apiKey.length === 39 ||  // Google Gemini
            apiKey.startsWith('sk-') && apiKey.length >= 48 ||     // OpenAI
            /^[0-9a-f]{32,}$/i.test(apiKey)                       // Generic hex key
        );
    }

    // Store API key securely
    secureStore(apiKey) {
        if (!this.isValidApiKey(apiKey)) {
            throw new Error('Invalid API key format');
        }
        return this.encrypt(apiKey);
    }

    // Retrieve API key securely
    secureRetrieve(encryptedData) {
        if (!encryptedData) return '';
        
        // If it's already decrypted (backward compatibility)
        if (this.isValidApiKey(encryptedData)) {
            return encryptedData;
        }
        
        return this.decrypt(encryptedData);
    }
}

module.exports = SecureKeyManager;
