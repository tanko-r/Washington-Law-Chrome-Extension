
/*
http://courts.wa.libguides.com/rcw

Citations to the Revised Code of Washington:

code    - RCW
title   - Title 1 RCW
chapter - chapter 1.04 RCW
section - RCW 1.04.020
unit - RCW 1.04.020(3) (not "unit (3) of RCW 1.04.020") // From -> http://leg.wa.gov/CodeReviser/Pages/bill_drafting_guide.aspx#CITATIONS

http://incometaxact.ca/tax-research/know-thy-ita/whats-in-a-section/
*/

/*)
https://www.reddit.com/r/law/comments/2ea13g/how_does_a_layman_tell_the_difference_between/
http://uscode.house.gov/detailed_guide.xhtml -> 'Sections are often subdivided into a combination of smaller units such as subsections, paragraphs, subparagraphs, clauses, subclauses, and items.'
https://www.cga.ct.gov/lco/PDFs/RegsDraftingManual.pdf -> 'A "unit" of a regulation refers to a unit, subdivision, subparagraph or any other division within a regulation.'
http://www.fjc.gov/public/pdf.nsf/lookup/draftcon.pdf/$file/draftcon.pdf
http://cw.routledge.com/textbooks/9780415458511/students.asp?p=part-2&r=case-studies&i=1-unfair-contract-terms-act.html
http://leg.wa.gov/CodeReviser/Pages/bill_drafting_guide.aspx#SUBSECTIONS

(a) Subsections and subparagraphs are enumerated as follows:
    (1)   -> subsection
    (2)
    (a)
    (b)
    (i)
    (ii)
    (iii)
    (A)
    (B)
    (I)
    (II)

*/

chrome.runtime.sendMessage({key: 'isDisabled', localStorage: 'get'}, function(response) {

    if ((response.isDisabled === 'false' || !response.isDisabled) && (location && !/original_text/.test(location.hash))) {

        main(); // If not disabled then run the extensions code.

    }

    setAspnetFormVisibility('initial');
});

chrome.runtime.sendMessage({key: 'isDisabled_lineHighlight' , localStorage: 'get'}, function(response) {

    if (response.isDisabled_lineHighlight === 'true') {
        var style = document.createElement('style');
        style.innerHTML = "tr:hover .unit-highlight {background-color: initial;}";

        document.body.appendChild(style);
    }

});

chrome.runtime.sendMessage({key: 'isDisabled_definedTerms' , localStorage: 'get'}, function(response) {

    if (response.isDisabled_definedTerms === 'true' && window.definedTermsInstance) {
        window.definedTermsInstance.toggle(false);
    }

});

function main() {

    findSections();
    warningWidget();
    changeFontSizeWidget();
    initializeDefinedTerms();

    return 0;

}

function findSections(){
    var lawDivs = document.querySelectorAll('#divContent div');

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

    unit = p_startElem;

    unitsArray = [];

    container = document.createElement('div');

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

    section = new Section({ container: container, unitsArray: unitsArray });
}

function setAspnetFormVisibility (p_visibility){
    document.getElementById('aspnetForm').style.visibility = p_visibility;
};

/*
Tests:

  http://app.leg.wa.gov/RCW/default.aspx?cite=84.33.130 <- (1)(a)(i)
  http://app.leg.wa.gov/RCW/default.aspx?cite=69.50.208 <- Schedule III. drugs. (a) (1) and (2) near last paragraph.
  http://app.leg.wa.gov/RCW/default.aspx?cite=69.50.204 <- Schedule I. drugs. Entire paragraph in parens. Lowercase letters after roman, should be uppercase. (6)(+-) shouldn't be matched
  http://app.leg.wa.gov/RCW/default.aspx?cite=69.50.101 <- goes all the way to (tt);
  http://app.leg.wa.gov/RCW/default.aspx?cite=26.50.020 <- (1)(a)
  http://apps.leg.wa.gov/wac/default.aspx?cite=182-513-1350 <- last unit is roman numeral
  http://apps.leg.wa.gov/wac/default.aspx?cite=182-513-1301 <- doesn't format correctly
  http://apps.leg.wa.gov/wac/default.aspx?cite=137-80-033
  http://app.leg.wa.gov/RCW/default.aspx?cite=69.50.206 <- (ii) at end and then paragraph, that caught a bug once.
  http://app.leg.wa.gov/rcw/default.aspx?cite=72.09.400
  http://apps.leg.wa.gov/wac/default.aspx?cite=182-513-1366 <- roman end of document. Can't figure out yet.
  http://apps.leg.wa.gov/wac/default.aspx?cite=137-30-030
  http://app.leg.wa.gov/RCW/default.aspx?cite=46.61.5055 <- DUI paragraphs
  http://apps.leg.wa.gov/wac/default.aspx?cite=182-513-1350 <== unit 3 error (should be capital letters not roman numerals).
  http://app.leg.wa.gov/RCW/default.aspx?cite=58.19.055 <== a-z unit 2
  http://app.leg.wa.gov/rcw/default.aspx?cite=9.94A&full=true // SENTENCING REFORM ACT OF 1981 full chapter
  http://app.leg.wa.gov/RCW/default.aspx?cite=9.41&full=true // fire arms dangerous weapons full chapter
  http://app.leg.wa.gov/RCW/default.aspx?cite=5.64.010 <- (b)(a) of this subsection...
  http://app.leg.wa.gov/RCW/default.aspx?cite=9.94A.411 <- many div paragraphs
  http://apps.leg.wa.gov/wac/default.aspx?cite=44-10&full=true <- parens test
  http://app.leg.wa.gov/RCW/default.aspx?cite=9A.20.010 <- Doesn't capture (1)(a) or (2)(a) next unit starts at (b);


  Tests (lowercase roman numerals: ivlxc):
  http://app.leg.wa.gov/rcw/default.aspx?cite=9.94A.728 -> unit one "(i)".
  http://app.leg.wa.gov/RCW/default.aspx?cite=46.20.342 -> goes to "(xx)".
  http://app.leg.wa.gov/RCW/default.aspx?cite=84.33.140 -> "(i)(i)" in same div. Land grade table.
  http://apps.leg.wa.gov/WAC/default.aspx?cite=458-20-169 -> Paragraph before (i). (xiii) <- 4 characters long.
  http://apps.leg.wa.gov/wac/default.aspx?cite=182-513-1525 -> (H)...\n(iii)\n(A)

  Tests (upper case roman numerals: IVLXC):
  http://app.leg.wa.gov/RCW/default.aspx?cite=84.34.020

*/

/*

https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx
// Was testing out the code on another state's website, it does seem to work with enough effort
.
function tt(){
  var ps = document.querySelectorAll('p');
    var spansArray = [];
var found1 = false;
var unit = null;
    var container = null;
    var section = null;
    var unitRegex = /^\s*[\s&nbsp;]*(\([\da-zA-Z]{1,8}?\))?\s*[\s&nbsp;]*(\([\da-zA-Z]{1,8}?\))?\s*[\s&nbsp;]*(\([\da-zA-Z]{1,8}?\))?\s*[\s&nbsp;]*(\([\da-zA-Z]{1,8}?\))?\s*[\s&nbsp;]*(\([\da-zA-Z]{1,8}?\))?([\s\S]*)/;

    for (var n = 130; n < ps.length; n++) {
       if (ps[n].childNodes && ps[n].childNodes.length === 2 && ps[n].firstChild.tagName === 'B') {
                  if (/\d{3}.?\./.test(ps[n].firstChild.firstChild.innerHTML)) {

        if (!section){
          container = document.createElement('div');
                    container.style.marginLeft = '30px';
                container.className = 'MsoNormal';
          found1 = true;
                section = new Section({ container: container, unitsArray: spansArray });
              ps[n+1].parentElement.insertBefore(container, ps[n+1]);
                }
            }
            if (section && found1 && !/\s*[\s&nbsp;]*\([\da-zA-Z]{0,10}\)/.test(ps[n].innerHTML)) {
            //debugger;
              section.processUnits();
        found1 = false;
              section = null;
               spansArray = [];
        continue;
          }

          if (found1 && /^\s*[\s&nbsp;]*\([\da-zA-Z]{0,10}\)/.test(ps[n].childNodes[1].innerHTML)) {

        found1 = true;
            spansArray.push(new Unit(ps[n].childNodes[1].innerHTML,unitRegex));

                ps[n].childNodes[1].parentElement.removeChild(ps[n].childNodes[1]);
          }
      }

    if (found1 && /^\s*[\s&nbsp;]*\([\da-zA-Z]{0,10}\)/.test(ps[n].firstChild.innerHTML)) {
            found1 = true;
            spansArray.push(new Unit(ps[n].firstChild.innerHTML,unitRegex));
            ps[n].firstChild.parentElement.removeChild(ps[n].firstChild);
        }

    }
    return container;
}
tt();

*/
