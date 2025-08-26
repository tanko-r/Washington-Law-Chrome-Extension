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
}

DefinedTerms.prototype.initialize = function() {
    this.loadSettings();
    this.addStyles();
    this.detectChapterContext();
    this.scanForDefinedTerms();
    this.highlightTerms();
    this.addEventListeners();
};

DefinedTerms.prototype.loadSettings = function() {
    chrome.runtime.sendMessage({key: 'isDisabled_definedTerms', localStorage: 'get'}, (response) => {
        this.isEnabled = response.isDisabled_definedTerms !== 'true';
    });
};

DefinedTerms.prototype.addStyles = function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .${this.highlightClass} {
            background-color: rgba(255, 255, 0, 0.2);
            border-bottom: 1px dotted #666;
            cursor: help;
            position: relative;
        }
        
        .${this.definitionClass} {
            background-color: rgba(0, 255, 0, 0.15);
            border: 1px solid rgba(0, 128, 0, 0.3);
            font-weight: bold;
        }
        
        .${this.tooltipClass} {
            position: fixed;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            max-width: 350px;
            z-index: 999999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: none;
            line-height: 1.4;
            pointer-events: none;
            white-space: normal;
            word-wrap: break-word;
        }
        
        .${this.tooltipClass}::before {
            content: '';
            position: absolute;
            top: -5px;
            left: 10px;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 5px solid #333;
        }
        
        .chapter-term-tooltip {
            border-left: 3px solid #007acc;
        }
        
        .chapter-term-tooltip::after {
            content: ' (Chapter Definition)';
            font-size: 10px;
            opacity: 0.8;
            font-style: italic;
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
    if (!this.isEnabled || this.isScanning) return;
    
    this.isScanning = true;
    
    try {
        if (this.isFullChapter) {
            // For full chapters, scan all sections for definitions
            this.scanFullChapter();
        } else {
            // For single sections, scan current section + attempt to load chapter definitions
            this.scanCurrentSection();
            this.loadChapterDefinitions();
        }
    } finally {
        this.isScanning = false;
    }
};

/**
 * Scans the entire chapter when viewing full chapter mode
 */
DefinedTerms.prototype.scanFullChapter = function() {
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) return;
    
    // Find all section headers to identify individual sections
    const sectionHeaders = contentDiv.querySelectorAll('a[href*="cite="]');
    const sections = [];
    
    // Group content by sections
    sectionHeaders.forEach((header, index) => {
        const sectionNumber = this.extractSectionNumber(header.href);
        if (sectionNumber) {
            const nextHeader = sectionHeaders[index + 1];
            const sectionContent = this.getSectionContent(header, nextHeader);
            sections.push({
                number: sectionNumber,
                content: sectionContent,
                element: sectionContent
            });
        }
    });
    
    // Scan each section for definitions
    sections.forEach(section => {
        this.scanSectionForDefinitions(section.content, section.number);
    });
    
    console.log(`Scanned ${sections.length} sections, found ${this.chapterTerms.size} chapter-wide definitions`);
};

/**
 * Scans only the current section when viewing individual section
 */
DefinedTerms.prototype.scanCurrentSection = function() {
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) return;
    
    const currentSection = this.getCurrentSectionNumber();
    this.scanSectionForDefinitions(contentDiv, currentSection);
};

/**
 * Attempts to load definitions from other sections in the chapter via AJAX
 */
DefinedTerms.prototype.loadChapterDefinitions = function() {
    if (!this.currentChapter) return;
    
    // Construct URL for full chapter
    const fullChapterUrl = `${window.location.origin}${window.location.pathname}?cite=${this.currentChapter}&full=true`;
    
    // Use fetch to load the full chapter content
    fetch(fullChapterUrl)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const contentDiv = doc.getElementById('divContent');
            
            if (contentDiv) {
                this.scanChapterContent(contentDiv);
                // Re-highlight terms with new chapter-wide definitions
                this.highlightTerms();
            }
        })
        .catch(error => {
            console.log('Could not load full chapter for definitions:', error);
        });
};

/**
 * Scans chapter content loaded via AJAX
 */
DefinedTerms.prototype.scanChapterContent = function(contentDiv) {
    const sectionHeaders = contentDiv.querySelectorAll('a[href*="cite="]');
    
    sectionHeaders.forEach((header, index) => {
        const sectionNumber = this.extractSectionNumber(header.href);
        if (sectionNumber) {
            const nextHeader = sectionHeaders[index + 1];
            const sectionContent = this.getSectionContent(header, nextHeader);
            this.scanSectionForDefinitions(sectionContent, sectionNumber);
        }
    });
    
    console.log(`Loaded ${this.chapterTerms.size} definitions from full chapter`);
};

/**
 * Scans a specific section element for defined terms
 */
DefinedTerms.prototype.scanSectionForDefinitions = function(sectionElement, sectionNumber) {
    if (!sectionElement) return;
    
    const textNodes = this.getTextNodes(sectionElement);
    
    // Enhanced pattern to capture quoted terms with better context
    const quotedTermPattern = /"([^"]{2,200})"/g;
    
    textNodes.forEach(node => {
        const text = node.textContent;
        let match;
        quotedTermPattern.lastIndex = 0;
        
        while ((match = quotedTermPattern.exec(text)) !== null) {
            const term = match[1].trim();
            const wordCount = term.split(/\s+/).length;
            
            // Only capture terms that are 6 words or fewer
            if (wordCount <= 6 && term.length >= 2) {
                this.addDefinedTerm(term, node, match.index, sectionNumber);
            }
        }
    });
};

/**
 * Adds a defined term to the appropriate dictionary
 */
DefinedTerms.prototype.addDefinedTerm = function(term, definitionNode, matchIndex, sectionNumber) {
    const normalizedTerm = term.toLowerCase();
    const fullText = definitionNode.textContent;
    
    // Check if this term has definition patterns
    const definitionPatterns = [
        new RegExp(`"${this.escapeRegex(term)}"\\s+(?:means?|shall mean)`, 'i'),
        new RegExp(`"${this.escapeRegex(term)}"\\s+(?:is|are)\\s+defined\\s+as`, 'i'),
        new RegExp(`for\\s+(?:the\\s+)?purposes?\\s+of\\s+(?:this\\s+)?(?:section|chapter|act|title),?\\s+"${this.escapeRegex(term)}"\\s+means?`, 'i'),
        new RegExp(`as\\s+used\\s+in\\s+(?:this\\s+)?(?:section|chapter|act|title),?\\s+"${this.escapeRegex(term)}"\\s+means?`, 'i'),
        new RegExp(`the\\s+terms?\\s+"${this.escapeRegex(term)}"\\s+means?`, 'i'),
        new RegExp(`"${this.escapeRegex(term)}"\\s+has\\s+the\\s+meaning\\s+given`, 'i')
    ];
    
    let definitionContext = '';
    let hasDefinitionPattern = false;
    
    // Check for definition patterns
    for (let pattern of definitionPatterns) {
        if (pattern.test(fullText)) {
            hasDefinitionPattern = true;
            break;
        }
    }
    
    if (hasDefinitionPattern) {
        // Extract definition context
        definitionContext = this.extractDefinitionContext(fullText, term);
    } else {
        definitionContext = `Defined term: "${term}"`;
    }
    
    const termData = {
        originalTerm: term,
        definition: definitionContext,
        definitionNode: definitionNode,
        hasDefinitionPattern: hasDefinitionPattern,
        sourceSection: sectionNumber || 'current',
        occurrences: []
    };
    
    // Store in appropriate dictionary
    if (hasDefinitionPattern) {
        // Terms with definitions go to chapter-wide dictionary
        this.chapterTerms.set(normalizedTerm, termData);
    }
    
    // Also store in local dictionary for current context
    if (!this.definedTerms.has(normalizedTerm)) {
        this.definedTerms.set(normalizedTerm, termData);
    }
};

/**
 * Extracts definition context from surrounding text
 */
DefinedTerms.prototype.extractDefinitionContext = function(fullText, term) {
    // Split into sentences and find the one containing the definition
    const sentences = fullText.split(/[.!?]+/);
    
    for (let sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();
        const lowerTerm = term.toLowerCase();
        
        if (lowerSentence.includes(`"${lowerTerm}"`) && 
            (lowerSentence.includes('means') || lowerSentence.includes('defined'))) {
            
            // Clean up the sentence
            let cleanSentence = sentence.trim();
            
            // Remove leading numbers/letters that might be section markers
            cleanSentence = cleanSentence.replace(/^\s*\([^)]*\)\s*/, '');
            
            // Limit length for tooltip display
            if (cleanSentence.length > 300) {
                const termIndex = cleanSentence.toLowerCase().indexOf(`"${lowerTerm}"`);
                if (termIndex !== -1) {
                    // Try to get context around the term
                    const start = Math.max(0, termIndex - 50);
                    const end = Math.min(cleanSentence.length, termIndex + 250);
                    cleanSentence = '...' + cleanSentence.substring(start, end) + '...';
                } else {
                    cleanSentence = cleanSentence.substring(0, 300) + '...';
                }
            }
            
            return cleanSentence;
        }
    }
    
    return `Definition of "${term}" (see source section)`;
};

/**
 * Highlights all defined terms in the current document
 */
DefinedTerms.prototype.highlightTerms = function() {
    if (!this.isEnabled) return;
    
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) return;
    
    // Combine local and chapter-wide terms
    const allTerms = new Map([...this.definedTerms, ...this.chapterTerms]);
    
    if (allTerms.size === 0) return;
    
    // Create pattern for all terms
    const terms = Array.from(allTerms.keys()).map(term => 
        allTerms.get(term).originalTerm
    );
    
    // Sort by length (longest first) to avoid partial matches
    terms.sort((a, b) => b.length - a.length);
    
    const escapedTerms = terms.map(term => this.escapeRegex(term));
    const pattern = new RegExp(`"(${escapedTerms.join('|')})"`, 'gi');
    
    this.highlightInElement(contentDiv, pattern, allTerms);
};

/**
 * Highlights terms within a specific element
 */
DefinedTerms.prototype.highlightInElement = function(element, pattern, termMap) {
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
            this.replaceTextWithHighlights(textNode, matches, termMap);
        }
    });
};

/**
 * Replaces text nodes with highlighted spans
 */
DefinedTerms.prototype.replaceTextWithHighlights = function(textNode, matches, termMap) {
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
        const termData = termMap.get(normalizedTerm);
        
        if (termData) {
            const isDefinition = this.isDefinitionLocation(textNode, match);
            const isChapterTerm = this.chapterTerms.has(normalizedTerm);
            
            span.className = isDefinition ? this.definitionClass : this.highlightClass;
            span.textContent = match.fullMatch;
            span.setAttribute('data-term', normalizedTerm);
            span.setAttribute('data-is-chapter-term', isChapterTerm.toString());
            
            if (!isDefinition) {
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = this.tooltipClass;
                if (isChapterTerm) {
                    tooltip.classList.add('chapter-term-tooltip');
                }
                
                let tooltipText = termData.definition || `Definition of "${match.term}"`;
                if (isChapterTerm && termData.sourceSection && termData.sourceSection !== 'current') {
                    tooltipText += ` (Defined in RCW ${this.currentChapter}.${termData.sourceSection})`;
                }
                
                tooltip.textContent = tooltipText;
                span.appendChild(tooltip);
            }
            
            // Track occurrence
            termData.occurrences.push({
                element: span,
                isDefinition: isDefinition
            });
        } else {
            span.className = this.highlightClass;
            span.textContent = match.fullMatch;
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
 * Utility function to escape regex special characters
 */
DefinedTerms.prototype.escapeRegex = function(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extracts section number from URL
 */
DefinedTerms.prototype.extractSectionNumber = function(url) {
    const match = url.match(/cite=\d+\.\d+\.(\d+)/);
    return match ? match[1] : null;
};

/**
 * Gets the current section number from URL
 */
DefinedTerms.prototype.getCurrentSectionNumber = function() {
    const url = window.location.href;
    return this.extractSectionNumber(url);
};

/**
 * Gets content between two section headers
 */
DefinedTerms.prototype.getSectionContent = function(startHeader, endHeader) {
    const content = document.createElement('div');
    let current = startHeader.nextElementSibling;
    
    while (current && current !== endHeader) {
        content.appendChild(current.cloneNode(true));
        current = current.nextElementSibling;
    }
    
    return content;
};

/**
 * Checks if a match location is where the term is being defined
 */
DefinedTerms.prototype.isDefinitionLocation = function(textNode, match) {
    const text = textNode.textContent.toLowerCase();
    const beforeMatch = text.substring(0, match.start).slice(-100);
    const afterMatch = text.substring(match.end, match.end + 100);
    
    const definitionIndicators = [
        'means', 'shall mean', 'is defined as', 'are defined as',
        'for purposes of', 'as used in', 'has the meaning'
    ];
    
    return definitionIndicators.some(indicator => 
        beforeMatch.includes(indicator) || afterMatch.includes(indicator)
    );
};

/**
 * Event listeners for tooltip interactions
 */
DefinedTerms.prototype.addEventListeners = function() {
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
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains(this.highlightClass) || 
            e.target.classList.contains(this.definitionClass)) {
            this.handleTermClick(e.target, e);
        }
    });
};

/**
 * Shows tooltip with improved positioning
 */
DefinedTerms.prototype.showTooltip = function(element, event) {
    const tooltip = element.querySelector(`.${this.tooltipClass}`);
    if (!tooltip) return;
    
    tooltip.style.display = 'block';
    
    // Get element position
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Initial positioning below the element
    let left = rect.left + scrollLeft;
    let top = rect.bottom + scrollTop + 5;
    
    // Apply initial position to measure tooltip
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    // Adjust positioning after tooltip is rendered
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Adjust horizontal position if tooltip goes off screen
        if (tooltipRect.right > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
            tooltip.style.left = left + 'px';
        }
        if (tooltipRect.left < 10) {
            left = 10;
            tooltip.style.left = left + 'px';
        }
        
        // Adjust vertical position if tooltip goes off screen
        if (tooltipRect.bottom > window.innerHeight - 10) {
            top = rect.top + scrollTop - tooltipRect.height - 5;
            tooltip.style.top = top + 'px';
            
            // Move arrow to bottom for upward tooltip
            tooltip.style.setProperty('--arrow-position', 'bottom');
        }
    }, 0);
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
 * Handles clicks on defined terms
 */
DefinedTerms.prototype.handleTermClick = function(element, event) {
    const term = element.getAttribute('data-term');
    if (!term) return;
    
    // Check both local and chapter terms
    const termData = this.definedTerms.get(term) || this.chapterTerms.get(term);
    if (!termData) return;
    
    // Find and scroll to definition
    const definitionOccurrence = termData.occurrences.find(occ => occ.isDefinition);
    if (definitionOccurrence) {
        definitionOccurrence.element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Highlight the definition briefly
        const originalBg = definitionOccurrence.element.style.backgroundColor;
        definitionOccurrence.element.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
        setTimeout(() => {
            definitionOccurrence.element.style.backgroundColor = originalBg;
        }, 2000);
    } else if (termData.sourceSection && termData.sourceSection !== 'current') {
        // If definition is in another section, provide feedback
        const message = `Definition is in RCW ${this.currentChapter}.${termData.sourceSection}`;
        console.log(message);
        
        // Could implement navigation to definition section here
        // window.location.href = `?cite=${this.currentChapter}.${termData.sourceSection}`;
    }
    
    event.preventDefault();
};

/**
 * Gets all text nodes within an element
 */
DefinedTerms.prototype.getTextNodes = function(element) {
    const textNodes = [];
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
                
                return node.textContent.trim().length > 0 ? 
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    return textNodes;
};

/**
 * Toggles the defined terms functionality
 */
DefinedTerms.prototype.toggle = function(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
        this.scanForDefinedTerms();
        this.highlightTerms();
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
    if (!window.definedTermsInstance) {
        window.definedTermsInstance = new DefinedTerms();
        window.definedTermsInstance.initialize();
    }
}