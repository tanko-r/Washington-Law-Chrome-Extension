

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