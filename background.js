/**
 * Email Scraper Extension - Background Script
 * Handles extension lifecycle and provides additional security layer
 * @author OCHIRIA ELIAS ONYAIT
 * @version 1.1.0
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
                maxEmails: 1000,
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
                    if (tabs[0] && tabs[0].id) {
                        // Validate tab still exists before sending message
                        chrome.tabs.get(tabs[0].id, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.warn(`Background: Tab ${tabs[0].id} no longer exists for keyboard shortcut`);
                                return;
                            }
                            
                        console.log('Background: Sending extract emails message to tab:', tabs[0].id);
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'extractEmails' }, (response) => {
                            if (chrome.runtime.lastError) {
                                    console.error('Background: Failed to send keyboard shortcut message:', chrome.runtime.lastError.message);
                            } else {
                                console.log('Background: Keyboard shortcut message sent successfully');
                            }
                            });
                        });
                    } else {
                        console.warn('Background: No active tab found for keyboard shortcut');
                    }
                } catch (tabError) {
                    console.error('Background: Error in tab query callback:', tabError.message);
                }
            });
        }
    } catch (commandError) {
        console.error('Background: Error in command listener:', commandError.message);
    }
});

// Enhanced message handler for better email management
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        // Fast validation
        if (!message || !message.type) {
            sendResponse({ success: false, error: 'Invalid message' });
            return true;
        }

        // Validate sender tab exists before processing
        if (sender.tab && sender.tab.id) {
            chrome.tabs.get(sender.tab.id, (tab) => {
                if (chrome.runtime.lastError) {
                    console.warn(`Background: Tab ${sender.tab.id} no longer exists, ignoring message`);
                    sendResponse({ success: false, error: 'Tab no longer exists' });
                    return;
                }
                processMessage(message, sender, sendResponse);
            });
        } else {
            // No tab context, process message normally
            processMessage(message, sender, sendResponse);
        }

        return true; // Async response

    } catch (error) {
        console.error('Background: Message error:', error.message);
        sendResponse({ success: false, error: error.message });
        return true;
    }
});

/**
 * Process message after tab validation
 */
function processMessage(message, sender, sendResponse) {
    try {
        switch (message.type) {
            case 'storePageEmails':
                // Store page emails with metadata
                if (message.pageData && Array.isArray(message.pageData.emails)) {
                    const pageData = {
                        ...message.pageData,
                        storedAt: Date.now(),
                        tabId: sender.tab?.id,
                        url: sender.tab?.url
                    };

                    chrome.storage.local.set({
                        pageData: pageData
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Background: Storage failed:', chrome.runtime.lastError);
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            // Update badge with proper error handling
                            updateBadge(pageData.emails.length, sender.tab?.id);
                            sendResponse({ success: true, count: pageData.emails.length });
                        }
                    });
                } else {
                    sendResponse({ success: false, error: 'Invalid page data' });
                }
                break;

            case 'getStoredEmails':
                // Retrieve stored emails
                chrome.storage.local.get(['extractedEmails'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ 
                            success: true, 
                            emails: result.extractedEmails || [],
                            count: (result.extractedEmails || []).length
                        });
                    }
                });
                break;

            case 'clearStoredEmails':
                // Clear stored emails
                chrome.storage.local.remove(['extractedEmails', 'pageData'], () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        // Clear badge with proper error handling
                        updateBadge(0, sender.tab?.id);
                        sendResponse({ success: true });
                    }
                });
                break;

            case 'addEmails':
                // Add new emails to storage
                if (message.emails && Array.isArray(message.emails)) {
                    chrome.storage.local.get(['extractedEmails'], (result) => {
                        const currentEmails = result.extractedEmails || [];
                        const newEmails = [...currentEmails, ...message.emails];
                        
                        // Remove duplicates if requested
                        const finalEmails = message.removeDuplicates ? 
                            [...new Set(newEmails)] : newEmails;

                        chrome.storage.local.set({ extractedEmails: finalEmails }, () => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                            } else {
                                updateBadge(finalEmails.length, sender.tab?.id);
                                sendResponse({ success: true, count: finalEmails.length });
                            }
                        });
                    });
                } else {
                    sendResponse({ success: false, error: 'Invalid emails data' });
                }
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Background: Message processing error:', error.message);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Check if a tab exists before updating its badge
 * @param {number} tabId - Tab ID to check
 * @returns {Promise<boolean>} - True if tab exists
 */
async function tabExists(tabId) {
    try {
        if (!tabId || typeof tabId !== 'number') {
            return false;
        }
        
        const tab = await chrome.tabs.get(tabId);
        return !!tab && tab.id === tabId;
    } catch (error) {
        // Tab doesn't exist or is inaccessible
        return false;
    }
}

/**
 * Update extension badge with email count - Enhanced error handling
 * @param {number} count - Number of emails found
 * @param {number} tabId - Tab ID to update badge for
 */
async function updateBadge(count, tabId) {
    try {
        // Validate tab exists before updating badge
        if (tabId && !(await tabExists(tabId))) {
            console.log(`Background: Tab ${tabId} no longer exists, skipping badge update`);
            return;
        }

        if (count > 0) {
            // Set badge text
            const badgeText = count > 99 ? '99+' : count.toString();

            if (tabId) {
                // Update badge for specific tab
            chrome.action.setBadgeText({
                text: badgeText,
                tabId: tabId
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Background: Failed to set badge text for tab ${tabId}:`, chrome.runtime.lastError.message);
                    }
            });

                // Set badge color for specific tab
            chrome.action.setBadgeBackgroundColor({
                color: '#28a745',
                tabId: tabId
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Background: Failed to set badge color for tab ${tabId}:`, chrome.runtime.lastError.message);
                    }
                });
            } else {
                // Update global badge
                chrome.action.setBadgeText({
                    text: badgeText
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Background: Failed to set global badge text:', chrome.runtime.lastError.message);
                    }
                });

                chrome.action.setBadgeBackgroundColor({
                    color: '#28a745'
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Background: Failed to set global badge color:', chrome.runtime.lastError.message);
                    }
                });
            }
        } else {
            // Clear badge
            if (tabId) {
                // Clear badge for specific tab
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Background: Failed to clear badge for tab ${tabId}:`, chrome.runtime.lastError.message);
                    }
                });
            } else {
                // Clear global badge
                chrome.action.setBadgeText({
                    text: ''
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Background: Failed to clear global badge:', chrome.runtime.lastError.message);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Background: Error updating badge:', error.message);
    }
}

// Clear badge when tab is closed or URL changes with enhanced error handling
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    try {
        if (changeInfo.status === 'loading') {
            console.log('Background: Clearing badge for loading tab:', tabId);
            // Clear badge when page starts loading
            updateBadge(0, tabId);
        }
    } catch (tabUpdateError) {
        console.error('Background: Error in tab update listener:', tabUpdateError.message);
    }
});

// Handle tab removal to clean up badges
chrome.tabs.onRemoved.addListener((tabId) => {
    try {
        console.log('Background: Tab removed, clearing badge for tab:', tabId);
        // Clear badge for removed tab
        updateBadge(0, tabId);
    } catch (error) {
        console.error('Background: Error clearing badge for removed tab:', error.message);
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