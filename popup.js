/**
 * Email Scraper Extension - Popup Script
 * Handles user interactions and manages email extraction functionality
 * @author OCHIRIA ELIAS ONYAIT
 * @version 1.0.0
 */

// DOM Elements - Centralized for easy maintenance
const elements = {
    extractBtn: document.getElementById('extractBtn'),
    clearBtn: document.getElementById('clearBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportBtn: document.getElementById('exportBtn'),
    exportFormat: document.getElementById('exportFormat'),
    removeDuplicates: document.getElementById('removeDuplicates'),
    statusMessage: document.getElementById('statusMessage'),
    emailList: document.getElementById('emailList'),
    emailCount: document.getElementById('emailCount'),
    extractText: document.getElementById('extractText'),
    autoDetectStatus: document.getElementById('autoDetectStatus'),
    pageInfo: document.getElementById('pageInfo')
};

// Application State
let extractedEmails = [];
let isExtracting = false;

/**
 * Utility Functions
 */
const utils = {
    /**
     * Shows status message to user
     * @param {string} message - Message to display
     * @param {string} type - Type of message (success, warning, error)
     */
    showStatus: (message, type = 'success') => {
        const statusEl = elements.statusMessage;
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    },

    /**
     * Updates the email count display
     */
    updateEmailCount: () => {
        elements.emailCount.textContent = `Emails found: ${extractedEmails.length}`;
    },

    /**
     * Removes duplicate emails from array
     * @param {Array} emails - Array of email addresses
     * @returns {Array} - Array with duplicates removed
     */
    removeDuplicates: (emails) => {
        return [...new Set(emails.map(email => email.toLowerCase()))];
    },

    /**
     * Validates email format using regex
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Sanitizes and validates extracted emails
     * @param {Array} emails - Raw email array
     * @param {boolean} removeDupes - Whether to remove duplicates
     * @returns {Array} - Cleaned and validated emails
     */
    sanitizeEmails: (emails, removeDupes = true) => {
        if (!Array.isArray(emails)) {
            console.warn('sanitizeEmails: Input must be an array');
            return [];
        }

        let cleaned = emails
            .filter(email => email && typeof email === 'string')
            .map(email => {
                // Additional sanitization: remove potential XSS vectors
                const sanitized = email.trim().toLowerCase();
                // Remove any HTML tags or script content
                return sanitized.replace(/<[^>]*>/g, '').substring(0, 254);
            })
            .filter(email => {
                // Additional security check: ensure email doesn't contain suspicious patterns
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i,
                    /data:\s*text\/html/i
                ];
                return email.length > 0 &&
                       email.length <= 254 &&
                       !suspiciousPatterns.some(pattern => pattern.test(email)) &&
                       utils.isValidEmail(email);
            });

        if (removeDupes) {
            cleaned = utils.removeDuplicates(cleaned);
        }

        // Limit array size for security
        return cleaned.slice(0, 1000);
    }
};

/**
 * Email Management Functions
 */
const emailManager = {
    /**
     * Displays emails in the UI
     * @param {Array} emails - Emails to display
     */
    displayEmails: (emails) => {
        const emailListEl = elements.emailList;

        if (emails.length === 0) {
            emailListEl.classList.add('hidden');
            return;
        }

        emailListEl.innerHTML = '';
        emailListEl.classList.remove('hidden');

        emails.forEach((email, index) => {
            const emailItem = document.createElement('div');
            emailItem.className = 'email-item';
            emailItem.textContent = email;
            emailItem.setAttribute('role', 'listitem');
            emailListEl.appendChild(emailItem);
        });
    },

    /**
     * Adds emails to the collection
     * @param {Array} newEmails - New emails to add
     */
    addEmails: (newEmails) => {
        const removeDupes = elements.removeDuplicates.checked;
        const allEmails = [...extractedEmails, ...newEmails];
        extractedEmails = utils.sanitizeEmails(allEmails, removeDupes);

        emailManager.displayEmails(extractedEmails);
        utils.updateEmailCount();

        // Enable export button if we have emails
        elements.exportBtn.disabled = extractedEmails.length === 0;
    },

    /**
     * Clears all extracted emails
     */
    clearEmails: () => {
        extractedEmails = [];
        emailManager.displayEmails(extractedEmails);
        utils.updateEmailCount();
        elements.exportBtn.disabled = true;
        utils.showStatus('Email list cleared', 'success');
    },

    /**
     * Exports emails in specified format
     * @param {string} format - Export format (csv, json, txt, pdf)
     */
    exportEmails: async (format) => {
        if (extractedEmails.length === 0) {
            utils.showStatus('No emails to export', 'warning');
            return;
        }

        try {
            let content = '';
            let filename = '';
            let mimeType = '';

            switch (format) {
                case 'csv':
                    content = 'Email\n' + extractedEmails.join('\n');
                    filename = 'emails.csv';
                    mimeType = 'text/csv';
                    break;
                case 'json':
                    content = JSON.stringify({ emails: extractedEmails, count: extractedEmails.length, exportedAt: new Date().toISOString() }, null, 2);
                    filename = 'emails.json';
                    mimeType = 'application/json';
                    break;
                case 'pdf':
                    await exportAsPDF();
                    return;
                case 'txt':
                default:
                    content = extractedEmails.join('\n');
                    filename = 'emails.txt';
                    mimeType = 'text/plain';
                    break;
            }

            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, () => {
                URL.revokeObjectURL(url);
                utils.showStatus(`Exported ${extractedEmails.length} emails as ${format.toUpperCase()}`, 'success');
            });

        } catch (error) {
            console.error('Export error:', error);
            utils.showStatus('Export failed: ' + error.message, 'error');
        }
    }
};

/**
 * PDF Export Function
 */
async function exportAsPDF() {
    try {
        // Create a simple HTML structure for PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Extracted Emails</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #007bff; }
                    .email { padding: 5px; margin: 2px 0; background: #f8f9fa; border-left: 3px solid #007bff; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { margin: 20px 0; padding: 15px; background: #e9ecef; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Extracted Email Addresses</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                <div class="stats">
                    <strong>Total Emails Found:</strong> ${extractedEmails.length}
                </div>
                <h2>Email List:</h2>
                ${extractedEmails.map(email => `<div class="email">${email}</div>`).join('')}
            </body>
            </html>
        `;

        // Convert HTML to PDF using jsPDF (if available) or fallback to print
        try {
            // Try to use jsPDF if available
            if (typeof window.jsPDF !== 'undefined') {
                const { jsPDF } = window.jsPDF;
                const doc = new jsPDF();
                
                doc.setFontSize(16);
                doc.text('Extracted Email Addresses', 20, 20);
                doc.setFontSize(12);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
                doc.text(`Total Emails: ${extractedEmails.length}`, 20, 40);
                
                let yPos = 60;
                extractedEmails.forEach((email, index) => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(`${index + 1}. ${email}`, 20, yPos);
                    yPos += 10;
                });
                
                doc.save('emails.pdf');
                utils.showStatus('PDF exported successfully', 'success');
            } else {
                // Fallback: Open in new window for printing
                const newWindow = window.open('', '_blank');
                newWindow.document.write(htmlContent);
                newWindow.document.close();
                newWindow.print();
                utils.showStatus('PDF export opened for printing', 'success');
            }
        } catch (pdfError) {
            // Final fallback: download as HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            chrome.downloads.download({
                url: url,
                filename: 'emails.html',
                saveAs: true
            }, () => {
                URL.revokeObjectURL(url);
                utils.showStatus('Exported as HTML (can be converted to PDF)', 'success');
            });
        }

    } catch (error) {
        console.error('PDF export error:', error);
        utils.showStatus('PDF export failed: ' + error.message, 'error');
    }
}

/**
 * Check if content script is loaded on the current tab
 */
async function isContentScriptLoaded(tabId) {
    try {
        // Try to ping the content script
        const response = await chrome.tabs.sendMessage(tabId, { type: 'ping' });
        return response && response.success;
    } catch (error) {
        console.log('Content script not loaded:', error.message);
        return false;
    }
}

/**
 * Force inject content script into the current tab
 */
async function forceInjectContentScript(tabId) {
    try {
        console.log('Force injecting content script into tab:', tabId);
        
        // First, try to inject using chrome.scripting API
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        
        console.log('Content script force injection successful');
        
        // Wait for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify the script is now loaded
        const isLoaded = await isContentScriptLoaded(tabId);
        if (isLoaded) {
            console.log('Content script verification successful');
            return true;
        } else {
            throw new Error('Content script injection succeeded but verification failed');
        }
        
    } catch (error) {
        console.error('Force injection failed:', error);
        throw new Error(`Force injection failed: ${error.message}`);
    }
}

/**
 * Core Email Extraction Functions
 */
const emailExtractor = {
    /**
     * Extracts emails from the current active tab
     */
    extractEmailsFromCurrentPage: async () => {
        if (isExtracting) {
            utils.showStatus('Extraction already in progress', 'warning');
            return;
        }

        isExtracting = true;
        elements.extractBtn.disabled = true;
        elements.extractText.textContent = 'Extracting...';

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Check if we can access the tab
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('Cannot extract emails from this type of page (Chrome internal pages are not supported)');
            }

            console.log('Checking if content script is loaded on tab:', tab.id);
            
            // Check if content script is already loaded
            let contentScriptLoaded = await isContentScriptLoaded(tab.id);
            
            if (!contentScriptLoaded) {
                console.log('Content script not loaded, attempting to inject...');
                utils.showStatus('Content script not loaded. Injecting...', 'warning');
                
                // Try to force inject the content script
                await forceInjectContentScript(tab.id);
                contentScriptLoaded = true;
            }
            
            if (contentScriptLoaded) {
                // Now try to extract emails
                let response = await emailExtractor.tryExtractWithRetry(tab.id);
                
                if (response && response.success) {
                    const emails = response.emails || [];
                    if (emails.length > 0) {
                        emailManager.addEmails(emails);
                        utils.showStatus(`Found ${emails.length} email(s)`, 'success');
                        elements.autoDetectStatus.textContent = `✅ Found ${emails.length}`;
                        elements.autoDetectStatus.className = 'status-indicator found';
                    } else {
                        utils.showStatus('No emails found on this page', 'warning');
                        elements.autoDetectStatus.textContent = '🔍 No emails found';
                        elements.autoDetectStatus.className = 'status-indicator';
                    }
                } else {
                    throw new Error(response?.error || 'Failed to extract emails');
                }
            } else {
                throw new Error('Failed to load content script after injection attempts');
            }

        } catch (error) {
            console.error('Extraction error:', error);
            
            // Provide more specific error messages
            let userMessage = 'Extraction failed';
            if (error.message.includes('Could not establish connection')) {
                userMessage = 'Content script not loaded. Please refresh the page and try again.';
            } else if (error.message.includes('Cannot extract emails from this type of page')) {
                userMessage = error.message;
            } else if (error.message.includes('No active tab found')) {
                userMessage = 'No active tab found. Please ensure you have a webpage open.';
            } else if (error.message.includes('Failed to load content script')) {
                userMessage = 'Content script injection failed. Please reload the extension.';
            } else {
                userMessage = error.message;
            }
            
            utils.showStatus(userMessage, 'error');
            elements.autoDetectStatus.textContent = '❌ Error';
            elements.autoDetectStatus.className = 'status-indicator';
        } finally {
            isExtracting = false;
            elements.extractBtn.disabled = false;
            elements.extractText.textContent = 'Extract Emails';
        }
    },

    /**
     * Try to extract emails with retry mechanism
     */
    tryExtractWithRetry: async (tabId, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Extraction attempt ${attempt}/${maxRetries}`);
                
                // Try to send message to content script
                const response = await chrome.tabs.sendMessage(tabId, { type: 'extractEmails' });
                
                if (response && response.success) {
                    return response;
                } else {
                    throw new Error(response?.error || 'Extraction failed');
                }
                
            } catch (messageError) {
                console.log(`Attempt ${attempt} failed:`, messageError.message);
                
                if (attempt === maxRetries) {
                    // Last attempt failed, try to inject content script
                    console.log('All attempts failed, trying content script injection');
                    return await emailExtractor.injectContentScriptAndExtract(tabId);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    },

    /**
     * Injects content script and extracts emails as fallback
     */
    injectContentScriptAndExtract: async (tabId) => {
        try {
            console.log('Injecting content script into tab:', tabId);
            
            // Inject the content script using chrome.scripting API
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            console.log('Content script injected successfully');
            
            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Now try to send the message again
            const response = await chrome.tabs.sendMessage(tabId, { type: 'extractEmails' });
            
            if (response && response.success) {
                return response;
            } else {
                throw new Error('Content script injection succeeded but extraction failed');
            }
            
        } catch (injectionError) {
            console.error('Content script injection failed:', injectionError);
            throw new Error(`Failed to inject content script: ${injectionError.message}`);
        }
    },

    /**
     * Refreshes email detection on the current page
     */
    refreshDetection: async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'refreshDetection' });
                    utils.showStatus('Detection refreshed', 'success');
                } catch (messageError) {
                    console.log('Refresh failed, content script may not be loaded:', messageError.message);
                    utils.showStatus('Refresh failed - content script not accessible', 'warning');
                }
            }
        } catch (error) {
            console.error('Refresh error:', error);
            utils.showStatus('Refresh failed', 'error');
        }
    }
};

/**
 * Event Handlers
 */
const eventHandlers = {
    /**
     * Initialize event listeners
     */
    init: () => {
        // Extract button
        elements.extractBtn.addEventListener('click', emailExtractor.extractEmailsFromCurrentPage);
        
        // Clear button
    elements.clearBtn.addEventListener('click', emailManager.clearEmails);

        // Refresh button
        elements.refreshBtn.addEventListener('click', emailExtractor.refreshDetection);
        
        // Export button
    elements.exportBtn.addEventListener('click', () => {
        const format = elements.exportFormat.value;
        emailManager.exportEmails(format);
    });

    // Remove duplicates checkbox
    elements.removeDuplicates.addEventListener('change', () => {
        if (extractedEmails.length > 0) {
            const removeDupes = elements.removeDuplicates.checked;
            extractedEmails = utils.sanitizeEmails(extractedEmails, removeDupes);
            emailManager.displayEmails(extractedEmails);
            utils.updateEmailCount();
        }
    });
    }
};

/**
 * Initialize popup
 */
function initializePopup() {
    try {
        // Initialize event handlers
        eventHandlers.init();
        
        // Update page info
        updatePageInfo();
        
        // Load any existing emails from storage
        loadStoredEmails();
        
        // Check content script status
        checkContentScriptStatus();
        
        // Set up message listener for automatic email detection
        setupMessageListener();
        
        console.log('Email Scraper Popup initialized successfully');
        
    } catch (error) {
        console.error('Popup initialization error:', error);
        utils.showStatus('Initialization failed', 'error');
    }
}

/**
 * Set up message listener for automatic email detection
 */
function setupMessageListener() {
    try {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'emailsDetected') {
                console.log('Popup: Received automatic email detection:', message.count, 'emails');
                
                // Automatically add the detected emails
                if (message.emails && Array.isArray(message.emails)) {
                    emailManager.addEmails(message.emails);
                    
                    // Update status
                    elements.autoDetectStatus.textContent = `✅ Found ${message.count}`;
                    elements.autoDetectStatus.className = 'status-indicator found';
                    
                    // Show success message
                    utils.showStatus(`Automatically detected ${message.count} email(s)`, 'success');
                    
                    // Enable export button
                    elements.exportBtn.disabled = false;
                }
                
                sendResponse({ success: true });
                return true;
            }
        });
        
        console.log('Popup: Message listener for automatic detection set up');
        
    } catch (error) {
        console.error('Popup: Error setting up message listener:', error);
    }
}

/**
 * Update page information display
 */
async function updatePageInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            const url = new URL(tab.url);
            elements.pageInfo.textContent = url.hostname;
        }
    } catch (error) {
        console.error('Error updating page info:', error);
        elements.pageInfo.textContent = 'Current page';
    }
}

/**
 * Load emails from storage
 */
async function loadStoredEmails() {
    try {
        const result = await chrome.storage.local.get(['extractedEmails']);
        if (result.extractedEmails && Array.isArray(result.extractedEmails)) {
            extractedEmails = result.extractedEmails;
            emailManager.displayEmails(extractedEmails);
    utils.updateEmailCount();
            elements.exportBtn.disabled = extractedEmails.length === 0;
        }
    } catch (error) {
        console.error('Error loading stored emails:', error);
    }
}

/**
 * Save emails to storage
 */
async function saveEmailsToStorage() {
    try {
        await chrome.storage.local.set({ extractedEmails: extractedEmails });
    } catch (error) {
        console.error('Error saving emails to storage:', error);
    }
}

/**
 * Check if content script is accessible on current tab
 */
async function checkContentScriptStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url) {
            elements.autoDetectStatus.textContent = '🔍 No page loaded';
            return;
        }

        // Check if it's a supported page type
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            elements.autoDetectStatus.textContent = '⚠️ Chrome page (not supported)';
            elements.autoDetectStatus.className = 'status-indicator warning';
            return;
        }

        // Try to ping the content script
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
            
            // Check if we already have emails for this page
            const result = await chrome.storage.local.get(['pageData']);
            if (result.pageData && result.pageData.emails && result.pageData.emails.length > 0) {
                elements.autoDetectStatus.textContent = `✅ Found ${result.pageData.emails.length}`;
                elements.autoDetectStatus.className = 'status-indicator found';
                
                // Load the emails automatically
                emailManager.addEmails(result.pageData.emails);
                elements.exportBtn.disabled = false;
                
                utils.showStatus(`Found ${result.pageData.emails.length} previously detected email(s)`, 'success');
            } else {
                elements.autoDetectStatus.textContent = '🔍 Scanning for emails...';
                elements.autoDetectStatus.className = 'status-indicator scanning';
            }
            
        } catch (pingError) {
            if (pingError.message.includes('Could not establish connection')) {
                elements.autoDetectStatus.textContent = '⚠️ Content script not loaded';
                elements.autoDetectStatus.className = 'status-indicator warning';
                utils.showStatus('Content script not loaded. Click Extract to inject it.', 'warning');
            } else {
                elements.autoDetectStatus.textContent = '❌ Error';
                elements.autoDetectStatus.className = 'status-indicator';
            }
        }
        
    } catch (error) {
        console.error('Error checking content script status:', error);
        elements.autoDetectStatus.textContent = '❌ Status check failed';
        elements.autoDetectStatus.className = 'status-indicator';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}

// Save emails to storage when they change
const originalAddEmails = emailManager.addEmails;
emailManager.addEmails = function(newEmails) {
    originalAddEmails.call(this, newEmails);
    saveEmailsToStorage();
};

const originalClearEmails = emailManager.clearEmails;
emailManager.clearEmails = function() {
    originalClearEmails.call(this);
    saveEmailsToStorage();
};