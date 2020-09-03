{
	"translatorID": "a515a220-6fef-0111-1974-8025dfebbb8f",
	"label": "@Item URI with note",
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
	"lastUpdated": "2020-08-31 21:03:52"
}

function doExport() {
	var item;
	while(item = Zotero.nextItem()) {
		const date = Zotero.BetterBibTeX.parseDate(item.date);
		Zotero.write("(");
		if (item.creators[2]) {
			Zotero.write(item.creators[0].lastName + ", " + item.creators[1].lastName + " et al., ");
			}
		else if (item.creators[1]) {
			Zotero.write(item.creators[0].lastName + " and " + item.creators[1].lastName + ", ");
			}
		else {
			Zotero.write(item.creators[0].lastName + ", ");
			}
		Zotero.write(date.year + ")");
		Zotero.write(" <<fnote '");
		if (item.creators[2]) {
			Zotero.write(item.creators[0].lastName + ", " + item.creators[1].lastName + " et al., ");
			}
		else if (item.creators[1]) {
			Zotero.write(item.creators[0].lastName + " and " + item.creators[1].lastName + ", ");
			}
		else {
			Zotero.write(item.creators[0].lastName + ", ");
			}
		Zotero.write(date.year + ", " + item["title"] + ". [[zotero|");
		Zotero.write(item.uri + "]] [ext[local|");
		Zotero.write("zotero://select/items/");
		var library_id = item.libraryID ? item.libraryID : 0;
		Zotero.write(library_id + "_" + item.key + "]]");
		Zotero.write(", Key: " + item.citationKey + "'>>");
	}
}
