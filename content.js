/**
 * Email Scraper Extension - Content Script
 * Extracts email addresses from web pages efficiently and ethically
 * @author OCHIRIA ELIAS ONYAIT
 * @version 1.0.0
 */

/**
 * EmailExtractor Class
 * Handles all email extraction logic with performance optimizations
 */
class EmailExtractor {
    constructor() {
        this.extractedEmails = new Set();
        this.emailRegex = null;
        this.initializeRegex();
    }

    /**
     * Initialize email regex patterns for comprehensive matching
     */
    initializeRegex() {
        // Comprehensive email regex that handles most common formats
        // This pattern is more permissive but still validates basic email structure
        const emailPattern = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;

        this.emailRegex = emailPattern;
    }

    /**
     * Extracts emails from text content
     * @param {string} text - Text to search for emails
     * @returns {Array} - Array of found email addresses
     */
    extractFromText(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const emails = [];
        let match;

        // Reset regex lastIndex to ensure consistent results
        this.emailRegex.lastIndex = 0;

        while ((match = this.emailRegex.exec(text)) !== null) {
            const email = match[0].toLowerCase().trim();

            // Additional validation for edge cases
            if (this.isValidEmail(email)) {
                emails.push(email);
            }

            // Prevent infinite loops with very long texts
            if (emails.length > 1000) {
                console.warn('Email extraction stopped at 1000 emails to prevent performance issues');
                break;
            }
        }

        return emails;
    }

    /**
     * Validates email format with additional checks
     * @param {string} email - Email to validate
     * @returns {boolean} - True if email appears valid
     */
    isValidEmail(email) {
        // Basic format validation
        if (!email || email.length > 254) {
            return false;
        }

        // Check for common invalid patterns
        const invalidPatterns = [
            /\.{2,}/,          // Multiple consecutive dots
            /^\./,             // Starts with dot
            /\.$/,             // Ends with dot
            /@.*@/,            // Multiple @ symbols
            /^[^@]*$/,         // No @ symbol
            /@\./,             // @ followed immediately by dot
            /\.@/,             // Dot followed immediately by @
            /^@/,              // Email cannot start with @
        ];

        if (invalidPatterns.some(pattern => pattern.test(email))) {
            return false;
        }

        // Check domain has at least one dot after @
        const atIndex = email.indexOf('@');
        if (atIndex === -1) {
            return false;
        }

        const domain = email.substring(atIndex + 1);
        if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
            return false;
        }

        return true;
    }

    /**
     * Extracts emails from DOM elements
     * @param {NodeList|Array} elements - DOM elements to search
     * @returns {Array} - Array of found email addresses
     */
    extractFromElements(elements) {
        const emails = [];

        // Security: Limit the number of elements to process
        const maxElements = 10000;
        const elementsArray = Array.from(elements).slice(0, maxElements);

        elementsArray.forEach((element, index) => {
            try {
                // Security: Skip elements that might be in sensitive areas
                if (this.isSensitiveElement(element)) {
                    return;
                }

                // Get text content with security checks
                const textContent = this.getSafeTextContent(element);
                const textEmails = this.extractFromText(textContent);
                emails.push(...textEmails);

                // Check attributes that commonly contain emails
                const emailAttributes = ['href', 'src', 'data-email', 'data-contact', 'title', 'alt'];

                emailAttributes.forEach(attr => {
                    try {
                        const attrValue = element.getAttribute(attr);
                        if (attrValue && typeof attrValue === 'string') {
                            // Security: Limit attribute value length
                            const safeAttrValue = attrValue.substring(0, 1000);

                            // Handle mailto: links
                            if (attr === 'href' && safeAttrValue.startsWith('mailto:')) {
                                const email = safeAttrValue.substring(7).split('?')[0]; // Remove query parameters
                                if (this.isValidEmail(email)) {
                                    emails.push(email.toLowerCase().trim());
                                }
                            } else {
                                const attrEmails = this.extractFromText(safeAttrValue);
                                emails.push(...attrEmails);
                            }
                        }
                    } catch (attrError) {
                        // Silently handle attribute errors
                        console.debug('Error processing attribute:', attr, attrError);
                    }
                });

            } catch (error) {
                // Silently handle errors for individual elements
                console.debug('Error processing element:', index, error);
            }
        });

        return emails;
    }

    /**
     * Checks if an element is in a sensitive area that should be avoided
     * @param {Element} element - DOM element to check
     * @returns {boolean} - True if element should be skipped
     */
    isSensitiveElement(element) {
        if (!element || !element.tagName) {
            return true;
        }

        // Skip form inputs, password fields, and other sensitive elements
        const sensitiveSelectors = [
            'input[type="password"]',
            'input[type="email"]',
            'textarea',
            'form',
            'iframe',
            'script',
            'style'
        ];

        return sensitiveSelectors.some(selector => {
            try {
                return element.matches && element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    /**
     * Safely gets text content from an element
     * @param {Element} element - DOM element
     * @returns {string} - Safe text content
     */
    getSafeTextContent(element) {
        try {
            const textContent = element.textContent || element.innerText || '';

            // Security: Limit text content length to prevent performance issues
            return textContent.substring(0, 10000);
        } catch (error) {
            console.debug('Error getting text content:', error);
            return '';
        }
    }

    /**
     * Main extraction method - searches entire document
     * @returns {Array} - Array of unique email addresses found
     */
    extractEmails() {
        console.log('Email Scraper: Starting email extraction...');

        const startTime = performance.now();
        const emails = new Set();

        try {
            // Extract from document body
            const allElements = document.querySelectorAll('*');
            const elementEmails = this.extractFromElements(allElements);
            elementEmails.forEach(email => emails.add(email.toLowerCase().trim()));

            // Extract from common email-containing elements
            const emailSelectors = [
                'a[href*="mailto:"]',
                '[data-email]',
                '.email',
                '.contact-email',
                '[class*="email"]',
                '[id*="email"]'
            ];

            emailSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    const selectorEmails = this.extractFromElements(elements);
                    selectorEmails.forEach(email => emails.add(email.toLowerCase().trim()));
                } catch (error) {
                    console.debug('Error with selector:', selector, error);
                }
            });

            // Extract from JSON-LD structured data
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    const jsonText = JSON.stringify(data);
                    const jsonEmails = this.extractFromText(jsonText);
                    jsonEmails.forEach(email => emails.add(email.toLowerCase().trim()));
                } catch (error) {
                    // Silently handle JSON parsing errors
                }
            });

            // Extract from meta tags
            const metaTags = document.querySelectorAll('meta[name*="email"], meta[property*="email"]');
            const metaEmails = this.extractFromElements(metaTags);
            metaEmails.forEach(email => emails.add(email.toLowerCase().trim()));

        } catch (error) {
            console.error('Email extraction error:', error);
        }

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        const result = Array.from(emails);
        console.log(`Email Scraper: Found ${result.length} unique emails in ${duration}ms`);

        return result;
    }

    /**
     * Filters out common false positives
     * @param {Array} emails - Array of emails to filter
     * @returns {Array} - Filtered array of emails
     */
    filterFalsePositives(emails) {
        const falsePositives = [
            // Common placeholder emails
            'example@example.com',
            'test@test.com',
            'user@example.com',
            'email@example.com',
            'info@example.com',

            // Generic emails that are likely not useful
            'noreply@',
            'no-reply@',
            'donotreply@',
            'newsletter@',

            // Very short or suspicious domains
            /@.{1,2}\./,  // Domains with 1-2 characters before first dot
        ];

        return emails.filter(email => {
            // Check against exact false positives
            if (falsePositives.slice(0, 5).includes(email.toLowerCase())) {
                return false;
            }

            // Check against pattern-based false positives
            if (falsePositives.slice(5).some(pattern => pattern.test(email))) {
                return false;
            }

            return true;
        });
    }
}

/**
 * Auto-detect emails when page loads and send to background script
 */
async function autoDetectEmails() {
    try {
        console.log('Email Scraper: Auto-detecting emails on page load...');

        // Check if we have access to required APIs
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.error('Email Scraper: Chrome runtime API not available');
            return [];
        }

        if (typeof document === 'undefined') {
            console.error('Email Scraper: Document API not available');
            return [];
        }

        const extractor = new EmailExtractor();
        let emails = extractor.extractEmails();

        // Apply false positive filtering
        emails = extractor.filterFalsePositives(emails);

        // Limit results to prevent performance issues
        if (emails.length > 500) {
            console.warn('Email Scraper: Limiting results to 500 emails for performance');
            emails = emails.slice(0, 500);
        }

        // Safely get page information
        let pageUrl = '';
        let pageTitle = '';

        try {
            pageUrl = window.location ? window.location.href : '';
            pageTitle = document.title || '';
        } catch (urlError) {
            console.warn('Email Scraper: Could not access page URL/title:', urlError);
        }

        // Prepare page data
        const pageData = {
            url: pageUrl,
            title: pageTitle,
            emails: emails,
            timestamp: Date.now(),
            count: emails.length
        };

        console.log(`Email Scraper: Auto-detected ${emails.length} emails on ${pageUrl}`);

        // Send emails to background script for storage and badge update
        chrome.runtime.sendMessage({
            type: 'storePageEmails',
            pageData: pageData
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Email Scraper: Failed to send message to background:', chrome.runtime.lastError);
            } else if (response && response.success) {
                console.log('Email Scraper: Emails stored successfully');
            } else {
                console.error('Email Scraper: Failed to store emails:', response);
            }
        });

        return emails;

    } catch (error) {
        console.error('Email Scraper: Error during auto-detection:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return [];
    }
}

/**
 * Main execution function for popup-triggered extraction
 * This function is called when the user clicks "Extract Emails"
 */
function extractEmailsFromPage() {
    try {
        console.log('Email Scraper: Manual extraction requested');

        // Check if we have access to required APIs
        if (typeof document === 'undefined') {
            console.error('Email Scraper: Document API not available');
            return [];
        }

        const extractor = new EmailExtractor();
        let emails = extractor.extractEmails();

        // Apply false positive filtering
        emails = extractor.filterFalsePositives(emails);

        // Limit results to prevent performance issues
        if (emails.length > 500) {
            console.warn('Email Scraper: Limiting results to 500 emails for performance');
            emails = emails.slice(0, 500);
        }

        console.log(`Email Scraper: Manual extraction found ${emails.length} emails`);
        return emails;

    } catch (error) {
        console.error('Email Scraper: Fatal error during extraction:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return [];
    }
}

// Auto-detect emails when page loads
if (typeof document !== 'undefined' && document.readyState) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Email Scraper: DOM content loaded, starting auto-detection');
            autoDetectEmails();
        });
    } else {
        // Page already loaded
        console.log('Email Scraper: Page already loaded, starting auto-detection');
        autoDetectEmails();
    }
} else {
    console.error('Email Scraper: Document API not available for DOM ready detection');
}

// Also detect emails when DOM changes (for dynamic content)
if (typeof document !== 'undefined' && document.body && typeof MutationObserver !== 'undefined') {
    try {
        const observer = new MutationObserver((mutations) => {
            try {
                let shouldRescan = false;

                mutations.forEach((mutation) => {
                    // Check if new content was added that might contain emails
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (let node of mutation.addedNodes) {
                            if (node && node.nodeType === Node.ELEMENT_NODE &&
                                (node.tagName === 'DIV' || node.tagName === 'P' || node.tagName === 'SPAN' ||
                                 node.tagName === 'A' || (node.querySelector && node.querySelector('a[href*="mailto:"]')))) {
                                shouldRescan = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldRescan) {
                    console.log('Email Scraper: Dynamic content detected, rescanning...');
                    setTimeout(() => {
                        autoDetectEmails().catch(error => {
                            console.error('Email Scraper: Error during dynamic content scan:', error);
                        });
                    }, 1000); // Delay to allow content to fully load
                }
            } catch (mutationError) {
                console.error('Email Scraper: MutationObserver callback error:', mutationError);
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('Email Scraper: MutationObserver started for dynamic content detection');
    } catch (observerError) {
        console.error('Email Scraper: Failed to start MutationObserver:', observerError);
    }
} else {
    console.warn('Email Scraper: MutationObserver not available or document.body not ready');
}

// Listen for messages from popup/background scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('Email Scraper: Received message:', message.type);

        if (message.type === 'refreshDetection') {
            console.log('Email Scraper: Received refresh request');

            // Check if chrome runtime is available
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                console.error('Email Scraper: Chrome runtime not available for refresh');
                sendResponse({ success: false, error: 'Chrome runtime not available' });
                return true;
            }

            autoDetectEmails().then((emails) => {
                console.log(`Email Scraper: Refresh completed, found ${emails.length} emails`);
                sendResponse({ success: true, count: emails.length });
            }).catch((error) => {
                console.error('Email Scraper: Refresh failed:', error);
                console.error('Refresh error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response

        } else if (message.type === 'extractEmails') {
            console.log('Email Scraper: Received extract emails request');

            try {
                const emails = extractEmailsFromPage();
                console.log(`Email Scraper: Extracted ${emails.length} emails via messaging`);
                sendResponse({ success: true, emails: emails });
            } catch (extractError) {
                console.error('Email Scraper: Extract emails failed:', extractError);
                sendResponse({ success: false, error: extractError.message });
            }
            return true; // Keep message channel open for async response

        } else {
            console.log('Email Scraper: Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (listenerError) {
        console.error('Email Scraper: Message listener error:', listenerError);
        console.error('Listener error details:', {
            message: listenerError.message,
            stack: listenerError.stack,
            name: listenerError.name
        });
        sendResponse({ success: false, error: 'Message listener error: ' + listenerError.message });
    }

    return true; // Keep message channel open for async response
});