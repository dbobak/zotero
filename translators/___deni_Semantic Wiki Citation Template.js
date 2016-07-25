{
"translatorID":"04623cf0-194c-71df-5eac-5294056d7c28",
"translatorType":2,
"label":"__Semantic Wiki Citation Template",
"creator":"Darek Bobak",
"target":"Semantic Wiki",
"minVersion":"1.0",
"maxVersion":"",
"priority":200,
"inRepository":false,
"displayOptions":{"exportCharset":"UTF-8"},
"lastUpdated":"2013-09-11 22:54:00"
}

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

function doExport() {
	var first = true;
	while(item = Zotero.nextItem()) {
		// determine type
		var type = typeMap[item.itemType];
		if(!type) type = "Cite";
		
		var properties = new Object();
		
		for(var wikiField in fieldMap) {
			var zoteroField = fieldMap[wikiField];
			if(item[zoteroField]) properties[wikiField] = item[zoteroField];
		}
		
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
					var editorText = formatAuthors(editors)+(editors.length == 1 ? " (ed.)" : " (eds.)");
					if(item.itemType == "bookSection" || type == "Conference paper" || type == "Report" || type == "Encyclopedia article" || type == "Dictionary entry") {
						// as per docs, use editor only for chapters
						properties.editors = editorText;
					} else {
						others = editorText;
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
		
		//prepare link to Zotero item
		
		var library_id = item.libraryID ? item.libraryID : 0;
		var ZoteroLink = ('zotero://select/items/' + library_id + '_' + item.key);
		
		//prepare citation and topicname
		var citation = '';
		var topicname = '';
		switch(type) {
			case 'Journal article':
				citation = properties.firstAuthor + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + '. ' + properties.journal + ', vol. ' + properties.volume + (properties.issue ? '(' + properties.issue + ')' : '') + (properties.pages ? ', pp. ' + properties.pages : '') + '.';
				topicname = properties.last + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + ', ' + properties.year + ", " + properties.title;
				break;
			case 'Book section':
				citation = properties.firstAuthor + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + ', ' + properties.year + ", " + properties.chapter + ', [in:] ' + properties.editors + ', ' + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.series ? '. ' + properties.series : '')+ (properties.seriesNumber ? ' ' + properties.seriesNumber : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '') + (properties.pages ? ', pp. ' + properties.pages : '') + '.';
				topicname = properties.last + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + ', ' + properties.year + ", " + properties.chapter;
				break;
			case 'Book':
				citation = (properties.firstAuthor ? properties.firstAuthor : '') + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.series ? '. ' + properties.series : '') + (properties.seriesNumber ? ' ' + properties.seriesNumber : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '') + '.';
				topicname = (properties.last ? properties.last : '') + (properties.last2 ? ', '+ properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '');
				break;
			case 'Thesis':
			case 'Manuscript':
				citation = properties.firstAuthor + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? ', ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + ', ' + properties.year + ", " + properties.title + (properties.volume ? ', vol. ' + properties.volume : '') + (properties.thesisType ? '. ' + properties.thesisType + ' thesis' : '') + (properties.publisher ? '. ' + properties.publisher : '') + (properties.location ? ', ' + properties.location : '') + '.';
				topicname = properties.last + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '')  + ', ' + properties.year + ", " + properties.title;
				break;
			default:
				citation = properties.firstAuthor + (properties.secondAuthor ? ', ' + properties.first2 + ' ' + properties.last2 : '') + (properties.coauthors ? '; ' + properties.coauthors : '') + (properties.others ? ', ' + properties.others : '') + properties.title + properties.year + '.';
				topicname = properties.last + (properties.last2 ? ', ' + properties.last2 : '') + (properties.coauthors ? ' et al.' : '') + ', ' + properties.year + ", " + properties.title;
		}
//		topicname = "(" + topicname + ")"
		// write out properties
		var pagetext = [
			"<!-- Page title",
			topicname,
			"-->",
			"__NOTOC__",
			"Status: [[Has status::not ready]]",
			"",
			"Temat: [[Has subject::Uzupełnij]]",
			"==Bibliografia==",
			"Type: [[Reference type::" + type + "]]",
			"===Cytowanie===",
			"{{Reference citation|" + citation + "}}",
			"===Plik===",
			"[" + ZoteroLink + " " + topicname + "]",
			"===Abstrakt===",
			(item.abstractNote ? item.abstractNote : ""),
			"==Cytaty/Komentarze/Notatki==",
			"",
			"==Metadane==",
			"==== Stanowiska ====",
			"==== Słowa kluczowe ====",
			"{{key|Uzupełnij}}",
			"[[Has author::" + properties.firstAuthor + "| ]]" + (properties.secondAuthor ? "\r\n[[Has author::" + properties.secondAuthor + "| ]]" : '') + formatAuthorsCT(item.creators, false),
			"[[CATEGORY:Reading notes]]",
			""
			]. join( "\r\n" );
		
		Zotero.write(pagetext);
		first = false;
	}
}
