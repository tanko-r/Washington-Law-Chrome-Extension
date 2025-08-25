var checkBox_extEnable = document.getElementById('check_box_extEnable');
var checkBox_lineHighlight = document.getElementById('check_box_lineHighlight');

// Listen for the change event on the checkbox.
checkBox_extEnable.addEventListener('change', function() {

    // Update the background page localStorage.
    chrome.runtime.getBackgroundPage(function (arg_win) {

      arg_win.updateLocalStorage('isDisabled', !this.checked); // Checked === enabled

    }.bind(this));

    reloadPage();

    closePopUp();
});

checkBox_lineHighlight.addEventListener('change', function() {

    // Update the background page localStorage.
    chrome.runtime.getBackgroundPage(function (arg_win) {

      arg_win.updateLocalStorage('isDisabled_lineHighlight', !this.checked); // Checked === enabled

    }.bind(this));

    reloadPage();

    closePopUp();
});

chrome.runtime.getBackgroundPage(function (arg_win) {

  // Set the checkbox state, either checked or unchecked.

  if (!arg_win.getLocalStorage('isDisabled') || arg_win.getLocalStorage('isDisabled') === 'false') {

    checkBox_extEnable.checked = true;

  } else {

    checkBox_extEnable.checked = false;

    checkBox_lineHighlight.disabled = true; // Disable the other checkbox.
  }

  if (!arg_win.getLocalStorage('isDisabled_lineHighlight') || arg_win.getLocalStorage('isDisabled_lineHighlight') === 'false') {

    checkBox_lineHighlight.checked = true;

  } else {

    checkBox_lineHighlight.checked = false;
  }

});

function reloadPage(){
     // Reload page.
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

        chrome.tabs.update(tabs[0].id, {url: tabs[0].url});
    });
}

function closePopUp(){
  // Close the popup.
  setTimeout(function(){
    window.close();
  }, 500);
}