

function changeFontSizeWidget() {
    var form = document.createElement('form');
    form.className = 'ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset change-form-text-size';
    form.action    = "javascript:void(0); return false;";
    form.onSubmit  = 'function() { return false;}; return false;';
    form.title     = 'Change font size (usefull for printing).';

    var input = document.createElement('input');
    input.className = 'change-form-text-size--input-text';
    input.type      = 'text';
    input.maxLength = '4';
    input.value     = '100%';

    var button = document.createElement('input');
    button.className = 'change-form-text-size--input-submit';
    button.type      = 'submit';
    button.value     = 'Change Text Size';

    form.appendChild(input);
    form.appendChild(button);

    document.body.appendChild(form);

    // input.addEventListener('keyup', function(e) {

    //     this.value = this.value.replace(/[^\d\%]/g,'')
    // });

    button.addEventListener('click', function() {
        var aspForm = document.getElementById('aspnetForm');
        var number = parseInt(input.value.replace(/[^\d]/g,''));

        if (!number) {

             number = 100;

             input.value = '100%';

        } else {

            input.value = input.value.replace(/[^\d]/g,'') + '%';
        }

        if (aspForm) {
            aspForm.style.fontSize = (number / 100) +'em';
        }

        return false;
    });
}