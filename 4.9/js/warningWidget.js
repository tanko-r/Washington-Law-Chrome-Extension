function warningWidget() {
    var href = location.href;

    var warning = document.createElement('div');
    warning.className = 'modified_law_warning';

    warning.addEventListener('click', function(e) {

        if (e.srcElement === this) {

            this.parentElement.removeChild(this);
        }
    });

    warning.innerHTML = 'A browser extension is installed that can modify this page. '
                        + '<span style="color: maroon;">ALWAYS</span> '
                        + "read the law's original text. "
                        + '<a target="_blank" href="'+ (href +'#original_text') +'">Click here for original Text</a>';

    document.body.appendChild(warning);
}
