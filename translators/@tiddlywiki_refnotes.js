{
	"translatorID": "a515a220-6fef-0121-1974-2425dfebbb8f",
	"label": "@TiddlyWiki Refnotes citation",
	"creator": "Dariusz Bobak",
	"target": "txt",
	"minVersion": "4.0.27",
	"translatorType": 2,
	"browserSupport": "gcsv",
	"priority": 100,
	"displayOptions": {
		"quickCopyMode": ""
	},
	"inRepository": false,
	"lastUpdated": "2020-09-10 19:03:52"
}

function doExport() {
	var item;
	while(item = Zotero.nextItem()) {
		Zotero.write("<<ref " + item.citationKey + ">> ");
	}
}
