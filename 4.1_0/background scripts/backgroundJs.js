function updateLocalStorage(p_key, p_value) {

  localStorage[p_key] = p_value;

}

function getLocalStorage(p_key){

  return localStorage[p_key];

}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var obj = {};

    if (request.localStorage === 'get') {

        obj[request.key] = getLocalStorage(request.key);

        sendResponse(obj);

    }

    chrome.pageAction.show(sender.tab.id);

});