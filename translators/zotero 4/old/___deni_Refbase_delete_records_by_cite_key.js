{
	"translatorID":"04a25cf0-194c-73af-5eac-56c4q56d7a31",
	"translatorType":3,
	"label":"___deni_Refbase_delete_records_by_cite_key",
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
		"exportNotes": true,
		"exportFileData": false,
		"useJournalAbbreviation": false,
		"Keep updated": false
		},
	"lastUpdated":"2015-07-27 15:00:00"
}

// Translator eksportuje listę cite_key, których całe wpisy należy usunąć z Refbase (przez zaimportowaniem ich ponownie, np. w wersji poprawionej). Tworzy kwerendę SQL, którą należy wkleić do okienka kwerend w refbase.

function doExport() { 
	var citekey_list = [];
	while(item = Zotero.nextItem()) {
		citekey_list.push("cite_key = '" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey + "'");
		}
	Zotero.write("DELETE refs.* FROM refs WHERE (");
	Zotero.write(citekey_list.join(" OR "));
	Zotero.write(")");
}