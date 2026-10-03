
	
browser.contextMenus.create({
	title : "Open in new tab",
	type : "normal",
	contexts : [ "image", "video", "audio" ],
	onclick : function (data) {
		//console.log('img', data)
		var url = data.srcUrl;
		chrome.tabs.create({url: url, active: false});
	}
});

browser.contextMenus.create({
	title : "Open frame in new tab",
	type : "normal",
	contexts : [ "frame" ],
	onclick : function (data) {
		//console.log('frame', data)
		var url = data.frameUrl;
		chrome.tabs.create({url: url, active: false});
	}
});

