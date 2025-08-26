/**
 * Defined Terms Module
 * Handles detection and highlighting of defined terms in legal documents
 */

function DefinedTerms() {
    this.definedTerms = new Map(); // term -> {definition, occurrences: []}
    this.isEnabled = true;
    this.highlightClass = 'defined-term-highlight';
    this.definitionClass = 'defined-term-definition';
    this.tooltipClass = 'defined-term-tooltip';
}

DefinedTerms.prototype.initialize = function() {
    this.loadSettings();
    this.addStyles();
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
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            max-width: 300px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: none;
            line-height: 1.4;
        }
        
        .${this.tooltipClass}:before {
            content: '';
            position: absolute;
            top: -5px;
            left: 10px;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 5px solid #333;
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

DefinedTerms.prototype.scanForDefinedTerms = function() {
    if (!this.isEnabled) return;
    
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) return;
    
    const textNodes = this.getTextNodes(contentDiv);
    
    // Pattern to capture all quoted terms (up to 6 words)
    const quotedTermPattern = /"([^"]{1,200})"/g; // Reasonable character limit for 6 words
    
    textNodes.forEach(node => {
        const text = node.textContent;
        
        let match;
        quotedTermPattern.lastIndex = 0; // Reset regex
        while ((match = quotedTermPattern.exec(text)) !== null) {
            const term = match[1].trim();
            const wordCount = term.split(/\s+/).length;
            
            // Only capture terms that are 6 words or fewer and at least 2 characters
            if (wordCount <= 6 && term.length >= 2 && term.length <= 100) {
                this.addDefinedTerm(term, node, match.index);
            }
        }
    });
};

DefinedTerms.prototype.addDefinedTerm = function(term, definitionNode, matchIndex) {
    const normalizedTerm = term.toLowerCase();
    
    if (!this.definedTerms.has(normalizedTerm)) {
        // Extract definition context - look for definition patterns around the term
        const fullText = definitionNode.textContent;
        
        // Check if this term appears with definition patterns
        const definitionPatterns = [
            new RegExp(`"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+(?:means?|shall mean)`, 'i'),
            new RegExp(`"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+(?:is|are)\\s+defined\\s+as`, 'i'),
            new RegExp(`for\\s+(?:the\\s+)?purposes?\\s+of\\s+(?:this\\s+)?(?:section|chapter|act|title),?\\s+"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+means?`, 'i'),
            new RegExp(`as\\s+used\\s+in\\s+(?:this\\s+)?(?:section|chapter|act|title),?\\s+"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+means?`, 'i'),
            new RegExp(`the\\s+terms?\\s+"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+means?`, 'i'),
            new RegExp(`"${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+has\\s+the\\s+meaning\\s+given`, 'i')
        ];
        
        let definitionContext = '';
        let hasDefinitionPattern = false;
        
        // Check if any definition pattern matches
        for (let pattern of definitionPatterns) {
            if (pattern.test(fullText)) {
                hasDefinitionPattern = true;
                break;
            }
        }
        
        if (hasDefinitionPattern) {
            // Extract the sentence containing the definition
            const sentences = fullText.split(/[.!?]+/);
            for (let sentence of sentences) {
                if (sentence.toLowerCase().includes(term.toLowerCase()) && 
                    (sentence.toLowerCase().includes('means') || 
                     sentence.toLowerCase().includes('defined'))) {
                    definitionContext = sentence.trim();
                    break;
                }
            }
        } else {
            // For terms without explicit definitions, use a generic message
            definitionContext = `Defined term: "${term}"`;
        }
        
        let definitionContext = '';
        
        this.definedTerms.set(normalizedTerm, {
            originalTerm: term,
            definition: definitionContext,
            definitionNode: definitionNode,
            hasDefinitionPattern: hasDefinitionPattern,
            occurrences: []
        });
    }
};

DefinedTerms.prototype.highlightTerms = function() {
    if (!this.isEnabled || this.definedTerms.size === 0) return;
    
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) return;
    
    // Create a combined regex for all defined terms
    const terms = Array.from(this.definedTerms.keys()).map(term => 
        this.definedTerms.get(term).originalTerm
    );
    
    if (terms.length === 0) return;
    
    // Sort by length (longest first) to avoid partial matches
    terms.sort((a, b) => b.length - a.length);
    
    // Escape special regex characters and create pattern
    const escapedTerms = terms.map(term => 
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    const pattern = new RegExp(`"(${escapedTerms.join('|')})"`, 'gi');
    
    this.highlightInElement(contentDiv, pattern);
};

DefinedTerms.prototype.highlightInElement = function(element, pattern) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip if parent is already highlighted or is a script/style tag
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tagName = parent.tagName.toLowerCase();
                if (tagName === 'script' || tagName === 'style') {
                    return NodeFilter.FILTER_REJECT;
                }
                
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
        
        // Reset regex
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
            this.replaceTextWithHighlights(textNode, matches);
        }
    });
};

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
        
        if (termData) {
            // Check if this is the definition location
            const isDefinition = this.isDefinitionLocation(textNode, match);
            
            span.className = isDefinition ? this.definitionClass : this.highlightClass;
            span.textContent = match.fullMatch;
            span.setAttribute('data-term', normalizedTerm);
            
            if (!isDefinition) {
                // Add tooltip for non-definition occurrences
                const tooltip = document.createElement('div');
                tooltip.className = this.tooltipClass;
                tooltip.textContent = termData.definition || `Definition of "${match.term}"`;
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

DefinedTerms.prototype.isDefinitionLocation = function(textNode, match) {
    const text = textNode.textContent.toLowerCase();
    const beforeMatch = text.substring(0, match.start).slice(-50); // Check 50 chars before
    const afterMatch = text.substring(match.end, match.end + 50); // Check 50 chars after
    
    const definitionIndicators = [
        'means', 'shall mean', 'is defined as', 'are defined as',
        'for purposes of', 'as used in', 'has the meaning'
    ];
    
    return definitionIndicators.some(indicator => 
        beforeMatch.includes(indicator) || afterMatch.includes(indicator)
    );
};

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

DefinedTerms.prototype.showTooltip = function(element, event) {
    const tooltip = element.querySelector(`.${this.tooltipClass}`);
    if (tooltip) {
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = '0px';
        tooltip.style.top = (element.offsetHeight + 5) + 'px';
        
        // Adjust if tooltip goes off screen
        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = (window.innerWidth - tooltipRect.width - rect.left - 10) + 'px';
            }
        }, 0);
    }
};

DefinedTerms.prototype.hideTooltip = function(element) {
    const tooltip = element.querySelector(`.${this.tooltipClass}`);
    if (tooltip) {
        tooltip.style.display = 'none';
    }
};

DefinedTerms.prototype.handleTermClick = function(element, event) {
    const term = element.getAttribute('data-term');
    if (!term) return;
    
    const termData = this.definedTerms.get(term);
    if (!termData) return;
    
    // Find and scroll to definition
    const definitionOccurrence = termData.occurrences.find(occ => occ.isDefinition);
    if (definitionOccurrence) {
        definitionOccurrence.element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Briefly highlight the definition
        const originalClass = definitionOccurrence.element.className;
        definitionOccurrence.element.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
        setTimeout(() => {
            definitionOccurrence.element.style.backgroundColor = '';
        }, 2000);
    }
    
    event.preventDefault();
};

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

DefinedTerms.prototype.toggle = function(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
        this.scanForDefinedTerms();
        this.highlightTerms();
    } else {
        this.removeHighlights();
    }
};

DefinedTerms.prototype.removeHighlights = function() {
    const highlights = document.querySelectorAll(`.${this.highlightClass}, .${this.definitionClass}`);
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize(); // Merge adjacent text nodes
    });
    
    this.definedTerms.clear();
};

// Global instance
window.definedTermsInstance = null;

function initializeDefinedTerms() {
    if (!window.definedTermsInstance) {
        window.definedTermsInstance = new DefinedTerms();
        window.definedTermsInstance.initialize();
    }
}