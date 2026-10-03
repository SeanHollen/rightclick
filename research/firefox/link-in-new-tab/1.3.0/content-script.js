// use default browser behaviour until told otherwise
let active = false;

// detect if disabled
browser.runtime.onMessage.addListener(message => {
    active = message.enabled;
});

// listen for all clicks
addEventListener("click", event => {
    if(active) {
        let currentTarget = event.target;
        let link = event.target.href;
        // climb up parents until there are no more or one of them is a link (has an href)
        while(currentTarget.parentElement !== null && link === undefined) {
            currentTarget = currentTarget.parentElement;
            link = currentTarget.href;
        }
        if(link !== undefined) {
            let fail = false;
            // don't match JS links
            if(link.startsWith("javascript:")) {
                fail = true;
            }
            // don't match empty links
            if(link === "") {
                fail = true;
            }
            // don't match jump links
            if(link.startsWith("#")) {

            }
            // don't match when holding alt
            if(event.altKey) {
                window.open(link, "_self");
                fail = true;
            }
            if(!fail) {
                // send message to open tab
                browser.runtime.sendMessage(link);
                // kill any other events
                event.preventDefault();
                event.stopImmediatePropagation();
                return false;
            }
        }
    }
}, true);