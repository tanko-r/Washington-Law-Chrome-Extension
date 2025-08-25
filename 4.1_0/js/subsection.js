
function Subsection(p_section) {
    this.section = p_section || null;

    this.table = Subsection.createTable();
    this.table.className += 'subsection';

    this.tbody = this.table.querySelector('tbody');

    this.element = this.table;

    this.unitsArray = [];

    this.section.event.addListener('dblclick', this.mouseEvt_indenterDblclick.bind(this));
}

Subsection.prototype.processNextUnit = function(p_unitObj) {
    var parentElem = this.tbody || this.table;

    p_unitObj.subsection = this;

    p_unitObj.elem = Subsection.createRow(Subsection.createTDs(p_unitObj));

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

Subsection.createTable = function() {
    var table = document.createElement('table');
        table.style.fontSize = '1em';
        table.style.borderCollapse = 'collapse';
        //table.style.fontFamily = "'Linux Libertine',Georgia,Times,serif";

    var tBody = document.createElement('tbody');
    table.appendChild(tBody);

    return table;
};

Subsection.createRow = function(p_html) {
    var tr = document.createElement('tr');

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