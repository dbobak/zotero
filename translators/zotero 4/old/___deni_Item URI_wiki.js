{
"translatorID":"064ef4ee-61b8-4bb4-ba16-5501d09aed0cadfa",
"translatorType":2,
"label":"___deni_Item URI_wiki",
"creator":"Darek Bobak",
"target":"wiki",
"minVersion":"2.0",
"maxVersion":"",
"priority":200,
"inRepository":false,
"lastUpdated":"2013-07-17 22:27:00"
}

var webdavPath = "{{WebDAVURI}}";
 
function doExport() {
	var item;
	Zotero.write('<div style="font-family: Sans-serif; font-size: 80%;">\n');
	while(item = Zotero.nextItem()) {
//		Zotero.write('<a href="https://flint.lithics.eu/zotero/');
		var library_id = item.libraryID ? item.libraryID : 0;
		

		var creatorsS = (item.creators !== 'undefined' && item.creators.length > 0) ? item.creators[0].lastName : "(Anonymous)";
		if (item.creators.length>2)
			creatorsS += " et al.";
		else if (item.creators.length==2)
			creatorsS += " & " + item.creators[1].lastName;
		
		var date = Zotero.Utilities.strToDate(item.date);
//		var dateS = (date.year) ? date.year : item.date;
		var dateS = (date.year) ? date.year : "(no date)";
		Zotero.write("# " + creatorsS + ', ' + dateS + ', ');

//		var titleS = (item.title) ? item.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;') : "(no title)";
		var titleS = (item.title) ? item.title : "(no title)";
//		var pubTitleS = (item.publicationTitle) ? item.publicationTitle.replace(/&/g,'&amp;').replace(/"/g,'&quot;') : "";
		var pubTitleS = (item.publicationTitle) ? '\'\'' + item.publicationTitle + '\'\'' : "";
		if (!pubTitleS && item.type)
			pubTitleS = '['+item.type+']';
		Zotero.write(titleS + ". " + ((item.conferenceName) ? ', [in:] \'\''+ item.conferenceName + '\'\'' : pubTitleS));
		
	if(item.attachments) {
		var attachmentString = "";
		var allAttachmentString = "";
		for(var i in item.attachments) {
		var attachmentString = "";
		var attachment = item.attachments[i];
			if(Zotero.getOption("exportFileData") && attachment.saveFile) {
				attachment.saveFile(attachment.defaultPath, true);
				attachmentString += attachment.defaultPath;
			} else if(attachment.localPath) {
				attachmentString += attachment.localPath;
			}
			attachmentString=attachmentString.replace(/\\/g, "/");
			attachmentString=webdavPath + attachmentString.split("/")[attachmentString.split("/").length - 2] + ".zip";
				Zotero.write("\n#* [" + attachmentString + " " + attachment.title + "]");
			}
		}
		Zotero.write("\n");
	}
	Zotero.write("</div>");
}



