/**
 * Email Scraper Extension - Background Script
 * Handles extension lifecycle and provides additional security layer
 * @author OCHIRIA ELIAS ONYAIT
 * @version 1.0.0
 */

// Background script for handling extension lifecycle and security
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Email Scraper Extension installed successfully');

        // Initialize default settings
        chrome.storage.local.set({
            extractedEmails: [],
            settings: {
                removeDuplicates: true,
                maxEmails: 500,
                exportFormat: 'csv'
            }
        });
    } else if (details.reason === 'update') {
        console.log('Email Scraper Extension updated');
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'extract-emails') {
        // Get the active tab and send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'extractEmails' });
            }
        });
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only accept messages from our own extension
    if (sender.id !== chrome.runtime.id) {
        console.warn('Unauthorized message received');
        return;
    }

    // Handle different message types with validation
    switch (message.type) {
        case 'storePageEmails':
            // Store page emails and update badge
            if (message.pageData && Array.isArray(message.pageData.emails)) {
                const pageData = message.pageData;

                // Validate email format before storing
                const validEmails = pageData.emails.filter(email =>
                    typeof email === 'string' &&
                    email.length > 0 &&
                    email.length <= 254 &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                );

                // Update page data with validated emails
                const validatedPageData = {
                    ...pageData,
                    emails: validEmails,
                    count: validEmails.length
                };

                // Store page emails
                chrome.storage.local.set({
                    currentPageEmails: validatedPageData
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to store page emails:', chrome.runtime.lastError);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log(`Stored ${validEmails.length} emails for page: ${pageData.url}`);
                        // Update badge for the tab
                        updateBadge(validEmails.length, sender.tab?.id);
                        sendResponse({ success: true, count: validEmails.length });
                    }
                });
            } else {
                sendResponse({ success: false, error: 'Invalid page data' });
            }
            break;

        case 'pageEmailsDetected':
            // Update extension badge with email count
            updateBadge(message.count, sender.tab?.id);
            sendResponse({ success: true });
            break;

        case 'emailsExtracted':
            if (Array.isArray(message.emails)) {
                // Validate email format before storing
                const validEmails = message.emails.filter(email =>
                    typeof email === 'string' &&
                    email.length > 0 &&
                    email.length <= 254 &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                );

                // Store validated emails
                chrome.storage.local.get(['extractedEmails'], (result) => {
                    const existingEmails = result.extractedEmails || [];
                    const allEmails = [...existingEmails, ...validEmails];

                    // Remove duplicates and limit size
                    const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase()))].slice(0, 1000);

                    chrome.storage.local.set({ extractedEmails: uniqueEmails });
                });

                sendResponse({ success: true, count: validEmails.length });
            }
            break;

        case 'getSettings':
            chrome.storage.local.get(['settings'], (result) => {
                sendResponse(result.settings || {});
            });
            break;

        default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ error: 'Unknown message type' });
    }

    // Return true to indicate async response
    return true;
});

/**
 * Update extension badge with email count
 * @param {number} count - Number of emails found
 * @param {number} tabId - Tab ID to update badge for
 */
function updateBadge(count, tabId) {
    try {
        if (count > 0) {
            // Set badge text
            const badgeText = count > 99 ? '99+' : count.toString();

            chrome.action.setBadgeText({
                text: badgeText,
                tabId: tabId
            });

            // Set badge color (green for emails found)
            chrome.action.setBadgeBackgroundColor({
                color: '#28a745',
                tabId: tabId
            });
        } else {
            // Clear badge if no emails
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
            });
        }
    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

// Clear badge when tab is closed or URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        // Clear badge when page starts loading
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
    }
});


// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
    console.log('Email Scraper Extension suspending');
});

// Periodic cleanup of old data (optional)
setInterval(() => {
    chrome.storage.local.get(['extractedEmails'], (result) => {
        const emails = result.extractedEmails || [];
        if (emails.length > 1000) {
            // Keep only the most recent 500 emails
            const trimmedEmails = emails.slice(-500);
            chrome.storage.local.set({ extractedEmails: trimmedEmails });
        }
    });
}, 3600000); // Run every hour