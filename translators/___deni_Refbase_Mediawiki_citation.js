{
	"translatorID":"04a25cf0-172c-73af-5eac-10c4a56d7a31",
	"translatorType":3,
	"label":"___deni_Refbase_Mediawiki_citation",
	"creator":"Darek Bobak",
	"target":"sql",
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
	"lastUpdated":"2015-07-27 15:00:00"
}

// Translator eksportuje listę cite_key, których całe wpisy należy usunąć z Refbase (przez zaimportowaniem ich ponownie, np. w wersji poprawionej). Tworzy kwerendę SQL, którą należy wkleić do okienka kwerend w refbase.

function doExport() { 
	var refs_list = [];
	while(item = Zotero.nextItem()) {
		refs_list.push("<refbase>" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey + "</refbase>");
		}
	Zotero.write(refs_list.join(" "));
}