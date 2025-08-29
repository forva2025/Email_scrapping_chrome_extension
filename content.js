/**
 * Email Scraper Extension - Content Script
 * Extracts email addresses from web pages efficiently and ethically
 * @author OCHIRIA ELIAS ONYAIT
 * @version 1.0.0
 */

// Global state
let isExtensionActive = true;
let activeOperations = new Set();
let registeredListeners = new Set();
let registeredTimers = new Set();
let registeredIntervals = new Set();

/**
 * Check if extension context is valid
 */
function isContextValid() {
    try {
        return typeof chrome !== 'undefined' &&
               chrome.runtime &&
               chrome.runtime.sendMessage &&
               isExtensionActive;
    } catch (error) {
        console.warn('Email Scraper: Context check failed:', error.message);
        isExtensionActive = false;
        return false;
    }
}

/**
 * Safely send message to background script
 */
function sendMessageSafely(message, callback) {
    if (!isContextValid()) {
        console.error('Email Scraper: Context invalid, cannot send message');
        if (callback) callback({ success: false, error: 'Extension context invalidated' });
        return false;
    }

    const operationId = `msg_${Date.now()}_${Math.random()}`;
    activeOperations.add(operationId);

    try {
        chrome.runtime.sendMessage(message, (response) => {
            activeOperations.delete(operationId);

            if (chrome.runtime.lastError) {
                console.error('Email Scraper: Message failed:', chrome.runtime.lastError);

                // Check for context invalidation
                if (chrome.runtime.lastError.message &&
                    chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                    console.error('Email Scraper: Extension context invalidated - stopping all operations');
                    isExtensionActive = false;
                    cleanupAll();
                }

                if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
            } else {
                if (callback) callback(response);
            }
        });

        return true;
    } catch (error) {
        activeOperations.delete(operationId);
        console.error('Email Scraper: Failed to send message:', error);
        if (callback) callback({ success: false, error: error.message });
        return false;
    }
}

/**
 * Register event listener for cleanup
 */
function addListener(target, type, listener, options) {
    if (!target || !type || !listener || !isContextValid()) return null;

    try {
        target.addEventListener(type, listener, options);
        const listenerId = `${type}_${Date.now()}_${Math.random()}`;
        registeredListeners.add({ target, type, listener, options, id: listenerId });
        return listenerId;
    } catch (error) {
        console.error('Email Scraper: Failed to add listener:', error);
        return null;
    }
}

/**
 * Register timer for cleanup
 */
function setTimer(callback, delay) {
    if (!isContextValid()) return null;

    try {
        const timerId = window.setTimeout(() => {
            registeredTimers.delete(timerId);
            if (isContextValid() && callback) {
                callback();
            }
        }, delay);

        registeredTimers.add(timerId);
        return timerId;
    } catch (error) {
        console.error('Email Scraper: Failed to set timer:', error);
        return null;
    }
}

/**
 * Register interval for cleanup
 */
function setIntervalTimer(callback, delay) {
    if (!isContextValid()) return null;

    try {
        const intervalId = window.setInterval(() => {
            if (!isContextValid()) {
                clearIntervalTimer(intervalId);
                return;
            }
            if (callback) callback();
        }, delay);

        registeredIntervals.add(intervalId);
        return intervalId;
    } catch (error) {
        console.error('Email Scraper: Failed to set interval:', error);
        return null;
    }
}

/**
 * Clear timer
 */
function clearTimer(timerId) {
    if (timerId && registeredTimers.has(timerId)) {
        try {
            window.clearTimeout(timerId);
            registeredTimers.delete(timerId);
        } catch (error) {
            console.error('Email Scraper: Failed to clear timer:', error);
        }
    }
}

/**
 * Clear interval
 */
function clearIntervalTimer(intervalId) {
    if (intervalId && registeredIntervals.has(intervalId)) {
        try {
            window.clearInterval(intervalId);
            registeredIntervals.delete(intervalId);
        } catch (error) {
            console.error('Email Scraper: Failed to clear interval:', error);
        }
    }
}

/**
 * Cleanup all resources
 */
function cleanupAll() {
    console.log('Email Scraper: Starting emergency cleanup');

    // Clear all timers
    registeredTimers.forEach(timerId => {
        try { window.clearTimeout(timerId); } catch (e) {}
    });
    registeredTimers.clear();

    // Clear all intervals
    registeredIntervals.forEach(intervalId => {
        try { window.clearInterval(intervalId); } catch (e) {}
    });
    registeredIntervals.clear();

    // Remove all listeners
    registeredListeners.forEach(({ target, type, listener, options }) => {
        try {
            if (target && target.removeEventListener) {
                target.removeEventListener(type, listener, options);
            }
        } catch (e) {}
    });
    registeredListeners.clear();

    // Clear active operations
    activeOperations.clear();

    isExtensionActive = false;
    console.log('Email Scraper: Emergency cleanup completed');
}

/**
 * Simple Email Extractor - Focused on stability
 */
const EmailExtractor = {
    // Simple email regex for basic validation
    emailRegex: /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g,

    /**
     * Validate email format
     */
    isValidEmail: function(email) {
        if (!email || typeof email !== 'string' || email.length > 254) {
            return false;
        }

        // Simple validation - just check basic format
        const atIndex = email.indexOf('@');
        if (atIndex === -1 || atIndex === 0) {
            return false;
        }

        const domain = email.substring(atIndex + 1);
        return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
    },

    /**
     * Extract emails from text
     */
    extractFromText: function(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const emails = [];
        let match;

        // Reset regex
        this.emailRegex.lastIndex = 0;

        while ((match = this.emailRegex.exec(text)) !== null) {
            const email = match[0].toLowerCase().trim();
            if (this.isValidEmail(email) && !emails.includes(email)) {
                emails.push(email);
                if (emails.length >= 100) break; // Limit results
            }
        }

        return emails;
    },

    /**
     * Extract emails from page - Optimized for speed
     */
    extractEmails: function() {
        if (!isContextValid()) {
            console.error('Email Scraper: Context invalid, cannot extract emails');
            return [];
        }

        const startTime = performance.now();
        const emails = new Set();

        try {
            // Fast extraction: Get visible text content only
            const bodyText = document.body ? document.body.textContent || document.body.innerText || '' : '';

            // Process in smaller chunks for better performance
            const textChunks = bodyText.substring(0, 25000).split('\n'); // Reduced limit, split by lines
            for (const chunk of textChunks) {
                if (emails.size >= 30) break; // Early exit if we have enough emails
                const chunkEmails = this.extractFromText(chunk);
                chunkEmails.forEach(email => emails.add(email));
            }

            // Fast mailto link extraction
            const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
            for (let i = 0; i < Math.min(mailtoLinks.length, 20); i++) { // Limit processing
                try {
                    const href = mailtoLinks[i].getAttribute('href');
                    if (href) {
                        const email = href.substring(7).split('?')[0].toLowerCase().trim();
                        if (this.isValidEmail(email)) {
                            emails.add(email);
                        }
                    }
                } catch (e) {
                    // Ignore individual link errors
                }
            }

            // Quick false positive filter
            const result = Array.from(emails).filter(email => {
                const falsePositives = ['example@example.com', 'test@test.com', 'user@example.com'];
                return !falsePositives.includes(email) && email.length < 100; // Additional length check
            });

            const endTime = performance.now();
            console.log(`Email Scraper: Found ${result.length} emails in ${(endTime - startTime).toFixed(2)}ms`);

            return result.slice(0, 25); // Reduced limit for faster processing

        } catch (error) {
            console.error('Email Scraper: Extraction failed:', error);
            return [];
        }
    }
};

/**
 * Simple auto-detection - runs once when page loads
 */
function autoDetectEmails() {
    if (!isContextValid()) {
        console.error('Email Scraper: Context invalid, skipping auto-detection');
        return;
    }

    try {
        console.log('Email Scraper: Starting simple email detection');

        const emails = EmailExtractor.extractEmails();

        if (emails.length > 0) {
            // Store emails locally for popup access
            const pageData = {
                url: window.location ? window.location.href : '',
                title: document.title || '',
                emails: emails,
                timestamp: Date.now(),
                count: emails.length
            };

            try {
                const storageData = {};
                storageData['pageData'] = pageData;

                chrome.storage.local.set(storageData, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Email Scraper: Failed to store emails locally:', chrome.runtime.lastError);
                    } else {
                        console.log('Email Scraper: Emails stored locally successfully');
                    }
                });
            } catch (storageError) {
                console.error('Email Scraper: Local storage operation failed:', storageError);
            }

            // Also send to background script for badge update
            sendMessageSafely({
                type: 'storePageEmails',
                pageData: pageData
            }, (response) => {
                if (response && response.success) {
                    console.log('Email Scraper: Background storage successful');
                } else {
                    console.error('Email Scraper: Background storage failed');
                }
            });
        } else {
            console.log('Email Scraper: No emails found on page');
        }

    } catch (error) {
        console.error('Email Scraper: Auto-detection failed:', error.message);
    }
}

/**
 * Manual extraction for popup
 */
function extractEmailsFromPage() {
    if (!isContextValid()) {
        console.error('Email Scraper: Context invalid, cannot extract emails');
        return [];
    }

    try {
        console.log('Email Scraper: Manual extraction requested');
        return EmailExtractor.extractEmails();
    } catch (error) {
        console.error('Email Scraper: Manual extraction failed:', error.message);
        return [];
    }
}

// Simple initialization - just run once when page loads
function initializeEmailScraper() {
    if (!isContextValid()) {
        console.error('Email Scraper: Context invalid during initialization');
        return;
    }

    console.log('Email Scraper: Initializing simple email detection');

    // Simple approach: just run detection once after page loads
    if (document.readyState === 'loading') {
        // Wait for DOM to be ready
        addListener(document, 'DOMContentLoaded', () => {
            if (isContextValid()) {
                setTimer(() => autoDetectEmails(), 500);
            }
        });
    } else {
        // Page already loaded
        setTimer(() => autoDetectEmails(), 500);
    }

    // Cleanup on page unload
    addListener(window, 'beforeunload', () => {
        console.log('Email Scraper: Page unloading, cleaning up');
        cleanupAll();
    });
}

// Initialize if we have the required APIs
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    initializeEmailScraper();
} else {
    console.error('Email Scraper: Required APIs not available');
}

// Simple message listener - no complex observers or timers
if (isContextValid()) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            if (!isContextValid()) {
                console.error('Email Scraper: Context invalidated, ignoring message');
                sendResponse({ success: false, error: 'Extension context invalidated' });
                return true;
            }

            console.log('Email Scraper: Received message:', message.type);

            if (message.type === 'extractEmails') {
                const emails = extractEmailsFromPage();
                sendResponse({ success: true, emails: emails });
                return true;

            } else if (message.type === 'refreshDetection') {
                autoDetectEmails();
                sendResponse({ success: true });
                return true;
            }

            sendResponse({ success: false, error: 'Unknown message type' });
            return true;

        } catch (error) {
            console.error('Email Scraper: Message listener error:', error.message);

            if (error.message && error.message.includes('Extension context invalidated')) {
                isExtensionActive = false;
                cleanupAll();
            }

            sendResponse({ success: false, error: error.message });
            return true;
        }
    });

    console.log('Email Scraper: Message listener registered');
} else {
    console.error('Email Scraper: Cannot register message listener - context not valid');
}
