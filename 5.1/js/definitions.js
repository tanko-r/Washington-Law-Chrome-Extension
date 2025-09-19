/**
 * Finds and highlights defined terms on the page.
 * A defined term is a short phrase in quotes. Its definition is assumed to be the content of the paragraph it's in.
 * Usages of the term are then highlighted with a tooltip showing the definition.
 */

let termIdCounter = 0;
let tooltipElement = null;
let tooltipHideTimer = null;

/**
 * Initializes the tooltip element and attaches it to the body.
 */
function createTooltip() {
    if (tooltipElement) return;
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'defined-term-tooltip';
    document.body.appendChild(tooltipElement);

    tooltipElement.addEventListener('mouseenter', () => {
        clearTimeout(tooltipHideTimer);
    });
    tooltipElement.addEventListener('mouseleave', () => {
        tooltipElement.style.display = 'none';
    });
}

/**
 * Shows the tooltip with provided content near the target element.
 * @param {HTMLElement} targetElement The element that triggered the tooltip.
 * @param {string} definition The definition text.
 * @param {string} sourceId The ID of the definition source for the anchor link.
 * @param {boolean} isFullChapter Whether the current page is the full chapter view.
 * @param {string} fullChapterUrl The URL for the full chapter view.
 */
function showTooltip(targetElement, definition, sourceId, isFullChapter, fullChapterUrl) {
    clearTimeout(tooltipHideTimer);
    if (!tooltipElement) createTooltip();

    const formattedDefinition = definition
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');

    let linkHtml;
    if (isFullChapter) {
        // On full chapter page, it's a simple anchor link.
        linkHtml = `<a href="#${sourceId}" class="defined-term-tooltip-link" onclick="document.querySelector('.defined-term-tooltip').style.display='none';">Go to definition</a>`;
    } else {
        // On single section page, link to the full chapter page in a new tab with a scroll instruction.
        const fullUrl = `${fullChapterUrl}&scrollToDef=${sourceId}`;
        linkHtml = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="defined-term-tooltip-link">Go to definition</a>`;
    }

    tooltipElement.innerHTML = `
        <div class="defined-term-tooltip-content">${formattedDefinition}</div>
        ${linkHtml}
        <div class="defined-term-tooltip-disclaimer">Definitions displayed may be inaccurate.  ALWAYS review the original law.</div>
    `;

    const rect = targetElement.getBoundingClientRect();
    tooltipElement.style.display = 'block';
    
    const topPos = window.scrollY + rect.bottom + 5;
    const leftPos = window.scrollX + rect.left;

    tooltipElement.style.top = `${topPos}px`;
    tooltipElement.style.left = `${leftPos}px`;
    
    const tooltipRect = tooltipElement.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
        tooltipElement.style.left = `${window.innerWidth - tooltipRect.width - 10 + window.scrollX}px`;
    }
}

/**
 * Hides the tooltip after a short delay.
 */
function hideTooltip() {
    tooltipHideTimer = setTimeout(() => {
        if (tooltipElement) {
            tooltipElement.style.display = 'none';
        }
    }, 300);
}

/**
 * Helper to get the indentation level of a formatted law row (<tr>).
 * @param {HTMLElement} trElement The table row element.
 * @returns {number} The indentation level.
 */
function getRowIndentLevel(trElement) {
    if (!trElement) return 0;
    return trElement.querySelectorAll('.td-unit-indent').length;
}

/**
 * Helper to get cleaned and combined text from a formatted law row (<tr>).
 * @param {HTMLElement} trElement The table row element.
 * @returns {string} The combined text from enum and body cells.
 */
function getCleanRowText(trElement) {
    if (!trElement) return '';
    const enumTds = trElement.querySelectorAll('.td-unit-enum');
    const bodyTd = trElement.querySelector('.td-unit-body');

    const enumsText = Array.from(enumTds).map(td => td.textContent.trim()).join(' ');
    const bodyText = bodyTd ? bodyTd.textContent.trim() : '';
    
    // Add a space between ordinal and text, and indent multi-part definitions.
    let fullText = [enumsText, bodyText].filter(Boolean).join(' ');
    fullText = fullText.replace(/^(\(\w+\))(\S)/, '$1 $2'); // Add space after ordinal
    
    return fullText;
}

/**
 * Generates singular and plural variations of a given term.
 * Handles multi-word terms by only modifying the last word.
 * @param {string} term The term to process.
 * @returns {Set<string>} A set of term variations (lowercase).
 */
function getTermVariations(term) {
    const lowerTerm = term.toLowerCase();
    const variations = new Set([lowerTerm]);
    const words = lowerTerm.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.endsWith('s')) {
        const singularLastWord = lastWord.slice(0, -1);
        words[words.length - 1] = singularLastWord;
        variations.add(words.join(' '));
    } else {
        const pluralLastWord = lastWord + 's';
        words[words.length - 1] = pluralLastWord;
        variations.add(words.join(' '));
    }
    
    return variations;
}


async function findAndHighlightDefinedTerms() {
    console.log("Washington Law Extension: Starting findAndHighlightDefinedTerms...");
    const contentDiv = document.getElementById('divContent');
    if (!contentDiv) {
        console.error("Washington Law Extension: Could not find #divContent element. Aborting.");
        return;
    }
    
    createTooltip();
    const definedTerms = new Map();

    const url = new URL(window.location.href);
    const cite = url.searchParams.get('cite');
    const isFullChapter = url.searchParams.has('full');
    let fullChapterUrl;

    if (cite && !isFullChapter && cite.split('.').length >= 3) {
        console.log("Washington Law Extension: Individual section page detected. Fetching full chapter for definitions.");
        const chapterParts = cite.split('.').slice(0, 2).join('.');
        fullChapterUrl = `${url.origin}${url.pathname}?cite=${chapterParts}&full=true`;
        console.log(`Washington Law Extension: Fetching from: ${fullChapterUrl}`);

        try {
            const response = await fetch(fullChapterUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const fetchedDoc = parser.parseFromString(htmlText, 'text/html');
            
            console.log("Washington Law Extension: Fetched content successfully. Processing for definitions...");
            // Run indentation logic on the in-memory document
            findSections(fetchedDoc);

            const fetchedContentDiv = fetchedDoc.getElementById('divContent');
            if (fetchedContentDiv) {
                console.log("Washington Law Extension: Finished indenting fetched content. Now finding definitions...");
                findDefinitions(fetchedContentDiv, definedTerms);
                console.log(`Washington Law Extension: Found ${definedTerms.size} terms from full chapter.`);
            } else {
                 console.error("Washington Law Extension: #divContent not found in fetched HTML.");
            }

        } catch (error) {
            console.error("Washington Law Extension: Failed to fetch or process full chapter:", error);
        }
    } else {
        console.log("Washington Law Extension: Full chapter page detected. Finding definitions on this page.");
        findDefinitions(contentDiv, definedTerms);
    }

    if (definedTerms.size > 0) {
        console.log(`Washington Law Extension: Starting to highlight ${definedTerms.size} terms on current page...`);
        highlightTermUsages(contentDiv, definedTerms, isFullChapter, fullChapterUrl);
        console.log("Washington Law Extension: Finished highlighting term usages.");
    } else {
        console.log("Washington Law Extension: No defined terms found, skipping usage highlighting.");
    }

    // After all definitions are found and usages highlighted, check if we need to scroll to one.
    const urlParams = new URLSearchParams(window.location.search);
    const targetDefId = urlParams.get('scrollToDef');

    if (targetDefId) {
        const targetElement = document.getElementById(targetDefId);
        if (targetElement) {
            console.log(`Washington Law Extension: Scrolling to definition: ${targetDefId}`);
            // Setting the hash will trigger the :target CSS for highlighting.
            window.location.hash = targetDefId;
            // Now scroll it into view.
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // This could happen if the definition ID from the URL doesn't exist on this page.
            console.warn(`Washington Law Extension: Could not find target definition ID: ${targetDefId}`);
        }
    }
}

/**
 * Traverses the element to find and catalogue defined terms.
 * @param {HTMLElement} element The root element to search within.
 * @param {Map<string, object>} definedTerms The map to store found terms and definitions.
 */
function findDefinitions(element, definedTerms) {
    const treeWalker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while(node = treeWalker.nextNode()) {
        textNodes.push(node);
    }
    
    const termRegex = /"([^"]+)"/g;

    for (const node of textNodes) {
        if (!node.parentElement || !node.ownerDocument.body.contains(node)) {
            continue; // Node was removed from the DOM
        }
        if(node.parentElement.closest('.defined-term-source, .defined-term-usage')) {
            continue;
        }

        const text = node.nodeValue;
        if (!text || text.trim().length === 0) continue;
        
        const matches = [...text.matchAll(termRegex)];
        
        if (matches.length === 0) continue;

        const fragment = element.ownerDocument.createDocumentFragment();
        let lastIndex = 0;
        let replaced = false;

        for (const match of matches) {
            const term = match[1].trim();
            
            if (!term || term.split(/\s+/).length >= 6) continue;
            
            const termVariations = getTermVariations(term);
            const isAlreadyDefined = Array.from(termVariations).some(v => definedTerms.has(v));
            
            if (!isAlreadyDefined) {
                const sourceRow = node.parentElement.closest('tr.formatted-tr');
                if (!sourceRow) continue;

                let definitionText = '';
                const uniqueId = `def-term-${++termIdCounter}`;
                const firstLineText = getCleanRowText(sourceRow);
                
                if (firstLineText.trim().endsWith(':')) {
                    const definitionParts = [firstLineText];
                    const startIndent = getRowIndentLevel(sourceRow);
                    let currentRow = sourceRow.nextElementSibling;

                    while (currentRow && currentRow.tagName === 'TR') {
                        const currentIndent = getRowIndentLevel(currentRow);
                        if (currentIndent > startIndent) {
                            const relativeIndent = currentIndent - startIndent;
                            const indentSpaces = '  '.repeat(relativeIndent);
                            definitionParts.push(indentSpaces + getCleanRowText(currentRow));
                            currentRow = currentRow.nextElementSibling;
                        } else {
                            break;
                        }
                    }
                    definitionText = definitionParts.join('\n');
                } else {
                    definitionText = firstLineText;
                }
                
                const definitionData = { definition: definitionText, sourceId: uniqueId, baseTerm: term };
                for (const variation of termVariations) {
                    definedTerms.set(variation, definitionData);
                }

                const offset = match.index;
                if (offset > lastIndex) {
                    fragment.appendChild(element.ownerDocument.createTextNode(text.substring(lastIndex, offset)));
                }

                const span = element.ownerDocument.createElement('span');
                span.className = 'defined-term-source';
                span.id = uniqueId;
                span.textContent = match[0];
                fragment.appendChild(span);
                
                lastIndex = offset + match[0].length;
                replaced = true;
            }
        }

        if (replaced) {
            if (lastIndex < text.length) {
                fragment.appendChild(element.ownerDocument.createTextNode(text.substring(lastIndex)));
            }
            if (fragment.hasChildNodes()) {
                if (node.parentElement) {
                    node.parentElement.replaceChild(fragment, node);
                }
            }
        }
    }
}

/**
 * Traverses the element to find and highlight usages of defined terms.
 * @param {HTMLElement} element The root element to search within.
 * @param {Map<string, object>} definedTerms The map of defined terms.
 * @param {boolean} isFullChapter Whether the current page is the full chapter view.
 * @param {string} fullChapterUrl The URL for the full chapter view.
 */
function highlightTermUsages(element, definedTerms, isFullChapter, fullChapterUrl) {
    const terms = Array.from(definedTerms.keys());
    if (terms.length === 0) return;
    
    // Sort terms by length, descending, to match longer phrases first
    terms.sort((a, b) => b.length - a.length);

    const searchRegex = new RegExp(`\\b(${terms.map(term => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');
    
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while(node = treeWalker.nextNode()) {
        textNodes.push(node);
    }
    
    for(const node of textNodes) {
        const parent = node.parentElement;
        if (!parent || !document.body.contains(node)) continue;
        if (/^(script|style|a)$/i.test(parent.tagName) || parent.closest('.defined-term-source, .defined-term-usage')) {
            continue;
        }

        const text = node.nodeValue;
        if (!searchRegex.test(text)) continue;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        text.replace(searchRegex, (match, ...args) => {
            const offset = args[args.length - 2];
            const termKey = match.toLowerCase();
            
            if (definedTerms.has(termKey)) {
                const { definition, sourceId, baseTerm } = definedTerms.get(termKey);

                if (offset > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
                }

                const span = document.createElement('span');
                span.className = 'defined-term-usage';
                span.dataset.definition = definition;
                span.dataset.sourceId = sourceId;
                span.dataset.baseTerm = baseTerm;
                span.textContent = match;
                fragment.appendChild(span);

                lastIndex = offset + match.length;
            }
        });

        if (lastIndex > 0) {
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
    
            if (fragment.hasChildNodes() && parent) {
                parent.replaceChild(fragment, node);
            }
        }
    }

    element.addEventListener('mouseover', (event) => {
        const target = event.target.closest('.defined-term-usage');
        if (target) {
            showTooltip(target, target.dataset.definition, target.dataset.sourceId, isFullChapter, fullChapterUrl);
            const baseTerm = target.dataset.baseTerm;
            if (baseTerm) {
                const allInstances = element.querySelectorAll(`.defined-term-usage[data-base-term="${CSS.escape(baseTerm)}"]`);
                allInstances.forEach(instance => {
                    instance.classList.add('term-hover-highlight');
                });
            }
        }
    });

    element.addEventListener('mouseout', (event) => {
        const target = event.target.closest('.defined-term-usage');
        if (target) {
            hideTooltip();
            const baseTerm = target.dataset.baseTerm;
            if (baseTerm) {
                const allInstances = element.querySelectorAll(`.defined-term-usage[data-base-term="${CSS.escape(baseTerm)}"]`);
                allInstances.forEach(instance => {
                    instance.classList.remove('term-hover-highlight');
                });
            }
        }
    });
}