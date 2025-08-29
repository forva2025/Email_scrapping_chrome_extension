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

// Handle keyboard shortcuts with error handling
chrome.commands.onCommand.addListener((command) => {
    try {
        if (command === 'extract-emails') {
            console.log('Background: Keyboard shortcut triggered for email extraction');

            // Get the active tab and send message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                try {
                    if (tabs[0]) {
                        console.log('Background: Sending extract emails message to tab:', tabs[0].id);
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'extractEmails' }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Background: Failed to send keyboard shortcut message:', chrome.runtime.lastError);
                            } else {
                                console.log('Background: Keyboard shortcut message sent successfully');
                            }
                        });
                    } else {
                        console.warn('Background: No active tab found for keyboard shortcut');
                    }
                } catch (tabError) {
                    console.error('Background: Error in tab query callback:', tabError);
                }
            });
        }
    } catch (commandError) {
        console.error('Background: Error in command listener:', commandError);
    }
});

// Optimized message handler - Fast and simple
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        // Fast validation
        if (!message || !message.type) {
            sendResponse({ success: false, error: 'Invalid message' });
            return true;
        }

        switch (message.type) {
            case 'storePageEmails':
                // Fast storage of page emails
                if (message.pageData && Array.isArray(message.pageData.emails)) {
                    const pageData = {
                        ...message.pageData,
                        storedAt: Date.now()
                    };

                    chrome.storage.local.set({
                        pageData: pageData
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Background: Storage failed:', chrome.runtime.lastError);
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            // Update badge
                            updateBadge(pageData.emails.length, sender.tab?.id);
                            sendResponse({ success: true, count: pageData.emails.length });
                        }
                    });
                } else {
                    sendResponse({ success: false, error: 'Invalid page data' });
                }
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }

        return true; // Async response

    } catch (error) {
        console.error('Background: Message error:', error.message);
        sendResponse({ success: false, error: error.message });
        return true;
    }
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

// Clear badge when tab is closed or URL changes with error handling
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    try {
        if (changeInfo.status === 'loading') {
            console.log('Background: Clearing badge for loading tab:', tabId);
            // Clear badge when page starts loading
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Background: Failed to clear badge:', chrome.runtime.lastError);
                }
            });
        }
    } catch (tabUpdateError) {
        console.error('Background: Error in tab update listener:', tabUpdateError);
    }
});


// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
    console.log('Email Scraper Extension suspending');
});

// Simple cleanup on extension suspend
chrome.runtime.onSuspend.addListener(() => {
    console.log('Background: Extension suspending');
});