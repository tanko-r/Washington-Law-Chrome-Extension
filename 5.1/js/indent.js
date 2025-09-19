function Unit(p_unitTxt, p_unitRegex) {

    this.section    = null;
    this.subsection = null;
    this.elem = null;
    this.indent = 0;
    this.enumLvl = null;
    this.arrayIndex = null;

    var unit_regEx = p_unitRegex || /^\s*?(\([\da-zA-Z]{1,8}\))\s*(\([\da-zA-Z]{1,8}\))?\s*(\([\da-zA-Z]{1,8}\))?\s*(\([\da-zA-Z]{1,8}\))?\s*(\([\da-zA-Z]{1,8}\))?([\s\S]*)/;
    var match = p_unitTxt.match(unit_regEx) || [];

    if (match) {

        match.shift(); // Remove the "match" (match[0]) portion of the "match".
    }

    this.orginalText = p_unitTxt || '';
    this.body   = match.pop() || this.orginalText;
    this.paren1 = match[0] || ''; // Cache this for quick reference.
    this.parens = [];

    for (var n = 0; n < match.length; n++) {

        if (match[n]) {

            this.parens.push(match[n]); // Push all the parens that were matched.
        }
    }
}

function Subsection(p_section, p_doc) {
    this.section = p_section || null;
    this.doc = p_doc || document;

    this.table = Subsection.createTable(this.doc);
    this.table.className += 'subsection';

    this.tbody = this.table.querySelector('tbody');

    this.element = this.table;

    this.unitsArray = [];

    this.section.event.addListener('dblclick', this.mouseEvt_indenterDblclick.bind(this));
}

Subsection.prototype.processNextUnit = function(p_unitObj) {
    var parentElem = this.tbody || this.table;

    p_unitObj.subsection = this;

    p_unitObj.elem = Subsection.createRow(Subsection.createTDs(p_unitObj), this.doc);

    parentElem.appendChild(p_unitObj.elem);

    this.unitsArray.push(p_unitObj);
};

Subsection.createTDs = function(p_unitObj) {
    var tds = '';
    var tag = p_unitObj.parens.length === 0 // This is just for show, not necessary.
                ? 'div' // Preserve original content styles.
                : 'span'; // Mouse over highlight will only "span" the width of the content.

    for (var n = 0; n < p_unitObj.indent; n++) {

        tds = tds +'<td class="td-unit-indent"></td>';
    }

    for (n = 0; n < p_unitObj.parens.length; n++) {

        tds +=   '<td class="td-unit-enum">'
               +     p_unitObj.parens[n]
               + '</td>';
    }

    tds +=  '<td class="td-unit-body" colspan="100">'
          +     '<'+ tag +' class="unit-highlight">'
          +         p_unitObj.body
          +    '</'+ tag +'>'
          + '</td>';

    return tds;
};

Subsection.createTable = function(doc) {
    var table = doc.createElement('table');
        table.style.fontSize = '1em';
        table.style.borderCollapse = 'collapse';
        //table.style.fontFamily = "'Linux Libertine',Georgia,Times,serif";

    var tBody = doc.createElement('tbody');
    table.appendChild(tBody);

    return table;
};

Subsection.createRow = function(p_html, doc) {
    var tr = doc.createElement('tr');

    tr.className = 'formatted-tr';

    tr.innerHTML = p_html;

    return tr;
};

Subsection.prototype.mouseEvt_indenterDblclick = function() {
    var hasClass = this.table.classList.contains('indenter-activated');

    if (hasClass) {

        this.table.classList.remove('indenter-activated');

        this.table.removeEventListener('mousedown', Subsection.mouseEvt_indenterMousedown);

    } else {

        this.table.classList.add('indenter-activated');

        this.table.addEventListener('mousedown', Subsection.mouseEvt_indenterMousedown);
    }
};

Subsection.mouseEvt_indenterMousedown = function(e) {
    var row = e.target;
    var startPos = {x: e.pageX, y: e.pageY};

    while (!row.classList.contains('formatted-tr')) {

        row = row.parentElement;
    }
    var offset = parseFloat(getComputedStyle(row).fontSize) * 0.95; //http://tzi.fr/js/convert-em-in-px

    document.body.addEventListener('mousemove', mouseEvt_indenterMousemove);
    document.body.addEventListener('mouseup',   mouseEvt_indenterMouseup);

    function mouseEvt_indenterMousemove(e) {
        var indentTD = null;
        var dist = e.pageX - startPos.x;

        e.preventDefault();

        if (dist > offset) {

            indentTD = document.createElement('td');
            indentTD.className = 'td-unit-indent';

            row.insertBefore(indentTD, row.firstChild);

            startPos = {x: e.pageX, y: e.pageY};

        } else if (dist < (-offset) && row.querySelector('.td-unit-indent')) {

            row.removeChild(row.querySelector('.td-unit-indent'));

            startPos = {x: e.pageX, y: e.pageY};
        }
    }

    function mouseEvt_indenterMouseup(e) {
        document.body.removeEventListener('mousemove', mouseEvt_indenterMousemove);
        document.body.removeEventListener('mouseup', mouseEvt_indenterMouseup);
    }
};


function Section(p_obj) {
    this.indentObj = [];
    this.highlightObj = [];
    this.container = p_obj.container;
    this.unitsArray = p_obj.unitsArray;
    this.doc = p_obj.doc || document;
    this.subsectionsArray = [];
    this.event = Section.createEventSystem();
    this.newSubEnumLvl = null;

    if (!this.container) {
        throw new Error('Container not found.');
    } else if (this.container.isASectionOfTheLaw) {
        throw new Error('Container is already initialized.');
    }

    this.container.addEventListener('dblclick', this.mouseEvt_dblclick.bind(this));// Event delegation.

    this.container.isASectionOfTheLaw = true;

    this.container.classList.add('section-container');

    this.processUnits();
}

Section.subsectionConstructor = Subsection;

Section.createEventSystem = function() {
    //https://davidwalsh.name/pubsub-javascript
    var topics = {};
    var hOP = topics.hasOwnProperty;

    return {
        addListener: function(topic, fn){
            if(!hOP.call(topics, topic)) topics[topic] = [];
            topics[topic].push(fn);
        },
        removeListener: function(topic, fn){
            delete topics[topic][topics.indexOf(fn)];
        },
        publish: function(topic, info) {
            if(!hOP.call(topics, topic)) return;
            topics[topic].forEach(function(item) {
                item(info != undefined ? info : {});
            });
        }
    };
};

Section.convRomanNumToInt = function(p_x) {
    var t = 0;
    var arr = p_x.split('');
    var now  = null;
    var next = null;
    var nums = {'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100,
                'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100};

    for (var n = 0; n < arr.length; ++n) {
        now  = nums[arr[n]];
        next = nums[arr[n + 1]];

        if (!next || now >= next) {
            t += now;
        } else {
            t -= now;
        }
    }

    return t;
};

Section.prototype.processUnits = function() {
    var subsection = null;

    for (var m = 0; m < this.unitsArray.length; m++) {

        this.unitsArray[m].arrayIndex = m;

        this.processNextUnit(this.unitsArray[m]);

        if (!this.newSubEnumLvl) {

            this.newSubEnumLvl = this.unitsArray[m].enumLvl;
        }

        if (this.unitsArray[m].enumLvl === this.newSubEnumLvl

            && this.unitsArray[m].paren1) {

            subsection = this.createNewSubsection();
        }

        subsection.processNextUnit(this.unitsArray[m]);
    }
};

Section.prototype.processNextUnit = function(p_unitObj) {

    if (p_unitObj.enumLvl) {

        // The unit was already processed for some reason.

        return;
    }

    p_unitObj.section = this;

    p_unitObj.enumLvl = this.calcUnitEnumLvl(p_unitObj);

    p_unitObj.indent += this.calcUnitIndent(p_unitObj);

    p_unitObj.body = p_unitObj.body.replace(/text-indent:.*?;/, '');
};

Section.prototype.createNewSubsection = function() {
    var subsection = new Section.subsectionConstructor(this, this.doc)

    this.subsectionsArray.push(subsection);

    this.container.appendChild(subsection.element);

    return subsection;
};

Section.prototype.mouseEvt_dblclick = function(e) {
    this.event.publish('dblclick', e);
};

Section.prototype.calcUnitIndent = function(p_unitObj) {
    var indent = p_unitObj.enumLvl === null
                 ? 0
                 : this.setIndentLvlOfEnumLvl(p_unitObj.enumLvl);

    if (p_unitObj.parens.length > 1) { // Is there a second unit such as (c)(i)?

        for (var n = 1; n < p_unitObj.parens.length; ++n) {

            this.setIndentLvlOfEnumLvl(p_unitObj.parens[n] === '(1)'? 1:
                                       p_unitObj.parens[n] === '(a)'? 2:
                                       p_unitObj.parens[n] === '(i)'? 3:
                                       p_unitObj.parens[n] === '(A)'? 4:
                                       p_unitObj.parens[n] === '(I)'? 5: null);
        }
    }

    return indent;
};

Section.prototype.setIndentLvlOfEnumLvl = function(p_) {

    if (this.indentObj.indexOf(p_) === -1) {

        this.indentObj.push(p_);
    }

    // The index that the param is stored at determines how far it is indented.
    return this.indentObj.indexOf(p_);
};

Section.prototype.getEnumLvlOfIndentLvl = function(p_) {
    p_ = p_ - 1;

    if (p_ < 0) { p_ = 0; }
    if (p_ > this.indentObj.length - 1) { p_ = this.indentObj.length - 1; }

    return this.indentObj[p_];
};

Section.prototype.calcUnitEnumLvl = function(p_unitObj) {
    var that = this;
    var txt = p_unitObj.paren1 || '';

    var regExArr = [
        [/^\s*\(\d{1,3}\)/,            function() { return 1; }],
        [/^\s*\([a-hjkm-uwyz]{1,3}\)/, function() { return 2; }],
        [/^\s*\([ilvx]{1,8}\)/,        function(e){ return that.enumIsRomanNum(e, 3)? 3: 2; }],
        [/^\s*\([A-HJKM-UWYZ]{1,3}\)/, function() { return 4; }],
        [/^\s*\([ILVX]{1,8}\)/,        function(e){ return that.enumIsRomanNum(e, 5)? 5: 4; }],
        [/.?/,  /*default*/            function(e){ return that.calcNonEnumeratedUnitEnumLvl(e); }]
    ];

    for (var n = 0; n < regExArr.length; ++n) {

        if (regExArr[n][0].test(txt)) {

            return regExArr[n][1](p_unitObj);
        }
    }

    return p_unitObj.enumLvl; // Return default value just in case.
};

Section.prototype.calcNonEnumeratedUnitEnumLvl = function(p_unitObj) {
    var unitsArray = this.unitsArray;
    var indexPlusOne = p_unitObj.arrayIndex + 1;
    var prevUnit = this.calcPrevEnumeratedUnitInfo(p_unitObj);
    var prevUnitPrens = prevUnit.unit.parens;
    var nextUnit = null;

    if (unitsArray[indexPlusOne]) { // Check to see if there is another unit in the array.

        unitsArray[indexPlusOne].arrayIndex = indexPlusOne; // <- Array index on next unit might not be set yet.

        nextUnit = this.calcThisOrNextEnumeratedUnitInfo(unitsArray[indexPlusOne]);
    }

    if (!prevUnit.hasPeriod) {

        // If the previous unit body DOESN'T HAVE A PERIOD, then this unit might
        // be associated with the previous unit somehow.

        if ((prevUnitPrens.length > 1)
            && /\([1aiAI]\)/.test(prevUnitPrens[prevUnitPrens.length - 1])) {

            // As as many indents as there are parens that were found.
            p_unitObj.indent += prevUnitPrens.length;

        } else {

            p_unitObj.indent += 1;
        }

        return prevUnit.enumLvl;
    }

    for (var n = indexPlusOne;n < unitsArray.length; ++n) {

        unitsArray[n].arrayIndex = n;

        this.processNextUnit(unitsArray[n]);

        if (unitsArray[n].enumLvl && unitsArray[n].parens.length > 0) {

            break;
        }
    }

    if ((nextUnit && unitsArray[n])
        && ((unitsArray[n].enumLvl === 1)
            || !/\([1aiAI]\)/.test(unitsArray[n].parens[0]))) {

        // If the next enumerated unit is a level 1 or the nextUnit doesn't
        // have mulitple parens that end with 1, a, i, A, or I, then give it
        // an additional indent.

        // TODO: test this again

        p_unitObj.indent += 1;
    }

    return (unitsArray[n] && unitsArray[n].enumLvl) || this.getEnumLvlOfIndentLvl(1);
};

Section.prototype.calcPrevEnumeratedUnitInfo = function(p_unitObj) {
    var unit = p_unitObj;
    var index = unit.arrayIndex;
    var regEx = /^\s*\((.*?)\)/; // Get both parens. example: (m)(i).
    var period_regex = /\.\s*$/;
    var innerParensText = null;
    var charCodeTotal = 0;

    unit = this.unitsArray[index - 1];

    while (unit.parens.length === 0) {

        // Skip over previous siblings until the previous unit is found.

        index -= 1;

        unit = this.unitsArray[index];
    }

    innerParensText = (unit.parens.length > 1
                             // The previous unit would be the second parens if it exists.
                          && unit.parens[unit.parens.length - 1].match(regEx)[1])
                      || unit.paren1.match(regEx)[1];

    for (var n = 0; n < innerParensText.length; ++n) {

        charCodeTotal += innerParensText.charCodeAt(n);
    }

    return {
        unit: unit,
        hasPeriod: period_regex.test(unit.body),
        charCodeTotal: charCodeTotal,
        charCodeAvg: charCodeTotal/innerParensText.length,
        integer: Section.convRomanNumToInt(innerParensText),
        length: innerParensText.length,
        enumLvl : unit.enumLvl
     };
};

Section.prototype.calcThisOrNextEnumeratedUnitInfo = function(p_unitObj) {
    var unit = p_unitObj;
    var index = unit.arrayIndex;
    var regEx = /^\s*\((.*?)\)/; // Only get first parens, second one (if it exists) doesn't matter.
    var period_regex = /\.\s*$/;
    var innerParensText = null;
    var charCodeTotal = 0;
    var isLast = false;

    // Skip over siblings until the next viable unit is found.
    while (unit && !unit.paren1) {

        index += 1;

        if (this.unitsArray[index]) {

            unit = this.unitsArray[index];

        } else {

            return null;
        }
    }

    innerParensText = unit.paren1.match(regEx) && unit.paren1.match(regEx)[1];

    for (var n = 0; n < innerParensText.length; ++n) {

        charCodeTotal += innerParensText.charCodeAt(n);
    }

    return {
        unit: unit,
        hasPeriod: period_regex.test(unit.body),
        islast: isLast,
        charCodeTotal: charCodeTotal,
        charCodeAvg: charCodeTotal/innerParensText.length,
        integer: Section.convRomanNumToInt(innerParensText),
        length: innerParensText.length
     };
};

Section.prototype.enumIsRomanNum = function(p_unitObj, p_lvl) {
    var index = p_unitObj.arrayIndex;

    var LookBehind = this.findFirstLowerPreviousEnum(p_unitObj, p_lvl);

    if (LookBehind.enumLvl !== p_lvl - 1) {

        // The last unit found must be the first unit in the sectin.
        // Probably has multiple parens.
        // example: LookBehind.enumLvl === 1 and (p_lvl - 1) === 2

        return true;
    }

    var prevUnit = this.calcPrevEnumeratedUnitInfo(p_unitObj);
    var thisUnit = this.calcThisOrNextEnumeratedUnitInfo(p_unitObj);
    var nextUnit = null;

    if (this.unitsArray[index + 1]) { // Make sure there is a next unit to check.

        nextUnit = this.calcThisOrNextEnumeratedUnitInfo(this.unitsArray[index + 1]);
    }

    var prevLvlUnit = this.calcThisOrNextEnumeratedUnitInfo(LookBehind);
    var AlphaOrderWithPrevLvlUnit = (prevLvlUnit.charCodeAvg + 1 === thisUnit.charCodeAvg)
                                     && (prevLvlUnit.length === thisUnit.length);

    if (!AlphaOrderWithPrevLvlUnit) {

        // If not in alphabetical order with the previous level unit, then no need to go further.

        return true;
    }

    if ((p_unitObj.parens.length > 1)

        && /\([iI]\)/.test(p_unitObj.parens[p_unitObj.parens.length - 1])) { // (v)(i) or (i)(i)...

        // Run this check first...why not..
        return false;
    }

    if (nextUnit && (thisUnit.integer + 1 === nextUnit.integer)) { // (v)...(v)(vi)

        return true;
    }

    if (!prevUnit.hasPeriod && (thisUnit.integer - 1 === prevUnit.integer)) { // (u)(i)(ii)(iii)(iv)sdf.(v) <- HAS period after (iv)

        return true;
    }

    if (prevLvlUnit.charCodeAvg === thisUnit.charCodeAvg) { // (i)(i), (v)...(v)

        return true;
    }

    if ((LookBehind.parens.length > 1)

        && /\([iI]\)/.test(LookBehind.parens[LookBehind.parens.length - 1])

        && (thisUnit.integer > 1)) {

        return true;
    }

    return false;
};

Section.prototype.findFirstLowerPreviousEnum = function(p_unitObj, p_lvl) {
    var arr = this.unitsArray;
    var index = p_unitObj.arrayIndex;
    var unit = arr[index];

    while (index !== -1) {

        if (unit && unit.paren1 && unit.enumLvl === p_lvl - 1) {

            break;
        }

        index -= 1;

        unit = arr[index];
    }

    if (index === -1) {

        return arr[index + 1];
    }

    return unit;
};

function findSections(p_rootNode){
    var rootNode = p_rootNode || document;
    var lawDivs = rootNode.querySelectorAll('#divContent div');

    for (var n = 0; n < lawDivs.length; ++n) {

        if (!lawDivs[n].nextElementSibling) {

            // The element was removed from the DOM when the new section was created.

            continue;
        }

        if (/^\s*\([1aAiI]\)/.test(lawDivs[n].innerHTML)) { // The first "unit" should start with a (a) or (1).

            createNewSection(lawDivs[n]);
        }
    }
}

function createNewSection(p_startElem) {
    var container = null;
    var unitsArray = [];
    var section = null;
    var unit = null;
    var doc = p_startElem.ownerDocument;

    unit = p_startElem;

    unitsArray = [];

    container = doc.createElement('div');

    unit.parentElement.insertBefore(container, unit);

    while (unit) {

        // Gobble up all the "units" from the start element until the end of the section is found.

        if (unit.classList.contains('lawreference')) {

            break; // Every law (as far as I can tell) has a .lawreference that marks the end of the section.
        }

        if (/^\s*\([\da-zA-Z]{0,8}\)/.test(unit.innerHTML)) {

            unitsArray.push(new Unit(unit.innerHTML)); // An enumerated subsection. Example: (a) texttexttext.

        } else {

            unitsArray.push(new Unit(unit.outerHTML)); // Probably a paragraph or table.
        }

        if (unit.nextElementSibling) {

            unit = unit.nextElementSibling;

            unit.previousElementSibling.parentElement.removeChild(unit.previousElementSibling);

        } else {

            unit.parentElement.removeChild(unit);

            break; // Break if this "unit" has no more siblings.
        }
    }

    section = new Section({ container: container, unitsArray: unitsArray, doc: doc });
}
