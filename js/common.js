/* ========================================
   PickPop - Common JavaScript Utilities
   ======================================== */

// Constants
const APP_NAME = 'PickPop';
const APP_VERSION = '1.0.0';
const FREE_TIER_LIMIT = 30;

// Image mode technical limits (separate from free tier)
const IMAGE_SOFT_WARNING_LIMIT = 300;  // Show gentle warning
const IMAGE_HARD_LIMIT = 500;          // Block further additions

// Image compression settings
const IMAGE_MAX_DIMENSION = 400;       // Max width/height in px
const IMAGE_JPEG_QUALITY = 0.8;        // 0-1

// Storage Keys
const STORAGE_KEYS = {
    IMAGE_MODE: 'pickpop_image_mode',
    TEXT_MODE: 'pickpop_text_mode',
    SETTINGS: 'pickpop_settings',
    PRIVACY_ACCEPTED: 'pickpop_privacy_accepted'
};

/**
 * Show a temporary toast notification
 * @param {string} message - Message to show
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.pickpop-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `pickpop-toast pickpop-toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
    `;

    // Add styles if not exists
    if (!document.getElementById('pickpop-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'pickpop-toast-styles';
        style.textContent = `
            .pickpop-toast {
                position: fixed;
                top: 30px;
                right: 30px;
                padding: 15px 25px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                font-size: 0.95em;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                animation: toastSlideIn 0.3s ease;
                max-width: 400px;
            }
            .pickpop-toast-success { background: rgba(76, 175, 80, 0.95); }
            .pickpop-toast-error { background: rgba(244, 67, 54, 0.95); }
            .pickpop-toast-warning { background: rgba(255, 152, 0, 0.95); }
            .pickpop-toast-info { background: rgba(33, 150, 243, 0.95); }
            .toast-icon { font-size: 1.3em; }
            @keyframes toastSlideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

/**
 * Show a confirmation dialog
 * @param {string} message - Message to show
 * @param {string} title - Optional title
 * @returns {Promise<boolean>}
 */
function showConfirm(message, title = 'ยืนยัน') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'pickpop-modal-overlay';
        modal.innerHTML = `
            <div class="pickpop-modal">
                <h3 class="pickpop-modal-title">${title}</h3>
                <p class="pickpop-modal-message">${message}</p>
                <div class="pickpop-modal-buttons">
                    <button class="pickpop-btn-cancel">ยกเลิก</button>
                    <button class="pickpop-btn-confirm">ยืนยัน</button>
                </div>
            </div>
        `;

        // Add styles if not exists
        if (!document.getElementById('pickpop-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'pickpop-modal-styles';
            style.textContent = `
                .pickpop-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.2s ease;
                }
                .pickpop-modal {
                    background: white;
                    color: #2d3748;
                    padding: 30px;
                    border-radius: 20px;
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: fadeIn 0.3s ease;
                    font-family: 'Prompt', 'Anuphan', sans-serif;
                }
                .pickpop-modal-title {
                    font-size: 1.3em;
                    margin-bottom: 15px;
                    color: #2d3748;
                }
                .pickpop-modal-message {
                    margin-bottom: 25px;
                    line-height: 1.6;
                    color: #4a5568;
                    white-space: pre-line;
                }
                .pickpop-modal-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                .pickpop-modal-buttons button {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 10px;
                    font-family: inherit;
                    font-size: 0.95em;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pickpop-btn-cancel {
                    background: #e2e8f0;
                    color: #4a5568;
                }
                .pickpop-btn-cancel:hover {
                    background: #cbd5e0;
                }
                .pickpop-btn-confirm {
                    background: #FF6B6B;
                    color: white;
                }
                .pickpop-btn-confirm:hover {
                    background: #ff5252;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        modal.querySelector('.pickpop-btn-confirm').onclick = () => {
            modal.remove();
            resolve(true);
        };
        modal.querySelector('.pickpop-btn-cancel').onclick = () => {
            modal.remove();
            resolve(false);
        };
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
}

/**
 * Save data to localStorage safely
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Storage save failed:', error);
        return false;
    }
}

/**
 * Load data from localStorage safely
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Storage load failed:', error);
        return defaultValue;
    }
}

/**
 * Check if free tier limit is reached
 */
function isOverFreeLimit(count) {
    return count > FREE_TIER_LIMIT;
}

/**
 * Get free limit info
 */
function getFreeLimitInfo() {
    return {
        limit: FREE_TIER_LIMIT,
        message: `รุ่นฟรีจำกัด ${FREE_TIER_LIMIT} รายการ`
    };
}

/**
 * Format number with comma
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Compress an image file using Canvas - resizes to max dimension and
 * re-encodes as JPEG. Keeps memory usage manageable when users upload
 * many high-resolution photos (e.g. straight from a phone camera).
 * @param {File} file - Original image file
 * @param {number} maxDimension - Max width/height in px
 * @param {number} quality - JPEG quality 0-1
 * @returns {Promise<string>} - Compressed image as Data URL
 */
function compressImage(file, maxDimension = IMAGE_MAX_DIMENSION, quality = IMAGE_JPEG_QUALITY) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Export for use in other scripts (browser global)
window.PickPop = {
    APP_NAME,
    APP_VERSION,
    FREE_TIER_LIMIT,
    IMAGE_SOFT_WARNING_LIMIT,
    IMAGE_HARD_LIMIT,
    IMAGE_MAX_DIMENSION,
    IMAGE_JPEG_QUALITY,
    STORAGE_KEYS,
    showToast,
    showConfirm,
    saveToStorage,
    loadFromStorage,
    isOverFreeLimit,
    getFreeLimitInfo,
    formatNumber,
    debounce,
    compressImage
};
