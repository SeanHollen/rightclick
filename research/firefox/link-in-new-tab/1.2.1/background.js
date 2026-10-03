let active = false;

// is activated?
browser.storage.local.get("enabled")
    .then(enabled => {
        active = !!enabled;
        updateActive();
    });


function onCreated() {}

let relativeMode = true;

// get current relativeMode state
browser.storage.local.get("relativeMode")
    .then(relative => {
        relativeMode = relative.relativeMode !== undefined ? relative.relativeMode : true;
        browser.contextMenus.update("relative-toggle",{checked: relativeMode});
    });

// create relativeMode toggle
browser.contextMenus.create({
    id: "relative-toggle",
    title: "Open tabs relative to current",
    type: "checkbox",
    checked: relativeMode,
    contexts: ["browser_action"]
}, onCreated);


let discardTabs = false;

// get current discardTabs state
browser.storage.local.get("discardTabs")
    .then(discard => {
        discardTabs = discard.discardTabs !== undefined ? discard.discardTabs : false;
        browser.contextMenus.update("discard-toggle",{checked: discardTabs});
    });

// create discardTabs toggle
browser.contextMenus.create({
    id: "discard-toggle",
    title: "Discard opened tabs",
    type: "checkbox",
    checked: discardTabs,
    contexts: ["browser_action"]
}, onCreated);

// add click listeners
browser.contextMenus.onClicked.addListener(info => {
    switch(info.menuItemId) {
        case "relative-toggle":
            relativeMode = !relativeMode;
            browser.storage.local.set({
                relativeMode: relativeMode
            });
            break;
        case "discard-toggle":
            discardTabs = !discardTabs;
            browser.storage.local.set({
                discardTabs: discardTabs
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
            index: sender.tab.index + 1,
            discarded: discardTabs
        });
    }
    else {
        browser.tabs.create({
            active: false,
            url: message,
            discarded: discardTabs
        });
    }
});

// toggle on browserAction click
browser.browserAction.onClicked.addListener(() => {
    active = !active;
    updateActive();
});

// send message to all new tabs
browser.tabs.onUpdated.addListener(tabId => {
    browser.tabs.sendMessage(tabId, {"enabled": active});
});

function updateActive() {
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
    // send message to all tabs to let them know it's disabled
    browser.tabs.query({})
        .then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, {"enabled": active});
            })
        });

    // set storage key
    browser.storage.local.set({
        enabled: active
    });
}