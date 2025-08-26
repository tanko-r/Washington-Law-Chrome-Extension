/**
 * Enhanced Defined Terms Module
 * Handles detection and highlighting of defined terms across entire RCW chapters
 */

function DefinedTerms() {
    this.definedTerms = new Map(); // term -> {definition, occurrences: [], sourceSection: ''}
    this.chapterTerms = new Map(); // Global chapter-wide terms
    this.isEnabled = true;
    this.highlightClass = 'defined-term-highlight';
    this.definitionClass = 'defined-term-definition';
    this.tooltipClass = 'defined-term-tooltip';
    this.currentChapter = null;
    this.isScanning = false;
    
    console.log('DefinedTerms initialized');
}

DefinedTerms.prototype.initialize = function() {
    console.log('DefinedTerms.initialize() called');
    
    this.loadSettings(() => {
        if (this.isEnabled) {
            this.addStyles();
            this.detectChapterContext();
            this.scanForDefinedTerms();
            this.addEventListeners();
        }
    });
};

DefinedTerms.prototype.loadSettings = function(callback) {
    chrome.runtime.sendMessage({key: 'isDisabled_definedTerms', localStorage: 'get'}, (response) => {
        this.isEnabled = response.isDisabled_definedTerms !== 'true';
        console.log('DefinedTerms enabled:', this.isEnabled);
        if (callback) callback();
    });
};

DefinedTerms.prototype.addStyles = function() {
    console.log('Adding styles for defined terms');
    
    const style = document.createElement('style');
    style.innerHTML = `
        .${this.highlightClass} {
            background-color: rgba(255, 255, 0, 0.3) !important;
            border-bottom: 2px dotted #666 !important;
            cursor: help !important;
            position: relative !important;
        }
        
        .${this.definitionClass} {
            background-color: rgba(0, 255, 0, 0.2) !important;
            border: 2px solid rgba(0, 128, 0, 0.5) !important;
            font-weight: bold !important;
        }
        
        .${this.tooltipClass} {
            position: fixed !important;
            background: #333 !important;
            color: white !important;
            padding: 8px 12px !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            max-width: 350px !important;
            z-index: 999999 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            display: none !important;
            line-height: 1.4 !important;
            pointer-events: none !important;
            white-space: normal !important;
            word-wrap: break-word !important;
        }
        
        .${this.tooltipClass}::before {
            content: '' !important;
            position: absolute !important;
            top: -5px !important;
            left: 10px !important;
            border-left: 5px solid transparent !important;
            border-right: 5px solid transparent !important;
            border-bottom: 5px solid #333 !important;
        }
        
        .chapter-term-tooltip {
            border-left: 3px solid #007acc !important;
        }
        
        @media print {
            .${this.highlightClass}, .${this.definitionClass} {
                background: none !important;
                border: none !important;
            }
            .${this.tooltipClass} {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
};

/**
 * Detects the current RCW chapter context from URL and page content
 */
DefinedTerms.prototype.detectChapterContext = function() {
    const url = window.location.href;
    console.log('Detecting chapter context from URL:', url);
    
    // Extract chapter from URL patterns like:
    // http://app.leg.wa.gov/RCW/default.aspx?cite=64.90&full=true (full chapter)
    // http://app.leg.wa.gov/RCW/default.aspx?cite=64.90.010 (single section)
    const chapterMatch = url.match(/cite=(\d+\.\d+)/);
    if (chapterMatch) {
        this.currentChapter = chapterMatch[1];
    }
    
    // Also check if we're viewing a full chapter
    this.isFullChapter = url.includes('full=true');
    
    console.log(`Detected RCW Chapter: ${this.currentChapter}, Full Chapter: ${this.isFullChapter}`);
};

/**
 * Main scanning function that handles both single sections and full chapters
 */
DefinedTerms.prototype.scanForDefinedTerms = function() {
    if (!this.isEnabled || this.isScanning) {
        console.log('Skipping scan - enabled:', this.isEnabled, 'scanning:', this.isScanning);
        return;
    }
    
    console.log('Starting scan for defined terms');
    this.isScanning = true;
    
    try {
        const contentDiv = document.getElementById('divContent');
        if (!contentDiv) {
            console.log('No divContent found');
            return;
        }
        
        // Simple approach: scan the current page content for all quoted terms
        this.scanContentForTerms(contentDiv);
        
        // If we found terms, highlight them
        if (this.definedTerms.size > 0) {
            console.log(`Found ${this.definedTerms.size} defined terms, highlighting...`);
            this.highlightTerms();
        } else {
            console.log('No defined terms found');
        }
        
    } finally {
        this.isScanning = false;
    }
};

/**
 * Scans content for all quoted terms
 */
DefinedTerms.prototype.scanContentForTerms = function(contentElement) {
    console.log('Scanning content for terms...');
    
    const textContent = contentElement.textContent || contentElement.innerText || '';
    console.log('Content length:', textContent.length);
    
    // Find all quoted terms
    const quotedTermPattern = /"([^"]{2,200})"/g;
    let match;
    let termCount = 0;
    
    while ((match = quotedTermPattern.exec(textContent)) !== null) {
        const term = match[1].trim();
        const wordCount = term.split(/\s+/).length;
        
        // Only capture terms that are 6 words or fewer
        if (wordCount <= 6 && term.length >= 2) {
            const normalizedTerm = term.toLowerCase();
            
            if (!this.definedTerms.has(normalizedTerm)) {
                // Look for definition context
                const definitionContext = this.findDefinitionContext(textContent, term);
                
                const termData = {
                    originalTerm: term,
                    definition: definitionContext,
                    sourceSection: 'current',
                    occurrences: []
                };
                
                this.definedTerms.set(normalizedTerm, termData);
                termCount++;
                
                console.log(`Found term: "${term}" with definition: "${definitionContext.substring(0, 100)}..."`);
            }
        }
    }
    
    console.log(`Scan complete. Found ${termCount} unique terms.`);
};

/**
 * Finds definition context for a term
 */
DefinedTerms.prototype.findDefinitionContext = function(fullText, term) {
    const termPattern = new RegExp(`"${this.escapeRegex(term)}"`, 'gi');
    const match = termPattern.exec(fullText);
    
    if (match) {
        // Get surrounding context (500 characters)
        const start = Math.max(0, match.index - 100);
        const end = Math.min(fullText.length, match.index + 400);
        let context = fullText.substring(start, end);
        
        // Clean up context
        context = context.replace(/\s+/g, ' ').trim();
        
        // If it contains definition keywords, it's likely a definition
        if (/\bmeans?\b|\bis defined as\b|\bshall mean\b/i.test(context)) {
            return context;
        }
    }
    
    return `Defined term: "${term}"`;
};

/**
 * Highlights all defined terms in the current document
 */
DefinedTerms.prototype.highlightTerms = function() {
    if (!this.isEnabled || this.definedTerms.size === 0) {
        console.log('Skipping highlight - enabled:', this.isEnabled, 'terms:', this.definedTerms.size);
        return;
    }
    
    console.log('Starting to highlight terms...');
    
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) {
        console.log('No content div found for highlighting');
        return;
    }
    
    // Get all terms to highlight
    const terms = Array.from(this.definedTerms.keys()).map(key => 
        this.definedTerms.get(key).originalTerm
    );
    
    // Sort by length (longest first) to avoid partial matches
    terms.sort((a, b) => b.length - a.length);
    
    console.log('Terms to highlight:', terms);
    
    // Create pattern for all terms
    const escapedTerms = terms.map(term => this.escapeRegex(term));
    const pattern = new RegExp(`"(${escapedTerms.join('|')})"`, 'gi');
    
    console.log('Highlight pattern:', pattern);
    
    this.highlightInElement(contentDiv, pattern);
    
    console.log('Highlighting complete');
};

/**
 * Highlights terms within a specific element
 */
DefinedTerms.prototype.highlightInElement = function(element, pattern) {
    console.log('Highlighting in element...');
    
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tagName = parent.tagName.toLowerCase();
                if (tagName === 'script' || tagName === 'style') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip already highlighted elements
                if (parent.classList.contains('defined-term-highlight') ||
                    parent.classList.contains('defined-term-definition')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    console.log(`Found ${textNodes.length} text nodes to process`);
    
    let highlightCount = 0;
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [];
        let match;
        
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(text)) !== null) {
            matches.push({
                term: match[1],
                start: match.index,
                end: match.index + match[0].length,
                fullMatch: match[0]
            });
        }
        
        if (matches.length > 0) {
            console.log(`Found ${matches.length} matches in text node:`, matches);
            this.replaceTextWithHighlights(textNode, matches);
            highlightCount += matches.length;
        }
    });
    
    console.log(`Applied ${highlightCount} highlights`);
};

/**
 * Replaces text nodes with highlighted spans
 */
DefinedTerms.prototype.replaceTextWithHighlights = function(textNode, matches) {
    const text = textNode.textContent;
    const parent = textNode.parentNode;
    const fragment = document.createDocumentFragment();
    
    let lastIndex = 0;
    
    matches.forEach(match => {
        // Add text before the match
        if (match.start > lastIndex) {
            fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, match.start))
            );
        }
        
        // Create highlighted span
        const span = document.createElement('span');
        const normalizedTerm = match.term.toLowerCase();
        const termData = this.definedTerms.get(normalizedTerm);
        
        span.className = this.highlightClass;
        span.textContent = match.fullMatch;
        span.setAttribute('data-term', normalizedTerm);
        
        if (termData) {
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = this.tooltipClass;
            tooltip.textContent = termData.definition || `Definition of "${match.term}"`;
            span.appendChild(tooltip);
            
            // Track occurrence
            termData.occurrences.push({
                element: span,
                isDefinition: false
            });
        }
        
        fragment.appendChild(span);
        lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
        fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
        );
    }
    
    parent.replaceChild(fragment, textNode);
};

/**
 * Event listeners for tooltip interactions
 */
DefinedTerms.prototype.addEventListeners = function() {
    console.log('Adding event listeners for tooltips');
    
    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains(this.highlightClass)) {
            this.showTooltip(e.target, e);
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains(this.highlightClass)) {
            this.hideTooltip(e.target);
        }
    });
};

/**
 * Shows tooltip
 */
DefinedTerms.prototype.showTooltip = function(element, event) {
    const tooltip = element.querySelector(`.${this.tooltipClass}`);
    if (!tooltip) return;
    
    tooltip.style.display = 'block';
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    let left = rect.left + scrollLeft;
    let top = rect.bottom + scrollTop + 5;
    
    // Adjust if tooltip goes off screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) {
        left = 10;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
};

/**
 * Hides tooltip
 */
DefinedTerms.prototype.hideTooltip = function(element) {
    const tooltip = element.querySelector(`.${this.tooltipClass}`);
    if (tooltip) {
        tooltip.style.display = 'none';
    }
};

/**
 * Utility function to escape regex special characters
 */
DefinedTerms.prototype.escapeRegex = function(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Toggles the defined terms functionality
 */
DefinedTerms.prototype.toggle = function(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
        this.scanForDefinedTerms();
    } else {
        this.removeHighlights();
    }
};

/**
 * Removes all highlights and clears term dictionaries
 */
DefinedTerms.prototype.removeHighlights = function() {
    const highlights = document.querySelectorAll(`.${this.highlightClass}, .${this.definitionClass}`);
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        }
    });
    
    this.definedTerms.clear();
    this.chapterTerms.clear();
};

// Global instance
window.definedTermsInstance = null;

/**
 * Initialize the defined terms system
 */
function initializeDefinedTerms() {
    console.log('initializeDefinedTerms() called');
    
    if (!window.definedTermsInstance) {
        window.definedTermsInstance = new DefinedTerms();
        window.definedTermsInstance.initialize();
    }
}