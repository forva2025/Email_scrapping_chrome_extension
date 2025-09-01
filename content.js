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
        // Check if Chrome object exists
        if (typeof chrome === 'undefined') {
            console.debug('Email Scraper: Chrome object not defined');
            return false;
        }
        
        // Check if runtime exists
        if (!chrome.runtime) {
            console.debug('Email Scraper: Chrome runtime not available');
            return false;
        }
        
        // Check if sendMessage is available
        if (typeof chrome.runtime.sendMessage !== 'function') {
            console.debug('Email Scraper: sendMessage not available');
            return false;
        }
        
        // Check if onMessage is available
        if (typeof chrome.runtime.onMessage !== 'object') {
            console.debug('Email Scraper: onMessage not available');
            return false;
        }
        
        // Check if extension is still active
        if (!isExtensionActive) {
            console.debug('Email Scraper: Extension marked as inactive');
            return false;
        }
        
        // All checks passed
        return true;
        
    } catch (error) {
        console.warn('Email Scraper: Context check failed with error:', error.message);
        return false;
    }
}

/**
 * Get detailed context status for debugging
 */
function getContextStatus() {
    const status = {
        chromeDefined: typeof chrome !== 'undefined',
        runtimeAvailable: typeof chrome !== 'undefined' && !!chrome.runtime,
        sendMessageAvailable: typeof chrome !== 'undefined' && 
                             chrome.runtime && 
                             typeof chrome.runtime.sendMessage === 'function',
        onMessageAvailable: typeof chrome !== 'undefined' && 
                           chrome.runtime && 
                           typeof chrome.runtime.onMessage === 'object',
        extensionActive: isExtensionActive,
        overallValid: false
    };
    
    status.overallValid = status.chromeDefined && 
                          status.runtimeAvailable && 
                          status.sendMessageAvailable && 
                          status.onMessageAvailable && 
                          status.extensionActive;
    
    return status;
}

/**
 * Wait for Chrome extension APIs to be available with timeout
 */
function waitForChromeAPIs(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkAPIs = () => {
            // Check if timeout exceeded
            if (Date.now() - startTime > timeoutMs) {
                reject(new Error('Timeout waiting for Chrome APIs'));
                return;
            }
            
            if (isContextValid()) {
                console.log('✅ Email Scraper: Chrome APIs are now available');
                resolve(true);
            } else {
                console.log('⏳ Email Scraper: Waiting for Chrome APIs...');
                setTimeout(checkAPIs, 200); // Check every 200ms
            }
        };
        
        checkAPIs();
    });
}

/**
 * Initialize the content script with proper context validation
 */
async function initializeWithContext() {
    try {
        console.log('🚀 Email Scraper: Starting initialization...');
        
        // Wait for Chrome APIs to be available with timeout
        await waitForChromeAPIs(10000); // 10 second timeout
        
        if (!isContextValid()) {
            throw new Error('Chrome APIs still not available after waiting');
        }
        
        console.log('✅ Email Scraper: Chrome APIs available, proceeding with initialization');
        
        // Initialize the email scraper
        initializeEmailScraper();
        
        // Register message listener
        const listenerRegistered = registerMessageListener();
        
        if (!listenerRegistered) {
            throw new Error('Failed to register message listener');
        }
        
        console.log('✅ Email Scraper: Initialization completed successfully');
        
        // Show visual indicator that content script is loaded
        showContentScriptLoadedIndicator();
        
    } catch (error) {
        console.error('❌ Email Scraper: Initialization failed:', error.message);
        
        if (error.message.includes('Timeout')) {
            console.log('⏰ Email Scraper: Timeout reached, trying fallback initialization');
            fallbackInitialization();
        } else {
            // Try to recover by retrying after a delay
            setTimeout(() => {
                console.log('🔄 Email Scraper: Retrying initialization...');
                initializeWithContext();
            }, 2000);
        }
    }
}

/**
 * Show a visual indicator that the content script is loaded
 */
function showContentScriptLoadedIndicator() {
    try {
        // Create a small indicator in the top-right corner
        const indicator = document.createElement('div');
        indicator.id = 'email-scraper-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 999999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            pointer-events: none;
            opacity: 0.9;
        `;
        indicator.textContent = '📧 Email Scraper Loaded';
        
        document.body.appendChild(indicator);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
        
        console.log('🎨 Email Scraper: Visual indicator displayed');
        
    } catch (error) {
        console.warn('Email Scraper: Could not show visual indicator:', error.message);
    }
}

/**
 * Fallback initialization method for when async initialization fails
 */
function fallbackInitialization() {
    console.log('🔄 Email Scraper: Using fallback initialization method');
    
    try {
        // Check if we can at least register a basic message listener
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            console.log('✅ Email Scraper: Basic Chrome APIs available, attempting fallback setup');
            
            // Try to register a minimal message listener
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log('📨 Email Scraper: Fallback message received:', message.type);
                
                if (message.type === 'ping') {
                    sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
                    return true;
                }
                
                sendResponse({ success: false, error: 'Extension not fully initialized' });
                return true;
            });
            
            console.log('✅ Email Scraper: Fallback message listener registered');
            
            // Try to initialize email scraper
            if (isContextValid()) {
                initializeEmailScraper();
            }
            
        } else {
            console.error('❌ Email Scraper: Even fallback initialization failed - no Chrome APIs');
            
            // Try alternative initialization strategies
            tryAlternativeInitialization();
        }
        
    } catch (error) {
        console.error('❌ Email Scraper: Fallback initialization failed:', error.message);
        tryAlternativeInitialization();
    }
}

/**
 * Try alternative initialization strategies when Chrome APIs are completely unavailable
 */
function tryAlternativeInitialization() {
    console.log('🔄 Email Scraper: Trying alternative initialization strategies...');
    
    try {
        // Strategy 1: Wait for window load and try again
        if (document.readyState === 'loading') {
            console.log('📄 Email Scraper: Document still loading, waiting for load event');
            document.addEventListener('load', () => {
                console.log('📄 Email Scraper: Document loaded, retrying Chrome API check');
                setTimeout(() => {
                    if (isContextValid()) {
                        console.log('✅ Email Scraper: Chrome APIs now available after page load');
                        initializeWithContext();
                    } else {
                        console.log('❌ Email Scraper: Chrome APIs still not available after page load');
                        initializeStandaloneMode();
                    }
                }, 1000);
            });
        } else {
            // Strategy 2: Try to initialize in standalone mode
            console.log('📄 Email Scraper: Document already loaded, trying standalone mode');
            initializeStandaloneMode();
        }
        
    } catch (error) {
        console.error('❌ Email Scraper: Alternative initialization failed:', error.message);
        initializeStandaloneMode();
    }
}

/**
 * Initialize in standalone mode when Chrome APIs are not available
 */
function initializeStandaloneMode() {
    console.log('🔄 Email Scraper: Initializing in standalone mode (no Chrome APIs)');
    
    try {
        // Create a basic email extraction system that works without Chrome APIs
        console.log('📧 Email Scraper: Setting up standalone email extraction');
        
        // Set up basic email detection
        setTimeout(() => {
            console.log('🔍 Email Scraper: Starting standalone email detection...');
            const emails = EmailExtractor.extractEmails();
            
            if (emails.length > 0) {
                console.log(`✅ Email Scraper: Found ${emails.length} emails in standalone mode`);
                
                // Store emails in localStorage as fallback
                try {
                    localStorage.setItem('emailScraper_emails', JSON.stringify({
                        emails: emails,
                        url: window.location.href,
                        timestamp: Date.now()
                    }));
                    console.log('✅ Email Scraper: Emails stored in localStorage');
                } catch (storageError) {
                    console.warn('⚠️ Email Scraper: Could not store emails in localStorage:', storageError.message);
                }
                
                // Show visual notification
                showStandaloneEmailNotification(emails.length);
                
            } else {
                console.log('🔍 Email Scraper: No emails found in standalone mode');
            }
        }, 3000); // Wait 3 seconds for page to fully load
        
        console.log('✅ Email Scraper: Standalone mode initialized');
        
    } catch (error) {
        console.error('❌ Email Scraper: Standalone mode initialization failed:', error.message);
    }
}

/**
 * Show notification for emails found in standalone mode
 */
function showStandaloneEmailNotification(emailCount) {
    try {
        const notification = document.createElement('div');
        notification.id = 'email-scraper-standalone-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffc107;
            color: #212529;
            padding: 15px 25px;
            border-radius: 25px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            cursor: pointer;
        `;
        
        notification.innerHTML = `
            📧 ${emailCount} email${emailCount > 1 ? 's' : ''} detected! 
            <span style="font-size: 12px; opacity: 0.7;">(Standalone mode)</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
        
        // Click to remove
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('🎨 Email Scraper: Standalone notification displayed');
        
    } catch (error) {
        console.warn('Email Scraper: Could not show standalone notification:', error.message);
    }
}

/**
 * Main initialization entry point with multiple fallback strategies
 */
function startInitialization() {
    console.log('🚀 Email Scraper: Starting content script initialization...');
    console.log('📄 Page URL:', window.location.href);
    console.log('📄 Page Title:', document.title);
    console.log('🔧 Chrome APIs available:', typeof chrome !== 'undefined');
    console.log('🔧 Chrome runtime available:', typeof chrome !== 'undefined' && !!chrome.runtime);
    
    // Check if we're in a supported context
    if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
        console.log('⚠️ Email Scraper: Chrome internal page detected, skipping initialization');
        return;
    }
    
    // Strategy 1: Try async initialization first
    initializeWithContext().catch(error => {
        console.error('❌ Email Scraper: Async initialization failed, trying fallback:', error.message);
        fallbackInitialization();
    });
    
    // Strategy 2: Set up a timeout-based fallback
    setTimeout(() => {
        if (!isContextValid()) {
            console.log('⏰ Email Scraper: Timeout reached, trying fallback initialization');
            fallbackInitialization();
        }
    }, 8000); // 8 second timeout
    
    // Strategy 3: Try initialization after page is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('load', () => {
            setTimeout(() => {
                if (!isContextValid()) {
                    console.log('📄 Email Scraper: Page fully loaded, retrying initialization');
                    fallbackInitialization();
                }
            }, 2000);
        });
    }
}

/**
 * Register the message listener with proper error handling
 */
function registerMessageListener() {
    if (!isContextValid()) {
        console.error('Email Scraper: Cannot register message listener - context not valid');
        return false;
    }

    try {
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
                    
                } else if (message.type === 'ping') {
                    // Simple ping to check if content script is accessible
                    sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
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

        console.log('Email Scraper: Message listener registered successfully');
        return true;
        
    } catch (error) {
        console.error('Email Scraper: Failed to register message listener:', error.message);
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
    if (!target || !type || !listener) return null;

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
    try {
        const timerId = window.setTimeout(() => {
            registeredTimers.delete(timerId);
            if (callback) {
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
function setInterval(callback, delay) {
    try {
        const intervalId = window.setInterval(() => {
            if (callback) {
                callback();
            } else {
                window.clearInterval(intervalId);
                registeredIntervals.delete(intervalId);
            }
        }, delay);
        registeredIntervals.add(intervalId);
        return intervalId;
    } catch (error) {
        console.error('Email Scraper: Failed to set interval:', error);
        return null;
    }
}

/**
 * Cleanup all registered resources
 */
function cleanupAll() {
    console.log('Email Scraper: Cleaning up all resources');

    // Clear all timers
    registeredTimers.forEach(timerId => {
        try {
            window.clearTimeout(timerId);
        } catch (e) {
            // Ignore cleanup errors
        }
    });
    registeredTimers.clear();

    // Clear all intervals
    registeredIntervals.forEach(intervalId => {
        try {
            window.clearInterval(intervalId);
        } catch (e) {
            // Ignore cleanup errors
        }
    });
    registeredIntervals.clear();

    // Remove all event listeners
    registeredListeners.forEach(({ target, type, listener, options }) => {
        try {
                target.removeEventListener(type, listener, options);
        } catch (e) {
            // Ignore cleanup errors
            }
    });
    registeredListeners.clear();

    // Clear active operations
    activeOperations.clear();
}

/**
 * Enhanced Email Extractor - Comprehensive crawling with validation
 */
const EmailExtractor = {
    // Comprehensive email regex for better detection
    emailRegex: /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g,

    /**
     * Enhanced email validation with multiple checks
     */
    isValidEmail: function(email) {
        if (!email || typeof email !== 'string' || email.length > 254) {
            return false;
        }

        // Basic format validation
        const atIndex = email.indexOf('@');
        if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
            return false;
        }

        const localPart = email.substring(0, atIndex);
        const domain = email.substring(atIndex + 1);

        // Local part validation
        if (localPart.length > 64 || localPart.length === 0) {
            return false;
        }

        // Domain validation
        if (domain.length > 253 || domain.length === 0) {
            return false;
        }

        // Check for valid domain structure
        if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
            return false;
        }

        // Check for valid TLD (top-level domain)
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2 || tld.length > 6) {
            return false;
        }

        // Additional security checks
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /data:\s*text\/html/i,
            /vbscript:/i,
            /expression\s*\(/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(email))) {
            return false;
        }

        // Check for common invalid patterns
        if (email.includes('..') || email.includes('@@') || email.includes('--')) {
            return false;
        }

        return true;
    },

    /**
     * Extract emails from text with enhanced validation
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
            
            // Apply strict validation
            if (this.isValidEmail(email) && !emails.includes(email)) {
                emails.push(email);
            }
        }

        return emails;
    },

    /**
     * Extract emails from page - Comprehensive automatic crawling
     */
    extractEmails: function() {
        // Allow extraction even if Chrome APIs are unavailable; only DOM is required here
        const startTime = performance.now();
        const emails = new Set();

        try {
            console.log('🚀 Email Scraper: Starting automatic email extraction...');

            // 1. Extract from all text content (comprehensive)
            const allTextContent = this.getAllTextContent();
            const textEmails = this.extractFromText(allTextContent);
            textEmails.forEach(email => emails.add(email));

            // 2. Extract from mailto links
            const mailtoEmails = this.extractFromMailtoLinks();
            mailtoEmails.forEach(email => emails.add(email));

            // 3. Extract from data attributes
            const dataEmails = this.extractFromDataAttributes();
            dataEmails.forEach(email => emails.add(email));

            // 4. Extract from input fields
            const inputEmails = this.extractFromInputFields();
            inputEmails.forEach(email => emails.add(email));

            // 5. Extract from meta tags
            const metaEmails = this.extractFromMetaTags();
            metaEmails.forEach(email => emails.add(email));

            // 6. Extract from JSON-LD and structured data
            const structuredEmails = this.extractFromStructuredData();
            structuredEmails.forEach(email => emails.add(email));

            // Filter out false positives and common test emails
            const result = Array.from(emails).filter(email => {
                const falsePositives = [
                    'example@example.com', 'test@test.com', 'user@example.com',
                    'admin@example.com', 'info@example.com', 'contact@example.com',
                    'noreply@example.com', 'no-reply@example.com', 'sample@domain.com',
                    'demo@example.com', 'placeholder@email.com', 'user@domain.com'
                ];
                
                return !falsePositives.includes(email) && 
                       email.length < 100 &&
                       !email.includes('localhost') &&
                       !email.includes('127.0.0.1') &&
                       !email.includes('test.') &&
                       !email.includes('example.') &&
                       !email.includes('demo.');
            });

            const endTime = performance.now();
            console.log(`✅ Email Scraper: Found ${result.length} verified emails in ${(endTime - startTime).toFixed(2)}ms`);

            return result;

        } catch (error) {
            console.error('❌ Email Scraper: Error during extraction:', error);
            return [];
        }
    },

    /**
     * Get all text content from the page comprehensively
     */
    getAllTextContent: function() {
        let allText = '';

        try {
            // Get body text
            if (document.body) {
                allText += document.body.textContent || document.body.innerText || '';
            }

            // Get text from all elements
            const allElements = document.querySelectorAll('*');
            for (let i = 0; i < Math.min(allElements.length, 1000); i++) {
                const element = allElements[i];
                if (element.textContent && element.textContent.trim()) {
                    allText += ' ' + element.textContent.trim();
                }
            }

            // Get text from iframes (if accessible)
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < Math.min(iframes.length, 10); i++) {
                try {
                    const iframe = iframes[i];
                    if (iframe.contentDocument && iframe.contentDocument.body) {
                        allText += ' ' + (iframe.contentDocument.body.textContent || '');
                    }
                } catch (e) {
                    // Cross-origin iframe, skip
                }
            }

        } catch (error) {
            console.warn('Email Scraper: Error getting text content:', error);
        }

        return allText;
    },

    /**
     * Extract emails from mailto links
     */
    extractFromMailtoLinks: function() {
        const emails = [];
        try {
            const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
            for (let i = 0; i < mailtoLinks.length; i++) {
                try {
                    const href = mailtoLinks[i].getAttribute('href');
                    if (href) {
                        const email = href.substring(7).split('?')[0].toLowerCase().trim();
                        if (this.isValidEmail(email)) {
                            emails.push(email);
                        }
                    }
                } catch (e) {
                    // Ignore individual link errors
                }
            }
        } catch (error) {
            console.warn('Email Scraper: Error extracting from mailto links:', error);
        }
        return emails;
    },

    /**
     * Extract emails from data attributes
     */
    extractFromDataAttributes: function() {
        const emails = [];
        try {
            const dataElements = document.querySelectorAll('[data-email], [data-contact], [data-mail]');
            for (let i = 0; i < dataElements.length; i++) {
                try {
                    const element = dataElements[i];
                    const dataEmail = element.getAttribute('data-email') || 
                                    element.getAttribute('data-contact') || 
                                    element.getAttribute('data-mail');
                    if (dataEmail && this.isValidEmail(dataEmail)) {
                        emails.push(dataEmail.toLowerCase().trim());
                    }
                } catch (e) {
                    // Ignore individual element errors
                }
            }
        } catch (error) {
            console.warn('Email Scraper: Error extracting from data attributes:', error);
        }
        return emails;
    },

    /**
     * Extract emails from input fields
     */
    extractFromInputFields: function() {
        const emails = [];
        try {
            const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email"]');
            for (let i = 0; i < emailInputs.length; i++) {
                try {
                    const input = emailInputs[i];
                    const value = input.value || input.defaultValue || input.placeholder;
                    if (value && this.isValidEmail(value)) {
                        emails.push(value.toLowerCase().trim());
                    }
                } catch (e) {
                    // Ignore individual input errors
                }
            }
        } catch (error) {
            console.warn('Email Scraper: Error extracting from input fields:', error);
        }
        return emails;
    },

    /**
     * Extract emails from meta tags
     */
    extractFromMetaTags: function() {
        const emails = [];
        try {
            const metaTags = document.querySelectorAll('meta');
            for (let i = 0; i < metaTags.length; i++) {
                try {
                    const meta = metaTags[i];
                    const content = meta.getAttribute('content');
                    if (content && this.isValidEmail(content)) {
                        emails.push(content.toLowerCase().trim());
                    }
                } catch (e) {
                    // Ignore individual meta tag errors
                }
            }
        } catch (error) {
            console.warn('Email Scraper: Error extracting from meta tags:', error);
        }
        return emails;
    },

    /**
     * Extract emails from structured data (JSON-LD, etc.)
     */
    extractFromStructuredData: function() {
        const emails = [];
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const script = scripts[i];
                    const content = script.textContent || script.innerHTML;
                    if (content) {
                        const jsonData = JSON.parse(content);
                        const extracted = this.extractEmailsFromObject(jsonData);
                        extracted.forEach(email => emails.push(email));
                    }
                } catch (e) {
                    // Invalid JSON, skip
                }
            }
        } catch (error) {
            console.warn('Email Scraper: Error extracting from structured data:', error);
        }
        return emails;
    },

    /**
     * Recursively extract emails from object
     */
    extractEmailsFromObject: function(obj) {
        const emails = [];
        if (typeof obj === 'string') {
            if (this.isValidEmail(obj)) {
                emails.push(obj.toLowerCase().trim());
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const extracted = this.extractEmailsFromObject(obj[key]);
                    extracted.forEach(email => emails.push(email));
                }
            }
        }
        return emails;
    }
};

/**
 * Auto-detect emails on page load and notify popup automatically
 */
function autoDetectEmails() {
    try {
        console.log('🔍 Email Scraper: Starting automatic email detection...');
        const emails = EmailExtractor.extractEmails();
        
        if (emails.length > 0) {
            console.log(`✅ Email Scraper: Auto-detected ${emails.length} verified emails`);
            
            const pageData = {
                emails: emails,
                url: window.location.href,
                detectedAt: Date.now(),
                source: 'automatic-detection'
            };

            // Use Chrome storage and messaging only if APIs are available
            if (isContextValid()) {
                try {
                    chrome.storage.local.set({ pageData }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('❌ Email Scraper: Failed to store emails locally:', chrome.runtime.lastError);
                        } else {
                            console.log('✅ Email Scraper: Emails stored locally successfully');
                        }
                    });
                } catch (storageError) {
                    console.error('❌ Email Scraper: Local storage operation failed:', storageError);
                }

                // Send to background script for badge update and popup notification
                sendMessageSafely({
                    type: 'storePageEmails',
                    pageData: pageData
                }, (response) => {
                    if (response && response.success) {
                        console.log('✅ Email Scraper: Background storage successful');
                        
                        // Also send a notification to any open popup
                        sendMessageSafely({
                            type: 'emailsDetected',
                            emails: emails,
                            count: emails.length,
                            url: window.location.href
                        });
                        
                    } else {
                        console.error('❌ Email Scraper: Background storage failed');
                    }
                });
            }

            // Always show visual notification
            showEmailDetectionNotification(emails.length);
            
        } else {
            console.log('🔍 Email Scraper: No verified emails found on page');
        }

    } catch (error) {
        console.error('❌ Email Scraper: Auto-detection failed:', error.message);
    }
}

/**
 * Show visual notification that emails were detected
 */
function showEmailDetectionNotification(emailCount) {
    try {
        // Create a notification banner
        const notification = document.createElement('div');
        notification.id = 'email-scraper-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: slideDown 0.5s ease-out;
            cursor: pointer;
        `;
        
        notification.innerHTML = `
            📧 ${emailCount} verified email${emailCount > 1 ? 's' : ''} detected! 
            <span style="font-size: 12px; opacity: 0.8;">Click extension icon to view</span>
        `;
        
        // Add animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideDown 0.5s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 8000);
        
        // Click to remove
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('🎨 Email Scraper: Detection notification displayed');
        
    } catch (error) {
        console.warn('Email Scraper: Could not show detection notification:', error.message);
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

    console.log('🚀 Email Scraper: Initializing automatic email detection system');

    try {
        // Automatic email extraction - no waiting for user interaction
        if (document.readyState === 'loading') {
            // Wait for DOM to be ready, then extract automatically
            console.log('📄 Email Scraper: DOM still loading, waiting for DOMContentLoaded');
            addListener(document, 'DOMContentLoaded', () => {
                if (isContextValid()) {
                    console.log('✅ Email Scraper: DOM loaded, starting automatic email extraction');
                    // Start automatic extraction after a short delay to ensure page is fully loaded
                    setTimer(() => {
                        console.log('🔍 Email Scraper: Starting automatic email detection...');
                        autoDetectEmails();
                    }, 2000); // 2 second delay for better results
                } else {
                    console.warn('⚠️ Email Scraper: Context became invalid while waiting for DOM');
                }
            });
        } else {
            // Page already loaded, start extraction immediately
            console.log('✅ Email Scraper: DOM already loaded, starting automatic email extraction');
            setTimer(() => {
                console.log('🔍 Email Scraper: Starting automatic email detection...');
                autoDetectEmails();
            }, 1000); // 1 second delay for better results
        }

        // Cleanup on page unload
        addListener(window, 'beforeunload', () => {
            console.log('🔄 Email Scraper: Page unloading, cleaning up');
            cleanupAll();
        });

        console.log('✅ Email Scraper: Automatic email detection system initialized successfully');
        
    } catch (error) {
        console.error('❌ Email Scraper: Error during email scraper initialization:', error.message);
    }
}

// Initialize if we have the required APIs
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    console.log('🌐 Email Scraper: Document and window APIs available, starting initialization');
    
    // Add a small delay to ensure Chrome extension context is ready
    setTimeout(() => {
        startInitialization();
    }, 500);
    
} else {
    console.error('❌ Email Scraper: Required APIs not available');
}
