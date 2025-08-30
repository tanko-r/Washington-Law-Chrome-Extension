function updateLocalStorage(p_key, p_value) {
  chrome.storage.local.set({[p_key]: p_value});
}

async function getLocalStorage(p_key){
  const result = await chrome.storage.local.get([p_key]);
  return result[p_key];
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.localStorage === 'get') {
        getLocalStorage(request.key).then(value => {
            var obj = {};
            obj[request.key] = value;
            sendResponse(obj);
        });
        return true; // Keep message channel open for async response
    }
    
    // Show action icon (replaces pageAction.show)
    chrome.action.enable(sender.tab.id);
});