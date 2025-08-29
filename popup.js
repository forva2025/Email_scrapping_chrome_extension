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
     * @param {string} format - Export format (csv, json, txt)
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
                case 'txt':
                default:
                    content = extractedEmails.join('\n');
                    filename = 'emails.txt';
                    mimeType = 'text/plain';
                    break;
            }

            // Create and trigger download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });

            URL.revokeObjectURL(url);
            utils.showStatus(`Exported ${extractedEmails.length} emails as ${format.toUpperCase()}`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            utils.showStatus('Export failed. Please try again.', 'error');
        }
    }
};

/**
 * Chrome Extension Communication
 */
const chromeComm = {
    /**
     * Extracts emails from current active tab
     */
    extractEmails: async () => {
        if (isExtracting) return;

        isExtracting = true;
        elements.extractBtn.disabled = true;
        elements.extractText.innerHTML = '<span class="loading"></span>Extracting...';

        try {
            // Check if chrome.scripting is available
            if (!chrome.scripting || !chrome.scripting.executeScript) {
                console.error('Email Scraper: chrome.scripting API not available');
                throw new Error('Scripting API not available. Please check extension permissions.');
            }

            // First, try to get pre-detected emails from storage
            const result = await chrome.storage.local.get(['currentPageEmails']);
            const pageData = result.currentPageEmails;

            if (pageData && pageData.emails && pageData.emails.length > 0) {
                // Use pre-detected emails
                emailManager.addEmails(pageData.emails);
                utils.showStatus(`Found ${pageData.emails.length} email(s)`, 'success');
            } else {
                // Fallback: manually extract emails
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab) {
                    throw new Error('No active tab found');
                }

                console.log('Email Scraper: Executing script on tab:', tab.id, tab.url);

                let emails = [];

                try {
                    // Try chrome.scripting first
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            // Call the extraction function directly
                            return extractEmailsFromPage();
                        }
                    });

                    console.log('Email Scraper: Script execution results:', results);
                    emails = results[0]?.result || [];

                } catch (scriptingError) {
                    console.warn('Email Scraper: chrome.scripting failed, trying content script messaging:', scriptingError);

                    // Fallback: Try to communicate with existing content script
                    try {
                        const response = await new Promise((resolve, reject) => {
                            chrome.tabs.sendMessage(tab.id, {
                                type: 'extractEmails'
                            }, (response) => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            });
                        });

                        if (response && response.emails) {
                            emails = response.emails;
                            console.log('Email Scraper: Content script messaging successful');
                        }

                    } catch (messagingError) {
                        console.error('Email Scraper: Content script messaging also failed:', messagingError);
                        throw new Error('Both scripting methods failed. Content script may not be loaded.');
                    }
                }

                if (emails.length > 0) {
                    emailManager.addEmails(emails);
                    utils.showStatus(`Found ${emails.length} email(s)`, 'success');
                } else {
                    utils.showStatus('No emails found on this page', 'warning');
                }
            }

        } catch (error) {
            console.error('Extraction failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            // Provide more specific error messages
            let errorMessage = 'Failed to extract emails. ';
            if (error.message.includes('Scripting API')) {
                errorMessage += 'Extension permissions may be missing.';
            } else if (error.message.includes('active tab')) {
                errorMessage += 'No active tab found.';
            } else {
                errorMessage += 'Please try again.';
            }

            utils.showStatus(errorMessage, 'error');
        } finally {
            isExtracting = false;
            elements.extractBtn.disabled = false;
            elements.extractText.textContent = 'Extract Emails';
        }
    }
};

/**
 * Load current page emails and update UI - Optimized for speed
 */
const loadCurrentPageEmails = () => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab) {
            console.error('Email Scraper: No active tab found');
            elements.pageInfo.textContent = 'No active tab';
            return;
        }

        // Update page info immediately
        elements.pageInfo.textContent = currentTab.title || 'Current page';

        // Check for stored emails (fast check)
        chrome.storage.local.get(['pageData'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Email Scraper: Storage error:', chrome.runtime.lastError);
                elements.autoDetectStatus.textContent = '❌ Storage error';
                return;
            }

            const pageData = result.pageData;

            if (pageData && pageData.url === currentTab.url && pageData.emails && pageData.emails.length > 0) {
                // Show stored emails immediately
                const emailCount = pageData.emails.length;
                elements.emailCount.textContent = `Emails found: ${emailCount}`;
                elements.autoDetectStatus.textContent = `✅ ${emailCount} emails found`;
                elements.autoDetectStatus.className = 'status-indicator found';

                // Display emails
                emailManager.displayEmails(pageData.emails);
                elements.exportBtn.disabled = false;
                extractedEmails = pageData.emails;

                console.log(`Email Scraper: Loaded ${emailCount} stored emails for ${currentTab.url}`);
            } else {
                // No stored emails - show ready state
                elements.emailCount.textContent = 'Emails found: 0';
                elements.autoDetectStatus.textContent = '🔍 Ready to scan';
                elements.autoDetectStatus.className = 'status-indicator';
                elements.emailList.classList.add('hidden');
                elements.exportBtn.disabled = true;

                console.log(`Email Scraper: No stored emails for ${currentTab.url} - ready for manual scan`);
            }
        });
    });
};

/**
 * Refresh email detection for current page
 */
const refreshEmailDetection = () => {
    console.log('Email Scraper: Manual refresh requested');

    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab) {
            utils.showStatus('No active tab found', 'error');
            return;
        }

        // Show scanning status
        elements.autoDetectStatus.textContent = '🔄 Refreshing...';
        elements.autoDetectStatus.className = 'status-indicator scanning';

        // Send message to content script to re-scan
        chrome.tabs.sendMessage(currentTab.id, {
            type: 'refreshDetection'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Email Scraper: Refresh failed:', chrome.runtime.lastError);
                console.error('Error details:', {
                    message: chrome.runtime.lastError.message,
                    tabId: currentTab.id,
                    url: currentTab.url
                });
                utils.showStatus(`Refresh failed: ${chrome.runtime.lastError.message}`, 'error');
                elements.autoDetectStatus.textContent = '❌ Refresh failed';
                elements.autoDetectStatus.className = 'status-indicator';
            } else {
                console.log('Email Scraper: Refresh initiated, response:', response);
                utils.showStatus('Refreshing email detection...', 'success');

                // Reload current page emails after a short delay
                setTimeout(() => {
                    loadCurrentPageEmails();
                }, 1500);
            }
        });
    });
};

/**
 * Event Listeners
 */
const setupEventListeners = () => {
    // Extract emails button
    elements.extractBtn.addEventListener('click', chromeComm.extractEmails);

    // Refresh detection button
    elements.refreshBtn.addEventListener('click', refreshEmailDetection);

    // Clear emails button
    elements.clearBtn.addEventListener('click', emailManager.clearEmails);

    // Export emails button
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl+Shift+E or Cmd+Shift+E to extract
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
            event.preventDefault();
            chromeComm.extractEmails();
        }

        // Ctrl+Shift+R or Cmd+Shift+R to refresh
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
            event.preventDefault();
            refreshEmailDetection();
        }
    });
};

/**
 * Fast Initialization - Optimized for speed
 */
const initialize = () => {
    // Setup event listeners immediately
    setupEventListeners();

    // Load current page emails immediately (no delays)
    loadCurrentPageEmails();

    // Update UI elements immediately
    utils.updateEmailCount();
};

// Initialize immediately when script loads
initialize();

// Save emails when popup closes
window.addEventListener('beforeunload', () => {
    chrome.storage.local.set({ extractedEmails: extractedEmails });
});