{
	"translatorID":"04a25cf0-172c-73af-5eac-10c4a56d7a33",
	"translatorType":3,
	"label":"@Pandoc citation",
	"creator":"Darek Bobak",
	"target":"txt",
	"minVersion":"1.0",
	"maxVersion":"",
	"priority":200,
	"inRepository":false,
	"configOptions": {
			"getCollections": true
	},
	"displayOptions": {
		"exportCharset":"UTF-8",
		"exportNotes": false,
		"exportFileData": false,
		"useJournalAbbreviation": false,
		"Keep updated": false
		},
	"lastUpdated":"2015-12-20 13:50:00"
}

// Cytowanie dla markdown (Pandoc)

function doExport() {
	Zotero.write(" [");
	while(item = Zotero.nextItem()) {
		var pagetext = "@" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey;
		Zotero.write(pagetext);
		if (Zotero.nextItem()) {
			Zotero.write("; ");
		}
	}
	Zotero.write("] ");
}

