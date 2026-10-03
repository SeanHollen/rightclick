let active = false;

// is activated?
browser.storage.local.get("enabled")
    .then(enabled => {
        active = enabled.enabled;
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

let actionKey = "alt";

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

// listen for shortcuts
browser.commands.onCommand.addListener(command => {
    switch(command) {
        case "toggle-active":
            active = !active;
            updateActive();
            break;
    }
});

// open unfocused tab for link clicks
browser.runtime.onMessage.addListener((message, sender) => {
    let tab = {
        active: false, // open tab in background
        url: message, // set url to href of link clicked
        discarded: discardTabs, // set if tab will be discarded on creation
        cookieStoreId: sender.tab.cookieStoreId // set contextualIdentity (also known as container)
    };
    
    if(relativeMode) {
        // if set to relative mode, open in tab index after currently selected
        tab.index = sender.tab.index + 1;
    }
    browser.tabs.create(tab);
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