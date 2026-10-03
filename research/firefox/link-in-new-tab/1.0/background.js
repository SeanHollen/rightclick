let active = true;

// open unfocused tab for link clicks
browser.runtime.onMessage.addListener(message => {
    browser.tabs.create({
        active: false,
        url: message
    });
});

// toggle on browserAction click
browser.browserAction.onClicked.addListener(() => {
    active = !active;
    // set browserAction icon
    if(active) {
        browser.browserAction.setIcon({
            "path": "plusgreen.png"
        });
    }
    else {
        browser.browserAction.setIcon({
            "path": "pluswhite.png"
        });
    }
    browser.tabs.query({})
        .then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, {"enabled": active});
            })
        })
});

// send message to all new tabs
browser.tabs.onUpdated.addListener(tabId => {
    browser.tabs.sendMessage(tabId, {"enabled": active});
});