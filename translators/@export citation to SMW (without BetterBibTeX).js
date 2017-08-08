{
  "translatorID": "b6e3ce37-8942-4d11-8e59-342c49ae397f",
  "translatorType": 2,
  "label": "@export citation to SMW (without BetterBibTeX)",
  "creator": "Simon Kornblith, Richard Karnesky, Anders Johansson, Emiliano Heyns and Dariusz Bobak",
  "target": "bib",
  "minVersion": "3.0b3",
  "maxVersion": "",
  "configOptions": {
    "getCollections": true,
    "serializationCache": true
  },
  "displayOptions": {
    "exportNotes": false,
    "exportFileData": false,
    "useJournalAbbreviation": false,
    "Keep updated": false
  },
  "priority": 100,
  "inRepository": false,
  "lastUpdated": "2017-08-08 18:21:46"
}

function doExport() {
  var bibtex;
  bibtex = /(?:^|\s)bibtex(\*?):[^\S\n]*([^\s]*)(?:\s|$)/;
  var item;
  while(item = Zotero.nextItem()) {
    var itemString;
    itemString = item.extra.match(bibtex);
    Zotero.write("[[CiteRef::" + itemString[2] + "]] ");
  }
}
