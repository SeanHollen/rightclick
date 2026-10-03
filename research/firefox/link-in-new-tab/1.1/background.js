let active = true;


function onCreated() {}
// register relative mode toggle

let relativeMode = true;

browser.storage.local.get("relativeMode")
    .then(relative => {
        relativeMode = relative.relativeMode;
    });
browser.contextMenus.create({
    id: "relative-toggle",
    title: "Open tabs relative to current",
    type: "checkbox",
    checked: relativeMode,
    contexts: ["browser_action"]
}, onCreated);
browser.contextMenus.onClicked.addListener(info => {
    switch(info.menuItemId) {
        case "relative-toggle":
            relativeMode = !relativeMode;
            browser.storage.local.set({
                relativeMode: relativeMode
            });
            break;
    }
});



// open unfocused tab for link clicks
browser.runtime.onMessage.addListener((message, sender) => {
    if(relativeMode) {
        // if set to relative mode, open in tab index after currently selected
        browser.tabs.create({
            active: false,
            url: message,
            index: sender.tab.index + 1
        });
    }
    else {
        browser.tabs.create({
            active: false,
            url: message
        });
    }
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
