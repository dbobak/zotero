{
"translatorID":"04623cf0-194c-71ab-5eac-5294056d7c29",
"translatorType":2,
"label":"__XML Semantic Wiki Citation Template",
"creator":"Darek Bobak",
"target":"xml",
"minVersion":"1.0",
"maxVersion":"",
"priority":200,
"inRepository":false,
"displayOptions":{
	"exportCharset":"UTF-8"
	},
"lastUpdated":"2014-03-08 12:00:00"
}
 
var webdavPath = "{{WebDAVURI}}";

var fieldMap = {
	edition:"edition",
	publisher:"publisher",
	doi:"DOI",
	isbn:"ISBN",
	issn:"ISSN",
	conference:"conferenceName",
	volume:"volume",
	issue:"issue",
	pages:"pages",
	number:"episodeNumber"
};

var typeMap = {
	book:"Book",
	bookSection:"Book section",
	journalArticle:"Journal article",
	magazineArticle:"Magazine article",
	newspaperArticle:"Newspaper article",
	thesis:"Thesis",
	letter:"Letter",
	manuscript:"Manuscript",
	interview:"Interview",
	film:"Film",
	artwork:"Artwork",
	webpage:"Web page",
	report:"Report",
	bill:"Bill",
	hearing:"Hearing",
	patent:"Patent",
	statute:"Statue",
	email:"Email",
	map:"Map",
	blogPost:"Blog post",
	instantMessage:"Instant message",
	forumPost:"Forum post",
	audioRecording:"Audio recording",
	presentation:"Presentation",
	videoRecording:"Video recording",
	tvBroadcast:"TV broadcast",
	radioBroadcast:"Radio broadcast",
	podcast:"Podcast",
	computerProgram:"Computer program",
	conferencePaper:"Conference paper",
	document:"Document",
	encyclopediaArticle:"Encyclopedia article",
	dictionaryEntry:"Dictionary entry"
};

function formatAuthors(authors, useTypes) {
	var text = "";
	for each(var author in authors) {
		text += ", "+author.firstName;
		if(author.firstName && author.lastName) text += " ";
		text += author.lastName;
		if(useTypes) text += " ("+author.creatorType+")";
	}
	return text.substr(2);
}

function formatFirstAuthor(authors, useTypes) {
	var firstCreator = authors.shift();
	var field = firstCreator.lastName;
	if(firstCreator.lastName && firstCreator.firstName) field += ", ";
	field += firstCreator.firstName;
	if(useTypes) field += " ("+firstCreator.creatorType+")";
	return field;
}

function formatAuthorsCT(authors, useTypes) {
	var text = "";
	for each(var author in authors) {
			text += "\r\n[[Has author::"+author.lastName;
			if(author.lastName && author.firstName) text += ", ";
			text += author.firstName;
			if(useTypes) text += " ("+author.creatorType+")";
			text += '| ]]';
	}
	return text;
}

function formatDate(date) {
	var date = date.substr(0, date.indexOf(" "));
	if(date.substr(4, 3) == "-00") {
		date = date.substr(0, 4);
	} else if(date.substr(7, 3) == "-00") {
		date = date.substr(0, 7);
	}
	return date;
}

function getItemID() {
	var itemID = "";
	var splitStr = item.extra.split("\n");
	var indexs = [];
	splitStr.forEach(function(entry) {
	    	if(entry.indexOf("bibtex: ") == 0) {
	    	  	indexs.push(entry);
	     	}
	 	}
	 );
	if (typeof indexs[0] !== 'undefined') {
		itemID = indexs[0].substr(8);
	}
	else {
		itemID = "no_bibtex_key";
	}
	return itemID;
}

function getAttachmentString() {
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
			attachmentString="* [" + attachmentString + " " + attachment.title.replace(/\&/g, "&amp;").replace(/\</g, "&lt;") + "]\n";
			allAttachmentString = allAttachmentString + attachmentString;
		}
	}
	return allAttachmentString;
}

function getKeywords() {
	if (item.tags && item.tags.length) {
		var tagString = "";
		for (var i=0; i<item.tags.length; i++) {
			tagString += "* {{key|" + Zotero.Utilities.htmlSpecialChars(item.tags[i].tag) + "}}\n";
		}
	}
	return tagString;
}

function getNotes() {
	var noteString = "&lt;html&gt;"
	if (item.notes) {
		for (var i=0; i<item.notes.length; i++) {
			var note = item.notes[i];
			noteString = noteString + Zotero.Utilities.htmlSpecialChars(note["note"])+ "\n----\n";
//			noteString = noteString + Zotero.Utilities.unescapeHTML(note["note"])+ "\n----\n";
//			noteString = noteString + note["note"] + "\n----\n";
		}
	}
	noteString = noteString + "&lt;/html&gt;";
	return noteString;
}

function doExport() {
	var first = true;
	var XMLHeader = [
		'<mediawiki xmlns="http://www.mediawiki.org/xml/export-0.8/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mediawiki.org/xml/export-0.8/ http://www.mediawiki.org/xml/export-0.8.xsd" version="0.8" xml:lang="en">',
		'<siteinfo>',
		'<case>first-letter</case>',
		'</siteinfo>'
		]. join( "\r\n" );
	Zotero.write(XMLHeader);
	while(item = Zotero.nextItem()) {
		// zerujemy zmienne
		var editorsLast = "";
		// determine type
		var timestamp = new Date().getTime();
		timestamp = timestamp/1000;
		var type = typeMap[item.itemType];
		if(!type) type = "Cite";
		
		var properties = new Object();
		
		for(var wikiField in fieldMap) {
			var zoteroField = fieldMap[wikiField];
			if(item[zoteroField]) properties[wikiField] = item[zoteroField];
		};
	// Tworzymy blok z metadanymi autorów	
		var itemCreators2 = item.creators.slice(0);
		var authorsCount = 0;
		var authorsMWProp = "\r\n";

		if (itemCreators2 && itemCreators2.length) {
			for (var i in itemCreators2) {
				if ((itemCreators2[i].creatorType == "author") || (itemCreators2[i].creatorType == "cartographer") || (itemCreators2[i].creatorType == "artist") || (itemCreators2[i].creatorType == "performer") || (itemCreators2[i].creatorType == "programmer") || (itemCreators2[i].creatorType == "director") || (itemCreators2[i].creatorType == "contributor") || (itemCreators2[i].creatorType == "interviewee") || (itemCreators2[i].creatorType == "inventor") || (itemCreators2[i].creatorType == "podcaster") || (itemCreators2[i].creatorType == "presenter")) {
					authorsCount = authorsCount + 1;
					authorsMWProp = authorsMWProp + "[[Has author::" + itemCreators2[i].lastName + ", " + itemCreators2[i].firstName + "| ]] ";
				};
			};
			for (var i in itemCreators2) {
				if ((itemCreators2[i].creatorType == "editor") && (authorsCount == 0)) {
					authorsMWProp = authorsMWProp + "[[Has author::" + itemCreators2[i].lastName + ", " + itemCreators2[i].firstName + "| ]] ";
				};
			};
		};
	//koniec bloku z metadanymi autorów
		
		if(item.creators && item.creators.length) {
			if(type == "TV broadcast" || type == "Radio broadcast") {
				// now add additional creators
				properties.credits = formatAuthors(item.creators, true);
			} else if(type == "Film" || type == "Video recording") {
				properties.people = "";
				
				// make first creator first, last
				properties.people = formatFirstAuthor(item.creators, true);
				// now add additional creators
				if(item.creators.length) properties.people += ", "+formatAuthors(item.creators, true);
				
				// use type
				if(item.type) {
					properties.medium = item.type;
				}
			} else if(type == "Email") {
				// get rid of non-authors
				for(var i in item.creators) {
					if(item.creators[i].creatorType != "author") {
						// drop contributors
						item.creators.splice(i, 1);
					}
				}
				
//				// make first authors first, last
				properties.author = formatFirstAuthor(item.creators);
				// add supplemental authors
				if(item.creators.length) {
					properties.author += ", "+formatAuthors(item.creators);
				}
			} else if(type == "Interview") {
				// check for an interviewer or translator
				var interviewers = [];
				var translators = [];
				for(var i in item.creators) {
					if(item.creators[i].creatorType == "translator") {
						translators = translators.concat(item.creators.splice(i, 1));
					} else if(item.creators[i].creatorType == "interviewer") {
						interviewers = interviewers.concat(item.creators.splice(i, 1));
					} else if(item.creators[i].creatorType == "contributor") {
						// drop contributors
						item.creators.splice(i, 1);
					}
				}
				
				// interviewers
				if(interviewers.length) {
					properties.interviewer = formatAuthors([interviewers.shift()]);
					if(interviewers.length) properties.cointerviewers = formatAuthors(interviewers);
				}
				// translators
				if(translators.length) {
					properties.cointerviewers = (properties.cointerviewers ? properties.cointerviewers+", " : "");
					properties.cointerviewers += formatAuthors(translators);
				}
				// interviewees
				if(item.creators.length) {
					// take up to 4 interviewees
					var i = 1;
					while((interviewee = item.creators.shift()) && i <= 4) {
						var lastKey = "last";
						var firstKey = "first";
						if(i != 1) {
							lastKey += i;
							firstKey += i;
						}
						
						properties[lastKey] = interviewee.lastName;
						properties[firstKey] = interviewee.firstName;
					}
				}
				// medium
				if(item.medium) {
					properties.type = item.medium
				}
			} else {
				// check for an editor or translator
				var editors = [];
				var translators = [];
				for(var i = 0; i < item.creators.length; i++) {
					var creator = item.creators[i];
					if(creator.creatorType == "translator") {
						translators = translators.concat(item.creators.splice(i, 1));
						i--;  //błąd w Wikipedia Citation Template - zgłosić!
					} else if(creator.creatorType == "editor") {
						editors = editors.concat(item.creators.splice(i, 1));
						i--; //błąd w Wikipedia Citation Template - zgłosić!
					} else if(creator.creatorType == "contributor" || creator.creatorType == "seriesEditor") {
						// drop contributors
						item.creators.splice(i, 1);
						i--;
						}
				}
				
				// editors
				var others = "";
				if(editors.length) {
					var editors2 = editors.slice(0);
					var edLength = editors.length;
					var firstEditor = formatFirstAuthor(editors);
				//	var firstEditor = editors.shift();
					var editorText = firstEditor + (edLength > 1 ? ", " + formatAuthors(editors) : "") + (edLength == 1 ? " (ed.)" : " (eds.)"); 
					if(item.itemType == "bookSection" || type == "Conference paper" || type == "Report" || type == "Encyclopedia article" || type == "Dictionary entry") {
						// as per docs, use editor only for chapters
						properties.editors = editorText;
					} else {
						others = editorText;
						editorsLast = editors2[0].lastName + (editors2.length > 1 ? ", " + editors2[1].lastName : "") + (editors2.length > 2 ? " et al." : "");
					}
				}
				// translators
				if(translators.length) {
					if(others) others += ", ";
					others += formatAuthors(translators)+" (trans.)";
				}
				
				// pop off first author, if there is one
				if(item.creators.length) {
					var firstAuthor = item.creators.shift();
					properties.last = firstAuthor.lastName;
					properties.first = firstAuthor.firstName;
					properties.firstAuthor = (firstAuthor.lastName + ", " + firstAuthor.firstName);
					// pop off second author
					if(item.creators.length) {
						var secondAuthor = item.creators.shift();
						properties.last2 = secondAuthor.lastName;
						properties.first2 = secondAuthor.firstName;
						properties.secondAuthor = (secondAuthor.lastName + ", " + secondAuthor.firstName);
					}
					// add supplemental authors
					if(item.creators.length) {
						properties.coauthors = formatAuthors(item.creators);
					}
				}
				
				// attach others
				if(others) {
					if(type == "Book" || type == "Book section" || type == "Manuscript") {
						properties.others = others;
					} else {
						properties.coauthors = (properties.coauthors ? properties.coauthors+", " : "");
						properties.coauthors += others;
					}
				}
			}
		}
		
		if(item.itemType == "bookSection") {
			properties.title = item.publicationTitle;
			properties.chapter = item.title;;
		} else {
			properties.title = item.title;
			
			if(type == "Journal article") {
				properties.journal = item.publicationTitle;
			} else if(type == "Report" || type == "Conference paper") {
				properties.booktitle = item.publicationTitle;
			} else if(type == "Encyclopedia article" || type == "Dictionary entry") {
				properties.encyclopedia = item.publicationTitle;
			} else {
				properties.work = item.publicationTitle;
			}
		}
		
		if((type == "Web page" || type == "Blog post" || type == "Forum post") && item.type) {
			properties.format = item.type;
		}
		
		if(item.place) {
			if(type == "Radio broadcast" || type == "TV broadcast") {
				properties.city = item.place;
			} else {
				properties.location = item.place;
			}
		}
		
		if(item.series) {
			properties.series = item.series;
		} else if(item.seriesTitle) {
			properties.series = item.seriesTitle;
		} else if(item.seriesText) {
			properties.series = item.seriesText;
		}
		
		if(item.seriesNumber) {
			properties.seriesNumber = item.seriesNumber;
		}
		
		if(item.thesisType) {
			properties.thesisType = item.thesisType;
		}
		
		if(item.accessDate) {
			properties.accessdate = formatDate(item.accessDate);
		}
		
		if(item.date) {
			if(type == "Email") {
				properties.senddate = formatDate(item.date);
			} else {
				var date = Zotero.Utilities.strToDate(item.date);
				var mm = "00";
				var dd = "00";
				if (date["month"] != undefined){
					mm = date["month"];
					mm = mm + 1;
					if (mm < 10){
						mm = "0" + mm;
					} 
				}
				if (date["day"] != undefined){
					dd = date["day"];
					if (dd < 10){
						dd = "0" + dd;
					} 
				}
				if (date["year"] != undefined){
					var yyyy = date["year"].toString();
					while (yyyy.length < 4){
						yyyy = "0"+yyyy;
					}
					properties.date = formatDate(yyyy+"-"+mm+"-"+dd+" ");
					properties.year = yyyy;
				}
			}
		} else {
			properties.year = "no date";
		}

		if(item.runningTime) {
			if(type == "Radio broadcast" || type == "TV broadcast") {
				properties.minutes = item.runningTime;
			} else {
				properties.time = item.runningTime;
			}
		}
		
		if(item.url && item.accessDate) {
			if(item.itemType == "bookSection") {
				properties.chapterurl = item.url;
			} else {
				properties.url = item.url;
			}
		}
		
		if(item.rights && item.rights.length < 2) {
			properties.yearsfx = item.rights;
		}
		
		//prepare link to Zotero item
		
		var library_id = item.libraryID ? item.libraryID : 0;
		var ZoteroLink = ('zotero://select/items/' + library_id + '_' + item.key);
		
//test object properties

// var s = "";
// for (var key in item) {
    // s += key + ": " + item[key] + "\r\n";
// }
// Zotero.write (s);
// var t = "";
// for (var key in properties) {
    // t += key + ": " + properties[key] + "\r\n";
// }
// Zotero.write (t);

//var related_items = item.seeAlso;
//Zotero.write("Related: ");
//Zotero.write(related_items);
		
		//prepare citation and topicname
		var citation = '';
		var topicname = '';
		var shorttopicname = '';
		switch(type) {
			case 'Journal article':
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + '. ' + properties.journal + ', vol. ' + properties.volume + (properties.issue ? '(' + properties.issue + ')' : '') + (properties.pages ? ', pp. ' + properties.pages : '') + '.';
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + ', ' + properties.year + ", " + properties.title;
				shorttopicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + " " + properties.year + (properties.yearsfx ? properties.yearsfx : "")
				break;
			case 'Book section':
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + ', ' + properties.year + ", " + properties.chapter + ', [in:] ' + properties.editors + ', ' + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.series ? '. ' + properties.series : '')+ (properties.seriesNumber ? ' ' + properties.seriesNumber : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '') + (properties.pages ? ', pp. ' + properties.pages : '') + '.';
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + ', ' + properties.year + ", " + properties.chapter;
				shorttopicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + " " + properties.year + (properties.yearsfx ? properties.yearsfx : "")
				break;
			case 'Book':
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? properties.others : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.series ? '. ' + properties.series : '') + (properties.seriesNumber ? ' ' + properties.seriesNumber : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '') + '.';
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', '+ properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + (editorsLast ? editorsLast : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '');
				shorttopicname = (properties.last ? properties.last : '') + (properties.last2 ? ', '+ properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + (editorsLast ? editorsLast : '') + " " + properties.year + (properties.yearsfx ? properties.yearsfx : "")
				break;
			case 'Thesis':
			case 'Manuscript':
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.thesisType ? '. ' + properties.thesisType + ' thesis' : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '');
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '')  + ', ' + properties.year + ", " + properties.title;
				shorttopicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + " " + properties.year + (properties.yearsfx ? properties.yearsfx : "")
				break;
			default:
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (editorsLast ? editorsLast : '') + (properties.people ? properties.people : '') + ", " + properties.year + ", " + properties.title;
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (editorsLast ? editorsLast : '') + (properties.people ? properties.people : '') + ", " + properties.year + ", " + properties.title;
				shorttopicname = (properties.last ? properties.last : '') + (properties.last2 ? ', ' + properties.last2 : '') + (editorsLast ? editorsLast : '') + (properties.people ? properties.people : '') + " " + properties.year + (properties.yearsfx ? properties.yearsfx : "")
		}
//		topicname = "(" + topicname + ")"
		// write out properties
		var pagetext = [
			"",
			"<page>",
			"<title>" + Zotero.Utilities.htmlSpecialChars(topicname) + "</title>",
			"<ns>0</ns>",
			"<revision>",
			"<contributor>",
			"<username>Zotero</username>",
			"</contributor>",
			"<comment>Page generated from Zotero bibliography</comment>",
			'<text xml:space="preserve">__NOTOC__',
//			"Status: [[Has status::not ready]]",
//			"",
//			"Temat: [[Has subject::Uzupełnij]]",
			"==Bibliografia==",
			"*Typ: [[Reference type::" + type + "]]",
			"*Rok publikacji: [[Has publication date::" + Zotero.Utilities.htmlSpecialChars(properties.year) + "]]" + (item.publicationTitle ? "\n*Publikacja: [[Is in publication::" + Zotero.Utilities.htmlSpecialChars(item.publicationTitle) + "]]" : ""),
			"*Cytowanie MediaWiki: [[" + Zotero.Utilities.htmlSpecialChars(shorttopicname) + "]] (" + Zotero.Utilities.htmlSpecialChars(shorttopicname) + ")",
			"*BibTeX key: [[" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey + "]] (" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export').citekey + ")",
			"===Cytowanie===",
			"{{Reference citation|" + Zotero.Utilities.htmlSpecialChars(citation) + "}}",
			"===Link Zotero===",
			"[" + Zotero.Utilities.htmlSpecialChars(ZoteroLink) + " " + Zotero.Utilities.htmlSpecialChars(topicname) + "]",
			"===Pliki===",
			getAttachmentString(),
			"===Abstrakt===",
			(item.abstractNote ? Zotero.Utilities.htmlSpecialChars(item.abstractNote) : ""),
			'==Notatki==',
			getNotes(),
			"==Metadane==",
			"* Data utworzenia: " + item.dateAdded,
			"* Data modyfikacji: " + item.dateModified,
//			"==== Stanowiska ====",
			"==== Słowa kluczowe ====",
			getKeywords(),
//			"{{key|Uzupełnij}}",
			"==Podstrony==",
			"{{Special:PrefixIndex/{{FULLPAGENAME}}/}}",
			"[[CATEGORY:Bibliografia]]",
//			"[[Has author::" + properties.firstAuthor + "| ]]" + (properties.secondAuthor ? "\r\n[[Has author::" + properties.secondAuthor + "| ]]" : '') + formatAuthorsCT(item.creators, false) + "</text>",
			Zotero.Utilities.htmlSpecialChars(authorsMWProp) + "</text>",
			"<model>wikitext</model>",
			"<format>text/x-wiki</format>",
			"</revision>",
			"</page>",
// strona z przekierowaniem
			"<page>",
			"<title>" + Zotero.Utilities.htmlSpecialChars(shorttopicname) + "</title>",
			"<ns>0</ns>",
			"<revision>",
			"<contributor>",
			"<username>Zotero</username>",
			"</contributor>",
			"<comment>Page generated from Zotero bibliography</comment>",
			'<text xml:space="preserve">#REDIRECT [[' + Zotero.Utilities.htmlSpecialChars(topicname) + ']]</text>',
			"<model>wikitext</model>",
			"<format>text/x-wiki</format>",
			"</revision>",
			"</page>",
// strona z przekierowaniem BibTeX key
			"<page>",
//			"<title>" + Zotero.BetterBibTeX.keymanager.get(item, 'on-export') + "</title>",
			"<title>"+ getItemID() + "</title>",
			"<ns>0</ns>",
			"<revision>",
			"<contributor>",
			"<username>Zotero</username>",
			"</contributor>",
			"<comment>Page generated from Zotero bibliography</comment>",
			'<text xml:space="preserve">#REDIRECT [[' + Zotero.Utilities.htmlSpecialChars(topicname) + ']]</text>',
			"<model>wikitext</model>",
			"<format>text/x-wiki</format>",
			"</revision>",
			"</page>",
			]. join( "\r\n" );
		
		Zotero.write(pagetext);
		first = false;
	}
	Zotero.write("\r\n</mediawiki>");
}
