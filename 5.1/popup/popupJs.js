var checkBox_extEnable = document.getElementById('check_box_extEnable');
var checkBox_lineHighlight = document.getElementById('check_box_lineHighlight');
var checkBox_termHighlight = document.getElementById('check_box_termHighlight');

// Listen for the change event on the checkbox.
checkBox_extEnable.addEventListener('change', function() {
    // Update storage directly
    chrome.storage.local.set({'isDisabled': (!this.checked).toString()});

    reloadPage();

    closePopUp();
});

checkBox_lineHighlight.addEventListener('change', function() {
    // Update storage directly
    chrome.storage.local.set({'isDisabled_lineHighlight': (!this.checked).toString()});

    reloadPage();

    closePopUp();
});

checkBox_termHighlight.addEventListener('change', function() {
    // Update storage directly
    chrome.storage.local.set({'isDisabled_termHighlight': (!this.checked).toString()});

    reloadPage();

    closePopUp();
});


// Get storage values and set checkbox states
chrome.storage.local.get(['isDisabled', 'isDisabled_lineHighlight', 'isDisabled_termHighlight'], function(result) {
  // Set the checkbox state, either checked or unchecked.
  if (!result.isDisabled || result.isDisabled === 'false') {
    checkBox_extEnable.checked = true;
  } else {
    checkBox_extEnable.checked = false;
    checkBox_lineHighlight.disabled = true; // Disable the other checkbox.
    checkBox_termHighlight.disabled = true; // Disable the other checkbox.
  }

  if (!result.isDisabled_lineHighlight || result.isDisabled_lineHighlight === 'false') {
    checkBox_lineHighlight.checked = true;
  } else {
    checkBox_lineHighlight.checked = false;
  }

  if (!result.isDisabled_termHighlight || result.isDisabled_termHighlight === 'false') {
    checkBox_termHighlight.checked = true;
  } else {
    checkBox_termHighlight.checked = false;
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