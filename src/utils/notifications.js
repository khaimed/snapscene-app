// Notification system for user feedback

class Notifications {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    // Create notification container
    createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    // Show notification
    show(message, type = 'info', duration = 4000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);

        // Auto remove
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        return notification;
    }

    // Create notification element
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            margin-bottom: 10px;
            max-width: 350px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            backdrop-filter: blur(10px);
        `;

        // Add icon
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        // Click to dismiss
        notification.addEventListener('click', () => {
            this.remove(notification);
        });

        return notification;
    }

    // Remove notification
    remove(notification) {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Get background color for notification type
    getBackgroundColor(type) {
        const colors = {
            success: 'linear-gradient(45deg, #48bb78, #38a169)',
            error: 'linear-gradient(45deg, #f56565, #e53e3e)',
            warning: 'linear-gradient(45deg, #ed8936, #dd6b20)',
            info: 'linear-gradient(45deg, #81e6d9, #81B2E6)',
            loading: 'linear-gradient(45deg, #4299e1, #3182ce)'
        };
        return colors[type] || colors.info;
    }

    // Get icon for notification type
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '⏳'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    loading(message) {
        return this.show(message, 'loading', 0); // No auto-dismiss
    }

    // Clear all notifications
    clearAll() {
        const notifications = this.container.querySelectorAll('div');
        notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// Create global instance
const notify = new Notifications();

// Quick access functions
function showNotification(message, type = 'info', duration = 4000) {
    return notify.show(message, type, duration);
}

function showSuccess(message) {
    return notify.success(message);
}

function showError(message) {
    return notify.error(message);
}

function showWarning(message) {
    return notify.warning(message);
}

function showInfo(message) {
    return notify.info(message);
}

function showLoading(message) {
    return notify.loading(message);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.notify = notify;
    window.showNotification = showNotification;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;
    window.showLoading = showLoading;
}

// For Node.js environments
if (typeof module !== 'undefined') {
    module.exports = { 
        Notifications, 
        showNotification, 
        showSuccess, 
        showError, 
        showWarning, 
        showInfo, 
        showLoading 
    };
}