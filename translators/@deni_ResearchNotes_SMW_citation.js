{
	"translatorID":"04a25cf0-172c-73af-5eac-10c4a56d7a32",
	"translatorType":3,
	"label":"@ResearchNotes_SMW_citation",
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
	"lastUpdated":"2015-12-20 13:30:00"
}

// Cytowanie do MediaWiki dla rozszerzenia SMW Cite

function doExport() {
	var first = true;
	while(item = Zotero.nextItem()) {
	var pagetext = [
		" [[CiteRef::",
		Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey,
		"]] "
		].join("");
	Zotero.write(pagetext);
	first = false;
	}
}

