{
	"translatorID": "ca65189f-0111-1974-8c8b-8c7c15f0adac",
	"translatorType": 3,
	"label": "@SMW Better BibTeX",
	"creator": "Simon Kornblith, Richard Karnesky, Emiliano Heyns and Dariusz Bobak",
	"target": "bib",
	"minVersion": "4.0.27",
	"maxVersion": "",
	"priority": 199,
	"inRepository": false,
	"configOptions": {
		"async": true,
		"getCollections": true
	},
	"displayOptions": {
		"exportNotes": false,
		"exportFileData": false,
		"useJournalAbbreviation": false,
		"keepUpdated": false
	},
	"browserSupport": "gcsv",
	"lastUpdated": "2019-11-26 20:47:51"
}

// based on "Better BibTeX.js"
var Translator = {
  initialize: function () {},
  BetterBibTeX: true,
  BetterTeX: true,
  BetterCSL: false,
  header: ZOTERO_TRANSLATOR_INFO,
  // header: < %- JSON.stringify(header) % >,
  preferences: {"DOIandURL":"both","ascii":"","asciiBibLaTeX":false,"asciiBibTeX":true,"autoAbbrev":false,"autoAbbrevStyle":"","autoExport":"immediate","autoExportDelay":1,"autoExportIdleWait":10,"autoExportPrimeExportCacheBatch":4,"autoExportPrimeExportCacheDelay":100,"autoExportPrimeExportCacheThreshold":0,"autoExportTooLong":10,"autoPin":false,"automaticTags":true,"auxImport":false,"biblatexExtendedDateFormat":true,"biblatexExtendedNameFormat":false,"bibtexParticleNoOp":false,"bibtexURL":"off","cacheFlushInterval":5,"citeCommand":"cite","citekeyFold":true,"citekeyFormat":"​[auth:lower][shorttitle3_3][year]","citeprocNoteCitekey":false,"client":"","csquotes":"","exportBibTeXStrings":"off","git":"config","importBibTeXStrings":true,"itemObserverDelay":100,"jabrefFormat":0,"keyConflictPolicy":"keep","keyScope":"library","kuroshiro":false,"lockedInit":false,"mapMath":"","mapText":"","mapUnicode":"conservative","newTranslatorsAskRestart":true,"parseParticles":true,"platform":"","postscript":"","qualityReport":false,"quickCopyMode":"latex","quickCopyPandocBrackets":false,"rawLaTag":"#LaTeX","relativeFilePaths":false,"scrubDatabase":false,"skipFields":"","skipWords":"a,ab,aboard,about,above,across,after,against,al,along,amid,among,an,and,anti,around,as,at,before,behind,below,beneath,beside,besides,between,beyond,but,by,d,da,das,de,del,dell,dello,dei,degli,della,dell,delle,dem,den,der,des,despite,die,do,down,du,during,ein,eine,einem,einen,einer,eines,el,en,et,except,for,from,gli,i,il,in,inside,into,is,l,la,las,le,les,like,lo,los,near,nor,of,off,on,onto,or,over,past,per,plus,round,save,since,so,some,sur,than,the,through,to,toward,towards,un,una,unas,under,underneath,une,unlike,uno,unos,until,up,upon,versus,via,von,while,with,within,without,yet,zu,zum","sorted":false,"strings":"","suppressBraceProtection":false,"suppressNoCase":false,"suppressSentenceCase":false,"suppressTitleCase":false,"verbatimFields":"url,doi,file,eprint,verba,verbb,verbc","warnBulkModify":10},
  options: {"exportFileData":false,"exportNotes":false,"keepUpdated":false,"useJournalAbbreviation":false},

  stringCompare: (new Intl.Collator('en')).compare,
  configure: function(stage) {
    this.BetterCSL = this.BetterCSLYAML || this.BetterCSLJSON;

    this.debugEnabled = Zotero.BetterBibTeX.debugEnabled();
    this.unicode = true; // set by Better BibTeX later

    if (stage == 'detectImport') {
      this.options = {}
    } else {
      this.platform = Zotero.getHiddenPref('better-bibtex.platform');
      this.isJurisM = Zotero.getHiddenPref('better-bibtex.client') === 'jurism';
      this.isZotero = !this.isJurisM;

      this.paths = {
        caseSensitive: this.platform !== 'mac' && this.platform !== 'win',
        sep: this.platform === 'win' ? '\\' : '/'
      }

      this.references = []

      for (var key in this.options) {
        if (typeof this.options[key] === 'boolean') {
          this.options[key] = !!Zotero.getOption(key)
        } else {
          this.options[key] = Zotero.getOption(key)
        }
      }
      // special handling

      if (stage === 'doExport') {
        this.cache = {
          hits: 0,
          misses: 0,
        }
        this.options.exportPath = Zotero.getOption('exportPath')
        if (this.options.exportPath && this.options.exportPath.endsWith(this.pathSep)) this.options.exportPath = this.options.exportPath.slice(0, -1)
      }
    }

    for (const pref of Object.keys(this.preferences)) {
      let value = undefined

      try {
        value = Zotero.getOption(`preference_${pref}`)
      } catch (err) {
        value = undefined
      }

      if (typeof value === 'undefined') {
        value = Zotero.getHiddenPref('better-bibtex.' + pref)
        Zotero.debug(`preference load: ${pref} = ${value}`)
      } else {
        Zotero.debug(`preference override: ${pref} = ${value}`)
      }
      this.preferences[pref] = value
    }
    // special handling
    this.skipFields = this.preferences.skipFields.toLowerCase().trim().split(/\s*,\s*/).filter(function(s) { return s })
    this.skipField = this.skipFields.reduce((acc, field) => { acc[field] = true; return acc }, {})
    this.verbatimFields = this.preferences.verbatimFields.toLowerCase().trim().split(/\s*,\s*/).filter(function(s) { return s })
    if (!this.verbatimFields.length) this.verbatimFields = null
    this.csquotes = this.preferences.csquotes ? { open: this.preferences.csquotes[0], close: this.preferences.csquotes[1] } : null
    this.preferences.testing = Zotero.getHiddenPref('better-bibtex.testing')
    Zotero.debug('prefs loaded: ' + JSON.stringify(this.preferences, null, 2))
    Zotero.debug('options loaded: ' + JSON.stringify(this.options, null, 2))

    if (stage == 'doExport') {
      this.caching = !(
        // when exporting file data you get relative paths, when not, you get absolute paths, only one version can go into the cache
        this.options.exportFileData

        // jabref 4 stores collection info inside the reference, and collection info depends on which part of your library you're exporting
        || (this.BetterTeX && this.preferences.jabrefFormat === 4)

        // if you're looking at this.options.exportPath in the postscript you're probably outputting something different based on it
        || ((this.preferences.postscript || '').indexOf('Translator.options.exportPath') >= 0)

        // relative file paths are going to be different based on the file being exported to
        || this.preferences.relativeFilePaths
      )
      Zotero.debug('export caching:' + this.caching)
    }

    this.collections = {}
    if (stage == 'doExport' && this.header.configOptions && this.header.configOptions.getCollections && Zotero.nextCollection) {
      let collection
      while (collection = Zotero.nextCollection()) {
        let children = collection.children || collection.descendents || []
        let key = (collection.primary ? collection.primary : collection).key

        this.collections[key] = {
          id: collection.id,
          key: key,
          parent: collection.fields.parentKey,
          name: collection.name,
          items: collection.childItems,
          collections: children.filter(function(coll) { return coll.type === 'collection'}).map(function(coll) { return coll.key}),
          // items: (item.itemID for item in children when item.type != 'collection')
          // descendents: undefined
          // children: undefined
          // childCollections: undefined
          // primary: undefined
          // fields: undefined
          // type: undefined
          // level: undefined
        }
      }
      for (const collection of Object.values(this.collections)) {
        if (collection.parent && !this.collections[collection.parent]) {
          collection.parent = false
          Zotero.debug('BBT translator: collection with key ' + collection.key + ' has non-existent parent ' + collection.parent + ', assuming root collection')
        }
      }
    }
  }
};


function doExport() {
  const start = Date.now()
  Translator.configure('doExport')
  Translator.initialize()
  Translator.doExport()
  const elapsed = Date.now() - start
  const hits = Translator.cache.hits
  const misses = Translator.cache.misses
  Zotero.debug("Better BibTeX" + ` export took ${elapsed/1000}s, hits=${hits}, misses=${misses}, ${elapsed / (misses + hits)}ms/item`)
}



function detectImport() {
  Translator.configure('detectImport')
  return Translator.detectImport()
}
function doImport() {
  Translator.configure('doImport')
  Translator.initialize()
  return Translator.doImport()
}

/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./Better BibTeX.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "../content/arXiv.ts":
/*!***************************!*\
  !*** ../content/arXiv.ts ***!
  \***************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// export singleton: https://k94n.com/es6-modules-single-instance-pattern
Object.defineProperty(exports, "__esModule", { value: true });
exports.arXiv = new class {
    constructor() {
        // new-style IDs
        // arXiv:0707.3168 [hep-th]
        // arXiv:YYMM.NNNNv# [category]
        this.post2007 = /(?:^|\s|\/)(?:arXiv:\s*)?(\d{4}\.\d{4,5}(?:v\d+)?)(?:\s\[(.*?)\])?(?=$|\s)/i;
        // arXiv:arch-ive/YYMMNNNv# or arXiv:arch-ive/YYMMNNNv# [category]
        this.pre2007 = /(?:^|\s|\/)(?:arXiv:\s*)?([a-z-]+(?:\.[A-Z]{2})?\/\d{2}(?:0[1-9]|1[012])\d{3}(?:v\d+)?(?=$|\s))/i;
    }
    parse(id) {
        if (!id)
            return { id: null };
        let match;
        if (match = this.post2007.exec(id)) {
            return { id: match[1], category: match[2] && match[2].trim() };
        }
        if (match = this.pre2007.exec(id)) {
            return { id: match[1] };
        }
        return { id: null };
    }
};


/***/ }),

/***/ "../content/csl-vars.json":
/*!********************************!*\
  !*** ../content/csl-vars.json ***!
  \********************************/
/*! exports provided: abstract, accessed, annote, archive, archive-location, archive-place, author, authority, call-number, chapter-number, citation-label, citation-number, collection-editor, collection-number, collection-title, composer, container, container-author, container-title, container-title-short, dimensions, director, DOI, edition, editor, editorial-director, event, event-date, event-place, first-reference-note-number, genre, illustrator, interviewer, ISBN, ISSN, issue, issued, jurisdiction, keyword, locator, medium, note, number, number-of-pages, number-of-volumes, original-author, original-date, original-publisher, original-publisher-place, original-title, page, page-first, PMCID, PMID, publisher, publisher-place, recipient, references, reviewed-author, reviewed-title, scale, section, source, status, submitted, title, title-short, translator, type, URL, version, volume, volume-title, year-suffix, default */
/*! all exports used */
/***/ (function(module) {

module.exports = JSON.parse("{\"abstract\":\"string\",\"accessed\":\"date\",\"annote\":\"string\",\"archive\":\"string\",\"archive-location\":\"string\",\"archive-place\":\"string\",\"author\":\"creator\",\"authority\":\"string\",\"call-number\":\"string\",\"chapter-number\":\"string\",\"citation-label\":\"string\",\"citation-number\":\"string\",\"collection-editor\":\"creator\",\"collection-number\":\"string\",\"collection-title\":\"string\",\"composer\":\"creator\",\"container\":\"date\",\"container-author\":\"creator\",\"container-title\":\"string\",\"container-title-short\":\"string\",\"dimensions\":\"string\",\"director\":\"creator\",\"DOI\":\"string\",\"edition\":\"string\",\"editor\":\"creator\",\"editorial-director\":\"creator\",\"event\":\"string\",\"event-date\":\"date\",\"event-place\":\"string\",\"first-reference-note-number\":\"string\",\"genre\":\"string\",\"illustrator\":\"creator\",\"interviewer\":\"creator\",\"ISBN\":\"string\",\"ISSN\":\"string\",\"issue\":\"string\",\"issued\":\"date\",\"jurisdiction\":\"string\",\"keyword\":\"string\",\"locator\":\"string\",\"medium\":\"string\",\"note\":\"string\",\"number\":\"string\",\"number-of-pages\":\"string\",\"number-of-volumes\":\"string\",\"original-author\":\"creator\",\"original-date\":\"date\",\"original-publisher\":\"string\",\"original-publisher-place\":\"string\",\"original-title\":\"string\",\"page\":\"string\",\"page-first\":\"string\",\"PMCID\":\"string\",\"PMID\":\"string\",\"publisher\":\"string\",\"publisher-place\":\"string\",\"recipient\":\"creator\",\"references\":\"string\",\"reviewed-author\":\"creator\",\"reviewed-title\":\"string\",\"scale\":\"string\",\"section\":\"string\",\"source\":\"string\",\"status\":\"string\",\"submitted\":\"date\",\"title\":\"string\",\"title-short\":\"string\",\"translator\":\"creator\",\"type\":\"string\",\"URL\":\"string\",\"version\":\"string\",\"volume\":\"string\",\"volume-title\":\"string\",\"year-suffix\":\"string\"}");

/***/ }),

/***/ "../content/escape.ts":
/*!****************************!*\
  !*** ../content/escape.ts ***!
  \****************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function html(str) {
    const entity = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
    };
    // return str.replace(/[\u00A0-\u9999<>\&]/gim, c => entity[c] || `&#${c.charCodeAt(0)};`)
    return str.replace(/[<>\&"']/g, c => entity[c] || `&#${c.charCodeAt(0)};`);
}
exports.html = html;
function rtf(str) {
    return str
        .replace(/([{}\\])/g, '\\$1')
        .replace(/\n/g, '\\par ');
}
exports.rtf = rtf;


/***/ }),

/***/ "../content/extra.ts":
/*!***************************!*\
  !*** ../content/extra.ts ***!
  \***************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// http://docs.citationstyles.org/en/stable/specification.html#appendix-iv-variables
const cslVariables = __webpack_require__(/*! ./csl-vars.json */ "../content/csl-vars.json");
const CSL = __webpack_require__(/*! ../gen/citeproc */ "../gen/citeproc.js");
function cslCreator(value) {
    const creator = value.split(/\s*\|\|\s*/);
    if (creator.length === 2) { // tslint:disable-line:no-magic-numbers
        const _creator = { family: creator[0] || '', given: creator[1] || '' };
        CSL.parseParticles(_creator);
        return _creator;
    }
    else {
        // return { literal: value, isInstitution: 1 }
        return { literal: value };
    }
}
exports.cslCreator = cslCreator;
function zoteroCreator(value) {
    const creator = value.split(/\s*\|\|\s*/);
    if (creator.length === 2) { // tslint:disable-line:no-magic-numbers
        return { lastName: creator[0] || '', firstName: creator[1] || '' };
    }
    else {
        return { name: value };
    }
}
exports.zoteroCreator = zoteroCreator;
const re = {
    // fetch fields as per https://forums.zotero.org/discussion/3673/2/original-date-of-publication/. Spurious tex. so I can do a single match
    csl: /^{:(tex\.)?([^:]+)(:)\s*([^}]+)}$/,
    kv: /^(tex\.)?([^:=]+)\s*([:=])\s*([\S\s]*)/,
};
function get(extra, options) {
    if (!options)
        options = { citationKey: true, aliases: true, csl: true, tex: true };
    extra = extra || '';
    const extraFields = {
        csl: {},
        tex: {},
        citationKey: '',
        aliases: [],
    };
    extra = extra.split('\n').filter(line => {
        const m = line.match(re.csl) || line.match(re.kv);
        if (!m)
            return true;
        let [, tex, name, assign, value] = m;
        const raw = (assign === '=');
        if (!tex && raw)
            return true;
        name = name.toLowerCase().trim();
        value = value.trim();
        if (!tex && options.citationKey && ['citation key', 'bibtex'].includes(name)) {
            extraFields.citationKey = value;
            return false;
        }
        if (!tex && options.aliases && name === 'citation key alias') {
            extraFields.aliases = value.split(/s*,\s*/).filter(alias => alias);
            return false;
        }
        if (!tex && options.csl) {
            let cslName = name.replace(/ +/g, '-');
            const cslType = cslVariables[cslName] || cslVariables[cslName = cslName.toUpperCase()];
            if (cslType) {
                if (cslType === 'creator') {
                    extraFields.csl[cslName] = extraFields.csl[cslName] || [];
                    extraFields.csl[cslName].push(value);
                }
                else {
                    extraFields.csl[cslName] = value;
                }
                return false;
            }
        }
        if (tex && options.tex && !name.includes(' ')) {
            extraFields.tex[name] = { value, raw };
            return false;
        }
        if (!tex && ['place', 'lccn', 'mr', 'zbl', 'arxiv', 'jstor', 'hdl', 'google-books-id'].includes(name)) {
            extraFields.tex[name.replace(/-/g, '')] = { value };
            return false;
        }
        return true;
    }).join('\n').trim();
    return { extra, extraFields };
}
exports.get = get;
function set(extra, options = {}) {
    const parsed = get(extra, options);
    if (options.citationKey)
        parsed.extra += `\nCitation Key: ${options.citationKey}`;
    if (options.aliases && options.aliases.length) {
        const aliases = Array.from(new Set(options.aliases)).sort().join(', ');
        parsed.extra += `\nCitation Key Alias: ${aliases}`;
    }
    if (options.tex) {
        for (const name of Object.keys(options.tex).sort()) {
            const value = options.tex[name];
            parsed.extra += `\ntex.${name}${value.raw ? '=' : ':'} ${value}`;
        }
    }
    if (options.csl) {
        for (const name of Object.keys(options.csl).sort()) {
            const value = options.csl[name];
            if (Array.isArray(value)) { // csl creators
                parsed.extra += value.map(creator => `\n${name}: ${value}`).join(''); // do not sort!!
            }
            else {
                parsed.extra += `\n${name}: ${value}`;
            }
        }
    }
    return parsed.extra.trim();
}
exports.set = set;


/***/ }),

/***/ "../gen/citeproc.js":
/*!**************************!*\
  !*** ../gen/citeproc.js ***!
  \**************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
Copyright (c) 2009-2019 Frank Bennett

	This program is free software: you can redistribute it and/or
	modify it under EITHER

      * the terms of the Common Public Attribution License (CPAL) as
	    published by the Open Source Initiative, either version 1 of
	    the CPAL, or (at your option) any later version; OR

      * the terms of the GNU Affero General Public License (AGPL)
        as published by the Free Software Foundation, either version
        3 of the AGPL, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	Affero General Public License for more details.

	You should have received copies of the Common Public Attribution
    License and of the GNU Affero General Public License along with
    this program.  If not, see <https://opensource.org/licenses/> or
    <http://www.gnu.org/licenses/> respectively.
*/
/*global CSL: true */

/**
 * A Javascript implementation of the CSL citation formatting language.
 *
 * <p>A configured instance of the process is built in two stages,
 * using {@link CSL.Core.Build} and {@link CSL.Core.Configure}.
 * The former sets up hash-accessible locale data and imports the CSL format file
 * to be applied to the citations,
 * transforming it into a one-dimensional token list, and
 * registering functions and parameters on each token as appropriate.
 * The latter sets jump-point information
 * on tokens that constitute potential branch
 * points, in a single back-to-front scan of the token list.
 * This
 * yields a token list that can be executed front-to-back by
 * body methods available on the
 * {@link CSL.Engine} class.</p>
 *
 * <p>This top-level {@link CSL} object itself carries
 * constants that are needed during processing.</p>
 * @namespace A CSL citation formatter.
 */

// IE6 does not implement Array.indexOf().
// IE7 neither, according to rumour.


// Potential skip words:
// under; along; out; between; among; outside; inside; amid; amidst; against; toward; towards.
// See https://forums.zotero.org/discussion/30484/?Focus=159613#Comment_159613




var CSL = {
    PARTICLE_GIVEN_REGEXP: /^([^ ]+(?:\u02bb |\u2019 | |\' ) *)(.+)$/,
    PARTICLE_FAMILY_REGEXP: /^([^ ]+(?:\-|\u02bb|\u2019| |\') *)(.+)$/,
    SKIP_WORDS: ["about","above","across","afore","after","against","al", "along","alongside","amid","amidst","among","amongst","anenst","apropos","apud","around","as","aside","astride","at","athwart","atop","barring","before","behind","below","beneath","beside","besides","between","beyond","but","by","circa","despite","down","during","et", "except","for","forenenst","from","given","in","inside","into","lest","like","modulo","near","next","notwithstanding","of","off","on","onto","out","over","per","plus","pro","qua","sans","since","than","through"," thru","throughout","thruout","till","to","toward","towards","under","underneath","until","unto","up","upon","versus","vs.","v.","vs","v","via","vis-à-vis","with","within","without","according to","ahead of","apart from","as for","as of","as per","as regards","aside from","back to","because of","close to","due to","except for","far from","inside of","instead of","near to","next to","on to","out from","out of","outside of","prior to","pursuant to","rather than","regardless of","such as","that of","up to","where as","or", "yet", "so", "for", "and", "nor", "a", "an", "the", "de", "d'", "von", "van", "c", "ca"]
};

CSL.Doppeler = function(rexStr, stringMangler) {
    var matchRex = new RegExp("(" + rexStr + ")", "g");
    var splitRex = new RegExp(rexStr, "g");
    this.split = function (str) {
        // Normalize markup
        if (stringMangler) {
            str = stringMangler(str);
        }
        var match = str.match(matchRex);
        if (!match) {
            return {
                tags: [],
                strings: [str]
            };
        }
        var split = str.split(splitRex);
        for (var i=match.length-1; i> -1; i--) {
            if (typeof match[i] === "number") {
                match[i] = "";
            }
            var tag = match[i];
            if (tag === "\'" && split[i+1].length > 0) {
                // Fixes https://forums.zotero.org/discussion/comment/294317
                split[i+1] = match[i] + split[i+1];
                match[i] = "";
            }
        }
        return {
            tags: match,
            strings: split,
            origStrings: split.slice()
        };
    };
    this.join = function (obj) {
        var lst = obj.strings.slice(-1);
        for (var i=obj.tags.length-1; i>-1; i--) {
            lst.push(obj.tags[i]);
            lst.push(obj.strings[i]);
        }
        lst.reverse();
        return lst.join("");
    };
};

/*global CSL: true */

CSL.Output = {};

/*global CSL: true */

CSL.Output.Formatters = (function () {
    var rexStr = "(?:\u2018|\u2019|\u201C|\u201D| \"| \'|\"|\'|[-\u2013\u2014\/.,;?!:]|\\[|\\]|\\(|\\)|<span style=\"font-variant: small-caps;\">|<span class=\"no(?:case|decor)\">|<\/span>|<\/?(?:i|sc|b|sub|sup)>)";
    var tagDoppel = new CSL.Doppeler(rexStr, function(str) {
        return str.replace(/(<span)\s+(class=\"no(?:case|decor)\")[^>]*(>)/g, "$1 $2$3").replace(/(<span)\s+(style=\"font-variant:)\s*(small-caps);?(\")[^>]*(>)/g, "$1 $2 $3;$4$5");
    });
    
    var wordDoppel = new CSL.Doppeler("(?:[\u0020\u00A0\u2000-\u200B\u205F\u3000]+)");
    
    /**
     * INTERNAL
     */

    var _tagParams = {
        "<span style=\"font-variant: small-caps;\">": "</span>",
        "<span class=\"nocase\">": "</span>",
        "<span class=\"nodecor\">": "</span>",
        "<sc>": "</sc>",
        "<sub>": "</sub>",
        "<sup>": "</sup>"
    };

    function _capitalise (word) {
        // Weird stuff is (.) transpiled with regexpu
        //   https://github.com/mathiasbynens/regexpu
        var m = word.match(/(^\s*)((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))(.*)/);
        // Do not uppercase lone Greek letters
        // (No case transforms in Greek citations, but chars used in titles to science papers)
        if (m && !(m[2].match(/^[\u0370-\u03FF]$/) && !m[3])) {
            return m[1] + m[2].toUpperCase() + m[3];
        }
        return word;
    }

    function _textcaseEngine(config, string) {
        if (!string) {
            return "";
        }
        config.doppel = tagDoppel.split(string);
        var quoteParams = {
            " \"": {
                opener: " \'",
                closer: "\""
            },
            " \'": {
                opener: " \"",
                closer: "\'"
            },
            "\u2018": {
                opener: "\u2018",
                closer: "\u2019"
            },
            "\u201C": {
                opener: "\u201C",
                closer: "\u201D"
            },
        };
        function tryOpen(tag, pos) {
            if (config.quoteState.length === 0 || tag === config.quoteState[config.quoteState.length - 1].opener) {
                config.quoteState.push({
                    opener: quoteParams[tag].opener,
                    closer: quoteParams[tag].closer,
                    pos: pos
                });
                return false;
            } else {
                var prevPos = config.quoteState[config.quoteState.length-1].pos;
                config.quoteState.pop();
                config.quoteState.push({
                    opener: quoteParams[tag].opener,
                    closer: quoteParams[tag].closer,
                    positions: pos
                });
                return prevPos;
            }
        }
        function tryClose(tag, pos) {
            if (config.quoteState.length > 0 && tag === config.quoteState[config.quoteState.length - 1].closer) {
                config.quoteState.pop();
            } else {
                return pos;
            }
        }
        function pushQuoteState(tag, pos) {
            var isOpener = ["\u201C", "\u2018", " \"", " \'"].indexOf(tag) > -1 ? true : false;
            if (isOpener) {
                return tryOpen(tag, pos);
            } else {
                return tryClose(tag, pos);
            }
        }
        function quoteFix (tag, positions) {
            var m = tag.match(/(^(?:\u2018|\u2019|\u201C|\u201D|\"|\')|(?: \"| \')$)/);
            if (m) {
                return pushQuoteState(m[1], positions);
            }
        }
        // Run state machine
        if (config.doppel.strings.length && config.doppel.strings[0].trim()) {
            config.doppel.strings[0] = config.capitaliseWords(config.doppel.strings[0], 0, config.doppel.tags[0]);
        }

    	for (var i=0,ilen=config.doppel.tags.length;i<ilen;i++) {
            var tag = config.doppel.tags[i];
            var str = config.doppel.strings[i+1];

            if (config.tagState !== null) {
                // Evaluate tag state for current string
                if (_tagParams[tag]) {
                    config.tagState.push(_tagParams[tag]);
                } else if (config.tagState.length && tag === config.tagState[config.tagState.length - 1]) {
                    config.tagState.pop();
                }
            }

            if (config.afterPunct !== null) {
                // Evaluate punctuation state of current string
                if (tag.match(/[\!\?\:]$/)) {
                    config.afterPunct = true;
                }
            }

            // Process if outside tag scope, else noop for upper-casing
            if (config.tagState.length === 0) {
                config.doppel.strings[i+1] = config.capitaliseWords(str, i+1, config.doppel,config.doppel.tags[i+1]);
                
            } else if (config.doppel.strings[i+1].trim()) {
                config.lastWordPos = null;
            }
            
            if (config.quoteState !== null) {
                // Evaluate quote state of current string and fix chars that have flown
                var quotePos = quoteFix(tag, i);
                if (quotePos || quotePos === 0) {
                    var origChar = config.doppel.origStrings[quotePos+1].slice(0, 1);
                    config.doppel.strings[quotePos+1] = origChar + config.doppel.strings[quotePos+1].slice(1);
                    config.lastWordPos = null;
                }
            }

            // If there was a printable string, unset first-word and after-punctuation
            if (config.isFirst) {
                if (str.trim()) {
                    config.isFirst = false;
                }
            }
            if (config.afterPunct) {
                if (str.trim()) {
                    config.afterPunct = false;
                }
            }
        }
        if (config.quoteState) {
            for (var i=0,ilen=config.quoteState.length;i<ilen;i++) {
                var quotePos = config.quoteState[i].pos;
                // Test for quotePos avoids a crashing error:
                //   https://github.com/citation-style-language/test-suite/blob/master/processor-tests/humans/flipflop_OrphanQuote.txt
                if (typeof quotePos !== 'undefined') {
                    var origChar = config.doppel.origStrings[quotePos+1].slice(0, 1);
                    config.doppel.strings[quotePos+1] = origChar + config.doppel.strings[quotePos+1].slice(1);
                }
            }
        }
        // Specially capitalize the last word if necessary (invert stop-word list)
        if (config.lastWordPos) {
            var lastWords = wordDoppel.split(config.doppel.strings[config.lastWordPos.strings]);
            var lastWord = lastWords.strings[config.lastWordPos.words];
            if (lastWord.length > 1 && lastWord.toLowerCase().match(config.skipWordsRex)) {
                lastWord = _capitalise(lastWord);
                lastWords.strings[config.lastWordPos.words] = lastWord;
            }
            config.doppel.strings[config.lastWordPos.strings] = wordDoppel.join(lastWords);
        }

        // Recombine the string
        return tagDoppel.join(config.doppel);
    }

    /**
     * PUBLIC
     */

    /**
     * A noop that just delivers the string.
     */
    function passthrough (state, str) {
        return str;
    }

    /**
     * Force all letters in the string to lowercase, skipping nocase spans
     */
    function lowercase(state, string) {
        var config = {
            quoteState: null,
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = word.toLowerCase();
                    }
                }
                return words.join(" ");
            },
            skipWordsRex: null,
            tagState: [],
            afterPunct: null,
            isFirst: null
        };
        return _textcaseEngine(config, string);
    }

    /**
     * Force all letters in the string to uppercase.
     */
    function uppercase(state, string) {
        var config = {
            quoteState: null,
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = word.toUpperCase();
                    }
                }
                return words.join(" ");
            },
            skipWordsRex: null,
            tagState: [],
            afterPunct: null,
            isFirst: null
        };
        return _textcaseEngine(config, string);
    }

    /**
     * Similar to <b>capitalize_first</b>, but force the
     * subsequent characters to lowercase.
     */
    function sentence(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        if (config.isFirst) {
                            words[i] = _capitalise(word);
                            config.isFirst = false;
                        } else {
                            words[i] = word.toLowerCase();
                        }
                    }
                }
                return words.join(" ");
            },
            skipWordsRex: null,
            tagState: [],
            afterPunct: null,
            isFirst: true
        };
        return _textcaseEngine(config, string);
    }

    function title(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str, i, followingTag) {
                if (str.trim()) {
                    var words = str.split(/[ \u00A0]+/);
                    var wordle = wordDoppel.split(str);
                    var words = wordle.strings;
                    for (var j=0,jlen=words.length;j<jlen;j++) {
                        var word = words[j];
                        if (!word) {
                            continue;
                        }
                        if (word.length > 1 && !word.toLowerCase().match(config.skipWordsRex)) {
                            // Capitalize every word that is not a stop-word
                            words[j] = _capitalise(words[j]);
                        } else if (j === (words.length - 1) && followingTag === "-") {
                            words[j] = _capitalise(words[j]);
                        } else if (config.isFirst) {
                            // Capitalize first word, even if a stop-word
                            words[j] = _capitalise(words[j]);
                        } else if (config.afterPunct) {
                            // Capitalize after punctuation
                            words[j] = _capitalise(words[j]);
                        }
                        config.afterPunct = false;
                        config.isFirst = false;
                        config.lastWordPos = {
                            strings: i,
                            words: j
                        };
                    }
                    str = wordDoppel.join(wordle);
                }
                return str;
            },
            skipWordsRex: state.locale[state.opt.lang].opts["skip-words-regexp"],
            tagState: [],
            afterPunct: false,
            isFirst: true
        };
        return _textcaseEngine(config, string);
    }
    
    
    /**
     * Force capitalization of the first letter in the string, leave
     * the rest of the characters untouched.
     */
    function capitalizeFirst(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        if (config.isFirst) {
                            words[i] = _capitalise(word);
                            config.isFirst = false;
                            break;
                        }
                    }
                }
                return words.join(" ");
            },
            skipWordsRex: null,
            tagState: [],
            afterPunct: null,
            isFirst: true
        };
        return _textcaseEngine(config, string);
    }

    /**
     * Force the first letter of each space-delimited
     * word in the string to uppercase, and leave the remainder
     * of the string untouched.  Single characters are forced
     * to uppercase.
     */
    function capitalizeAll (state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = _capitalise(word);
                    }
                }
                return words.join(" ");
            },
            skipWordsRex: null,
            tagState: [],
            afterPunct: null,
            isFirst: null
        };
        return _textcaseEngine(config, string);
    }
    return {
        passthrough: passthrough,
        lowercase: lowercase,
        uppercase: uppercase,
        sentence: sentence,
        title: title,
        "capitalize-first": capitalizeFirst,
        "capitalize-all": capitalizeAll
    };
}());

CSL.parseParticles = (function(){
    function splitParticles(nameValue, firstNameFlag, caseOverride) {
		// Parse particles out from name fields.
		// * nameValue (string) is the field content to be parsed.
		// * firstNameFlag (boolean) parse trailing particles
		//	 (default is to parse leading particles)
		// * caseOverride (boolean) include all but one word in particle set
		//	 (default is to include only words with lowercase first char)
        //   [caseOverride is not used in this application]
		// Returns an array with:
		// * (boolean) flag indicating whether a particle was found
		// * (string) the name after removal of particles
		// * (array) the list of particles found
		var origNameValue = nameValue;
		nameValue = caseOverride ? nameValue.toLowerCase() : nameValue;
		var particleList = [];
		var rex;
        var hasParticle;
		if (firstNameFlag) {
			nameValue = nameValue.split("").reverse().join("");
			rex = CSL.PARTICLE_GIVEN_REGEXP;
		} else {
			rex = CSL.PARTICLE_FAMILY_REGEXP;
		}
		var m = nameValue.match(rex);
		while (m) {
			var m1 = firstNameFlag ? m[1].split("").reverse().join("") : m[1];
			var firstChar = m ? m1 : false;
			var firstChar = firstChar ? m1.replace(/^[-\'\u02bb\u2019\s]*(.).*$/, "$1") : false;
			hasParticle = firstChar ? firstChar.toUpperCase() !== firstChar : false;
			if (!hasParticle) {
                break;
            }
			if (firstNameFlag) {
				particleList.push(origNameValue.slice(m1.length * -1));
				origNameValue = origNameValue.slice(0,m1.length * -1);
			} else {
				particleList.push(origNameValue.slice(0,m1.length));
				origNameValue = origNameValue.slice(m1.length);
			}
			//particleList.push(m1);
			nameValue = m[2];
			m = nameValue.match(rex);
		}
		if (firstNameFlag) {
			nameValue = nameValue.split("").reverse().join("");
			particleList.reverse();
			for (var i=1,ilen=particleList.length;i<ilen;i++) {
				if (particleList[i].slice(0, 1) == " ") {
					particleList[i-1] += " ";
				}
			}
			for (var i=0,ilen=particleList.length;i<ilen;i++) {
				if (particleList[i].slice(0, 1) == " ") {
					particleList[i] = particleList[i].slice(1);
				}
			}
			nameValue = origNameValue.slice(0, nameValue.length);
		} else {
			nameValue = origNameValue.slice(nameValue.length * -1);
		}
		return [hasParticle, nameValue, particleList];
	}
    function trimLast(str) {
        var lastChar = str.slice(-1);
        str = str.trim();
        if (lastChar === " " && ["\'", "\u2019"].indexOf(str.slice(-1)) > -1) {
            str += " ";
        }
        return str;
    }
    function parseSuffix(nameObj) {
        if (!nameObj.suffix && nameObj.given) {
            var m = nameObj.given.match(/(\s*,!*\s*)/);
            if (m) {
                var idx = nameObj.given.indexOf(m[1]);
                var possible_suffix = nameObj.given.slice(idx + m[1].length);
                var possible_comma = nameObj.given.slice(idx, idx + m[1].length).replace(/\s*/g, "");
                if (possible_suffix.replace(/\./g, "") === 'et al' && !nameObj["dropping-particle"]) {
                    // This hack covers the case where "et al." is explicitly used in the
                    // authorship information of the work.
                    nameObj["dropping-particle"] = possible_suffix;
                    nameObj["comma-dropping-particle"] = ",";
                } else {
                    if (possible_comma.length === 2) {
                        nameObj["comma-suffix"] = true;
                    }
                    nameObj.suffix = possible_suffix;
                }
                nameObj.given = nameObj.given.slice(0, idx);
            }
        }
    }
    return function(nameObj) {
        // Extract and set non-dropping particle(s) from family name field
        var res = splitParticles(nameObj.family);
        var lastNameValue = res[1];
        var lastParticleList = res[2];
        nameObj.family = lastNameValue;
        var nonDroppingParticle = trimLast(lastParticleList.join(""));
        if (nonDroppingParticle) {
            nameObj['non-dropping-particle'] = nonDroppingParticle;
        }
        // Split off suffix first of all
        parseSuffix(nameObj);
        // Extract and set dropping particle(s) from given name field
        var res = splitParticles(nameObj.given, true);
        var firstNameValue = res[1];
        var firstParticleList = res[2];
        nameObj.given = firstNameValue;
        var droppingParticle = firstParticleList.join("").trim();
        if (droppingParticle) {
            nameObj['dropping-particle'] = droppingParticle;
        }
    };
}());


module.exports = CSL

/***/ }),

/***/ "../gen/itemfields.ts":
/*!****************************!*\
  !*** ../gen/itemfields.ts ***!
  \****************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// tslint:disable:one-line
Object.defineProperty(exports, "__esModule", { value: true });
const jurism = Zotero.Utilities.getVersion().includes('m');
const zotero = !jurism;
exports.valid = new Map([
    ['conferencePaper', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['DOI', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['conferenceName', true],
            ['date', true],
            ['extra', true],
            ['institution', jurism],
            ['issue', jurism],
            ['language', true],
            ['libraryCatalog', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['series', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['journalArticle', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['DOI', true],
            ['ISSN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['issue', true],
            ['journalAbbreviation', true],
            ['language', true],
            ['libraryCatalog', true],
            ['pages', true],
            ['publicationTitle', true],
            ['rights', true],
            ['series', true],
            ['seriesText', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['audioRecording', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['numberOfVolumes', true],
            ['place', true],
            ['publisher', true],
            ['rights', true],
            ['runningTime', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['book', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', jurism],
            ['numPages', true],
            ['numberOfVolumes', true],
            ['place', true],
            ['publisher', true],
            ['rights', true],
            ['series', true],
            ['seriesNumber', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['bookSection', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['numberOfVolumes', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['series', true],
            ['seriesNumber', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['computerProgram', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['libraryCatalog', true],
            ['place', true],
            ['programmingLanguage', true],
            ['publisher', true],
            ['rights', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['system', true],
            ['title', true],
            ['url', true],
            ['versionNumber', true],
        ]),
    ],
    ['dictionaryEntry', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['numberOfVolumes', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['series', true],
            ['seriesNumber', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['encyclopediaArticle', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['numberOfVolumes', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['series', true],
            ['seriesNumber', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['map', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['place', true],
            ['publisher', true],
            ['rights', true],
            ['scale', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['videoRecording', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISBN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['numberOfVolumes', true],
            ['place', true],
            ['publisher', true],
            ['rights', true],
            ['runningTime', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
            ['websiteTitle', jurism],
        ]),
    ],
    ['magazineArticle', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISSN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['issue', true],
            ['language', true],
            ['libraryCatalog', true],
            ['pages', true],
            ['place', jurism],
            ['publicationTitle', true],
            ['publisher', jurism],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['newspaperArticle', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['ISSN', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['court', jurism],
            ['date', true],
            ['edition', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', true],
            ['rights', true],
            ['section', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['artwork', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['artworkSize', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['publicationTitle', jurism],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['bill', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archiveLocation', jurism],
            ['code', true],
            ['date', true],
            ['extra', true],
            ['history', true],
            ['language', true],
            ['legislativeBody', true],
            ['number', true],
            ['pages', true],
            ['rights', true],
            ['section', true],
            ['session', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['blogPost', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['publicationTitle', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['case', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', jurism],
            ['archiveLocation', jurism],
            ['callNumber', jurism],
            ['court', true],
            ['date', true],
            ['extra', true],
            ['filingDate', jurism],
            ['history', true],
            ['issue', jurism],
            ['language', true],
            ['number', true],
            ['pages', true],
            ['place', jurism],
            ['publicationTitle', jurism],
            ['publisher', jurism],
            ['reporter', zotero],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', true],
        ]),
    ],
    ['classic', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', jurism],
            ['accessDate', jurism],
            ['archive', jurism],
            ['archiveLocation', jurism],
            ['callNumber', jurism],
            ['date', jurism],
            ['extra', jurism],
            ['language', jurism],
            ['libraryCatalog', jurism],
            ['numPages', jurism],
            ['place', jurism],
            ['rights', jurism],
            ['shortTitle', jurism],
            ['title', jurism],
            ['type', jurism],
            ['url', jurism],
            ['volume', jurism],
        ]),
    ],
    ['document', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['publisher', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['versionNumber', jurism],
        ]),
    ],
    ['email', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['film', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['publisher', true],
            ['rights', true],
            ['runningTime', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['forumPost', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['publicationTitle', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['gazette', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', jurism],
            ['accessDate', jurism],
            ['code', jurism],
            ['codeNumber', jurism],
            ['date', jurism],
            ['extra', jurism],
            ['history', jurism],
            ['language', jurism],
            ['number', jurism],
            ['pages', jurism],
            ['publisher', jurism],
            ['rights', jurism],
            ['section', jurism],
            ['session', jurism],
            ['shortTitle', jurism],
            ['title', jurism],
            ['url', jurism],
        ]),
    ],
    ['hearing', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archiveLocation', jurism],
            ['committee', true],
            ['date', true],
            ['extra', true],
            ['history', true],
            ['language', true],
            ['legislativeBody', true],
            ['number', true],
            ['numberOfVolumes', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', jurism],
            ['publisher', true],
            ['rights', true],
            ['session', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
            ['volume', jurism],
        ]),
    ],
    ['instantMessage', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['interview', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['place', jurism],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['letter', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['manuscript', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['numPages', true],
            ['place', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['patent', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['applicationNumber', true],
            ['assignee', true],
            ['country', true],
            ['date', true],
            ['extra', true],
            ['filingDate', true],
            ['genre', jurism],
            ['issuingAuthority', true],
            ['language', true],
            ['legalStatus', true],
            ['number', true],
            ['pages', true],
            ['place', true],
            ['priorityNumbers', true],
            ['references', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['podcast', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', jurism],
            ['extra', true],
            ['language', true],
            ['medium', true],
            ['number', true],
            ['publisher', jurism],
            ['rights', true],
            ['runningTime', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['presentation', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['meetingName', true],
            ['place', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['radioBroadcast', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['number', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['runningTime', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['regulation', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', jurism],
            ['accessDate', jurism],
            ['code', jurism],
            ['codeNumber', jurism],
            ['date', jurism],
            ['extra', jurism],
            ['history', jurism],
            ['language', jurism],
            ['number', jurism],
            ['pages', jurism],
            ['publisher', jurism],
            ['rights', jurism],
            ['section', jurism],
            ['session', jurism],
            ['shortTitle', jurism],
            ['title', jurism],
            ['url', jurism],
        ]),
    ],
    ['report', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['committee', jurism],
            ['date', true],
            ['extra', true],
            ['institution', jurism],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', jurism],
            ['number', true],
            ['pages', true],
            ['place', true],
            ['publicationTitle', jurism],
            ['publisher', zotero],
            ['rights', true],
            ['seriesTitle', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['standard', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', jurism],
            ['accessDate', jurism],
            ['archive', jurism],
            ['archiveLocation', jurism],
            ['callNumber', jurism],
            ['date', jurism],
            ['extra', jurism],
            ['language', jurism],
            ['libraryCatalog', jurism],
            ['number', jurism],
            ['publisher', jurism],
            ['rights', jurism],
            ['shortTitle', jurism],
            ['title', jurism],
            ['url', jurism],
            ['versionNumber', jurism],
        ]),
    ],
    ['statute', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['code', true],
            ['codeNumber', true],
            ['date', true],
            ['extra', true],
            ['history', true],
            ['language', true],
            ['number', true],
            ['pages', true],
            ['publisher', jurism],
            ['rights', true],
            ['section', true],
            ['session', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['thesis', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['numPages', true],
            ['place', true],
            ['publisher', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['treaty', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', jurism],
            ['accessDate', jurism],
            ['archive', jurism],
            ['archiveLocation', jurism],
            ['callNumber', jurism],
            ['date', jurism],
            ['extra', jurism],
            ['language', jurism],
            ['libraryCatalog', jurism],
            ['pages', jurism],
            ['publisher', jurism],
            ['reporter', jurism],
            ['rights', jurism],
            ['section', jurism],
            ['shortTitle', jurism],
            ['title', jurism],
            ['url', jurism],
            ['volume', jurism],
        ]),
    ],
    ['tvBroadcast', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['archive', true],
            ['archiveLocation', true],
            ['callNumber', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['libraryCatalog', true],
            ['medium', true],
            ['number', true],
            ['place', true],
            ['publicationTitle', true],
            ['publisher', true],
            ['rights', true],
            ['runningTime', true],
            ['shortTitle', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['webpage', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['abstractNote', true],
            ['accessDate', true],
            ['date', true],
            ['extra', true],
            ['language', true],
            ['publicationTitle', true],
            ['rights', true],
            ['shortTitle', true],
            ['title', true],
            ['type', true],
            ['url', true],
        ]),
    ],
    ['attachment', new Map([
            ['itemType', true],
            ['creators', true],
            ['tags', true],
            ['attachments', true],
            ['notes', true],
            ['seeAlso', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
            ['multi', true],
            ['accessDate', true],
            ['title', true],
            ['url', true],
        ]),
    ],
    ['note', new Map([
            ['itemType', true],
            ['tags', true],
            ['note', true],
            ['id', true],
            ['itemID', true],
            ['dateAdded', true],
            ['dateModified', true],
        ]),
    ],
]);
function unalias(item) {
    // date
    if (typeof item.dateDecided !== 'undefined') {
        item.date = item.dateDecided;
        delete item.dateDecided;
    }
    else if (jurism && typeof item.dateEnacted !== 'undefined') {
        item.date = item.dateEnacted;
        delete item.dateEnacted;
    }
    else if (typeof item.dateEnacted !== 'undefined') {
        item.date = item.dateEnacted;
        delete item.dateEnacted;
    }
    else if (typeof item.issueDate !== 'undefined') {
        item.date = item.issueDate;
        delete item.issueDate;
    }
    // medium
    if (typeof item.artworkMedium !== 'undefined') {
        item.medium = item.artworkMedium;
        delete item.artworkMedium;
    }
    else if (typeof item.audioFileType !== 'undefined') {
        item.medium = item.audioFileType;
        delete item.audioFileType;
    }
    else if (typeof item.audioRecordingFormat !== 'undefined') {
        item.medium = item.audioRecordingFormat;
        delete item.audioRecordingFormat;
    }
    else if (typeof item.interviewMedium !== 'undefined') {
        item.medium = item.interviewMedium;
        delete item.interviewMedium;
    }
    else if (typeof item.videoRecordingFormat !== 'undefined') {
        item.medium = item.videoRecordingFormat;
        delete item.videoRecordingFormat;
    }
    // number
    if (typeof item.billNumber !== 'undefined') {
        item.number = item.billNumber;
        delete item.billNumber;
    }
    else if (typeof item.docketNumber !== 'undefined') {
        item.number = item.docketNumber;
        delete item.docketNumber;
    }
    else if (typeof item.documentNumber !== 'undefined') {
        item.number = item.documentNumber;
        delete item.documentNumber;
    }
    else if (typeof item.episodeNumber !== 'undefined') {
        item.number = item.episodeNumber;
        delete item.episodeNumber;
    }
    else if (typeof item.patentNumber !== 'undefined') {
        item.number = item.patentNumber;
        delete item.patentNumber;
    }
    else if (jurism && typeof item.publicLawNumber !== 'undefined') {
        item.number = item.publicLawNumber;
        delete item.publicLawNumber;
    }
    else if (typeof item.publicLawNumber !== 'undefined') {
        item.number = item.publicLawNumber;
        delete item.publicLawNumber;
    }
    else if (typeof item.reportNumber !== 'undefined') {
        item.number = item.reportNumber;
        delete item.reportNumber;
    }
    // pages
    if (typeof item.codePages !== 'undefined') {
        item.pages = item.codePages;
        delete item.codePages;
    }
    else if (typeof item.firstPage !== 'undefined') {
        item.pages = item.firstPage;
        delete item.firstPage;
    }
    // publicationTitle
    if (typeof item.blogTitle !== 'undefined') {
        item.publicationTitle = item.blogTitle;
        delete item.blogTitle;
    }
    else if (typeof item.bookTitle !== 'undefined') {
        item.publicationTitle = item.bookTitle;
        delete item.bookTitle;
    }
    else if (jurism && typeof item.bookTitle !== 'undefined') {
        item.publicationTitle = item.bookTitle;
        delete item.bookTitle;
    }
    else if (typeof item.dictionaryTitle !== 'undefined') {
        item.publicationTitle = item.dictionaryTitle;
        delete item.dictionaryTitle;
    }
    else if (typeof item.encyclopediaTitle !== 'undefined') {
        item.publicationTitle = item.encyclopediaTitle;
        delete item.encyclopediaTitle;
    }
    else if (typeof item.forumTitle !== 'undefined') {
        item.publicationTitle = item.forumTitle;
        delete item.forumTitle;
    }
    else if (typeof item.proceedingsTitle !== 'undefined') {
        item.publicationTitle = item.proceedingsTitle;
        delete item.proceedingsTitle;
    }
    else if (typeof item.programTitle !== 'undefined') {
        item.publicationTitle = item.programTitle;
        delete item.programTitle;
    }
    else if (jurism && typeof item.reporter !== 'undefined') {
        item.publicationTitle = item.reporter;
        delete item.reporter;
    }
    else if (jurism && typeof item.websiteTitle !== 'undefined') {
        item.publicationTitle = item.websiteTitle;
        delete item.websiteTitle;
    }
    else if (typeof item.websiteTitle !== 'undefined') {
        item.publicationTitle = item.websiteTitle;
        delete item.websiteTitle;
    }
    // publisher
    if (typeof item.company !== 'undefined') {
        item.publisher = item.company;
        delete item.company;
    }
    else if (typeof item.distributor !== 'undefined') {
        item.publisher = item.distributor;
        delete item.distributor;
    }
    else if (zotero && typeof item.institution !== 'undefined') {
        item.publisher = item.institution;
        delete item.institution;
    }
    else if (typeof item.label !== 'undefined') {
        item.publisher = item.label;
        delete item.label;
    }
    else if (typeof item.network !== 'undefined') {
        item.publisher = item.network;
        delete item.network;
    }
    else if (typeof item.studio !== 'undefined') {
        item.publisher = item.studio;
        delete item.studio;
    }
    else if (typeof item.university !== 'undefined') {
        item.publisher = item.university;
        delete item.university;
    }
    // title
    if (typeof item.caseName !== 'undefined') {
        item.title = item.caseName;
        delete item.caseName;
    }
    else if (jurism && typeof item.nameOfAct !== 'undefined') {
        item.title = item.nameOfAct;
        delete item.nameOfAct;
    }
    else if (typeof item.nameOfAct !== 'undefined') {
        item.title = item.nameOfAct;
        delete item.nameOfAct;
    }
    else if (typeof item.subject !== 'undefined') {
        item.title = item.subject;
        delete item.subject;
    }
    // type
    if (typeof item.genre !== 'undefined') {
        item.type = item.genre;
        delete item.genre;
    }
    else if (typeof item.letterType !== 'undefined') {
        item.type = item.letterType;
        delete item.letterType;
    }
    else if (jurism && typeof item.manuscriptType !== 'undefined') {
        item.type = item.manuscriptType;
        delete item.manuscriptType;
    }
    else if (typeof item.manuscriptType !== 'undefined') {
        item.type = item.manuscriptType;
        delete item.manuscriptType;
    }
    else if (typeof item.mapType !== 'undefined') {
        item.type = item.mapType;
        delete item.mapType;
    }
    else if (typeof item.postType !== 'undefined') {
        item.type = item.postType;
        delete item.postType;
    }
    else if (typeof item.presentationType !== 'undefined') {
        item.type = item.presentationType;
        delete item.presentationType;
    }
    else if (typeof item.reportType !== 'undefined') {
        item.type = item.reportType;
        delete item.reportType;
    }
    else if (typeof item.thesisType !== 'undefined') {
        item.type = item.thesisType;
        delete item.thesisType;
    }
    else if (typeof item.websiteType !== 'undefined') {
        item.type = item.websiteType;
        delete item.websiteType;
    }
    // volume
    if (typeof item.codeVolume !== 'undefined') {
        item.volume = item.codeVolume;
        delete item.codeVolume;
    }
    else if (typeof item.reporterVolume !== 'undefined') {
        item.volume = item.reporterVolume;
        delete item.reporterVolume;
    }
}
// import & export translators expect different creator formats... nice
function simplifyForExport(item, dropAttachments = false) {
    unalias(item);
    item.notes = item.notes ? item.notes.map(note => note.note || note) : [];
    if (item.filingDate)
        item.filingDate = item.filingDate.replace(/^0000-00-00 /, '');
    if (item.creators) {
        for (const creator of item.creators) {
            if (creator.fieldMode) {
                creator.name = creator.name || creator.lastName;
                delete creator.lastName;
                delete creator.firstName;
                delete creator.fieldMode;
            }
        }
    }
    if (dropAttachments)
        item.attachments = [];
    return item;
}
exports.simplifyForExport = simplifyForExport;
function simplifyForImport(item) {
    unalias(item);
    if (item.creators) {
        for (const creator of item.creators) {
            if (creator.name) {
                creator.lastName = creator.lastName || creator.name;
                creator.fieldMode = 1;
                delete creator.firstName;
                delete creator.name;
            }
            if (!jurism)
                delete creator.multi;
        }
    }
    if (!jurism)
        delete item.multi;
    return item;
}
exports.simplifyForImport = simplifyForImport;


/***/ }),

/***/ "../node_modules/@retorquere/bibtex-parser/chunker.js":
/*!************************************************************!*\
  !*** ../node_modules/@retorquere/bibtex-parser/chunker.js ***!
  \************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Original work by Henrik Muehe (c) 2010
//
// CommonJS port by Mikola Lysenko 2013
//
Object.defineProperty(exports, "__esModule", { value: true });
class ParseError extends Error {
    constructor(message, parser) {
        message += ` @ ${parser.pos}`;
        if (parser.parsing)
            message += ` in ${JSON.stringify(parser.parsing)}`;
        super(message);
        this.name = 'ParseError';
    }
}
// tslint:disable-next-line prefer-template
const letter = new RegExp('[' + [
    // Letter, Uppercase
    /\u0041-\u005A\u00C0-\u00D6\u00D8-\u00DE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178-\u0179\u017B\u017D\u0181-\u0182\u0184\u0186-\u0187\u0189-\u018B\u018E-\u0191\u0193-\u0194\u0196-\u0198\u019C-\u019D\u019F-\u01A0\u01A2\u01A4\u01A6-\u01A7\u01A9\u01AC\u01AE-\u01AF\u01B1-\u01B3\u01B5\u01B7-\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A-\u023B\u023D-\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u037F\u0386\u0388-\u038A\u038C\u038E-\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9-\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0-\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0528\u052A\u052C\u052E\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u13A0-\u13F5\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E-\u213F\u2145\u2183\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA698\uA69A\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D-\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA796\uA798\uA79A\uA79C\uA79E\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA-\uA7AD\uA7B0-\uA7B4\uA7B6\uFF21-\uFF3A/.source,
    // Letter, Titlecase
    /\u01C5\u01C8\u01CB\u01F2\u1F88-\u1F8F\u1F98-\u1F9F\u1FA8-\u1FAF\u1FBC\u1FCC\u1FFC/.source,
    // Letter, Lowercase
    /\u0061-\u007A\u00B5\u00DF-\u00F6\u00F8-\u00FF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137-\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148-\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C-\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA-\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9-\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC-\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF-\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F-\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0-\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB-\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE-\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0529\u052B\u052D\u052F\u0561-\u0587\u13F8-\u13FD\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6-\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FC7\u1FD0-\u1FD3\u1FD6-\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6-\u1FF7\u210A\u210E-\u210F\u2113\u212F\u2134\u2139\u213C-\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65-\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73-\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3-\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA699\uA69B\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793-\uA795\uA797\uA799\uA79B\uA79D\uA79F\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7B5\uA7B7\uA7FA\uAB30-\uAB5A\uAB60-\uAB65\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A/.source,
    // Letter, Modifier
    /\u02B0-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0374\u037A\u0559\u0640\u06E5-\u06E6\u07F4-\u07F5\u07FA\u081A\u0824\u0828\u0971\u0E46\u0EC6\u10FC\u17D7\u1843\u1AA7\u1C78-\u1C7D\u1D2C-\u1D6A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C-\u2C7D\u2D6F\u2E2F\u3005\u3031-\u3035\u303B\u309D-\u309E\u30FC-\u30FE\uA015\uA4F8-\uA4FD\uA60C\uA67F\uA69C-\uA69D\uA717-\uA71F\uA770\uA788\uA7F8-\uA7F9\uA9CF\uA9E6\uAA70\uAADD\uAAF3-\uAAF4\uAB5C-\uAB5F\uFF70\uFF9E-\uFF9F/.source,
    // Letter, Other
    /\u00AA\u00BA\u01BB\u01C0-\u01C3\u0294\u05D0-\u05EA\u05F0-\u05F2\u0620-\u063F\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06D5\u06EE-\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u0800-\u0815\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0972-\u0980\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0-\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B35-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0-\u0CE1\u0CF1-\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065-\u1066\u106E-\u1070\u1075-\u1081\u108E\u10D0-\u10FA\u10FD-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17DC\u1820-\u1842\u1844-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE-\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C77\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5-\u1CF6\u2135-\u2138\u2D30-\u2D67\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3006\u303C\u3041-\u3096\u309F\u30A1-\u30FA\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA014\uA016-\uA48C\uA4D0-\uA4F7\uA500-\uA60B\uA610-\uA61F\uA62A-\uA62B\uA66E\uA6A0-\uA6E5\uA78F\uA7F7\uA7FB-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9E0-\uA9E4\uA9E7-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA6F\uAA71-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5-\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADC\uAAE0-\uAAEA\uAAF2\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40-\uFB41\uFB43-\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF66-\uFF6F\uFF71-\uFF9D\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC/.source,
].join('') + ']');
class BibtexParser {
    parse(input, options = {}) {
        // this._progress = 0
        this.pos = 0;
        this.input = input;
        this.max_entries = options.max_entries || 0;
        this.entries = 0;
        this.parsing = null;
        this.chunks = [];
        if (options.async) {
            return this.bibtexAsync().then(() => this.chunks);
        }
        else {
            this.bibtex();
            return this.chunks;
        }
    }
    isWhitespace(s, horizontalOnly = false) {
        return (s === ' ' || s === '\t' || (!horizontalOnly && (s === '\r' || s === '\n')));
    }
    match(s) {
        this.skipWhitespace();
        if (this.input.substr(this.pos, s.length) !== s) {
            throw new ParseError(`Token mismatch, expected ${JSON.stringify(s)}, found ${JSON.stringify(this.input.substr(this.pos, 20))}...`, this); // tslint:disable-line no-magic-numbers
        }
        this.pos += s.length;
        this.skipWhitespace();
    }
    tryMatch(s) {
        this.skipWhitespace();
        return (this.input.substr(this.pos, s.length) === s);
        // this.skipWhitespace()
    }
    skipWhitespace() {
        while (this.isWhitespace(this.input[this.pos]))
            this.pos++;
        // shady
        if (this.input[this.pos] === '%') {
            while (this.input[this.pos] !== '\n')
                this.pos++;
            this.skipWhitespace();
        }
    }
    value_braces() {
        let bracecount = 0;
        this.match('{');
        const start = this.pos;
        let math = false;
        while (true) {
            switch (this.input[this.pos]) {
                case '\\':
                    this.pos += 1;
                    break;
                case '{':
                    bracecount++;
                    break;
                case '}':
                    if (bracecount === 0) {
                        if (math)
                            throw new ParseError('Unclosed math section', this);
                        this.pos++;
                        return this.input.substring(start, this.pos - 1);
                    }
                    bracecount--;
                    break;
                case '$':
                    math = !math;
                    break;
            }
            this.pos++;
            if (this.pos >= this.input.length) {
                throw new ParseError(`Unterminated brace-value ${JSON.stringify(this.input.substr(start, 20))}`, this); // tslint:disable-line no-magic-numbers
            }
        }
    }
    value_quotes() {
        this.match('"');
        const start = this.pos;
        let bracecount = 0;
        while (true) {
            switch (this.input[this.pos]) {
                case '\\':
                    this.pos += 1;
                    break;
                case '{':
                    bracecount++;
                    break;
                case '}':
                    bracecount++;
                    break;
                case '"':
                    if (bracecount <= 0) {
                        this.pos++;
                        return this.input.substring(start, this.pos - 1);
                    }
            }
            this.pos++;
            if (this.pos >= this.input.length) {
                throw new ParseError(`Unterminated quote-value ${JSON.stringify(this.input.substr(start, 20))}`, this); // tslint:disable-line no-magic-numbers
            }
        }
    }
    single_value() {
        if (this.tryMatch('{')) {
            return this.value_braces();
        }
        else if (this.tryMatch('"')) {
            return this.value_quotes();
        }
        else {
            return this.key();
        }
    }
    value() {
        const values = [];
        values.push(this.single_value());
        while (this.tryMatch('#')) {
            this.match('#');
            values.push(this.single_value());
        }
        return values.join('');
    }
    key(allowUnicode = false) {
        const start = this.pos;
        while (true) {
            if (this.pos === this.input.length) {
                throw new ParseError('Runaway key', this);
            }
            if (this.input[this.pos].match(/['a-zA-Z0-9&;_:\\./-]/)) {
                this.pos++;
            }
            else if (allowUnicode && this.input[this.pos].match(letter)) {
                this.pos++;
            }
            else {
                return this.input.substring(start, this.pos);
            }
        }
    }
    key_equals_value() {
        const key = this.key();
        if (!this.tryMatch('=')) {
            throw new ParseError(`... = value expected, equals sign missing: ${JSON.stringify(this.input.substr(this.pos, 20))}...`, this); // tslint:disable-line no-magic-numbers
        }
        this.match('=');
        const val = this.value();
        return [key, val];
    }
    key_value_list() {
        this.key_equals_value();
        while (this.tryMatch(',')) {
            this.match(',');
            // fixes problems with commas at the end of a list
            if (this.tryMatch('}')) {
                break;
            }
            this.key_equals_value();
        }
    }
    entry(d) {
        this.parsing = this.key(true);
        this.match(',');
        this.key_value_list();
    }
    directive() {
        this.match('@');
        return `@${this.key()}`.toLowerCase();
    }
    string() {
        this.key_equals_value();
    }
    preamble() {
        this.value();
    }
    comment() {
        while (this.isWhitespace(this.input[this.pos], true))
            this.pos++;
        if (this.input[this.pos] === '{') {
            this.value_braces();
            return;
        }
        while (this.input[this.pos] !== '\n' && this.pos < this.input.length)
            this.pos++;
    }
    /*
    private progress() {
      const progress = Math.round((this.pos / this.input.length * 100) / 5) * 5 // tslint:disable-line no-magic-numbers
      if (this._progress !== progress) {
        this._progress = progress
        process.stdout.write(` (${this._progress}%) `)
      }
    }
    */
    hasMore() {
        if (this.max_entries && this.entries >= this.max_entries)
            return false;
        return (this.pos < this.input.length);
    }
    bibtex() {
        while (this.hasMore()) {
            this.parseNext();
        }
    }
    bibtexAsync() {
        return this.hasMore() ? (new Promise(resolve => resolve(this.parseNext()))).then(() => this.bibtexAsync()) : Promise.resolve(null);
    }
    parseNext() {
        // this.progress()
        const chunk = {
            offset: {
                pos: this.pos,
                line: this.input.substring(0, this.pos).split('\n').length - 1,
            },
            error: null,
            text: null,
        };
        this.skipWhitespace();
        if (this.pos >= this.input.length)
            return;
        try {
            const d = this.directive();
            switch (d) {
                case '@string':
                    this.match('{');
                    this.string();
                    this.match('}');
                    chunk.stringDeclaration = true;
                    break;
                case '@preamble':
                    this.match('{');
                    this.preamble();
                    this.match('}');
                    chunk.preamble = true;
                    break;
                case '@comment':
                    this.comment();
                    chunk.comment = true;
                    break;
                default:
                    this.match('{');
                    this.entry(d);
                    this.match('}');
                    chunk.entry = true;
                    this.entries++;
                    break;
            }
        }
        catch (err) {
            if (err.name !== 'ParseError')
                throw err;
            chunk.error = err.message,
                // skip ahead to the next @ and try again
                this.pos = chunk.offset.pos + 1;
            while (this.pos < this.input.length && this.input[this.pos] !== '@')
                this.pos++;
        }
        const text = this.input.substring(chunk.offset.pos, this.pos);
        const last = this.chunks.length - 1;
        if (chunk.error && this.chunks.length && this.chunks[last].error) {
            this.chunks[last].text += text;
        }
        else {
            chunk.text = text;
            this.chunks.push(chunk);
        }
    }
}
/**
 * Reads the bibtex input and splits it into separate chunks of `@string`s, `@comment`s, and bibtex entries. Useful for detecting if a file is bibtex file and for filtering out basic errors that would
 * make the more sophisticated [[bibtex.parse]] reject the whole file
 *
 * @returns array of chunks, with markers for type and errors (if any) found.
 */
function parse(input, options = {}) {
    return (new BibtexParser).parse(input, options);
}
exports.parse = parse;


/***/ }),

/***/ "../node_modules/@retorquere/bibtex-parser/index.js":
/*!**********************************************************!*\
  !*** ../node_modules/@retorquere/bibtex-parser/index.js ***!
  \**********************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const bibtex = __webpack_require__(/*! astrocite-bibtex/lib/grammar */ "../node_modules/astrocite-bibtex/lib/grammar.js");
const chunker_1 = __webpack_require__(/*! ./chunker */ "../node_modules/@retorquere/bibtex-parser/chunker.js");
const latex2unicode = __webpack_require__(/*! ./latex2unicode */ "../node_modules/@retorquere/bibtex-parser/latex2unicode.js");
class ParserError extends Error {
    constructor(message, node) {
        super(message); // 'Error' breaks prototype chain here
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = this.constructor.name;
        this.node = node;
    }
}
class TeXError extends Error {
    constructor(message, node) {
        super(message); // 'Error' breaks prototype chain here
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = this.constructor.name;
        this.node = node;
    }
}
/*
function pad(s, n) {
  return `${s}${' '.repeat(n)}`.substr(0, n)
}

class Tracer {
  private input: string
  private level: number
  constructor(input) {
    this.input = input
    this.level = 0
  }

  trace(evt) {
    switch (evt.type) {
      case 'rule.enter':
        this.level++
        break

      case 'rule.fail':
      case 'rule.match':
        this.level--
        break

      default:
        throw new Error(JSON.stringify(evt))

    }

    console.log(pad(`${evt.location.start.offset}`, 6), pad(evt.type.split('.')[1], 5), pad(evt.rule, 10), '.'.repeat(this.level), JSON.stringify(this.input.substring(evt.location.start.offset, evt.location.end.offset)))
  }
}
*/
const marker = {
    and: '\u0001',
    comma: '\u0002',
    space: '\u0003',
    literal: '\u0004',
};
const markerRE = {
    and: new RegExp(marker.and, 'g'),
    comma: new RegExp(marker.comma, 'g'),
    space: new RegExp(marker.space, 'g'),
    literal: new RegExp(marker.literal, 'g'),
    literalName: new RegExp(`^${marker.literal}[^${marker.literal}]*${marker.literal}$`),
};
const fields = {
    creator: [
        'author',
        'bookauthor',
        'collaborators',
        'commentator',
        'director',
        'editor',
        'editora',
        'editorb',
        'editors',
        'holder',
        'scriptwriter',
        'translator',
        'translators',
    ],
    title: [
        'title',
        'series',
        'shorttitle',
        'booktitle',
        'type',
        'origtitle',
        'maintitle',
        'eventtitle',
    ],
    unnest: [
        'publisher',
        'location',
    ],
};
class Parser {
    constructor(options = {}) {
        this.unresolvedStrings = {};
        this.caseProtect = typeof options.caseProtect === 'undefined' ? true : options.caseProtect;
        this.sentenceCase = typeof options.sentenceCase === 'undefined' ? true : options.sentenceCase;
        this.markup = {
            enquote: { open: '\u201c', close: '\u201d' },
            sub: { open: '<sub>', close: '</sub>' },
            sup: { open: '<sup>', close: '</sup>' },
            bold: { open: '<b>', close: '</b>' },
            italics: { open: '<i>', close: '</i>' },
            smallCaps: { open: '<span style="font-variant:small-caps;">', close: '</span>' },
            caseProtect: { open: '<span class="nocase">', close: '</span>' },
            roman: { open: '', close: '' },
            fixedWidth: { open: '', close: '' },
        };
        for (const [markup, open_close] of Object.entries(options.markup || {})) {
            if (open_close)
                this.markup[markup] = open_close;
        }
        // tslint:disable-next-line only-arrow-functions
        this.errorHandler = (options.errorHandler || function (msg) { throw new Error(msg); });
        this.errors = [];
        this.comments = [];
        this.entries = [];
        this.strings = {};
        this.default_strings = {
            JAN: [this.text('01')],
            FEB: [this.text('02')],
            MAR: [this.text('03')],
            APR: [this.text('04')],
            MAY: [this.text('05')],
            JUN: [this.text('06')],
            JUL: [this.text('07')],
            AUG: [this.text('08')],
            SEP: [this.text('09')],
            OCT: [this.text('10')],
            NOV: [this.text('11')],
            DEC: [this.text('12')],
            ACMCS: [this.text('ACM Computing Surveys')],
            ACTA: [this.text('Acta Informatica')],
            CACM: [this.text('Communications of the ACM')],
            IBMJRD: [this.text('IBM Journal of Research and Development')],
            IBMSJ: [this.text('IBM Systems Journal')],
            IEEESE: [this.text('IEEE Transactions on Software Engineering')],
            IEEETC: [this.text('IEEE Transactions on Computers')],
            IEEETCAD: [this.text('IEEE Transactions on Computer-Aided Design of Integrated Circuits')],
            IPL: [this.text('Information Processing Letters')],
            JACM: [this.text('Journal of the ACM')],
            JCSS: [this.text('Journal of Computer and System Sciences')],
            SCP: [this.text('Science of Computer Programming')],
            SICOMP: [this.text('SIAM Journal on Computing')],
            TOCS: [this.text('ACM Transactions on Computer Systems')],
            TODS: [this.text('ACM Transactions on Database Systems')],
            TOG: [this.text('ACM Transactions on Graphics')],
            TOMS: [this.text('ACM Transactions on Mathematical Software')],
            TOOIS: [this.text('ACM Transactions on Office Information Systems')],
            TOPLAS: [this.text('ACM Transactions on Programming Languages and Systems')],
            TCS: [this.text('Theoretical Computer Science')],
        };
    }
    parse(input, options = {}) {
        for (const chunk of chunker_1.parse(input)) {
            this.parseChunk(chunk, options);
        }
        return this.parsed();
    }
    async parseAsync(input, options = {}) {
        for (const chunk of await chunker_1.parse(input, { async: true })) {
            this.parseChunk(chunk, options);
        }
        return this.parsed();
    }
    parsed() {
        this.field = null;
        const strings = {};
        for (const [key, value] of Object.entries(this.strings)) {
            this.field = {
                name: '@string',
                creator: false,
                text: '',
                level: 0,
                words: {
                    lowercase: 0,
                    other: 0,
                },
                exemptFromSentenceCase: null,
            };
            this.convert(value);
            strings[key] = this.field.text;
        }
        return {
            errors: this.errors,
            entries: this.entries,
            comments: this.comments,
            strings,
        };
    }
    parseChunk(chunk, options) {
        try {
            const ast = this.cleanup(bibtex.parse(chunk.text, { verbatimProperties: options.verbatimFields }), !this.caseProtect);
            if (ast.kind !== 'File')
                throw new Error(this.show(ast));
            for (const node of ast.children) {
                this.convert(node);
            }
        }
        catch (err) {
            if (!err.location)
                throw err;
            this.errors.push({
                message: err.message,
                line: err.location.start.line + chunk.offset.line,
                column: err.location.start.column,
            });
        }
    }
    show(o) {
        return JSON.stringify(o);
    }
    text(value = '') {
        return { kind: 'Text', value };
    }
    error(err, returnvalue) {
        this.errorHandler(err);
        return returnvalue;
    }
    condense(node, nocased) {
        if (!Array.isArray(node.value)) {
            if (node.value.kind === 'Number')
                return;
            return this.error(new ParserError(`cannot condense a ${node.value.kind}: ${this.show(node)}`, node), undefined);
        }
        const markup = {
            sl: 'italics',
            em: 'italics',
            it: 'italics',
            itshape: 'italics',
            bf: 'bold',
            bfseries: 'bold',
            sc: 'smallCaps',
            scshape: 'smallCaps',
            tt: 'fixedWidth',
            rm: 'roman',
            sf: 'sansSerif',
            verb: 'verbatim',
        };
        node.value = node.value.filter((child, i) => {
            // if (child.kind === 'Text' && !child.value) return false
            const next = node.value[i + 1] || {};
            if (child.kind === 'RegularCommand' && child.value.match(/^text(super|sub)script$/) && !child.arguments.length && next.kind === 'NestedLiteral') {
                child.arguments = [{ kind: 'RequiredArgument', value: next.value }];
                next.kind = 'Text';
                next.value = '';
                return true;
            }
            // \frac can either be "\frac{n}{d}" or "\frac n d" -- shudder
            if (child.kind === 'RegularCommand' && child.value === 'frac' && !child.arguments.length) {
                if (next.kind === 'Text' && next.value.match(/^\s+[a-z0-9]+\s+[a-z0-9]+$/i)) {
                    child.arguments = next.value.trim().split(/\s+/).map(v => ({ kind: 'RequiredArgument', value: [this.text(v)] }));
                    next.value = '';
                    return true;
                }
                // spaces after a bare command are consumed
            }
            else if (child.kind === 'RegularCommand' && !child.arguments.length && next.kind === 'Text' && next.value.match(/^\s+/)) {
                // despite Mozilla's claim that trimStart === trimLeft, and that trimStart should be preferred, trimStart does not seem to exist in FF chrome code.
                next.value = next.value.trimLeft();
            }
            if (child.kind === 'RegularCommand' && markup[child.value] && !child.arguments.length) {
                if (node.markup) {
                    delete node.markup.caseProtect;
                    node.markup[markup[child.value]] = true;
                    if (markup[child.value] === 'smallCaps')
                        node.exemptFromSentenceCase = true;
                }
                return false;
            }
            return true;
        });
        node.value = node.value.map(child => this.cleanup(child, nocased || (node.markup && (node.markup.caseProtect || node.exemptFromSentenceCase))));
        node.value = node.value.reduce((acc, child) => {
            const last = acc.length - 1;
            if (acc.length === 0 || child.kind !== 'Text' || acc[last].kind !== 'Text') {
                acc.push(child);
            }
            else {
                acc[last].value += child.value;
            }
            return acc;
        }, []);
    }
    argument(node, type) {
        if (type === 'none') {
            if (!node.arguments.length)
                return true;
            if (node.arguments.find(arg => arg.kind !== 'RequiredArgument' || arg.value.length))
                return false;
            return true;
        }
        if (typeof type === 'number') {
            if (node.arguments.length !== type || node.arguments.find(arg => arg.value.length !== 1 || arg.value[0].kind !== 'Text'))
                return false;
            return node.arguments.map(arg => arg.value[0].value);
        }
        if (!node.arguments || node.arguments.length !== 1 || node.arguments.find(arg => arg.kind !== 'RequiredArgument'))
            return false;
        switch (type) {
            case 'array':
                return node.arguments[0].value;
            case 'Text':
            case 'RegularCommand':
                return node.arguments[0].value.length === 1 && node.arguments[0].value[0].kind === type ? node.arguments[0].value[0].value : false;
        }
        return false;
    }
    cleanup(node, nocased) {
        if (Array.isArray(node))
            return node.map(child => this.cleanup(child, nocased));
        delete node.loc;
        if (!this['clean_' + node.kind])
            return this.error(new ParserError(`no cleanup method for '${node.kind}' (${this.show(node)})`, node), this.text());
        return this['clean_' + node.kind](node, nocased);
    }
    clean_BracedComment(node, nocased) { return node; }
    clean_LineComment(node, nocased) { return node; }
    clean_File(node, nocased) {
        node.children = node.children.filter(child => child.kind !== 'NonEntryText').map(child => this.cleanup(child, nocased));
        return node;
    }
    clean_StringExpression(node, nocased) {
        this.condense(node, nocased);
        this.strings[node.key.toUpperCase()] = node.value;
        return node;
    }
    clean_String(node, nocased) {
        const reference = node.value.toUpperCase();
        const _string = this.strings[reference] || this.default_strings[reference];
        if (!_string) {
            if (!this.unresolvedStrings[reference])
                this.errors.push({ message: `Unresolved @string reference ${JSON.stringify(node.value)}` });
            this.unresolvedStrings[reference] = true;
        }
        // if the string isn't found, add it as-is but exempt it from sentence casing
        return {
            kind: 'String',
            exemptFromSentenceCase: !_string,
            value: this.cleanup(_string ? JSON.parse(JSON.stringify(_string)) : [this.text(node.value)], nocased),
        };
    }
    clean_Entry(node, nocased) {
        node.properties = node.properties.map(child => this.cleanup(child, nocased));
        return node;
    }
    clean_Property(node, nocased) {
        const key = node.key.toLowerCase();
        // because this was abused so much, many processors ignore second-level too
        if (fields.title.concat(fields.unnest).includes(key) && node.value.length === 1 && node.value[0].kind === 'NestedLiteral') {
            node.value[0].markup = {};
            node.value[0].exemptFromSentenceCase = true;
        }
        this.condense(node, ['url', 'doi', 'file', 'files', 'eprint', 'verba', 'verbb', 'verbc'].includes(key) || !this.caseProtect);
        return node;
    }
    clean_Text(node, nocased) { return node; }
    clean_MathMode(node, nocased) { return node; }
    clean_RegularCommand(node, nocased) {
        let arg, unicode;
        switch (node.value) {
            case 't':
                if ((arg = this.argument(node, 'Text')) && (unicode = latex2unicode[`\\t{${arg}}`])) {
                    return this.text(unicode);
                }
                break;
            case 'vphantom':
                return this.text();
            case 'frac':
                // not a spectactular solution but what ya gonna do.
                if (arg = this.argument(node, 2)) {
                    return this.cleanup({
                        kind: 'NestedLiteral',
                        exemptFromSentenceCase: true,
                        markup: {},
                        value: [this.text(`${arg[0]}/${arg[1]}`)],
                    }, nocased);
                }
                break;
            case 'path':
            case 'aftergroup':
            case 'ignorespaces':
            case 'noopsort':
                return this.text();
            case 'chsf':
                if (this.argument(node, 'none'))
                    return this.text();
                if (arg = this.argument(node, 'array')) {
                    return this.cleanup({
                        kind: 'NestedLiteral',
                        markup: {},
                        value: arg,
                    }, nocased);
                }
                return node;
            case 'bibstring':
                if (arg = this.argument(node, 'Text'))
                    return this.text(arg);
                break;
            case 'cite':
                if (arg = this.argument(node, 1)) {
                    return this.cleanup({
                        kind: 'NestedLiteral',
                        exemptFromSentenceCase: true,
                        markup: {},
                        value: [this.text(arg[0])],
                    }, nocased);
                }
                break;
            case 'textsuperscript':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: { sup: true },
                    value: arg,
                }, nocased);
            case 'textsubscript':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: { sub: true },
                    value: arg,
                }, nocased);
            case 'textsc':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    exemptFromSentenceCase: true,
                    markup: { smallCaps: true },
                    value: arg,
                }, nocased);
            case 'enquote':
            case 'mkbibquote':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: { enquote: true },
                    value: arg,
                }, nocased);
            case 'textbf':
            case 'mkbibbold':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: { bold: true },
                    value: arg,
                }, nocased);
            case 'mkbibitalic':
            case 'mkbibemph':
            case 'textit':
            case 'emph':
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: { italics: true },
                    value: arg,
                }, nocased);
            case 'bibcyr':
                if (this.argument(node, 'none'))
                    return this.text();
                if (!(arg = this.argument(node, 'array')))
                    return this.error(new TeXError(node.value + this.show(node), node), this.text());
                return this.cleanup({
                    kind: 'NestedLiteral',
                    markup: {},
                    value: arg,
                }, nocased);
            case 'mathrm':
            case 'textrm':
            case 'ocirc':
            case 'mbox':
                if (arg = this.argument(node, 'Text')) {
                    unicode = latex2unicode[`\\${node.value}{${arg}}`];
                    return this.text(unicode || arg);
                }
                else if (!node.arguments.length) {
                    return this.text();
                }
                else if (arg = this.argument(node, 'array')) {
                    return this.cleanup({
                        kind: 'NestedLiteral',
                        markup: {},
                        value: arg,
                    }, nocased);
                }
                break;
            case 'href':
                if (arg = this.argument(node, 2)) {
                    return this.text(arg[0]);
                }
                break;
            case 'url':
                if (arg = this.argument(node, 'Text'))
                    return this.text(arg);
                if (arg = this.argument(node, 'array')) {
                    return this.cleanup({
                        kind: 'NestedLiteral',
                        markup: {},
                        value: arg,
                    }, nocased);
                }
                break;
            default:
                unicode = latex2unicode[`\\${node.value}`] || latex2unicode[`\\${node.value}{}`];
                if (unicode && this.argument(node, 'none')) {
                    return this.text(unicode);
                }
                if (arg = this.argument(node, 'Text')) {
                    if (unicode = latex2unicode[`\\${node.value}{${arg}}`]) {
                        return this.text(unicode);
                    }
                }
        }
        return this.error(new TeXError('Unhandled command: ' + this.show(node), node), this.text());
    }
    _clean_ScriptCommand(node, nocased, mode) {
        let value, singlechar;
        const cmd = mode === 'sup' ? '^' : '_';
        if (typeof node.value === 'string' && (singlechar = latex2unicode[`${cmd}${node.value}`] || latex2unicode[`${cmd}{${node.value}}`])) {
            return this.text(singlechar);
        }
        if (typeof node.value === 'string') {
            value = [this.text(node.value)];
        }
        else if (!Array.isArray(node.value)) {
            value = [node.value];
        }
        else {
            value = node.value;
        }
        return this.cleanup({
            kind: 'NestedLiteral',
            markup: { [mode]: true },
            value,
        }, nocased);
    }
    clean_SubscriptCommand(node, nocased) {
        return this._clean_ScriptCommand(node, nocased, 'sub');
    }
    clean_SuperscriptCommand(node, nocased) {
        return this._clean_ScriptCommand(node, nocased, 'sup');
    }
    clean_NestedLiteral(node, nocased) {
        if (!node.markup)
            node.markup = nocased ? {} : { caseProtect: true };
        // https://github.com/retorquere/zotero-better-bibtex/issues/541#issuecomment-240156274
        if (node.value.length && ['RegularCommand', 'DicraticalCommand'].includes(node.value[0].kind)) {
            delete node.markup.caseProtect;
        }
        else if (node.value.length && node.value[0].kind === 'Text') {
            if (!node.value[0].value.split(/\s+/).find(word => !this.implicitlyNoCased(word))) {
                delete node.markup.caseProtect;
                node.exemptFromSentenceCase = true;
            }
        }
        this.condense(node, nocased);
        return node;
    }
    clean_DicraticalCommand(node, nocased) {
        const char = node.dotless ? `\\${node.character}` : node.character;
        const unicode = latex2unicode[`\\${node.mark}{${char}}`]
            || latex2unicode[`\\${node.mark}${char}`]
            || latex2unicode[`{\\${node.mark} ${char}}`]
            || latex2unicode[`{\\${node.mark}${char}}`]
            || latex2unicode[`\\${node.mark} ${char}`];
        if (!unicode)
            return this.error(new TeXError(`Unhandled {\\${node.mark} ${char}}`, node), this.text());
        return this.text(unicode);
    }
    clean_SymbolCommand(node, nocased) {
        return this.text(latex2unicode[`\\${node.value}`] || node.value);
    }
    clean_PreambleExpression(node, nocased) { return node; }
    implicitlyNoCased(word) {
        // word = word.replace(new RegExp(`"[${this.markup.enquote.open}${this.markup.enquote.close}:()]`, 'g'), '')
        word = word.replace(/[:()]/g, '');
        if (word.match(/^[A-Z][^A-Z]+$/))
            return false;
        if (word.length > 1 && word.match(/^[A-Z][a-z]*(-[A-Za-z]+)*$/))
            return false;
        if (word.match(/[A-Z]/))
            return true;
        if (word.match(/^[0-9]+$/))
            return true;
        return false;
    }
    convert(node) {
        if (Array.isArray(node))
            return node.map(child => this.convert(child)).join('');
        if (!this['convert_' + node.kind])
            return this.error(new ParserError(`no converter for ${node.kind}: ${this.show(node)}`, node), undefined);
        const start = this.field ? this.field.text.length : null;
        this['convert_' + node.kind](node);
        const exemptFromSentenceCase = (typeof start === 'number'
            && this.field.exemptFromSentenceCase
            && (node.exemptFromSentenceCase
                ||
                    (node.markup && node.markup.caseProtect)));
        if (exemptFromSentenceCase)
            this.field.exemptFromSentenceCase.push({ start, end: this.field.text.length });
    }
    convert_BracedComment(node) {
        this.comments.push(node.value);
    }
    convert_LineComment(node) {
        this.comments.push(node.value);
    }
    splitOnce(s, sep, fromEnd = false) {
        const split = fromEnd ? s.lastIndexOf(sep) : s.indexOf(sep);
        return (split < 0) ? [s, ''] : [s.substr(0, split), s.substr(split + 1)];
    }
    parseName(name) {
        let parsed = null;
        const parts = name.split(marker.comma);
        if (parts.length && !parts.find(p => !p.match(/^[a-z]+=/i))) { // extended name format
            parsed = {};
            for (const part of parts) {
                const [attr, value] = this.splitOnce(part.replace(markerRE.space, ''), '=').map(v => v.trim());
                switch (attr.toLowerCase()) {
                    case 'family':
                        parsed.lastName = value;
                        break;
                    case 'given':
                        parsed.firstName = value;
                        break;
                    case 'prefix':
                        parsed.prefix = value;
                        break;
                    case 'suffix':
                        parsed.suffix = value;
                        break;
                    case 'useprefix':
                        parsed.useprefix = value.toLowerCase() === 'true';
                        break;
                }
            }
        }
        const prefix = /(.+?)\s+(vere|von|van den|van der|van|de|del|della|der|di|da|pietro|vanden|du|st.|st|la|lo|ter|bin|ibn|te|ten|op|ben|al)\s+(.+)/;
        let m;
        switch (parsed ? -1 : parts.length) {
            case -1:
                // already parsed
                break;
            case 0: // should never happen
                throw new Error(name);
            case 1: // name without commas
                // literal
                if (markerRE.literalName.test(parts[0])) {
                    parsed = { literal: parts[0] };
                }
                else if (m = parts[0].replace(markerRE.space, ' ').match(prefix)) { // split on prefix
                    parsed = {
                        firstName: m[1],
                        prefix: m[2],
                        lastName: m[3],
                    };
                }
                else {
                    // top-level "firstname lastname"
                    const [firstName, lastName] = this.splitOnce(parts[0], marker.space, true);
                    if (lastName) {
                        parsed = { firstName, lastName };
                    }
                    else {
                        parsed = { lastName: firstName };
                    }
                }
                break;
            case 2: // lastname, firstname
                parsed = {
                    lastName: parts[0],
                    firstName: parts[1],
                };
                break;
            default: // lastname, suffix, firstname
                parsed = {
                    lastName: parts[0],
                    suffix: parts[1],
                    firstName: parts.slice(2).join(marker.comma),
                };
        }
        for (let [k, v] of Object.entries(parsed)) {
            if (typeof v !== 'string')
                continue;
            // why do people have '{Lastname}, Firstname'?
            if (markerRE.literalName.test(v))
                v = v.replace(markerRE.literal, '"').slice(1, -1);
            parsed[k] = v.replace(markerRE.space, ' ').replace(markerRE.comma, ', ').replace(markerRE.literal, '"').trim();
        }
        return parsed;
    }
    convert_Entry(node) {
        this.entry = {
            key: node.id,
            type: node.type,
            fields: {},
            creators: {},
        };
        this.entries.push(this.entry);
        for (const prop of node.properties) {
            if (prop.kind !== 'Property')
                return this.error(new ParserError(`Expected Property, got ${prop.kind}`, node), undefined);
            const name = prop.key.toLowerCase();
            this.field = {
                name,
                creator: fields.creator.includes(prop.key.toLowerCase()),
                text: '',
                level: 0,
                words: {
                    lowercase: 0,
                    other: 0,
                },
                exemptFromSentenceCase: this.sentenceCase && fields.title.includes(name) ? [] : null,
            };
            this.entry.fields[this.field.name] = this.entry.fields[this.field.name] || [];
            this.convert(prop.value);
            this.field.text = this.field.text.trim();
            if (!this.field.text)
                continue;
            // "groups" is a jabref 3.8+ monstrosity
            if (this.field.name.match(/^(keywords?|groups)$/)) {
                for (let text of this.field.text.split(marker.comma)) {
                    text = text.trim();
                    if (text)
                        this.entry.fields[this.field.name].push(text);
                }
            }
            else if (this.field.creator) {
                if (!this.entry.creators[this.field.name])
                    this.entry.creators[this.field.name] = [];
                // {M. Halle, J. Bresnan, and G. Miller}
                if (this.field.text.includes(`${marker.comma}${marker.and}`)) { //
                    this.field.text = this.field.text.replace(new RegExp(`${marker.comma}${marker.and}`, 'g'), marker.and).replace(new RegExp(marker.comma), marker.and);
                }
                for (const creator of this.field.text.split(marker.and)) {
                    this.entry.fields[this.field.name].push(creator.replace(markerRE.comma, ', ').replace(markerRE.space, ' ').replace(markerRE.literal, '"'));
                    this.entry.creators[this.field.name].push(this.parseName(creator));
                }
            }
            else {
                if (this.field.words.lowercase > this.field.words.other)
                    this.field.exemptFromSentenceCase = null;
                this.entry.fields[this.field.name].push(this.convertToSentenceCase(this.field.text, this.field.exemptFromSentenceCase));
            }
        }
        this.field = null;
    }
    convertToSentenceCase(text, exemptions) {
        if (!exemptions)
            return text;
        let sentenceCased = text.toLowerCase().replace(/(([\?!]\s*|^)([\'\"¡¿“‘„«\s]+)?[^\s])/g, x => x.toUpperCase());
        for (const { start, end } of exemptions) {
            sentenceCased = sentenceCased.substring(0, start) + text.substring(start, end) + sentenceCased.substring(end);
        }
        return sentenceCased;
    }
    convert_Number(node) {
        this.field.text += `${node.value}`;
    }
    convert_Text(node) {
        node.value = node.value.replace(/``/g, this.markup.enquote.open).replace(/''/g, this.markup.enquote.close);
        // heuristic to detect pre-sentencecased text
        for (const word of node.value.split(/\b/)) {
            if (word.match(/^[a-z0-9]+$/)) {
                this.field.words.lowercase++;
            }
            else if (word.match(/[a-z]/i)) {
                this.field.words.other++;
            }
        }
        if (this.field.level === 0 && this.field.creator) {
            this.field.text += node.value.replace(/\s+and\s+/ig, marker.and).replace(/\s*,\s*/g, marker.comma).replace(/\s+/g, marker.space);
            return;
        }
        if (this.field.level === 0 && this.field.name.match(/^(keywords?|groups)$/)) {
            this.field.text += node.value.replace(/\s*[;,]\s*/g, marker.comma);
            return;
        }
        if (this.field.exemptFromSentenceCase) {
            for (const word of node.value.split(/(\s+)/)) {
                if (this.implicitlyNoCased(word))
                    this.field.exemptFromSentenceCase.push({ start: this.field.text.length, end: this.field.text.length + word.length });
                this.field.text += word;
            }
            return;
        }
        this.field.text += node.value;
    }
    convert_MathMode(node) { return; }
    convert_PreambleExpression(node) { return; }
    convert_StringExpression(node) { return; }
    convert_String(node) {
        this.convert(node.value);
    }
    convert_NestedLiteral(node) {
        const prefix = [];
        const postfix = [];
        // relies on objects remembering insertion order
        for (const markup of Object.keys(node.markup)) {
            if (markup === 'caseProtect' && this.field.creator) {
                prefix.push(marker.literal);
                postfix.unshift(marker.literal);
                continue;
            }
            if (!this.markup[markup])
                return this.error(new ParserError(`markup: ${markup}`, node), undefined);
            prefix.push(this.markup[markup].open);
            postfix.unshift(this.markup[markup].close);
        }
        const end = {
            withoutPrefix: this.field.text.length,
            withPrefix: 0,
        };
        this.field.text += prefix.join('');
        end.withPrefix = this.field.text.length;
        this.field.level++;
        this.convert(node.value);
        this.field.level--;
        if (this.field.text.length === end.withPrefix) { // nothing was added, so remove prefix
            this.field.text = this.field.text.substring(0, end.withoutPrefix);
        }
        else {
            this.field.text += postfix.reverse().join('');
        }
        this.field.text = this.field.text.replace(/<(sup|sub)>([^<>]+)<\/\1>$/i, (m, mode, chars) => {
            const cmd = mode === 'sup' ? '^' : '_';
            let script = '';
            for (const char of chars) {
                const unicode = latex2unicode[`${cmd}${char}`] || latex2unicode[`${cmd}{${char}}`];
                script += unicode ? unicode : `<${mode}>${char}</${mode}>`;
            }
            script = script.replace(new RegExp(`</${mode}><${mode}>`, 'g'), '');
            return script.length < m.length ? script : m;
        });
    }
}
/**
 * parse bibtex. This will try to convert TeX commands into unicode equivalents, and apply `@string` expansion
 */
function parse(input, options = {}) {
    const parser = new Parser({
        caseProtect: options.caseProtect,
        sentenceCase: options.sentenceCase,
        markup: options.markup,
        errorHandler: options.errorHandler,
    });
    return options.async ? parser.parseAsync(input, { verbatimFields: options.verbatimFields }) : parser.parse(input, { verbatimFields: options.verbatimFields });
}
exports.parse = parse;
var chunker_2 = __webpack_require__(/*! ./chunker */ "../node_modules/@retorquere/bibtex-parser/chunker.js");
exports.chunker = chunker_2.parse;
var jabref_1 = __webpack_require__(/*! ./jabref */ "../node_modules/@retorquere/bibtex-parser/jabref.js");
exports.jabref = jabref_1.parse;


/***/ }),

/***/ "../node_modules/@retorquere/bibtex-parser/jabref.js":
/*!***********************************************************!*\
  !*** ../node_modules/@retorquere/bibtex-parser/jabref.js ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function decode(s, sep = ';') {
    s = s.replace(/\n/g, '');
    let pos = 0;
    const records = [''];
    while (pos < s.length) {
        switch (s[pos]) {
            case '\\':
                pos++;
                records[0] += s[pos];
                break;
            case sep:
                records.unshift('');
                break;
            default:
                records[0] += s[pos];
        }
        pos++;
    }
    return records.reverse().filter(record => record);
}
const prefixes = {
    fileDirectory: 'jabref-meta: fileDirectory:',
    groupsversion: 'jabref-meta: groupsversion:',
    groupstree: 'jabref-meta: groupstree:',
};
/**
 * Import the JabRef groups from the `@string` comments in which they were stored. You would typically pass the comments parsed by [[bibtex.parse]] in here.
 *
 * JabRef knows several group types, and this parser parses most, but not all of them:
 *
 * * independent group: the keys listed in the group are the entries that are considered to belong to it
 * * intersection: the keys listed in the group are considered to belong to the group if they're also in the parent group
 * * union: the keys listed in the group are considered to belong to the group, and also the keys that are in the parent group
 * * query: not supported by this parser
 */
function parse(comments) {
    const result = {
        root: [],
        groups: {},
        fileDirectory: '',
        version: '',
    };
    const levels = [];
    const decoded = {
        fileDirectory: null,
        groupsversion: null,
        groupstree: null,
    };
    for (const comment of comments) {
        for (const [meta, prefix] of Object.entries(prefixes)) {
            if (comment.startsWith(prefix)) {
                decoded[meta] = decode(comment.substring(prefix.length));
            }
        }
    }
    result.version = decoded.groupsversion && decoded.groupsversion[0];
    result.fileDirectory = decoded.fileDirectory && decoded.fileDirectory[0];
    if (!decoded.groupstree)
        return result;
    for (const encoded of decoded.groupstree) {
        const fields = decode(encoded);
        const level_type_name = decode(fields.shift(), ':');
        const m = /^([0-9]+) (.+)/.exec(level_type_name[0]);
        if (!m)
            break;
        const level = parseInt(m[1]);
        // const type = m[2]
        if (level === 0)
            continue; // root
        const name = level_type_name[1];
        const intersection = decode(fields.shift())[0];
        const keys = fields.map(field => decode(field)[0]);
        const group = {
            name,
            entries: keys,
            groups: [],
        };
        result.groups[name] = result.groups[name] || group;
        if (levels.length < level) {
            levels.push(group);
        }
        else {
            levels[level - 1] = group;
        }
        if (level === 1) {
            result.root.push(group);
        }
        else {
            const parent = levels[level - 2];
            switch (intersection) {
                case '0': // independent
                    break;
                case '1': // intersect
                    group.entries = group.entries.filter(key => parent.entries.includes(key));
                    break;
                case '2': // union
                    group.entries = group.entries.concat(parent.entries.filter(key => !group.entries.includes(key)));
                    break;
            }
            levels[level - 2].groups.push(group);
        }
    }
    return result;
}
exports.parse = parse;


/***/ }),

/***/ "../node_modules/@retorquere/bibtex-parser/latex2unicode.js":
/*!******************************************************************!*\
  !*** ../node_modules/@retorquere/bibtex-parser/latex2unicode.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = {
  '\\_': '_',
  '\\lbrace': '{',
  '\\{': '{',
  '\\rbrace': '}',
  '\\}': '}',
  '\\&': '&',
  '\\#': '#',
  '\\%': '%',
  '\\sphat': '^',
  '\\^': '\u0302',
  '\\sptilde': '~',
  '\\textasciitilde': '~',
  '\\$': '$',
  '\\backslash': '\\',
  '\\textbackslash': '\\',
  '\\textexclamdown': '\xA1',
  '\\cent': '\xA2',
  '\\textcent': '\xA2',
  '\\pounds': '\xA3',
  '\\textsterling': '\xA3',
  '\\textcurrency': '\xA4',
  '\\yen': '\xA5',
  '\\textyen': '\xA5',
  '\\textbrokenbar': '\xA6',
  '\\textsection': '\xA7',
  '\\spddot': '\xA8',
  '\\textasciidieresis': '\xA8',
  '\\textcopyright': '\xA9',
  '\\textordfeminine': '\xAA',
  '\\guillemotleft': '\xAB',
  '\\lnot': '\xAC',
  '\\-': '\xAD',
  '\\circledR': '\xAE',
  '\\textregistered': '\xAE',
  '\\textasciimacron': '\xAF',
  '^\\circ': '\xB0',
  '\\textdegree': '\xB0',
  '\\pm': '\xB1',
  '^{2}': '\xB2',
  '^{3}': '\xB3',
  '\\textasciiacute': '\xB4',
  '\\mathrm{\\mu}': '\xB5',
  '\\textparagraph': '\xB6',
  '\\cdot': '\u22C5',
  '\\c': '\u0327',
  '^{1}': '\xB9',
  '\\textordmasculine': '\xBA',
  '\\guillemotright': '\xBB',
  '\\textonequarter': '\xBC',
  '\\textonehalf': '\xBD',
  '\\textthreequarters': '\xBE',
  '\\textquestiondown': '\xBF',
  '\\`A': '\xC0',
  '\\\'A': '\u0386',
  '\\^A': '\xC2',
  '\\~A': '\xC3',
  '\\"A': '\xC4',
  '\\r{A}': '\xC5',
  '{\\r A}': '\xC5',
  '\\AA': '\u212B',
  '\\AE': '\xC6',
  '{\\c C}': '\xC7',
  '\\`E': '\xC8',
  '\\\'E': '\u0388',
  '\\^E': '\xCA',
  '\\"E': '\xCB',
  '\\`I': '\xCC',
  '\\\'I': '\xCD',
  '\\^I': '\xCE',
  '\\"I': '\xCF',
  '\\DH': '\xD0',
  '\\~N': '\xD1',
  '\\`O': '\xD2',
  '\\\'O': '\xD3',
  '\\^O': '\xD4',
  '\\~O': '\xD5',
  '\\"O': '\xD6',
  '\\times': '\xD7',
  '\\texttimes': '\xD7',
  '\\O': '\xD8',
  '\\`U': '\xD9',
  '\\\'U': '\xDA',
  '\\^U': '\xDB',
  '\\"U': '\xDC',
  '\\\'Y': '\xDD',
  '\\TH': '\xDE',
  '\\ss': '\xDF',
  '\\`a': '\xE0',
  '\\\'a': '\xE1',
  '\\^a': '\xE2',
  '\\~a': '\xE3',
  '\\"a': '\xE4',
  '\\r{a}': '\xE5',
  '{\\r a}': '\xE5',
  '\\aa': '\xE5',
  '\\ae': '\xE6',
  '{\\c c}': '\xE7',
  '\\`e': '\xE8',
  '\\\'e': '\xE9',
  '\\^e': '\xEA',
  '\\"e': '\xEB',
  '\\`i': '\xEC',
  '\\\'i': '\xED',
  '\\^i': '\xEE',
  '\\"i': '\xEF',
  '\\eth': '\u01AA',
  '\\dh': '\xF0',
  '\\~n': '\xF1',
  '\\`o': '\xF2',
  '\\\'o': '\u03CC',
  '\\^o': '\xF4',
  '\\~o': '\xF5',
  '\\"o': '\xF6',
  '\\div': '\xF7',
  '\\o': '\xF8',
  '\\`u': '\xF9',
  '\\\'u': '\xFA',
  '\\^u': '\xFB',
  '\\"u': '\xFC',
  '\\\'y': '\xFD',
  '\\th': '\xFE',
  '\\"y': '\xFF',
  '\\=A': '\u0100',
  '\\=a': '\u0101',
  '{\\u A}': '\u0102',
  '{\\u a}': '\u0103',
  '\\k{A}': '\u0104',
  '\\k{a}': '\u0105',
  '\\\'C': '\u0106',
  '\\\'c': '\u0107',
  '\\^C': '\u0108',
  '\\^c': '\u0109',
  '\\.C': '\u010A',
  '\\.c': '\u010B',
  '{\\v C}': '\u010C',
  '{\\v c}': '\u010D',
  '{\\v D}': '\u010E',
  '{\\v d}': '\u010F',
  '\\DJ': '\u0110',
  '\\dj': '\u0111',
  '\\=E': '\u0112',
  '\\=e': '\u0113',
  '{\\u E}': '\u0114',
  '{\\u e}': '\u0115',
  '\\.E': '\u0116',
  '\\.e': '\u0117',
  '\\k{E}': '\u0118',
  '\\k{e}': '\u0119',
  '{\\v E}': '\u011A',
  '{\\v e}': '\u011B',
  '\\^G': '\u011C',
  '\\^g': '\u011D',
  '{\\u G}': '\u011E',
  '{\\u g}': '\u011F',
  '\\.G': '\u0120',
  '\\.g': '\u0121',
  '{\\c G}': '\u0122',
  '{\\c g}': '\u0123',
  '\\^H': '\u0124',
  '\\^h': '\u0125',
  '{\\fontencoding{LELA}\\selectfont\\char40}': '\u0126',
  '\\Elzxh': '\u0127',
  '\\~I': '\u0128',
  '\\~i': '\u0129',
  '\\=I': '\u012A',
  '\\=i': '\u012B',
  '{\\u I}': '\u012C',
  '{\\u \\i}': '\u012D',
  '\\k{I}': '\u012E',
  '\\k{i}': '\u012F',
  '\\.I': '\u0130',
  '\\imath': '\uD835\uDEA4',
  '\\i': '\u0131',
  '\\^J': '\u0134',
  '\\^\\j': '\u0135',
  '{\\c K}': '\u0136',
  '{\\c k}': '\u0137',
  '{\\fontencoding{LELA}\\selectfont\\char91}': '\u0138',
  '\\\'L': '\u0139',
  '\\\'l': '\u013A',
  '{\\c L}': '\u013B',
  '{\\c l}': '\u013C',
  '{\\v L}': '\u013D',
  '{\\v l}': '\u013E',
  '{\\fontencoding{LELA}\\selectfont\\char201}': '\u013F',
  '{\\fontencoding{LELA}\\selectfont\\char202}': '\u0140',
  '\\L': '\u0141',
  '\\l': '\u0142',
  '\\\'N': '\u0143',
  '\\\'n': '\u0144',
  '{\\c N}': '\u0145',
  '{\\c n}': '\u0146',
  '{\\v N}': '\u0147',
  '{\\v n}': '\u0148',
  '\\NG': '\u014A',
  '\\ng': '\u014B',
  '\\=O': '\u014C',
  '\\=o': '\u014D',
  '{\\u O}': '\u014E',
  '{\\u o}': '\u014F',
  '{\\H O}': '\u0150',
  '{\\H o}': '\u0151',
  '\\OE': '\u0152',
  '\\oe': '\u0153',
  '\\\'R': '\u0154',
  '\\\'r': '\u0155',
  '{\\c R}': '\u0156',
  '{\\c r}': '\u0157',
  '{\\v R}': '\u0158',
  '{\\v r}': '\u0159',
  '\\\'S': '\u015A',
  '\\\'s': '\u015B',
  '\\^S': '\u015C',
  '\\^s': '\u015D',
  '{\\c S}': '\u015E',
  '{\\c s}': '\u015F',
  '{\\v S}': '\u0160',
  '{\\v s}': '\u0161',
  '{\\c T}': '\u0162',
  '{\\c t}': '\u0163',
  '{\\v T}': '\u0164',
  '{\\v t}': '\u0165',
  '{\\fontencoding{LELA}\\selectfont\\char47}': '\u0166',
  '{\\fontencoding{LELA}\\selectfont\\char63}': '\u0167',
  '\\~U': '\u0168',
  '\\~u': '\u0169',
  '\\=U': '\u016A',
  '\\=u': '\u016B',
  '{\\u U}': '\u016C',
  '{\\u u}': '\u016D',
  '\\r{U}': '\u016E',
  '{\\r U}': '\u016E',
  '\\r{u}': '\u016F',
  '{\\r u}': '\u016F',
  '{\\H U}': '\u0170',
  '{\\H u}': '\u0171',
  '\\k{U}': '\u0172',
  '\\k{u}': '\u0173',
  '\\^W': '\u0174',
  '\\^w': '\u0175',
  '\\^Y': '\u0176',
  '\\^y': '\u0177',
  '\\"Y': '\u0178',
  '\\\'Z': '\u0179',
  '\\\'z': '\u017A',
  '\\.Z': '\u017B',
  '\\.z': '\u017C',
  '{\\v Z}': '\u017D',
  '{\\v z}': '\u017E',
  '\\texthvlig': '\u0195',
  '\\textnrleg': '\u019E',
  '\\Zbar': '\u01B5',
  '{\\fontencoding{LELA}\\selectfont\\char195}': '\u01BA',
  '\\textdoublepipe': '\u01C2',
  '{\\v A}': '\u01CD',
  '{\\v a}': '\u01CE',
  '{\\v I}': '\u01CF',
  '{\\v i}': '\u01D0',
  '{\\v O}': '\u01D1',
  '{\\v o}': '\u01D2',
  '{\\v U}': '\u01D3',
  '{\\v u}': '\u01D4',
  '{\\v G}': '\u01E6',
  '{\\v g}': '\u01E7',
  '{\\v K}': '\u01E8',
  '{\\v k}': '\u01E9',
  '{\\k O}': '\u01EA',
  '{\\k o}': '\u01EB',
  '{\\v j}': '\u01F0',
  '\\\'G': '\u01F4',
  '\\\'g': '\u01F5',
  '\\jmath': '\uD835\uDEA5',
  '\\Elztrna': '\u0250',
  '\\Elztrnsa': '\u0252',
  '\\Elzopeno': '\u0254',
  '\\Elzrtld': '\u0256',
  '{\\fontencoding{LEIP}\\selectfont\\char61}': '\u0258',
  '\\Elzschwa': '\u0259',
  '\\varepsilon': '\u025B',
  '\\Elzpgamma': '\u0263',
  '\\Elzpbgam': '\u0264',
  '\\Elztrnh': '\u0265',
  '\\Elzbtdl': '\u026C',
  '\\Elzrtll': '\u026D',
  '\\Elztrnm': '\u026F',
  '\\Elztrnmlr': '\u0270',
  '\\Elzltlmr': '\u0271',
  '\\Elzltln': '\u0272',
  '\\Elzrtln': '\u0273',
  '\\Elzclomeg': '\u0277',
  '\\textphi': '\u0278',
  '\\Elztrnr': '\u0279',
  '\\Elztrnrl': '\u027A',
  '\\Elzrttrnr': '\u027B',
  '\\Elzrl': '\u027C',
  '\\Elzrtlr': '\u027D',
  '\\Elzfhr': '\u027E',
  '{\\fontencoding{LEIP}\\selectfont\\char202}': '\u027F',
  '\\Elzrtls': '\u0282',
  '\\Elzesh': '\u0283',
  '\\Elztrnt': '\u0287',
  '\\Elzrtlt': '\u0288',
  '\\Elzpupsil': '\u028A',
  '\\Elzpscrv': '\u028B',
  '\\Elzinvv': '\u028C',
  '\\Elzinvw': '\u028D',
  '\\Elztrny': '\u028E',
  '\\Elzrtlz': '\u0290',
  '\\Elzyogh': '\u0292',
  '\\Elzglst': '\u0294',
  '\\Elzreglst': '\u0295',
  '\\Elzinglst': '\u0296',
  '\\textturnk': '\u029E',
  '\\Elzdyogh': '\u02A4',
  '\\Elztesh': '\u02A7',
  '\\textasciicircum': '\u02C6',
  '\\textasciicaron': '\u02C7',
  '\\Elzverts': '\u02C8',
  '\\Elzverti': '\u02CC',
  '\\Elzlmrk': '\u02D0',
  '\\Elzhlmrk': '\u02D1',
  '\\Elzsbrhr': '\u02D2',
  '\\Elzsblhr': '\u02D3',
  '\\Elzrais': '\u02D4',
  '\\Elzlow': '\u02D5',
  '\\textasciibreve': '\u02D8',
  '\\textperiodcentered': '\u02D9',
  '\\r': '\u030A',
  '\\k': '\u0328',
  '\\texttildelow': '\u02DC',
  '\\H': '\u030B',
  '\\tone{55}': '\u02E5',
  '\\tone{44}': '\u02E6',
  '\\tone{33}': '\u02E7',
  '\\tone{22}': '\u02E8',
  '\\tone{11}': '\u02E9',
  '\\grave': '\u0300',
  '\\`': '\u0300',
  '\\acute': '\u0301',
  '\\\'': '\u0301',
  '\\hat': '\u0302',
  '\\tilde': '\u0303',
  '\\~': '\u0303',
  '\\bar': '\u0304',
  '\\=': '\u0304',
  '\\overline': '\u0305',
  '\\breve': '\u0306',
  '\\u': '\u0306',
  '\\dot': '\u0307',
  '\\.': '\u0307',
  '\\ddot': '\u0308',
  '\\"': '\u0308',
  '\\ovhook': '\u0309',
  '\\mathring': '\u030A',
  '\\check': '\u030C',
  '\\v': '\u030C',
  '\\cyrchar\\C': '\u030F',
  '\\candra': '\u0310',
  '{\\fontencoding{LECO}\\selectfont\\char177}': '\u0311',
  '\\oturnedcomma': '\u0312',
  '\\ocommatopright': '\u0315',
  '{\\fontencoding{LECO}\\selectfont\\char184}': '\u0318',
  '{\\fontencoding{LECO}\\selectfont\\char185}': '\u0319',
  '\\droang': '\u031A',
  '\\Elzpalh': '\u0321',
  '\\Elzrh': '\u0322',
  '\\Elzsbbrg': '\u032A',
  '{\\fontencoding{LECO}\\selectfont\\char203}': '\u032B',
  '{\\fontencoding{LECO}\\selectfont\\char207}': '\u032F',
  '\\utilde': '\u0330',
  '\\underbar': '\u0331',
  '\\underline': '\u0332',
  '\\Elzxl': '\u0335',
  '\\Elzbar': '\u0336',
  '{\\fontencoding{LECO}\\selectfont\\char215}': '\u0337',
  '\\not': '\u0338',
  '{\\fontencoding{LECO}\\selectfont\\char218}': '\u033A',
  '{\\fontencoding{LECO}\\selectfont\\char219}': '\u033B',
  '{\\fontencoding{LECO}\\selectfont\\char220}': '\u033C',
  '{\\fontencoding{LECO}\\selectfont\\char221}': '\u033D',
  '{\\fontencoding{LECO}\\selectfont\\char225}': '\u0361',
  '\\\'H': '\u0389',
  '{\\\'{}I}': '\u038A',
  '{\\\'{}O}': '\u038C',
  '\\mathrm{\'Y}': '\u038E',
  '\\mathrm{\'\\Omega}': '\u038F',
  '\\acute{\\ddot{\\iota}}': '\u0390',
  '\\Gamma': '\u0393',
  '\\Delta': '\u0394',
  '\\Theta': '\u0398',
  '\\Lambda': '\u039B',
  '\\Xi': '\u039E',
  '\\Pi': '\u03A0',
  '\\Sigma': '\u03A3',
  '\\Upsilon': '\u03D2',
  '\\Phi': '\u03A6',
  '\\Psi': '\u03A8',
  '\\Omega': '\u2126',
  '\\mathrm{\\ddot{I}}': '\u03AA',
  '\\mathrm{\\ddot{Y}}': '\u03AB',
  '{\\\'$\\alpha$}': '\u03AC',
  '\\acute{\\epsilon}': '\u03AD',
  '\\acute{\\eta}': '\u03AE',
  '\\acute{\\iota}': '\u03AF',
  '\\acute{\\ddot{\\upsilon}}': '\u03B0',
  '\\alpha': '\u03B1',
  '\\beta': '\u03B2',
  '\\gamma': '\u03B3',
  '\\delta': '\u03B4',
  '\\epsilon': '\u03F5',
  '\\zeta': '\u03B6',
  '\\eta': '\u03B7',
  '\\theta': '\u03B8',
  '\\texttheta': '\u03B8',
  '\\iota': '\u03B9',
  '\\kappa': '\u03BA',
  '\\lambda': '\u03BB',
  '\\mu': '\u03BC',
  '\\nu': '\u03BD',
  '\\xi': '\u03BE',
  '\\pi': '\u03C0',
  '\\rho': '\u03C1',
  '\\varsigma': '\u03C2',
  '\\sigma': '\u03C3',
  '\\tau': '\u03C4',
  '\\upsilon': '\u03C5',
  '\\varphi': '\u03C6',
  '\\chi': '\u03C7',
  '\\psi': '\u03C8',
  '\\omega': '\u03C9',
  '\\ddot{\\iota}': '\u03CA',
  '\\ddot{\\upsilon}': '\u03CB',
  '\\acute{\\upsilon}': '\u03CD',
  '\\acute{\\omega}': '\u03CE',
  '\\varbeta': '\u03D0',
  '\\Pisymbol{ppi022}{87}': '\u03D0',
  '\\vartheta': '\u03D1',
  '\\textvartheta': '\u03D1',
  '\\phi': '\u03D5',
  '\\varpi': '\u03D6',
  '\\Qoppa': '\u03D8',
  '\\qoppa': '\u03D9',
  '\\Stigma': '\u03DA',
  '\\stigma': '\u03DB',
  '\\Digamma': '\u03DC',
  '\\digamma': '\u03DD',
  '\\Koppa': '\u03DE',
  '\\koppa': '\u03DF',
  '\\Sampi': '\u03E0',
  '\\sampi': '\u03E1',
  '\\varkappa': '\u03F0',
  '\\varrho': '\u03F1',
  '\\upvarTheta': '\u03F4',
  '\\textTheta': '\u03F4',
  '\\backepsilon': '\u03F6',
  '\\cyrchar\\CYRYO': '\u0401',
  '\\cyrchar\\CYRDJE': '\u0402',
  '\\cyrchar{\\\'\\CYRG}': '\u0403',
  '\\cyrchar\\CYRIE': '\u0404',
  '\\cyrchar\\CYRDZE': '\u0405',
  '\\cyrchar\\CYRII': '\u0406',
  '\\cyrchar\\CYRYI': '\u0407',
  '\\cyrchar\\CYRJE': '\u0408',
  '\\cyrchar\\CYRLJE': '\u0409',
  '\\cyrchar\\CYRNJE': '\u040A',
  '\\cyrchar\\CYRTSHE': '\u040B',
  '\\cyrchar{\\\'\\CYRK}': '\u040C',
  '\\cyrchar\\CYRUSHRT': '\u040E',
  '\\cyrchar\\CYRDZHE': '\u040F',
  '\\cyrchar\\CYRA': '\u0410',
  '\\cyrchar\\CYRB': '\u0411',
  '\\cyrchar\\CYRV': '\u0412',
  '\\cyrchar\\CYRG': '\u0413',
  '\\cyrchar\\CYRD': '\u0414',
  '\\cyrchar\\CYRE': '\u0415',
  '\\cyrchar\\CYRZH': '\u0416',
  '\\cyrchar\\CYRZ': '\u0417',
  '\\cyrchar\\CYRI': '\u0418',
  '\\cyrchar\\CYRISHRT': '\u0419',
  '\\cyrchar\\CYRK': '\u041A',
  '\\cyrchar\\CYRL': '\u041B',
  '\\cyrchar\\CYRM': '\u041C',
  '\\cyrchar\\CYRN': '\u041D',
  '\\cyrchar\\CYRO': '\u041E',
  '\\cyrchar\\CYRP': '\u041F',
  '\\cyrchar\\CYRR': '\u0420',
  '\\cyrchar\\CYRS': '\u0421',
  '\\cyrchar\\CYRT': '\u0422',
  '\\cyrchar\\CYRU': '\u0423',
  '\\cyrchar\\CYRF': '\u0424',
  '\\cyrchar\\CYRH': '\u0425',
  '\\cyrchar\\CYRC': '\u0426',
  '\\cyrchar\\CYRCH': '\u0427',
  '\\cyrchar\\CYRSH': '\u0428',
  '\\cyrchar\\CYRSHCH': '\u0429',
  '\\cyrchar\\CYRHRDSN': '\u042A',
  '\\cyrchar\\CYRERY': '\u042B',
  '\\cyrchar\\CYRSFTSN': '\u042C',
  '\\cyrchar\\CYREREV': '\u042D',
  '\\cyrchar\\CYRYU': '\u042E',
  '\\cyrchar\\CYRYA': '\u042F',
  '\\cyrchar\\cyra': '\u0430',
  '\\cyrchar\\cyrb': '\u0431',
  '\\cyrchar\\cyrv': '\u0432',
  '\\cyrchar\\cyrg': '\u0433',
  '\\cyrchar\\cyrd': '\u0434',
  '\\cyrchar\\cyre': '\u0435',
  '\\cyrchar\\cyrzh': '\u0436',
  '\\cyrchar\\cyrz': '\u0437',
  '\\cyrchar\\cyri': '\u0438',
  '\\cyrchar\\cyrishrt': '\u0439',
  '\\cyrchar\\cyrk': '\u043A',
  '\\cyrchar\\cyrl': '\u043B',
  '\\cyrchar\\cyrm': '\u043C',
  '\\cyrchar\\cyrn': '\u043D',
  '\\cyrchar\\cyro': '\u043E',
  '\\cyrchar\\cyrp': '\u043F',
  '\\cyrchar\\cyrr': '\u0440',
  '\\cyrchar\\cyrs': '\u0441',
  '\\cyrchar\\cyrt': '\u0442',
  '\\cyrchar\\cyru': '\u0443',
  '\\cyrchar\\cyrf': '\u0444',
  '\\cyrchar\\cyrh': '\u0445',
  '\\cyrchar\\cyrc': '\u0446',
  '\\cyrchar\\cyrch': '\u0447',
  '\\cyrchar\\cyrsh': '\u0448',
  '\\cyrchar\\cyrshch': '\u0449',
  '\\cyrchar\\cyrhrdsn': '\u044A',
  '\\cyrchar\\cyrery': '\u044B',
  '\\cyrchar\\cyrsftsn': '\u044C',
  '\\cyrchar\\cyrerev': '\u044D',
  '\\cyrchar\\cyryu': '\u044E',
  '\\cyrchar\\cyrya': '\u044F',
  '\\cyrchar\\cyryo': '\u0451',
  '\\cyrchar\\cyrdje': '\u0452',
  '\\cyrchar{\\\'\\cyrg}': '\u0453',
  '\\cyrchar\\cyrie': '\u0454',
  '\\cyrchar\\cyrdze': '\u0455',
  '\\cyrchar\\cyrii': '\u0456',
  '\\cyrchar\\cyryi': '\u0457',
  '\\cyrchar\\cyrje': '\u0458',
  '\\cyrchar\\cyrlje': '\u0459',
  '\\cyrchar\\cyrnje': '\u045A',
  '\\cyrchar\\cyrtshe': '\u045B',
  '\\cyrchar{\\\'\\cyrk}': '\u045C',
  '\\cyrchar\\cyrushrt': '\u045E',
  '\\cyrchar\\cyrdzhe': '\u045F',
  '\\cyrchar\\CYROMEGA': '\u0460',
  '\\cyrchar\\cyromega': '\u0461',
  '\\cyrchar\\CYRYAT': '\u0462',
  '\\cyrchar\\CYRIOTE': '\u0464',
  '\\cyrchar\\cyriote': '\u0465',
  '\\cyrchar\\CYRLYUS': '\u0466',
  '\\cyrchar\\cyrlyus': '\u0467',
  '\\cyrchar\\CYRIOTLYUS': '\u0468',
  '\\cyrchar\\cyriotlyus': '\u0469',
  '\\cyrchar\\CYRBYUS': '\u046A',
  '\\cyrchar\\CYRIOTBYUS': '\u046C',
  '\\cyrchar\\cyriotbyus': '\u046D',
  '\\cyrchar\\CYRKSI': '\u046E',
  '\\cyrchar\\cyrksi': '\u046F',
  '\\cyrchar\\CYRPSI': '\u0470',
  '\\cyrchar\\cyrpsi': '\u0471',
  '\\cyrchar\\CYRFITA': '\u0472',
  '\\cyrchar\\CYRIZH': '\u0474',
  '\\cyrchar\\CYRUK': '\u0478',
  '\\cyrchar\\cyruk': '\u0479',
  '\\cyrchar\\CYROMEGARND': '\u047A',
  '\\cyrchar\\cyromegarnd': '\u047B',
  '\\cyrchar\\CYROMEGATITLO': '\u047C',
  '\\cyrchar\\cyromegatitlo': '\u047D',
  '\\cyrchar\\CYROT': '\u047E',
  '\\cyrchar\\cyrot': '\u047F',
  '\\cyrchar\\CYRKOPPA': '\u0480',
  '\\cyrchar\\cyrkoppa': '\u0481',
  '\\cyrchar\\cyrthousands': '\u0482',
  '\\cyrchar\\cyrhundredthousands': '\u0488',
  '\\cyrchar\\cyrmillions': '\u0489',
  '\\cyrchar\\CYRSEMISFTSN': '\u048C',
  '\\cyrchar\\cyrsemisftsn': '\u048D',
  '\\cyrchar\\CYRRTICK': '\u048E',
  '\\cyrchar\\cyrrtick': '\u048F',
  '\\cyrchar\\CYRGUP': '\u0490',
  '\\cyrchar\\cyrgup': '\u0491',
  '\\cyrchar\\CYRGHCRS': '\u0492',
  '\\cyrchar\\cyrghcrs': '\u0493',
  '\\cyrchar\\CYRGHK': '\u0494',
  '\\cyrchar\\cyrghk': '\u0495',
  '\\cyrchar\\CYRZHDSC': '\u0496',
  '\\cyrchar\\cyrzhdsc': '\u0497',
  '\\cyrchar\\CYRZDSC': '\u0498',
  '\\cyrchar\\cyrzdsc': '\u0499',
  '\\cyrchar\\CYRKDSC': '\u049A',
  '\\cyrchar\\cyrkdsc': '\u049B',
  '\\cyrchar\\CYRKVCRS': '\u049C',
  '\\cyrchar\\cyrkvcrs': '\u049D',
  '\\cyrchar\\CYRKHCRS': '\u049E',
  '\\cyrchar\\cyrkhcrs': '\u049F',
  '\\cyrchar\\CYRKBEAK': '\u04A0',
  '\\cyrchar\\cyrkbeak': '\u04A1',
  '\\cyrchar\\CYRNDSC': '\u04A2',
  '\\cyrchar\\cyrndsc': '\u04A3',
  '\\cyrchar\\CYRNG': '\u04A4',
  '\\cyrchar\\cyrng': '\u04A5',
  '\\cyrchar\\CYRPHK': '\u04A6',
  '\\cyrchar\\cyrphk': '\u04A7',
  '\\cyrchar\\CYRABHHA': '\u04A8',
  '\\cyrchar\\cyrabhha': '\u04A9',
  '\\cyrchar\\CYRSDSC': '\u04AA',
  '\\cyrchar\\cyrsdsc': '\u04AB',
  '\\cyrchar\\CYRTDSC': '\u04AC',
  '\\cyrchar\\cyrtdsc': '\u04AD',
  '\\cyrchar\\CYRY': '\u04AE',
  '\\cyrchar\\cyry': '\u04AF',
  '\\cyrchar\\CYRYHCRS': '\u04B0',
  '\\cyrchar\\cyryhcrs': '\u04B1',
  '\\cyrchar\\CYRHDSC': '\u04B2',
  '\\cyrchar\\cyrhdsc': '\u04B3',
  '\\cyrchar\\CYRTETSE': '\u04B4',
  '\\cyrchar\\cyrtetse': '\u04B5',
  '\\cyrchar\\CYRCHRDSC': '\u04B6',
  '\\cyrchar\\cyrchrdsc': '\u04B7',
  '\\cyrchar\\CYRCHVCRS': '\u04B8',
  '\\cyrchar\\cyrchvcrs': '\u04B9',
  '\\cyrchar\\CYRSHHA': '\u04BA',
  '\\cyrchar\\cyrshha': '\u04BB',
  '\\cyrchar\\CYRABHCH': '\u04BC',
  '\\cyrchar\\cyrabhch': '\u04BD',
  '\\cyrchar\\CYRABHCHDSC': '\u04BE',
  '\\cyrchar\\cyrabhchdsc': '\u04BF',
  '\\cyrchar\\CYRpalochka': '\u04C0',
  '\\cyrchar\\CYRKHK': '\u04C3',
  '\\cyrchar\\cyrkhk': '\u04C4',
  '\\cyrchar\\CYRNHK': '\u04C7',
  '\\cyrchar\\cyrnhk': '\u04C8',
  '\\cyrchar\\CYRCHLDSC': '\u04CB',
  '\\cyrchar\\cyrchldsc': '\u04CC',
  '\\cyrchar\\CYRAE': '\u04D4',
  '\\cyrchar\\cyrae': '\u04D5',
  '\\cyrchar\\CYRSCHWA': '\u04D8',
  '\\cyrchar\\cyrschwa': '\u04D9',
  '\\cyrchar\\CYRABHDZE': '\u04E0',
  '\\cyrchar\\cyrabhdze': '\u04E1',
  '\\cyrchar\\CYROTLD': '\u04E8',
  '\\cyrchar\\cyrotld': '\u04E9',
  '\\\\backslash': '\u0871',
  '\\.B': '\u1E02',
  '\\.b': '\u1E03',
  '{\\d B}': '\u1E04',
  '{\\d b}': '\u1E05',
  '{\\b B}': '\u1E06',
  '{\\b b}': '\u1E07',
  '\\.D': '\u1E0A',
  '\\.d': '\u1E0B',
  '{\\d D}': '\u1E0C',
  '{\\d d}': '\u1E0D',
  '{\\b D}': '\u1E0E',
  '{\\b d}': '\u1E0F',
  '{\\c D}': '\u1E10',
  '{\\c d}': '\u1E11',
  '\\.F': '\u1E1E',
  '\\.f': '\u1E1F',
  '\\=G': '\u1E20',
  '\\=g': '\u1E21',
  '\\.H': '\u1E22',
  '\\.h': '\u1E23',
  '{\\d H}': '\u1E24',
  '{\\d h}': '\u1E25',
  '\\"H': '\u1E26',
  '\\"h': '\u1E27',
  '{\\c H}': '\u1E28',
  '{\\c h}': '\u1E29',
  '\\\'K': '\u1E30',
  '\\\'k': '\u1E31',
  '{\\d K}': '\u1E32',
  '{\\d k}': '\u1E33',
  '{\\b K}': '\u1E34',
  '{\\b k}': '\u1E35',
  '{\\d L}': '\u1E36',
  '{\\d l}': '\u1E37',
  '{\\b L}': '\u1E3A',
  '{\\b l}': '\u1E3B',
  '\\\'M': '\u1E3E',
  '\\\'m': '\u1E3F',
  '\\.M': '\u1E40',
  '\\.m': '\u1E41',
  '{\\d M}': '\u1E42',
  '{\\d m}': '\u1E43',
  '\\.N': '\u1E44',
  '\\.n': '\u1E45',
  '{\\d N}': '\u1E46',
  '{\\d n}': '\u1E47',
  '{\\b N}': '\u1E48',
  '{\\b n}': '\u1E49',
  '\\\'P': '\u1E54',
  '\\\'p': '\u1E55',
  '\\.P': '\u1E56',
  '\\.p': '\u1E57',
  '\\.R': '\u1E58',
  '\\.r': '\u1E59',
  '{\\d R}': '\u1E5A',
  '{\\d r}': '\u1E5B',
  '{\\b R}': '\u1E5E',
  '{\\b r}': '\u1E5F',
  '\\.S': '\u1E60',
  '\\.s': '\u1E61',
  '{\\d S}': '\u1E62',
  '{\\d s}': '\u1E63',
  '\\.T': '\u1E6A',
  '\\.t': '\u1E6B',
  '{\\d T}': '\u1E6C',
  '{\\d t}': '\u1E6D',
  '{\\b T}': '\u1E6E',
  '{\\b t}': '\u1E6F',
  '\\~V': '\u1E7C',
  '\\~v': '\u1E7D',
  '{\\d V}': '\u1E7E',
  '{\\d v}': '\u1E7F',
  '\\`W': '\u1E80',
  '\\`w': '\u1E81',
  '\\\'W': '\u1E82',
  '\\\'w': '\u1E83',
  '\\"W': '\u1E84',
  '\\"w': '\u1E85',
  '\\.W': '\u1E86',
  '\\.w': '\u1E87',
  '{\\d W}': '\u1E88',
  '{\\d w}': '\u1E89',
  '\\.X': '\u1E8A',
  '\\.x': '\u1E8B',
  '\\"X': '\u1E8C',
  '\\"x': '\u1E8D',
  '\\.Y': '\u1E8E',
  '\\.y': '\u1E8F',
  '\\^Z': '\u1E90',
  '\\^z': '\u1E91',
  '{\\d Z}': '\u1E92',
  '{\\d z}': '\u1E93',
  '{\\b Z}': '\u1E94',
  '{\\b z}': '\u1E95',
  '{\\b h}': '\u1E96',
  '\\"t': '\u1E97',
  '\\r{w}': '\u1E98',
  '{\\r w}': '\u1E98',
  '{\\r y}': '\u1E99',
  '\\r{y}': '\u1E99',
  '{\\d A}': '\u1EA0',
  '{\\d a}': '\u1EA1',
  '{\\d E}': '\u1EB8',
  '{\\d e}': '\u1EB9',
  '\\~E': '\u1EBC',
  '\\~e': '\u1EBD',
  '{\\d I}': '\u1ECA',
  '{\\d i}': '\u1ECB',
  '{\\d O}': '\u1ECC',
  '{\\d o}': '\u1ECD',
  '{\\d U}': '\u1EE4',
  '{\\d u}': '\u1EE5',
  '\\`Y': '\u1EF2',
  '\\`y': '\u1EF3',
  '{\\d Y}': '\u1EF4',
  '{\\d y}': '\u1EF5',
  '\\~Y': '\u1EF8',
  '\\~y': '\u1EF9',
  '\\quad': '\u2003',
  '\\hspace{0.6em}': '\u2002',
  '\\hspace{1em}': '\u2003',
  '\\;': '\u2004',
  '\\hspace{0.25em}': '\u2005',
  '\\hspace{0.166em}': '\u2006',
  '\\hphantom{0}': '\u2007',
  '\\hphantom{,}': '\u2008',
  '\\,': '\u2009',
  '\\mkern1mu': '\u200A',
  '\\mbox': '\u200B',
  '{\\aftergroup\\ignorespaces}': '\u200C',
  '\\textendash': '\u2013',
  '\\textemdash': '\u2014',
  '\\horizbar': '\u2015',
  '\\rule{1em}{1pt}': '\u2015',
  '\\Vert': '\u2016',
  '\\twolowline': '\u2017',
  '\\Elzreapos': '\u201B',
  '\\quotedblbase': '\u201F',
  '\\dagger': '\u2020',
  '\\textdagger': '\u2020',
  '\\ddagger': '\u2021',
  '\\textdaggerdbl': '\u2021',
  '\\bullet': '\u2219',
  '\\textbullet': '\u2022',
  '\\enleadertwodots': '\u2025',
  '\\ldots': '\u2026',
  '\\textperthousand': '\u2030',
  '\\textpertenthousand': '\u2031',
  '{\'}': '\u2032',
  '{\'\'}': '\u2033',
  '{\'\'\'}': '\u2034',
  '\\backprime': '\u2035',
  '\\backdprime': '\u2036',
  '\\backtrprime': '\u2037',
  '\\caretinsert': '\u2038',
  '\\guilsinglleft': '\u2039',
  '\\guilsinglright': '\u203A',
  '\\Exclam': '\u203C',
  '\\hyphenbullet': '\u2043',
  '\\fracslash': '\u2044',
  '\\Question': '\u2047',
  '\\closure': '\u2050',
  '\\:': '\u205F',
  '\\nolinebreak': '\u2060',
  '^{0}': '\u2070',
  '^{4}': '\u2074',
  '^{5}': '\u2075',
  '^{6}': '\u2076',
  '^{7}': '\u2077',
  '^{8}': '\u2078',
  '^{9}': '\u2079',
  '^{+}': '\u207A',
  '^{-}': '\u207B',
  '^{=}': '\u207C',
  '^{(}': '\u207D',
  '^{)}': '\u207E',
  '^{n}': '\u207F',
  '\\textsuperscript{n}': '\u207F',
  '^{i}': '\u2071',
  '\\textsuperscript{i}': '\u2071',
  '^{a}': '\u1D43',
  '\\textsuperscript{a}': '\u1D43',
  '^{b}': '\u1D47',
  '\\textsuperscript{b}': '\u1D47',
  '^{c}': '\u1D9C',
  '\\textsuperscript{c}': '\u1D9C',
  '^{d}': '\u1D48',
  '\\textsuperscript{d}': '\u1D48',
  '^{e}': '\u1D49',
  '\\textsuperscript{e}': '\u1D49',
  '^{f}': '\u1DA0',
  '\\textsuperscript{f}': '\u1DA0',
  '^{g}': '\u1D4D',
  '\\textsuperscript{g}': '\u1D4D',
  '^{h}': '\u02B0',
  '\\textsuperscript{h}': '\u02B0',
  '^{j}': '\u02B2',
  '\\textsuperscript{j}': '\u02B2',
  '^{k}': '\u1D4F',
  '\\textsuperscript{k}': '\u1D4F',
  '^{l}': '\u02E1',
  '\\textsuperscript{l}': '\u02E1',
  '^{m}': '\u1D50',
  '\\textsuperscript{m}': '\u1D50',
  '^{o}': '\u1D52',
  '\\textsuperscript{o}': '\u1D52',
  '^{p}': '\u1D56',
  '\\textsuperscript{p}': '\u1D56',
  '^{r}': '\u02B3',
  '\\textsuperscript{r}': '\u02B3',
  '^{s}': '\u02E2',
  '\\textsuperscript{s}': '\u02E2',
  '^{t}': '\u1D57',
  '\\textsuperscript{t}': '\u1D57',
  '^{u}': '\u1D58',
  '\\textsuperscript{u}': '\u1D58',
  '^{v}': '\u1D5B',
  '\\textsuperscript{v}': '\u1D5B',
  '^{w}': '\u02B7',
  '\\textsuperscript{w}': '\u02B7',
  '^{x}': '\u02E3',
  '\\textsuperscript{x}': '\u02E3',
  '^{y}': '\u02B8',
  '\\textsuperscript{y}': '\u02B8',
  '^{z}': '\u1DBB',
  '\\textsuperscript{z}': '\u1DBB',
  '_{0}': '\u2080',
  '_{1}': '\u2081',
  '_{2}': '\u2082',
  '_{3}': '\u2083',
  '_{4}': '\u2084',
  '_{5}': '\u2085',
  '_{6}': '\u2086',
  '_{7}': '\u2087',
  '_{8}': '\u2088',
  '_{9}': '\u2089',
  '_{+}': '\u208A',
  '_{-}': '\u208B',
  '_{=}': '\u208C',
  '_{(}': '\u208D',
  '_{)}': '\u208E',
  '_{a}': '\u2090',
  '\\textsubscript{a}': '\u2090',
  '_{e}': '\u2091',
  '\\textsubscript{e}': '\u2091',
  '_{o}': '\u2092',
  '\\textsubscript{o}': '\u2092',
  '_{x}': '\u2093',
  '\\textsubscript{x}': '\u2093',
  '\\textsubscript{\\textschwa}': '\u2094',
  '_{h}': '\u2095',
  '\\textsubscript{h}': '\u2095',
  '_{k}': '\u2096',
  '\\textsubscript{k}': '\u2096',
  '_{l}': '\u2097',
  '\\textsubscript{l}': '\u2097',
  '_{m}': '\u2098',
  '\\textsubscript{m}': '\u2098',
  '_{n}': '\u2099',
  '\\textsubscript{n}': '\u2099',
  '_{p}': '\u209A',
  '\\textsubscript{p}': '\u209A',
  '_{s}': '\u209B',
  '\\textsubscript{s}': '\u209B',
  '_{t}': '\u209C',
  '\\textsubscript{t}': '\u209C',
  '\\ensuremath{\\Elzpes}': '\u20A7',
  '\\euro': '\u20AC',
  '\\texteuro': '\u20AC',
  '\\lvec': '\u20D0',
  '\\vec': '\u20D7',
  '\\vertoverlay': '\u20D2',
  '\\LVec': '\u20D6',
  '\\dddot': '\u20DB',
  '\\ddddot': '\u20DC',
  '\\enclosecircle': '\u20DD',
  '\\enclosesquare': '\u20DE',
  '\\enclosediamond': '\u20DF',
  '\\overleftrightarrow': '\u20E1',
  '\\enclosetriangle': '\u20E4',
  '\\annuity': '\u20E7',
  '\\threeunderdot': '\u20E8',
  '\\widebridgeabove': '\u20E9',
  '\\underrightharpoondown': '\u20EC',
  '\\underleftharpoondown': '\u20ED',
  '\\underleftarrow': '\u20EE',
  '\\underrightarrow': '\u20EF',
  '\\asteraccent': '\u20F0',
  '\\mathbb{C}': '\u2102',
  '\\textcelsius': '\u2103',
  '\\Euler': '\u2107',
  '\\mathscr{g}': '\u210A',
  '\\mathscr{H}': '\u210B',
  '\\mathfrak{H}': '\u210C',
  '\\mathbb{H}': '\u210D',
  '\\Planckconst': '\u210E',
  '\\hslash': '\u210F',
  '\\mathscr{I}': '\u2110',
  '\\mathfrak{I}': '\u2111',
  '\\mathscr{L}': '\u2112',
  '\\mathscr{l}': '\uD835\uDCC1',
  '\\mathbb{N}': '\u2115',
  '\\cyrchar\\textnumero': '\u2116',
  '\\textcircledP': '\u2117',
  '\\wp': '\u2118',
  '\\mathbb{P}': '\u2119',
  '\\mathbb{Q}': '\u211A',
  '\\mathscr{R}': '\u211B',
  '\\mathfrak{R}': '\u211C',
  '\\mathbb{R}': '\u211D',
  '\\Elzxrat': '\u211E',
  '\\textservicemark': '\u2120',
  '\\texttrademark': '\u2122',
  '\\mathbb{Z}': '\u2124',
  '\\mho': '\u2127',
  '\\mathfrak{Z}': '\u2128',
  '\\ElsevierGlyph{2129}': '\u2129',
  '\\Angstroem': '\u212B',
  '\\mathscr{B}': '\u212C',
  '\\mathfrak{C}': '\u212D',
  '\\textestimated': '\u212E',
  '\\mathscr{e}': '\u212F',
  '\\mathscr{E}': '\u2130',
  '\\mathscr{F}': '\u2131',
  '\\Finv': '\u2132',
  '\\mathscr{M}': '\u2133',
  '\\mathscr{o}': '\u2134',
  '\\aleph': '\u2135',
  '\\beth': '\u2136',
  '\\gimel': '\u2137',
  '\\daleth': '\u2138',
  '\\mathbb{\\pi}': '\u213C',
  '\\mathbb{\\gamma}': '\u213D',
  '\\mathbb{\\Gamma}': '\u213E',
  '\\mathbb{\\Pi}': '\u213F',
  '\\mathbb{\\Sigma}': '\u2140',
  '\\Game': '\u2141',
  '\\sansLturned': '\u2142',
  '\\sansLmirrored': '\u2143',
  '\\Yup': '\u2144',
  '\\CapitalDifferentialD': '\u2145',
  '\\DifferentialD': '\u2146',
  '\\ExponetialE': '\u2147',
  '\\ComplexI': '\u2148',
  '\\ComplexJ': '\u2149',
  '\\PropertyLine': '\u214A',
  '\\invamp': '\u214B',
  '\\textfrac{1}{3}': '\u2153',
  '\\textfrac{2}{3}': '\u2154',
  '\\textfrac{1}{5}': '\u2155',
  '\\textfrac{2}{5}': '\u2156',
  '\\textfrac{3}{5}': '\u2157',
  '\\textfrac{4}{5}': '\u2158',
  '\\textfrac{1}{6}': '\u2159',
  '\\textfrac{5}{6}': '\u215A',
  '\\textfrac{1}{8}': '\u215B',
  '\\textfrac{3}{8}': '\u215C',
  '\\textfrac{5}{8}': '\u215D',
  '\\textfrac{7}{8}': '\u215E',
  '\\leftarrow': '\u2190',
  '\\uparrow': '\u2191',
  '\\rightarrow': '\u2192',
  '\\textrightarrow': '\u2192',
  '\\downarrow': '\u2193',
  '\\leftrightarrow': '\u2194',
  '\\updownarrow': '\u2195',
  '\\nwarrow': '\u2196',
  '\\nearrow': '\u2197',
  '\\searrow': '\u2198',
  '\\swarrow': '\u2199',
  '\\nleftarrow': '\u219A',
  '\\nrightarrow': '\u219B',
  '\\arrowwaveleft': '\u219C',
  '\\arrowwaveright': '\u219D',
  '\\twoheadleftarrow': '\u219E',
  '\\twoheaduparrow': '\u219F',
  '\\twoheadrightarrow': '\u21A0',
  '\\twoheaddownarrow': '\u21A1',
  '\\leftarrowtail': '\u21A2',
  '\\rightarrowtail': '\u21A3',
  '\\mapsfrom': '\u21A4',
  '\\MapsUp': '\u21A5',
  '\\mapsto': '\u21A6',
  '\\MapsDown': '\u21A7',
  '\\updownarrowbar': '\u21A8',
  '\\hookleftarrow': '\u21A9',
  '\\hookrightarrow': '\u21AA',
  '\\looparrowleft': '\u21AB',
  '\\looparrowright': '\u21AC',
  '\\leftrightsquigarrow': '\u21AD',
  '\\nleftrightarrow': '\u21AE',
  '\\lightning': '\u21AF',
  '\\Lsh': '\u21B0',
  '\\Rsh': '\u21B1',
  '\\dlsh': '\u21B2',
  '\\ElsevierGlyph{21B3}': '\u21B3',
  '\\linefeed': '\u21B4',
  '\\carriagereturn': '\u21B5',
  '\\curvearrowleft': '\u21B6',
  '\\curvearrowright': '\u21B7',
  '\\barovernorthwestarrow': '\u21B8',
  '\\barleftarrowrightarrowba': '\u21B9',
  '\\circlearrowleft': '\u21BA',
  '\\circlearrowright': '\u21BB',
  '\\leftharpoonup': '\u21BC',
  '\\leftharpoondown': '\u21BD',
  '\\upharpoonright': '\u21BE',
  '\\upharpoonleft': '\u21BF',
  '\\rightharpoonup': '\u21C0',
  '\\rightharpoondown': '\u21C1',
  '\\downharpoonright': '\u21C2',
  '\\downharpoonleft': '\u21C3',
  '\\rightleftarrows': '\u21C4',
  '\\dblarrowupdown': '\u21C5',
  '\\leftrightarrows': '\u21C6',
  '\\leftleftarrows': '\u21C7',
  '\\upuparrows': '\u21C8',
  '\\rightrightarrows': '\u21C9',
  '\\downdownarrows': '\u21CA',
  '\\leftrightharpoons': '\u21CB',
  '\\rightleftharpoons': '\u21CC',
  '\\nLeftarrow': '\u21CD',
  '\\nLeftrightarrow': '\u21CE',
  '\\nRightarrow': '\u21CF',
  '\\Leftarrow': '\u21D0',
  '\\Uparrow': '\u21D1',
  '\\Rightarrow': '\u21D2',
  '\\Downarrow': '\u21D3',
  '\\Leftrightarrow': '\u21D4',
  '\\Updownarrow': '\u21D5',
  '\\Nwarrow': '\u21D6',
  '\\Nearrow': '\u21D7',
  '\\Searrow': '\u21D8',
  '\\Swarrow': '\u21D9',
  '\\Lleftarrow': '\u21DA',
  '\\Rrightarrow': '\u21DB',
  '\\leftsquigarrow': '\u21DC',
  '\\rightsquigarrow': '\u21DD',
  '\\nHuparrow': '\u21DE',
  '\\nHdownarrow': '\u21DF',
  '\\dashleftarrow': '\u21E0',
  '\\updasharrow': '\u21E1',
  '\\dashrightarrow': '\u21E2',
  '\\downdasharrow': '\u21E3',
  '\\LeftArrowBar': '\u21E4',
  '\\RightArrowBar': '\u21E5',
  '\\leftwhitearrow': '\u21E6',
  '\\upwhitearrow': '\u21E7',
  '\\rightwhitearrow': '\u21E8',
  '\\downwhitearrow': '\u21E9',
  '\\whitearrowupfrombar': '\u21EA',
  '\\circleonrightarrow': '\u21F4',
  '\\DownArrowUpArrow': '\u21F5',
  '\\rightthreearrows': '\u21F6',
  '\\nvleftarrow': '\u21F7',
  '\\pfun': '\u21F8',
  '\\nvleftrightarrow': '\u21F9',
  '\\nVleftarrow': '\u21FA',
  '\\ffun': '\u21FB',
  '\\nVleftrightarrow': '\u21FC',
  '\\leftarrowtriangle': '\u21FD',
  '\\rightarrowtriangle': '\u21FE',
  '\\leftrightarrowtriangle': '\u21FF',
  '\\forall': '\u2200',
  '\\complement': '\u2201',
  '\\partial': '\uD835\uDFC3',
  '\\exists': '\u2203',
  '\\nexists': '\u2204',
  '\\varnothing': '\u2205',
  '\\increment': '\u2206',
  '\\nabla': '\u2207',
  '\\in': '\uD835\uDFC4',
  '\\not\\in': '\u2209',
  '\\smallin': '\u220A',
  '\\ni': '\u220B',
  '\\not\\ni': '\u220C',
  '\\smallni': '\u220D',
  '\\QED': '\u220E',
  '\\prod': '\u220F',
  '\\coprod': '\u2210',
  '\\sum': '\u2211',
  '\\mp': '\u2213',
  '\\dotplus': '\u2214',
  '\\slash': '\u2215',
  '\\setminus': '\u29F5',
  '{_\\ast}': '\u2217',
  '\\circ': '\u2218',
  '\\surd': '\u221A',
  '\\sqrt[3]': '\u221B',
  '\\sqrt[4]': '\u221C',
  '\\propto': '\u221D',
  '\\infty': '\u221E',
  '\\rightangle': '\u221F',
  '\\angle': '\u2220',
  '\\measuredangle': '\u2221',
  '\\sphericalangle': '\u2222',
  '\\mid': '\u2223',
  '\\nmid': '\u2224',
  '\\parallel': '\u2225',
  '\\nparallel': '\u2226',
  '\\wedge': '\u2227',
  '\\vee': '\u2228',
  '\\cap': '\u2229',
  '\\cup': '\u222A',
  '\\int': '\u222B',
  '{\\int\\!\\int}': '\u222C',
  '{\\int\\!\\int\\!\\int}': '\u222D',
  '\\oint': '\u222E',
  '\\surfintegral': '\u222F',
  '\\volintegral': '\u2230',
  '\\clwintegral': '\u2231',
  '\\ElsevierGlyph{2232}': '\u2232',
  '\\ElsevierGlyph{2233}': '\u2233',
  '\\therefore': '\u2234',
  '\\because': '\u2235',
  '\\Colon': '\u2237',
  '\\ElsevierGlyph{2238}': '\u2238',
  '\\eqcolon': '\u2239',
  '\\mathbin{{:}\\!\\!{-}\\!\\!{:}}': '\u223A',
  '\\homothetic': '\u223B',
  '\\sim': '\u223C',
  '\\backsim': '\u223D',
  '\\lazysinv': '\u223E',
  '\\AC': '\u223F',
  '\\wr': '\u2240',
  '\\not\\sim': '\u2241',
  '\\ElsevierGlyph{2242}': '\u2242',
  '\\simeq': '\u2243',
  '\\not\\simeq': '\u2244',
  '\\cong': '\u2245',
  '\\approxnotequal': '\u2246',
  '\\not\\cong': '\u2247',
  '\\approx': '\u2248',
  '\\not\\approx': '\u2249',
  '\\approxeq': '\u224A',
  '\\tildetrpl': '\u224B',
  '\\allequal': '\u224C',
  '\\asymp': '\u224D',
  '\\Bumpeq': '\u224E',
  '\\bumpeq': '\u224F',
  '\\doteq': '\u2250',
  '\\doteqdot': '\u2251',
  '\\fallingdotseq': '\u2252',
  '\\risingdotseq': '\u2253',
  '\\coloneq': '\u2254',
  '\\eqcirc': '\u2256',
  '\\circeq': '\u2257',
  '\\arceq': '\u2258',
  '\\estimates': '\u2259',
  '\\ElsevierGlyph{225A}': '\u2A63',
  '\\starequal': '\u225B',
  '\\triangleq': '\u225C',
  '\\eqdef': '\u225D',
  '\\measeq': '\u225E',
  '\\ElsevierGlyph{225F}': '\u225F',
  '\\not =': '\u2260',
  '\\equiv': '\u2261',
  '\\not\\equiv': '\u2262',
  '\\Equiv': '\u2263',
  '\\leq': '\u2264',
  '\\geq': '\u2265',
  '\\leqq': '\u2266',
  '\\geqq': '\u2267',
  '\\lneqq': '\u2268',
  '\\gneqq': '\u2269',
  '\\ll': '\u226A',
  '\\gg': '\u226B',
  '\\between': '\u226C',
  '{\\not\\kern-0.3em\\times}': '\u226D',
  '\\not<': '\u226E',
  '\\not>': '\u226F',
  '\\not\\leq': '\u2270',
  '\\not\\geq': '\u2271',
  '\\lessequivlnt': '\u2272',
  '\\greaterequivlnt': '\u2273',
  '\\ElsevierGlyph{2274}': '\u2274',
  '\\ElsevierGlyph{2275}': '\u2275',
  '\\lessgtr': '\u2276',
  '\\gtrless': '\u2277',
  '\\notlessgreater': '\u2278',
  '\\notgreaterless': '\u2279',
  '\\prec': '\u227A',
  '\\succ': '\u227B',
  '\\preccurlyeq': '\u227C',
  '\\succcurlyeq': '\u227D',
  '\\precapprox': '\u2AB7',
  '\\succapprox': '\u2AB8',
  '\\not\\prec': '\u2280',
  '\\not\\succ': '\u2281',
  '\\subset': '\u2282',
  '\\supset': '\u2283',
  '\\not\\subset': '\u2284',
  '\\not\\supset': '\u2285',
  '\\subseteq': '\u2286',
  '\\supseteq': '\u2287',
  '\\not\\subseteq': '\u2288',
  '\\not\\supseteq': '\u2289',
  '\\subsetneq': '\u228A',
  '\\supsetneq': '\u228B',
  '\\cupleftarrow': '\u228C',
  '\\cupdot': '\u228D',
  '\\uplus': '\u228E',
  '\\sqsubset': '\u228F',
  '\\sqsupset': '\u2290',
  '\\sqsubseteq': '\u2291',
  '\\sqsupseteq': '\u2292',
  '\\sqcap': '\u2293',
  '\\sqcup': '\u2294',
  '\\oplus': '\u2295',
  '\\ominus': '\u2296',
  '\\otimes': '\u2297',
  '\\oslash': '\u2298',
  '\\odot': '\u2299',
  '\\circledcirc': '\u229A',
  '\\circledast': '\u229B',
  '\\circledequal': '\u229C',
  '\\circleddash': '\u229D',
  '\\boxplus': '\u229E',
  '\\boxminus': '\u229F',
  '\\boxtimes': '\u22A0',
  '\\boxdot': '\u22A1',
  '\\vdash': '\u22A2',
  '\\dashv': '\u22A3',
  '\\top': '\u22A4',
  '\\perp': '\u27C2',
  '\\assert': '\u22A6',
  '\\truestate': '\u22A7',
  '\\forcesextra': '\u22A8',
  '\\Vdash': '\u22A9',
  '\\Vvdash': '\u22AA',
  '\\VDash': '\u22AB',
  '\\nvdash': '\u22AC',
  '\\nvDash': '\u22AD',
  '\\nVdash': '\u22AE',
  '\\nVDash': '\u22AF',
  '\\prurel': '\u22B0',
  '\\scurel': '\u22B1',
  '\\vartriangleleft': '\u22B2',
  '\\vartriangleright': '\u22B3',
  '\\trianglelefteq': '\u22B4',
  '\\trianglerighteq': '\u22B5',
  '\\original': '\u22B6',
  '\\image': '\u22B7',
  '\\multimap': '\u22B8',
  '\\hermitconjmatrix': '\u22B9',
  '\\intercal': '\u22BA',
  '\\veebar': '\u22BB',
  '\\barwedge': '\u2305',
  '\\barvee': '\u22BD',
  '\\rightanglearc': '\u22BE',
  '\\varlrtriangle': '\u22BF',
  '\\ElsevierGlyph{22C0}': '\u22C0',
  '\\ElsevierGlyph{22C1}': '\u22C1',
  '\\bigcap': '\u22C2',
  '\\bigcup': '\u22C3',
  '\\diamond': '\u2662',
  '\\star': '\u22C6',
  '\\divideontimes': '\u22C7',
  '\\bowtie': '\u22C8',
  '\\ltimes': '\u22C9',
  '\\rtimes': '\u22CA',
  '\\leftthreetimes': '\u22CB',
  '\\rightthreetimes': '\u22CC',
  '\\backsimeq': '\u22CD',
  '\\curlyvee': '\u22CE',
  '\\curlywedge': '\u22CF',
  '\\Subset': '\u22D0',
  '\\Supset': '\u22D1',
  '\\Cap': '\u22D2',
  '\\Cup': '\u22D3',
  '\\pitchfork': '\u22D4',
  '\\hash': '\u22D5',
  '\\lessdot': '\u22D6',
  '\\gtrdot': '\u22D7',
  '\\verymuchless': '\u22D8',
  '\\verymuchgreater': '\u22D9',
  '\\lesseqgtr': '\u22DA',
  '\\gtreqless': '\u22DB',
  '\\eqless': '\u22DC',
  '\\eqgtr': '\u22DD',
  '\\curlyeqprec': '\u22DE',
  '\\curlyeqsucc': '\u22DF',
  '\\npreceq': '\u22E0',
  '\\nsucceq': '\u22E1',
  '\\not\\sqsubseteq': '\u22E2',
  '\\not\\sqsupseteq': '\u22E3',
  '\\sqsubsetneq': '\u22E4',
  '\\Elzsqspne': '\u22E5',
  '\\lnsim': '\u22E6',
  '\\gnsim': '\u22E7',
  '\\precedesnotsimilar': '\u22E8',
  '\\succnsim': '\u22E9',
  '\\ntriangleleft': '\u22EA',
  '\\ntriangleright': '\u22EB',
  '\\ntrianglelefteq': '\u22EC',
  '\\ntrianglerighteq': '\u22ED',
  '\\vdots': '\u22EE',
  '\\cdots': '\u22EF',
  '\\upslopeellipsis': '\u22F0',
  '\\downslopeellipsis': '\u22F1',
  '\\disin': '\u22F2',
  '\\varisins': '\u22F3',
  '\\isins': '\u22F4',
  '\\isindot': '\u22F5',
  '\\barin': '\u22F6',
  '\\isinobar': '\u22F7',
  '\\isinvb': '\u22F8',
  '\\isinE': '\u22F9',
  '\\nisd': '\u22FA',
  '\\varnis': '\u22FB',
  '\\nis': '\u22FC',
  '\\varniobar': '\u22FD',
  '\\niobar': '\u22FE',
  '\\bagmember': '\u22FF',
  '\\diameter': '\u2300',
  '\\house': '\u2302',
  '\\varbarwedge': '\u2305',
  '\\perspcorrespond': '\u2A5E',
  '\\lceil': '\u2308',
  '\\rceil': '\u2309',
  '\\lfloor': '\u230A',
  '\\rfloor': '\u230B',
  '\\invneg': '\u2310',
  '\\wasylozenge': '\u2311',
  '\\profline': '\u2312',
  '\\profsurf': '\u2313',
  '\\recorder': '\u2315',
  '{\\mathchar"2208}': '\u2316',
  '\\viewdata': '\u2317',
  '\\turnednot': '\u2319',
  '\\ulcorner': '\u231C',
  '\\urcorner': '\u231D',
  '\\llcorner': '\u231E',
  '\\lrcorner': '\u231F',
  '\\inttop': '\u2320',
  '\\intbottom': '\u2321',
  '\\frown': '\u2322',
  '\\smile': '\u2323',
  '\\langle': '\u3008',
  '\\rangle': '\u3009',
  '\\varhexagonlrbonds': '\u232C',
  '\\conictaper': '\u2332',
  '\\topbot': '\u2336',
  '\\APLinv': '\u2339',
  '\\ElsevierGlyph{E838}': '\u233D',
  '\\notslash': '\u233F',
  '\\notbackslash': '\u2340',
  '\\APLleftarrowbox': '\u2347',
  '\\APLrightarrowbox': '\u2348',
  '\\invdiameter': '\u2349',
  '\\APLuparrowbox': '\u2350',
  '\\APLboxupcaret': '\u2353',
  '\\APLdownarrowbox': '\u2357',
  '\\APLcomment': '\u235D',
  '\\APLinput': '\u235E',
  '\\APLlog': '\u235F',
  '\\APLboxquestion': '\u2370',
  '\\rangledownzigzagarrow': '\u237C',
  '\\hexagon': '\u2394',
  '\\lparenuend': '\u239B',
  '\\lparenextender': '\u239C',
  '\\lparenlend': '\u239D',
  '\\rparenuend': '\u239E',
  '\\rparenextender': '\u239F',
  '\\rparenlend': '\u23A0',
  '\\lbrackuend': '\u23A1',
  '\\lbrackextender': '\u23A2',
  '\\Elzdlcorn': '\u23A3',
  '\\rbrackuend': '\u23A4',
  '\\rbrackextender': '\u23A5',
  '\\rbracklend': '\u23A6',
  '\\lbraceuend': '\u23A7',
  '\\lbracemid': '\u23A8',
  '\\lbracelend': '\u23A9',
  '\\vbraceextender': '\u23AA',
  '\\rbraceuend': '\u23AB',
  '\\rbracemid': '\u23AC',
  '\\rbracelend': '\u23AD',
  '\\intextender': '\u23AE',
  '\\harrowextender': '\u23AF',
  '\\lmoustache': '\u23B0',
  '\\rmoustache': '\u23B1',
  '\\sumtop': '\u23B2',
  '\\sumbottom': '\u23B3',
  '\\overbracket': '\u23B4',
  '\\underbracket': '\u23B5',
  '\\bbrktbrk': '\u23B6',
  '\\sqrtbottom': '\u23B7',
  '\\lvboxline': '\u23B8',
  '\\rvboxline': '\u23B9',
  '\\varcarriagereturn': '\u23CE',
  '\\overparen': '\u23DC',
  '\\underparen': '\u23DD',
  '\\overbrace': '\u23DE',
  '\\underbrace': '\u23DF',
  '\\obrbrak': '\u23E0',
  '\\ubrbrak': '\u23E1',
  '\\trapezium': '\u23E2',
  '\\benzenr': '\u23E3',
  '\\strns': '\u23E4',
  '\\fltns': '\u23E5',
  '\\accurrent': '\u23E6',
  '\\elinters': '\u23E7',
  '\\textvisiblespace': '\u2423',
  '\\ding{172}': '\u2460',
  '\\ding{173}': '\u2461',
  '\\ding{174}': '\u2462',
  '\\ding{175}': '\u2463',
  '\\ding{176}': '\u2464',
  '\\ding{177}': '\u2465',
  '\\ding{178}': '\u2466',
  '\\ding{179}': '\u2467',
  '\\ding{180}': '\u2468',
  '\\ding{181}': '\u2469',
  '\\circledS': '\u24C8',
  '\\Elzdshfnc': '\u2506',
  '\\Elzsqfnw': '\u2519',
  '\\diagup': '\u2571',
  '\\': '\\',
  '\\blockuphalf': '\u2580',
  '\\blocklowhalf': '\u2584',
  '\\blockfull': '\u2588',
  '\\blocklefthalf': '\u258C',
  '\\blockrighthalf': '\u2590',
  '\\blockqtrshaded': '\u2591',
  '\\blockhalfshaded': '\u2592',
  '\\blockthreeqtrshaded': '\u2593',
  '\\mdlgblksquare': '\u25A0',
  '\\ding{110}': '\u25A0',
  '\\square': '\u2B1C',
  '\\squoval': '\u25A2',
  '\\blackinwhitesquare': '\u25A3',
  '\\squarehfill': '\u25A4',
  '\\squarevfill': '\u25A5',
  '\\squarehvfill': '\u25A6',
  '\\squarenwsefill': '\u25A7',
  '\\squareneswfill': '\u25A8',
  '\\squarecrossfill': '\u25A9',
  '\\blacksquare': '\u2B1B',
  '\\smwhtsquare': '\u25AB',
  '\\hrectangleblack': '\u25AC',
  '\\fbox{~~}': '\u25AD',
  '\\vrectangleblack': '\u25AE',
  '\\Elzvrecto': '\u25AF',
  '\\parallelogramblack': '\u25B0',
  '\\ElsevierGlyph{E381}': '\u25B1',
  '\\bigblacktriangleup': '\u25B2',
  '\\ding{115}': '\u25B2',
  '\\bigtriangleup': '\u25B3',
  '\\blacktriangle': '\u25B4',
  '\\vartriangle': '\u25B5',
  '\\RHD': '\u25B6',
  '\\rhd': '\u25B7',
  '\\blacktriangleright': '\u25B8',
  '\\triangleright': '\u25B9',
  '\\blackpointerright': '\u25BA',
  '\\whitepointerright': '\u25BB',
  '\\bigblacktriangledown': '\u25BC',
  '\\ding{116}': '\u25BC',
  '\\bigtriangledown': '\u25BD',
  '\\blacktriangledown': '\u25BE',
  '\\triangledown': '\u25BF',
  '\\LHD': '\u25C0',
  '\\lhd': '\u25C1',
  '\\blacktriangleleft': '\u25C2',
  '\\triangleleft': '\u25C3',
  '\\blackpointerleft': '\u25C4',
  '\\whitepointerleft': '\u25C5',
  '\\Diamondblack': '\u25C6',
  '\\ding{117}': '\u25C6',
  '\\Diamond': '\u25C7',
  '\\blackinwhitediamond': '\u25C8',
  '\\fisheye': '\u25C9',
  '\\lozenge': '\u25CA',
  '\\bigcirc': '\u25EF',
  '\\dottedcircle': '\u25CC',
  '\\circlevertfill': '\u25CD',
  '\\bullseye': '\u25CE',
  '\\CIRCLE': '\u25CF',
  '\\ding{108}': '\u25CF',
  '\\Elzcirfl': '\u25D0',
  '\\Elzcirfr': '\u25D1',
  '\\Elzcirfb': '\u25D2',
  '\\circletophalfblack': '\u25D3',
  '\\circleurquadblack': '\u25D4',
  '\\blackcircleulquadwhite': '\u25D5',
  '\\LEFTCIRCLE': '\u25D6',
  '\\RIGHTCIRCLE': '\u25D7',
  '\\ding{119}': '\u25D7',
  '\\Elzrvbull': '\u25D8',
  '\\inversewhitecircle': '\u25D9',
  '\\invwhiteupperhalfcircle': '\u25DA',
  '\\invwhitelowerhalfcircle': '\u25DB',
  '\\ularc': '\u25DC',
  '\\urarc': '\u25DD',
  '\\lrarc': '\u25DE',
  '\\llarc': '\u25DF',
  '\\topsemicircle': '\u25E0',
  '\\botsemicircle': '\u25E1',
  '\\lrblacktriangle': '\u25E2',
  '\\llblacktriangle': '\u25E3',
  '\\ulblacktriangle': '\u25E4',
  '\\urblacktriangle': '\u25E5',
  '\\smwhtcircle': '\u25E6',
  '\\Elzsqfl': '\u25E7',
  '\\Elzsqfr': '\u25E8',
  '\\squareulblack': '\u25E9',
  '\\Elzsqfse': '\u25EA',
  '\\boxbar': '\u25EB',
  '\\trianglecdot': '\u25EC',
  '\\triangleleftblack': '\u25ED',
  '\\trianglerightblack': '\u25EE',
  '\\squareulquad': '\u25F0',
  '\\squarellquad': '\u25F1',
  '\\squarelrquad': '\u25F2',
  '\\squareurquad': '\u25F3',
  '\\circleulquad': '\u25F4',
  '\\circlellquad': '\u25F5',
  '\\circlelrquad': '\u25F6',
  '\\circleurquad': '\u25F7',
  '\\ultriangle': '\u25F8',
  '\\urtriangle': '\u25F9',
  '\\lltriangle': '\u25FA',
  '\\mdsmwhtsquare': '\u25FD',
  '\\mdsmblksquare': '\u25FE',
  '\\lrtriangle': '\u25FF',
  '\\bigstar': '\u2605',
  '\\ding{72}': '\u2605',
  '\\bigwhitestar': '\u2606',
  '\\ding{73}': '\u2729',
  '\\Sun': '\u2609',
  '\\ding{37}': '\u260E',
  '\\Square': '\u2610',
  '\\CheckedBox': '\u2611',
  '\\XBox': '\u2612',
  '\\steaming': '\u2615',
  '\\ding{42}': '\u261B',
  '\\pointright': '\u261E',
  '\\ding{43}': '\u261E',
  '\\skull': '\u2620',
  '\\danger': '\u2621',
  '\\radiation': '\u2622',
  '\\biohazard': '\u2623',
  '\\yinyang': '\u262F',
  '\\frownie': '\u2639',
  '\\smiley': '\u263A',
  '\\blacksmiley': '\u263B',
  '\\sun': '\u263C',
  '\\rightmoon': '\u263E',
  '\\leftmoon': '\u263E',
  '\\mercury': '\u263F',
  '\\female': '\u2640',
  '\\venus': '\u2640',
  '\\earth': '\u2641',
  '\\male': '\u2642',
  '\\jupiter': '\u2643',
  '\\saturn': '\u2644',
  '\\uranus': '\u2645',
  '\\neptune': '\u2646',
  '\\pluto': '\u2647',
  '\\aries': '\u2648',
  '\\taurus': '\u2649',
  '\\gemini': '\u264A',
  '\\cancer': '\u264B',
  '\\leo': '\u264C',
  '\\virgo': '\u264D',
  '\\libra': '\u264E',
  '\\scorpio': '\u264F',
  '\\sagittarius': '\u2650',
  '\\capricornus': '\u2651',
  '\\aquarius': '\u2652',
  '\\pisces': '\u2653',
  '\\spadesuit': '\u2660',
  '\\ding{171}': '\u2660',
  '\\heartsuit': '\u2661',
  '\\clubsuit': '\u2663',
  '\\ding{168}': '\u2663',
  '\\varspadesuit': '\u2664',
  '\\varheartsuit': '\u2665',
  '\\ding{170}': '\u2665',
  '\\vardiamondsuit': '\u2666',
  '\\ding{169}': '\u2666',
  '\\varclubsuit': '\u2667',
  '\\quarternote': '\u2669',
  '\\eighthnote': '\u266A',
  '\\twonotes': '\u266B',
  '\\sixteenthnote': '\u266C',
  '\\flat': '\u266D',
  '\\natural': '\u266E',
  '\\sharp': '\u266F',
  '\\recycle': '\u267B',
  '\\acidfree': '\u267E',
  '\\dicei': '\u2680',
  '\\diceii': '\u2681',
  '\\diceiii': '\u2682',
  '\\diceiv': '\u2683',
  '\\dicev': '\u2684',
  '\\dicevi': '\u2685',
  '\\circledrightdot': '\u2686',
  '\\circledtwodots': '\u2687',
  '\\blackcircledrightdot': '\u2688',
  '\\blackcircledtwodots': '\u2689',
  '\\anchor': '\u2693',
  '\\swords': '\u2694',
  '\\warning': '\u26A0',
  '\\Hermaphrodite': '\u26A5',
  '\\medcirc': '\u26AA',
  '\\medbullet': '\u26AB',
  '\\mdsmwhtcircle': '\u26AC',
  '\\neuter': '\u26B2',
  '\\ding{33}': '\u2701',
  '\\ding{34}': '\u2702',
  '\\ding{35}': '\u2703',
  '\\ding{36}': '\u2704',
  '\\ding{38}': '\u2706',
  '\\ding{39}': '\u2707',
  '\\ding{40}': '\u2708',
  '\\ding{41}': '\u2709',
  '\\ding{44}': '\u270C',
  '\\ding{45}': '\u270D',
  '\\pencil': '\u270E',
  '\\ding{46}': '\u270E',
  '\\ding{47}': '\u270F',
  '\\ding{48}': '\u2710',
  '\\ding{49}': '\u2711',
  '\\ding{50}': '\u2712',
  '\\checkmark': '\u2713',
  '\\ding{51}': '\u2713',
  '\\ding{52}': '\u2714',
  '\\ding{53}': '\u2715',
  '\\ding{54}': '\u2716',
  '\\ballotx': '\u2717',
  '\\ding{55}': '\u2717',
  '\\ding{56}': '\u2718',
  '\\ding{57}': '\u2719',
  '\\ding{58}': '\u271A',
  '\\ding{59}': '\u271B',
  '\\ding{60}': '\u271C',
  '\\ding{61}': '\u271D',
  '\\ding{62}': '\u271E',
  '\\ding{63}': '\u271F',
  '\\maltese': '\u2720',
  '\\ding{64}': '\u2720',
  '\\ding{65}': '\u2721',
  '\\ding{66}': '\u2722',
  '\\ding{67}': '\u2723',
  '\\ding{68}': '\u2724',
  '\\ding{69}': '\u2725',
  '\\ding{70}': '\u2726',
  '\\ding{71}': '\u2727',
  '\\circledstar': '\u272A',
  '\\ding{74}': '\u272A',
  '\\ding{75}': '\u272B',
  '\\ding{76}': '\u272C',
  '\\ding{77}': '\u272D',
  '\\ding{78}': '\u272E',
  '\\ding{79}': '\u272F',
  '\\ding{80}': '\u2730',
  '\\ding{81}': '\u2731',
  '\\ding{82}': '\u2732',
  '\\ding{83}': '\u2733',
  '\\ding{84}': '\u2734',
  '\\ding{85}': '\u2735',
  '\\varstar': '\u2736',
  '\\ding{86}': '\u2736',
  '\\ding{87}': '\u2737',
  '\\ding{88}': '\u2738',
  '\\ding{89}': '\u2739',
  '\\ding{90}': '\u273A',
  '\\ding{91}': '\u273B',
  '\\ding{92}': '\u273C',
  '\\dingasterisk': '\u273D',
  '\\ding{93}': '\u273D',
  '\\ding{94}': '\u273E',
  '\\ding{95}': '\u273F',
  '\\ding{96}': '\u2740',
  '\\ding{97}': '\u2741',
  '\\ding{98}': '\u2742',
  '\\ding{99}': '\u2743',
  '\\ding{100}': '\u2744',
  '\\ding{101}': '\u2745',
  '\\ding{102}': '\u2746',
  '\\ding{103}': '\u2747',
  '\\ding{104}': '\u2748',
  '\\ding{105}': '\u2749',
  '\\ding{106}': '\u274A',
  '\\ding{107}': '\u274B',
  '\\ding{109}': '\u274D',
  '\\ding{111}': '\u274F',
  '\\ding{112}': '\u2750',
  '\\ding{113}': '\u2751',
  '\\ding{114}': '\u2752',
  '\\ding{118}': '\u2756',
  '\\ding{120}': '\u2758',
  '\\ding{121}': '\u2759',
  '\\ding{122}': '\u275A',
  '\\ding{123}': '\u275B',
  '\\ding{124}': '\u275C',
  '\\ding{125}': '\u275D',
  '\\ding{126}': '\u275E',
  '\\ding{161}': '\u2761',
  '\\ding{162}': '\u2762',
  '\\ding{163}': '\u2763',
  '\\ding{164}': '\u2764',
  '\\ding{165}': '\u2765',
  '\\ding{166}': '\u2766',
  '\\ding{167}': '\u2767',
  '\\lbrbrak': '\u3014',
  '\\rbrbrak': '\u3015',
  '\\ding{182}': '\u2776',
  '\\ding{183}': '\u2777',
  '\\ding{184}': '\u2778',
  '\\ding{185}': '\u2779',
  '\\ding{186}': '\u277A',
  '\\ding{187}': '\u277B',
  '\\ding{188}': '\u277C',
  '\\ding{189}': '\u277D',
  '\\ding{190}': '\u277E',
  '\\ding{191}': '\u277F',
  '\\ding{192}': '\u2780',
  '\\ding{193}': '\u2781',
  '\\ding{194}': '\u2782',
  '\\ding{195}': '\u2783',
  '\\ding{196}': '\u2784',
  '\\ding{197}': '\u2785',
  '\\ding{198}': '\u2786',
  '\\ding{199}': '\u2787',
  '\\ding{200}': '\u2788',
  '\\ding{201}': '\u2789',
  '\\ding{202}': '\u278A',
  '\\ding{203}': '\u278B',
  '\\ding{204}': '\u278C',
  '\\ding{205}': '\u278D',
  '\\ding{206}': '\u278E',
  '\\ding{207}': '\u278F',
  '\\ding{208}': '\u2790',
  '\\ding{209}': '\u2791',
  '\\ding{210}': '\u2792',
  '\\ding{211}': '\u2793',
  '\\ding{212}': '\u2794',
  '\\ding{216}': '\u2798',
  '\\ding{217}': '\u2799',
  '\\ding{218}': '\u279A',
  '\\draftingarrow': '\u279B',
  '\\ding{219}': '\u279B',
  '\\ding{220}': '\u279C',
  '\\ding{221}': '\u279D',
  '\\ding{222}': '\u279E',
  '\\ding{223}': '\u279F',
  '\\ding{224}': '\u27A0',
  '\\ding{225}': '\u27A1',
  '\\arrowbullet': '\u27A2',
  '\\ding{226}': '\u27A2',
  '\\ding{227}': '\u27A3',
  '\\ding{228}': '\u27A4',
  '\\ding{229}': '\u27A5',
  '\\ding{230}': '\u27A6',
  '\\ding{231}': '\u27A7',
  '\\ding{232}': '\u27A8',
  '\\ding{233}': '\u27A9',
  '\\ding{234}': '\u27AA',
  '\\ding{235}': '\u27AB',
  '\\ding{236}': '\u27AC',
  '\\ding{237}': '\u27AD',
  '\\ding{238}': '\u27AE',
  '\\ding{239}': '\u27AF',
  '\\ding{241}': '\u27B1',
  '\\ding{242}': '\u27B2',
  '\\ding{243}': '\u27B3',
  '\\ding{244}': '\u27B4',
  '\\ding{245}': '\u27B5',
  '\\ding{246}': '\u27B6',
  '\\ding{247}': '\u27B7',
  '\\ding{248}': '\u27B8',
  '\\ding{249}': '\u27B9',
  '\\ding{250}': '\u27BA',
  '\\ding{251}': '\u27BB',
  '\\ding{252}': '\u27BC',
  '\\ding{253}': '\u27BD',
  '\\ding{254}': '\u27BE',
  '\\threedangle': '\u27C0',
  '\\whiteinwhitetriangle': '\u27C1',
  '\\subsetcirc': '\u27C3',
  '\\supsetcirc': '\u27C4',
  '\\Lbag': '\u27C5',
  '\\Rbag': '\u27C6',
  '\\veedot': '\u27C7',
  '\\bsolhsub': '\u27C8',
  '\\suphsol': '\u27C9',
  '\\longdivision': '\u27CC',
  '\\Diamonddot': '\u27D0',
  '\\wedgedot': '\u27D1',
  '\\upin': '\u27D2',
  '\\pullback': '\u27D3',
  '\\pushout': '\u27D4',
  '\\leftouterjoin': '\u27D5',
  '\\rightouterjoin': '\u27D6',
  '\\fullouterjoin': '\u27D7',
  '\\bigbot': '\u27D8',
  '\\bigtop': '\u27D9',
  '\\DashVDash': '\u27DA',
  '\\dashVdash': '\u27DB',
  '\\multimapinv': '\u27DC',
  '\\vlongdash': '\u27DD',
  '\\longdashv': '\u27DE',
  '\\cirbot': '\u27DF',
  '\\lozengeminus': '\u27E0',
  '\\concavediamond': '\u27E1',
  '\\concavediamondtickleft': '\u27E2',
  '\\concavediamondtickright': '\u27E3',
  '\\whitesquaretickleft': '\u27E4',
  '\\whitesquaretickright': '\u27E5',
  '\\llbracket': '\u27E6',
  '\\rrbracket': '\u27E7',
  '\\lang': '\u27EA',
  '\\rang': '\u27EB',
  '\\Lbrbrak': '\u27EC',
  '\\Rbrbrak': '\u27ED',
  '\\lgroup': '\u27EE',
  '\\rgroup': '\u27EF',
  '\\UUparrow': '\u27F0',
  '\\DDownarrow': '\u27F1',
  '\\acwgapcirclearrow': '\u27F2',
  '\\cwgapcirclearrow': '\u27F3',
  '\\rightarrowonoplus': '\u27F4',
  '\\longleftarrow': '\u27F5',
  '\\longrightarrow': '\u27F6',
  '\\longleftrightarrow': '\u27F7',
  '\\Longleftarrow': '\u27F8',
  '\\Longrightarrow': '\u27F9',
  '\\Longleftrightarrow': '\u27FA',
  '\\longmapsfrom': '\u27FB',
  '\\longmapsto': '\u27FC',
  '\\Longmapsfrom': '\u27FD',
  '\\Longmapsto': '\u27FE',
  '\\sim\\joinrel\\leadsto': '\u27FF',
  '\\psur': '\u2900',
  '\\nVtwoheadrightarrow': '\u2901',
  '\\nvLeftarrow': '\u2902',
  '\\nvRightarrow': '\u2903',
  '\\nvLeftrightarrow': '\u2904',
  '\\ElsevierGlyph{E212}': '\u2905',
  '\\Mapsfrom': '\u2906',
  '\\Mapsto': '\u2907',
  '\\downarrowbarred': '\u2908',
  '\\uparrowbarred': '\u2909',
  '\\Uuparrow': '\u290A',
  '\\Ddownarrow': '\u290B',
  '\\leftbkarrow': '\u290C',
  '\\rightbkarrow': '\u290D',
  '\\leftdbkarrow': '\u290E',
  '\\dbkarow': '\u290F',
  '\\drbkarow': '\u2910',
  '\\rightdotarrow': '\u2911',
  '\\UpArrowBar': '\u2912',
  '\\DownArrowBar': '\u2913',
  '\\pinj': '\u2914',
  '\\finj': '\u2915',
  '\\bij': '\u2916',
  '\\nvtwoheadrightarrowtail': '\u2917',
  '\\nVtwoheadrightarrowtail': '\u2918',
  '\\lefttail': '\u2919',
  '\\righttail': '\u291A',
  '\\leftdbltail': '\u291B',
  '\\rightdbltail': '\u291C',
  '\\diamondleftarrow': '\u291D',
  '\\rightarrowdiamond': '\u291E',
  '\\diamondleftarrowbar': '\u291F',
  '\\barrightarrowdiamond': '\u2920',
  '\\nwsearrow': '\u2921',
  '\\neswarrow': '\u2922',
  '\\ElsevierGlyph{E20C}': '\u2923',
  '\\ElsevierGlyph{E20D}': '\u2924',
  '\\ElsevierGlyph{E20B}': '\u2925',
  '\\ElsevierGlyph{E20A}': '\u2926',
  '\\ElsevierGlyph{E211}': '\u2927',
  '\\ElsevierGlyph{E20E}': '\u2928',
  '\\ElsevierGlyph{E20F}': '\u2929',
  '\\ElsevierGlyph{E210}': '\u292A',
  '\\rdiagovfdiag': '\u292B',
  '\\fdiagovrdiag': '\u292C',
  '\\seovnearrow': '\u292D',
  '\\neovsearrow': '\u292E',
  '\\fdiagovnearrow': '\u292F',
  '\\rdiagovsearrow': '\u2930',
  '\\neovnwarrow': '\u2931',
  '\\nwovnearrow': '\u2932',
  '\\ElsevierGlyph{E21C}': '\u2933',
  '\\uprightcurvearrow': '\u2934',
  '\\downrightcurvedarrow': '\u2935',
  '\\ElsevierGlyph{E21A}': '\u2936',
  '\\ElsevierGlyph{E219}': '\u2937',
  '\\cwrightarcarrow': '\u2938',
  '\\acwleftarcarrow': '\u2939',
  '\\acwoverarcarrow': '\u293A',
  '\\acwunderarcarrow': '\u293B',
  '\\curvearrowrightminus': '\u293C',
  '\\curvearrowleftplus': '\u293D',
  '\\cwundercurvearrow': '\u293E',
  '\\ccwundercurvearrow': '\u293F',
  '\\Elolarr': '\u2940',
  '\\Elorarr': '\u2941',
  '\\ElzRlarr': '\u2942',
  '\\leftarrowshortrightarrow': '\u2943',
  '\\ElzrLarr': '\u2944',
  '\\rightarrowplus': '\u2945',
  '\\leftarrowplus': '\u2946',
  '\\Elzrarrx': '\u2947',
  '\\leftrightarrowcircle': '\u2948',
  '\\twoheaduparrowcircle': '\u2949',
  '\\leftrightharpoon': '\u294A',
  '\\rightleftharpoon': '\u294B',
  '\\updownharpoonrightleft': '\u294C',
  '\\updownharpoonleftright': '\u294D',
  '\\LeftRightVector': '\u294E',
  '\\RightUpDownVector': '\u294F',
  '\\DownLeftRightVector': '\u2950',
  '\\LeftUpDownVector': '\u2951',
  '\\LeftVectorBar': '\u2952',
  '\\RightVectorBar': '\u2953',
  '\\RightUpVectorBar': '\u2954',
  '\\RightDownVectorBar': '\u2955',
  '\\DownLeftVectorBar': '\u2956',
  '\\DownRightVectorBar': '\u2957',
  '\\LeftUpVectorBar': '\u2958',
  '\\LeftDownVectorBar': '\u2959',
  '\\LeftTeeVector': '\u295A',
  '\\RightTeeVector': '\u295B',
  '\\RightUpTeeVector': '\u295C',
  '\\RightDownTeeVector': '\u295D',
  '\\DownLeftTeeVector': '\u295E',
  '\\DownRightTeeVector': '\u295F',
  '\\LeftUpTeeVector': '\u2960',
  '\\LeftDownTeeVector': '\u2961',
  '\\leftleftharpoons': '\u2962',
  '\\upupharpoons': '\u2963',
  '\\rightrightharpoons': '\u2964',
  '\\downdownharpoons': '\u2965',
  '\\leftrightharpoonsup': '\u2966',
  '\\leftrightharpoonsdown': '\u2967',
  '\\rightleftharpoonsup': '\u2968',
  '\\rightleftharpoonsdown': '\u2969',
  '\\leftbarharpoon': '\u296A',
  '\\barleftharpoon': '\u296B',
  '\\rightbarharpoon': '\u296C',
  '\\barrightharpoon': '\u296D',
  '\\UpEquilibrium': '\u296E',
  '\\ReverseUpEquilibrium': '\u296F',
  '\\RoundImplies': '\u2970',
  '\\equalrightarrow': '\u2971',
  '\\similarrightarrow': '\u2972',
  '\\leftarrowsimilar': '\u2973',
  '\\rightarrowsimilar': '\u2974',
  '\\rightarrowapprox': '\u2975',
  '\\ltlarr': '\u2976',
  '\\leftarrowless': '\u2977',
  '\\gtrarr': '\u2978',
  '\\subrarr': '\u2979',
  '\\leftarrowsubset': '\u297A',
  '\\suplarr': '\u297B',
  '\\ElsevierGlyph{E214}': '\u297C',
  '\\ElsevierGlyph{E215}': '\u297D',
  '\\upfishtail': '\u297E',
  '\\downfishtail': '\u297F',
  '\\Elztfnc': '\u2980',
  '\\spot': '\u2981',
  '\\typecolon': '\u2982',
  '\\lBrace': '\u2983',
  '\\rBrace': '\u2984',
  '\\ElsevierGlyph{3018}': '\u3018',
  '\\Elroang': '\u2986',
  '\\limg': '\u2987',
  '\\rimg': '\u2988',
  '\\lblot': '\u2989',
  '\\rblot': '\u298A',
  '\\lbrackubar': '\u298B',
  '\\rbrackubar': '\u298C',
  '\\lbrackultick': '\u298D',
  '\\rbracklrtick': '\u298E',
  '\\lbracklltick': '\u298F',
  '\\rbrackurtick': '\u2990',
  '\\langledot': '\u2991',
  '\\rangledot': '\u2992',
  '\\ElsevierGlyph{E291}': '\u2994',
  '\\Lparengtr': '\u2995',
  '\\Rparenless': '\u2996',
  '\\lblkbrbrak': '\u2997',
  '\\rblkbrbrak': '\u2998',
  '\\Elzddfnc': '\u2999',
  '\\vzigzag': '\u299A',
  '\\measuredangleleft': '\u299B',
  '\\Angle': '\u299C',
  '\\rightanglemdot': '\u299D',
  '\\angles': '\u299E',
  '\\angdnr': '\u299F',
  '\\Elzlpargt': '\u29A0',
  '\\sphericalangleup': '\u29A1',
  '\\turnangle': '\u29A2',
  '\\revangle': '\u29A3',
  '\\angleubar': '\u29A4',
  '\\revangleubar': '\u29A5',
  '\\wideangledown': '\u29A6',
  '\\wideangleup': '\u29A7',
  '\\measanglerutone': '\u29A8',
  '\\measanglelutonw': '\u29A9',
  '\\measanglerdtose': '\u29AA',
  '\\measangleldtosw': '\u29AB',
  '\\measangleurtone': '\u29AC',
  '\\measangleultonw': '\u29AD',
  '\\measangledrtose': '\u29AE',
  '\\measangledltosw': '\u29AF',
  '\\revemptyset': '\u29B0',
  '\\emptysetobar': '\u29B1',
  '\\emptysetocirc': '\u29B2',
  '\\emptysetoarr': '\u29B3',
  '\\emptysetoarrl': '\u29B4',
  '\\ElsevierGlyph{E260}': '\u29B5',
  '\\ElsevierGlyph{E61B}': '\u29B6',
  '\\circledparallel': '\u29B7',
  '\\circledbslash': '\u29B8',
  '\\operp': '\u29B9',
  '\\obot': '\u29BA',
  '\\olcross': '\u29BB',
  '\\odotslashdot': '\u29BC',
  '\\uparrowoncircle': '\u29BD',
  '\\circledwhitebullet': '\u29BE',
  '\\circledbullet': '\u29BF',
  '\\circledless': '\u29C0',
  '\\circledgtr': '\u29C1',
  '\\cirscir': '\u29C2',
  '\\cirE': '\u29C3',
  '\\boxslash': '\u29C4',
  '\\boxbslash': '\u29C5',
  '\\boxast': '\u29C6',
  '\\boxcircle': '\u29C7',
  '\\boxbox': '\u29C8',
  '\\boxonbox': '\u29C9',
  '\\ElzLap': '\u29CA',
  '\\Elzdefas': '\u29CB',
  '\\triangles': '\u29CC',
  '\\triangleserifs': '\u29CD',
  '\\rtriltri': '\u29CE',
  '\\LeftTriangleBar': '\u29CF',
  '\\RightTriangleBar': '\u29D0',
  '\\lfbowtie': '\u29D1',
  '\\rfbowtie': '\u29D2',
  '\\fbowtie': '\u29D3',
  '\\lftimes': '\u29D4',
  '\\rftimes': '\u29D5',
  '\\hourglass': '\u29D6',
  '\\blackhourglass': '\u29D7',
  '\\lvzigzag': '\u29D8',
  '\\rvzigzag': '\u29D9',
  '\\Lvzigzag': '\u29DA',
  '\\Rvzigzag': '\u29DB',
  '\\ElsevierGlyph{E372}': '\u29DC',
  '\\tieinfty': '\u29DD',
  '\\nvinfty': '\u29DE',
  '\\multimapboth': '\u29DF',
  '\\laplac': '\u29E0',
  '\\lrtriangleeq': '\u29E1',
  '\\shuffle': '\u29E2',
  '\\eparsl': '\u29E3',
  '\\smeparsl': '\u29E4',
  '\\eqvparsl': '\u29E5',
  '\\gleichstark': '\u29E6',
  '\\thermod': '\u29E7',
  '\\downtriangleleftblack': '\u29E8',
  '\\downtrianglerightblack': '\u29E9',
  '\\blackdiamonddownarrow': '\u29EA',
  '\\blacklozenge': '\u29EB',
  '\\circledownarrow': '\u29EC',
  '\\blackcircledownarrow': '\u29ED',
  '\\errbarsquare': '\u29EE',
  '\\errbarblacksquare': '\u29EF',
  '\\errbardiamond': '\u29F0',
  '\\errbarblackdiamond': '\u29F1',
  '\\errbarcircle': '\u29F2',
  '\\errbarblackcircle': '\u29F3',
  '\\RuleDelayed': '\u29F4',
  '\\dsol': '\u29F6',
  '\\rsolbar': '\u29F7',
  '\\xsol': '\u29F8',
  '\\zhide': '\u29F9',
  '\\doubleplus': '\u29FA',
  '\\tripleplus': '\u29FB',
  '\\lcurvyangle': '\u29FC',
  '\\rcurvyangle': '\u29FD',
  '\\tplus': '\u29FE',
  '\\tminus': '\u29FF',
  '\\bigodot': '\u2A00',
  '\\bigoplus': '\u2A01',
  '\\bigotimes': '\u2A02',
  '\\bigcupdot': '\u2A03',
  '\\Elxuplus': '\u2A04',
  '\\ElzThr': '\u2A05',
  '\\Elxsqcup': '\u2A06',
  '\\ElzInf': '\u2A07',
  '\\ElzSup': '\u2A08',
  '\\varprod': '\u2A09',
  '\\modtwosum': '\u2A0A',
  '\\sumint': '\u2A0B',
  '\\iiiint': '\u2A0C',
  '\\ElzCint': '\u2A0D',
  '\\intBar': '\u2A0E',
  '\\clockoint': '\u2A0F',
  '\\ElsevierGlyph{E395}': '\u2A10',
  '\\awint': '\u2A11',
  '\\rppolint': '\u2A12',
  '\\scpolint': '\u2A13',
  '\\npolint': '\u2A14',
  '\\pointint': '\u2A15',
  '\\sqrint': '\u2A16',
  '\\intlarhk': '\u2A17',
  '\\intx': '\u2A18',
  '\\intcap': '\u2A19',
  '\\intcup': '\u2A1A',
  '\\upint': '\u2A1B',
  '\\lowint': '\u2A1C',
  '\\Join': '\u2A1D',
  '\\bigtriangleleft': '\u2A1E',
  '\\zcmp': '\u2A1F',
  '\\zpipe': '\u2A20',
  '\\zproject': '\u2A21',
  '\\ringplus': '\u2A22',
  '\\plushat': '\u2A23',
  '\\simplus': '\u2A24',
  '\\ElsevierGlyph{E25A}': '\u2A25',
  '\\plussim': '\u2A26',
  '\\plussubtwo': '\u2A27',
  '\\plustrif': '\u2A28',
  '\\commaminus': '\u2A29',
  '\\ElsevierGlyph{E25B}': '\u2A2A',
  '\\minusfdots': '\u2A2B',
  '\\minusrdots': '\u2A2C',
  '\\ElsevierGlyph{E25C}': '\u2A2D',
  '\\ElsevierGlyph{E25D}': '\u2A2E',
  '\\ElzTimes': '\u2A2F',
  '\\dottimes': '\u2A30',
  '\\timesbar': '\u2A31',
  '\\btimes': '\u2A32',
  '\\smashtimes': '\u2A33',
  '\\ElsevierGlyph{E25E}': '\u2A35',
  '\\otimeshat': '\u2A36',
  '\\Otimes': '\u2A37',
  '\\odiv': '\u2A38',
  '\\triangleplus': '\u2A39',
  '\\triangleminus': '\u2A3A',
  '\\triangletimes': '\u2A3B',
  '\\ElsevierGlyph{E259}': '\u2A3C',
  '\\intprodr': '\u2A3D',
  '\\fcmp': '\u2A3E',
  '\\amalg': '\u2A3F',
  '\\capdot': '\u2A40',
  '\\uminus': '\u2A41',
  '\\barcup': '\u2A42',
  '\\barcap': '\u2A43',
  '\\capwedge': '\u2A44',
  '\\cupvee': '\u2A45',
  '\\cupovercap': '\u2A46',
  '\\capovercup': '\u2A47',
  '\\cupbarcap': '\u2A48',
  '\\capbarcup': '\u2A49',
  '\\twocups': '\u2A4A',
  '\\twocaps': '\u2A4B',
  '\\closedvarcup': '\u2A4C',
  '\\closedvarcap': '\u2A4D',
  '\\Sqcap': '\u2A4E',
  '\\Sqcup': '\u2A4F',
  '\\closedvarcupsmashprod': '\u2A50',
  '\\wedgeodot': '\u2A51',
  '\\veeodot': '\u2A52',
  '\\ElzAnd': '\u2A53',
  '\\ElzOr': '\u2A54',
  '\\ElsevierGlyph{E36E}': '\u2A55',
  '\\ElOr': '\u2A56',
  '\\bigslopedvee': '\u2A57',
  '\\bigslopedwedge': '\u2A58',
  '\\veeonwedge': '\u2A59',
  '\\wedgemidvert': '\u2A5A',
  '\\veemidvert': '\u2A5B',
  '\\midbarwedge': '\u2A5C',
  '\\midbarvee': '\u2A5D',
  '\\Elzminhat': '\u2A5F',
  '\\wedgedoublebar': '\u2A60',
  '\\varveebar': '\u2A61',
  '\\doublebarvee': '\u2A62',
  '\\dsub': '\u2A64',
  '\\rsub': '\u2A65',
  '\\eqdot': '\u2A66',
  '\\dotequiv': '\u2A67',
  '\\equivVert': '\u2A68',
  '\\equivVvert': '\u2A69',
  '\\dotsim': '\u2A6A',
  '\\simrdots': '\u2A6B',
  '\\simminussim': '\u2A6C',
  '\\congdot': '\u2A6D',
  '\\stackrel{*}{=}': '\u2A6E',
  '\\hatapprox': '\u2A6F',
  '\\approxeqq': '\u2A70',
  '\\eqqplus': '\u2A71',
  '\\pluseqq': '\u2A72',
  '\\eqqsim': '\u2A73',
  '\\Coloneqq': '\u2A74',
  '\\Equal': '\u2A75',
  '\\Same': '\u2A76',
  '\\ddotseq': '\u2A77',
  '\\equivDD': '\u2A78',
  '\\ltcir': '\u2A79',
  '\\gtcir': '\u2A7A',
  '\\ltquest': '\u2A7B',
  '\\gtquest': '\u2A7C',
  '\\leqslant': '\u2A7D',
  '\\geqslant': '\u2A7E',
  '\\lesdot': '\u2A7F',
  '\\gesdot': '\u2A80',
  '\\lesdoto': '\u2A81',
  '\\gesdoto': '\u2A82',
  '\\lesdotor': '\u2A83',
  '\\gesdotol': '\u2A84',
  '\\lessapprox': '\u2A85',
  '\\gtrapprox': '\u2A86',
  '\\lneq': '\u2A87',
  '\\gneq': '\u2A88',
  '\\lnapprox': '\u2A89',
  '\\gnapprox': '\u2A8A',
  '\\lesseqqgtr': '\u2A8B',
  '\\gtreqqless': '\u2A8C',
  '\\lsime': '\u2A8D',
  '\\gsime': '\u2A8E',
  '\\lsimg': '\u2A8F',
  '\\gsiml': '\u2A90',
  '\\lgE': '\u2A91',
  '\\glE': '\u2A92',
  '\\lesges': '\u2A93',
  '\\gesles': '\u2A94',
  '\\eqslantless': '\u2A95',
  '\\eqslantgtr': '\u2A96',
  '\\elsdot': '\u2A97',
  '\\egsdot': '\u2A98',
  '\\eqqless': '\u2A99',
  '\\eqqgtr': '\u2A9A',
  '\\eqqslantless': '\u2A9B',
  '\\eqqslantgtr': '\u2A9C',
  '\\Pisymbol{ppi020}{117}': '\u2A9D',
  '\\Pisymbol{ppi020}{105}': '\u2A9E',
  '\\simlE': '\u2A9F',
  '\\simgE': '\u2AA0',
  '\\NestedLessLess': '\u2AA1',
  '\\NestedGreaterGreater': '\u2AA2',
  '\\partialmeetcontraction': '\u2AA3',
  '\\glj': '\u2AA4',
  '\\gla': '\u2AA5',
  '\\leftslice': '\u2AA6',
  '\\rightslice': '\u2AA7',
  '\\lescc': '\u2AA8',
  '\\gescc': '\u2AA9',
  '\\smt': '\u2AAA',
  '\\lat': '\u2AAB',
  '\\smte': '\u2AAC',
  '\\late': '\u2AAD',
  '\\bumpeqq': '\u2AAE',
  '\\preceq': '\u2AAF',
  '\\succeq': '\u2AB0',
  '\\precneq': '\u2AB1',
  '\\succneq': '\u2AB2',
  '\\preceqq': '\u2AB3',
  '\\succeqq': '\u2AB4',
  '\\precneqq': '\u2AB5',
  '\\succneqq': '\u2AB6',
  '\\precnapprox': '\u2AB9',
  '\\succnapprox': '\u2ABA',
  '\\llcurly': '\u2ABB',
  '\\ggcurly': '\u2ABC',
  '\\subsetdot': '\u2ABD',
  '\\supsetdot': '\u2ABE',
  '\\subsetplus': '\u2ABF',
  '\\supsetplus': '\u2AC0',
  '\\submult': '\u2AC1',
  '\\supmult': '\u2AC2',
  '\\subedot': '\u2AC3',
  '\\supedot': '\u2AC4',
  '\\subseteqq': '\u2AC5',
  '\\supseteqq': '\u2AC6',
  '\\subsim': '\u2AC7',
  '\\supsim': '\u2AC8',
  '\\subsetapprox': '\u2AC9',
  '\\supsetapprox': '\u2ACA',
  '\\subsetneqq': '\u2ACB',
  '\\supsetneqq': '\u2ACC',
  '\\lsqhook': '\u2ACD',
  '\\rsqhook': '\u2ACE',
  '\\csub': '\u2ACF',
  '\\csup': '\u2AD0',
  '\\csube': '\u2AD1',
  '\\csupe': '\u2AD2',
  '\\subsup': '\u2AD3',
  '\\supsub': '\u2AD4',
  '\\subsub': '\u2AD5',
  '\\supsup': '\u2AD6',
  '\\suphsub': '\u2AD7',
  '\\supdsub': '\u2AD8',
  '\\forkv': '\u2AD9',
  '\\topfork': '\u2ADA',
  '\\mlcp': '\u2ADB',
  '\\forks': '\u2ADD\u0338',
  '\\forksnot': '\u2ADD',
  '\\shortlefttack': '\u2ADE',
  '\\shortdowntack': '\u2ADF',
  '\\shortuptack': '\u2AE0',
  '\\perps': '\u2AE1',
  '\\vDdash': '\u2AE2',
  '\\dashV': '\u2AE3',
  '\\Dashv': '\u2AE4',
  '\\DashV': '\u2AE5',
  '\\varVdash': '\u2AE6',
  '\\Barv': '\u2AE7',
  '\\vBar': '\u2AE8',
  '\\vBarv': '\u2AE9',
  '\\Top': '\u2AEA',
  '\\ElsevierGlyph{E30D}': '\u2AEB',
  '\\Not': '\u2AEC',
  '\\bNot': '\u2AED',
  '\\revnmid': '\u2AEE',
  '\\cirmid': '\u2AEF',
  '\\midcir': '\u2AF0',
  '\\topcir': '\u2AF1',
  '\\nhpar': '\u2AF2',
  '\\parsim': '\u2AF3',
  '\\interleave': '\u2AF4',
  '\\nhVvert': '\u2AF5',
  '\\Elztdcol': '\u2AF6',
  '\\lllnest': '\u2AF7',
  '\\gggnest': '\u2AF8',
  '\\leqqslant': '\u2AF9',
  '\\geqqslant': '\u2AFA',
  '\\trslash': '\u2AFB',
  '\\biginterleave': '\u2AFC',
  '{{/}\\!\\!{/}}': '\u2AFD',
  '\\talloblong': '\u2AFE',
  '\\bigtalloblong': '\u2AFF',
  '\\squaretopblack': '\u2B12',
  '\\squarebotblack': '\u2B13',
  '\\squareurblack': '\u2B14',
  '\\squarellblack': '\u2B15',
  '\\diamondleftblack': '\u2B16',
  '\\diamondrightblack': '\u2B17',
  '\\diamondtopblack': '\u2B18',
  '\\diamondbotblack': '\u2B19',
  '\\dottedsquare': '\u2B1A',
  '\\vysmblksquare': '\u2B1D',
  '\\vysmwhtsquare': '\u2B1E',
  '\\pentagonblack': '\u2B1F',
  '\\pentagon': '\u2B20',
  '\\varhexagon': '\u2B21',
  '\\varhexagonblack': '\u2B22',
  '\\hexagonblack': '\u2B23',
  '\\lgblkcircle': '\u2B24',
  '\\mdblkdiamond': '\u2B25',
  '\\mdwhtdiamond': '\u2B26',
  '\\mdblklozenge': '\u2B27',
  '\\mdwhtlozenge': '\u2B28',
  '\\smblkdiamond': '\u2B29',
  '\\smblklozenge': '\u2B2A',
  '\\smwhtlozenge': '\u2B2B',
  '\\blkhorzoval': '\u2B2C',
  '\\whthorzoval': '\u2B2D',
  '\\blkvertoval': '\u2B2E',
  '\\whtvertoval': '\u2B2F',
  '\\circleonleftarrow': '\u2B30',
  '\\leftthreearrows': '\u2B31',
  '\\leftarrowonoplus': '\u2B32',
  '\\longleftsquigarrow': '\u2B33',
  '\\nvtwoheadleftarrow': '\u2B34',
  '\\nVtwoheadleftarrow': '\u2B35',
  '\\twoheadmapsfrom': '\u2B36',
  '\\twoheadleftdbkarrow': '\u2B37',
  '\\leftdotarrow': '\u2B38',
  '\\nvleftarrowtail': '\u2B39',
  '\\nVleftarrowtail': '\u2B3A',
  '\\twoheadleftarrowtail': '\u2B3B',
  '\\nvtwoheadleftarrowtail': '\u2B3C',
  '\\nVtwoheadleftarrowtail': '\u2B3D',
  '\\leftarrowx': '\u2B3E',
  '\\leftcurvedarrow': '\u2B3F',
  '\\equalleftarrow': '\u2B40',
  '\\bsimilarleftarrow': '\u2B41',
  '\\leftarrowbackapprox': '\u2B42',
  '\\rightarrowgtr': '\u2B43',
  '\\rightarrowsupset': '\u2B44',
  '\\LLeftarrow': '\u2B45',
  '\\RRightarrow': '\u2B46',
  '\\bsimilarrightarrow': '\u2B47',
  '\\rightarrowbackapprox': '\u2B48',
  '\\similarleftarrow': '\u2B49',
  '\\leftarrowapprox': '\u2B4A',
  '\\leftarrowbsimilar': '\u2B4B',
  '\\rightarrowbsimilar': '\u2B4C',
  '\\medwhitestar': '\u2B50',
  '\\medblackstar': '\u2B51',
  '\\smwhitestar': '\u2B52',
  '\\rightpentagonblack': '\u2B53',
  '\\rightpentagon': '\u2B54',
  '\\ElsevierGlyph{300A}': '\u300A',
  '\\ElsevierGlyph{300B}': '\u300B',
  '\\postalmark': '\u3012',
  '\\ElsevierGlyph{3019}': '\u3019',
  '\\openbracketleft': '\u301A',
  '\\openbracketright': '\u301B',
  '\\hzigzag': '\u3030',
  '\\dbend': '\uFFFD',
  '\\NotEqualTilde': '\u2242\u0338',
  '\\not\\apid': '\u224B\u0338',
  '\\NotHumpDownHump': '\u224E\u0338',
  '\\NotHumpEqual': '\u224F\u0338',
  '\\not\\doteq': '\u2250\u0338',
  '\\lvertneqq': '\u2268\uFE00',
  '\\gvertneqq': '\u2269\uFE00',
  '\\NotLessLess': '\u226A\u0338',
  '\\NotGreaterGreater': '\u226B\u0338',
  '\\NotPrecedesTilde': '\u227E\u0338',
  '\\NotSucceedsTilde': '\u227F\u0338',
  '\\varsubsetneqq': '\u228A\uFE00',
  '\\varsupsetneq': '\u228B\uFE00',
  '\\NotSquareSubset': '\u228F\u0338',
  '\\NotSquareSuperset': '\u2290\u0338',
  '\\ElsevierGlyph{E21D}': '\u2933\u0338',
  '\\NotLeftTriangleBar': '\u29CF\u0338',
  '\\NotRightTriangleBar': '\u29D0\u0338',
  '\\nleqslant': '\u2A7D\u0338',
  '\\ngeqslant': '\u2A7E\u0338',
  '\\NotNestedLessLess': '\u2AA1\u0338',
  '\\NotNestedGreaterGreater': '\u2AA2\u0338',
  '\\not\\preceq': '\u2AAF\u0338',
  '\\not\\succeq': '\u2AB0\u0338',
  '\\nsubseteqq': '\u2AC5\u0338',
  '\\nsupseteqq': '\u2AC6\u0338',
  '{\\rlap{\\textbackslash}{{/}\\!\\!{/}}}': '\u2AFD\u20E5',
  '\\mathbf{A}': '\uD835\uDEC2',
  '\\mathbf{B}': '\uD835\uDEC3',
  '\\mathbf{C}': '\uD835\uDC02',
  '\\mathbf{D}': '\uD835\uDC03',
  '\\mathbf{E}': '\uD835\uDEC6',
  '\\mathbf{F}': '\uD835\uDC05',
  '\\mathbf{G}': '\uD835\uDC06',
  '\\mathbf{H}': '\uD835\uDEC8',
  '\\mathbf{I}': '\uD835\uDECA',
  '\\mathbf{J}': '\uD835\uDC09',
  '\\mathbf{K}': '\uD835\uDECB',
  '\\mathbf{L}': '\uD835\uDC0B',
  '\\mathbf{M}': '\uD835\uDC0C',
  '\\mathbf{N}': '\uD835\uDC0D',
  '\\mathbf{O}': '\uD835\uDC0E',
  '\\mathbf{P}': '\uD835\uDED2',
  '\\mathbf{Q}': '\uD835\uDC10',
  '\\mathbf{R}': '\uD835\uDC11',
  '\\mathbf{S}': '\uD835\uDC12',
  '\\mathbf{T}': '\uD835\uDED5',
  '\\mathbf{U}': '\uD835\uDC14',
  '\\mathbf{V}': '\uD835\uDC15',
  '\\mathbf{W}': '\uD835\uDC16',
  '\\mathbf{X}': '\uD835\uDED8',
  '\\mathbf{Y}': '\uD835\uDC18',
  '\\mathbf{Z}': '\uD835\uDEC7',
  '\\mathbf{a}': '\uD835\uDC1A',
  '\\mathbf{b}': '\uD835\uDC1B',
  '\\mathbf{c}': '\uD835\uDC1C',
  '\\mathbf{d}': '\uD835\uDC1D',
  '\\mathbf{e}': '\uD835\uDC1E',
  '\\mathbf{f}': '\uD835\uDC1F',
  '\\mathbf{g}': '\uD835\uDC20',
  '\\mathbf{h}': '\uD835\uDC21',
  '\\mathbf{i}': '\uD835\uDC22',
  '\\mathbf{j}': '\uD835\uDC23',
  '\\mathbf{k}': '\uD835\uDC24',
  '\\mathbf{l}': '\uD835\uDC25',
  '\\mathbf{m}': '\uD835\uDC26',
  '\\mathbf{n}': '\uD835\uDC27',
  '\\mathbf{o}': '\uD835\uDC28',
  '\\mathbf{p}': '\uD835\uDC29',
  '\\mathbf{q}': '\uD835\uDC2A',
  '\\mathbf{r}': '\uD835\uDC2B',
  '\\mathbf{s}': '\uD835\uDC2C',
  '\\mathbf{t}': '\uD835\uDC2D',
  '\\mathbf{u}': '\uD835\uDC2E',
  '\\mathbf{v}': '\uD835\uDC2F',
  '\\mathbf{w}': '\uD835\uDC30',
  '\\mathbf{x}': '\uD835\uDC31',
  '\\mathbf{y}': '\uD835\uDC32',
  '\\mathbf{z}': '\uD835\uDC33',
  '\\mathsl{A}': '\uD835\uDEFC',
  '\\mathsl{B}': '\uD835\uDEFD',
  '\\mathsl{C}': '\uD835\uDC36',
  '\\mathsl{D}': '\uD835\uDC37',
  '\\mathsl{E}': '\uD835\uDF00',
  '\\mathsl{F}': '\uD835\uDC39',
  '\\mathsl{G}': '\uD835\uDC3A',
  '\\mathsl{H}': '\uD835\uDF02',
  '\\mathsl{I}': '\uD835\uDF04',
  '\\mathsl{J}': '\uD835\uDC3D',
  '\\mathsl{K}': '\uD835\uDF05',
  '\\mathsl{L}': '\uD835\uDC3F',
  '\\mathsl{M}': '\uD835\uDC40',
  '\\mathsl{N}': '\uD835\uDC41',
  '\\mathsl{O}': '\uD835\uDC42',
  '\\mathsl{P}': '\uD835\uDF0C',
  '\\mathsl{Q}': '\uD835\uDC44',
  '\\mathsl{R}': '\uD835\uDC45',
  '\\mathsl{S}': '\uD835\uDC46',
  '\\mathsl{T}': '\uD835\uDF0F',
  '\\mathsl{U}': '\uD835\uDC48',
  '\\mathsl{V}': '\uD835\uDC49',
  '\\mathsl{W}': '\uD835\uDC4A',
  '\\mathsl{X}': '\uD835\uDF12',
  '\\mathsl{Y}': '\uD835\uDC4C',
  '\\mathsl{Z}': '\uD835\uDF01',
  '\\mathsl{a}': '\uD835\uDC4E',
  '\\mathsl{b}': '\uD835\uDC4F',
  '\\mathsl{c}': '\uD835\uDC50',
  '\\mathsl{d}': '\uD835\uDC51',
  '\\mathsl{e}': '\uD835\uDC52',
  '\\mathsl{f}': '\uD835\uDC53',
  '\\mathsl{g}': '\uD835\uDC54',
  '\\mathsl{i}': '\uD835\uDC56',
  '\\mathsl{j}': '\uD835\uDC57',
  '\\mathsl{k}': '\uD835\uDC58',
  '\\mathsl{l}': '\uD835\uDC59',
  '\\mathsl{m}': '\uD835\uDC5A',
  '\\mathsl{n}': '\uD835\uDC5B',
  '\\mathsl{o}': '\uD835\uDC5C',
  '\\mathsl{p}': '\uD835\uDC5D',
  '\\mathsl{q}': '\uD835\uDC5E',
  '\\mathsl{r}': '\uD835\uDC5F',
  '\\mathsl{s}': '\uD835\uDC60',
  '\\mathsl{t}': '\uD835\uDC61',
  '\\mathsl{u}': '\uD835\uDC62',
  '\\mathsl{v}': '\uD835\uDC63',
  '\\mathsl{w}': '\uD835\uDC64',
  '\\mathsl{x}': '\uD835\uDC65',
  '\\mathsl{y}': '\uD835\uDC66',
  '\\mathsl{z}': '\uD835\uDC67',
  '\\mathbit{A}': '\uD835\uDF36',
  '\\mathbit{B}': '\uD835\uDF37',
  '\\mathbit{C}': '\uD835\uDC6A',
  '\\mathbit{D}': '\uD835\uDC6B',
  '\\mathbit{E}': '\uD835\uDF3A',
  '\\mathbit{F}': '\uD835\uDC6D',
  '\\mathbit{G}': '\uD835\uDC6E',
  '\\mathbit{H}': '\uD835\uDF3C',
  '\\mathbit{I}': '\uD835\uDF3E',
  '\\mathbit{J}': '\uD835\uDC71',
  '\\mathbit{K}': '\uD835\uDF3F',
  '\\mathbit{L}': '\uD835\uDC73',
  '\\mathbit{M}': '\uD835\uDC74',
  '\\mathbit{N}': '\uD835\uDC75',
  '\\mathbit{O}': '\uD835\uDF2D',
  '\\mathbit{P}': '\uD835\uDF46',
  '\\mathbit{Q}': '\uD835\uDC78',
  '\\mathbit{R}': '\uD835\uDC79',
  '\\mathbit{S}': '\uD835\uDC7A',
  '\\mathbit{T}': '\uD835\uDF49',
  '\\mathbit{U}': '\uD835\uDC7C',
  '\\mathbit{V}': '\uD835\uDC7D',
  '\\mathbit{W}': '\uD835\uDC7E',
  '\\mathbit{X}': '\uD835\uDF4C',
  '\\mathbit{Y}': '\uD835\uDC80',
  '\\mathbit{Z}': '\uD835\uDF3B',
  '\\mathbit{a}': '\uD835\uDC82',
  '\\mathbit{b}': '\uD835\uDC83',
  '\\mathbit{c}': '\uD835\uDC84',
  '\\mathbit{d}': '\uD835\uDC85',
  '\\mathbit{e}': '\uD835\uDC86',
  '\\mathbit{f}': '\uD835\uDC87',
  '\\mathbit{g}': '\uD835\uDC88',
  '\\mathbit{h}': '\uD835\uDC89',
  '\\mathbit{i}': '\uD835\uDC8A',
  '\\mathbit{j}': '\uD835\uDC8B',
  '\\mathbit{k}': '\uD835\uDC8C',
  '\\mathbit{l}': '\uD835\uDC8D',
  '\\mathbit{m}': '\uD835\uDC8E',
  '\\mathbit{n}': '\uD835\uDC8F',
  '\\mathbit{o}': '\uD835\uDC90',
  '\\mathbit{p}': '\uD835\uDC91',
  '\\mathbit{q}': '\uD835\uDC92',
  '\\mathbit{r}': '\uD835\uDC93',
  '\\mathbit{s}': '\uD835\uDC94',
  '\\mathbit{t}': '\uD835\uDC95',
  '\\mathbit{u}': '\uD835\uDC96',
  '\\mathbit{v}': '\uD835\uDC97',
  '\\mathbit{w}': '\uD835\uDC98',
  '\\mathbit{x}': '\uD835\uDC99',
  '\\mathbit{y}': '\uD835\uDC9A',
  '\\mathbit{z}': '\uD835\uDC9B',
  '\\mathscr{A}': '\uD835\uDC9C',
  '\\mathscr{C}': '\uD835\uDC9E',
  '\\mathscr{D}': '\uD835\uDC9F',
  '\\mathscr{G}': '\uD835\uDCA2',
  '\\mathscr{J}': '\uD835\uDCA5',
  '\\mathscr{K}': '\uD835\uDCA6',
  '\\mathscr{N}': '\uD835\uDCA9',
  '\\mathscr{O}': '\uD835\uDCAA',
  '\\mathscr{P}': '\uD835\uDCAB',
  '\\mathscr{Q}': '\uD835\uDCAC',
  '\\mathscr{S}': '\uD835\uDCAE',
  '\\mathscr{T}': '\uD835\uDCAF',
  '\\mathscr{U}': '\uD835\uDCB0',
  '\\mathscr{V}': '\uD835\uDCB1',
  '\\mathscr{W}': '\uD835\uDCB2',
  '\\mathscr{X}': '\uD835\uDCB3',
  '\\mathscr{Y}': '\uD835\uDCB4',
  '\\mathscr{Z}': '\uD835\uDCB5',
  '\\mathscr{a}': '\uD835\uDCB6',
  '\\mathscr{b}': '\uD835\uDCB7',
  '\\mathscr{c}': '\uD835\uDCB8',
  '\\mathscr{d}': '\uD835\uDCB9',
  '\\mathscr{f}': '\uD835\uDCBB',
  '\\mathscr{h}': '\uD835\uDCBD',
  '\\mathscr{i}': '\uD835\uDCBE',
  '\\mathscr{j}': '\uD835\uDCBF',
  '\\mathscr{k}': '\uD835\uDCC0',
  '\\mathscr{m}': '\uD835\uDCC2',
  '\\mathscr{n}': '\uD835\uDCC3',
  '\\mathscr{p}': '\uD835\uDCC5',
  '\\mathscr{q}': '\uD835\uDCC6',
  '\\mathscr{r}': '\uD835\uDCC7',
  '\\mathscr{s}': '\uD835\uDCC8',
  '\\mathscr{t}': '\uD835\uDCC9',
  '\\mathscr{u}': '\uD835\uDCCA',
  '\\mathscr{v}': '\uD835\uDCCB',
  '\\mathscr{w}': '\uD835\uDCCC',
  '\\mathscr{x}': '\uD835\uDCCD',
  '\\mathscr{y}': '\uD835\uDCCE',
  '\\mathscr{z}': '\uD835\uDCCF',
  '\\mathmit{A}': '\uD835\uDCD0',
  '\\mathmit{B}': '\uD835\uDCD1',
  '\\mathmit{C}': '\uD835\uDCD2',
  '\\mathmit{D}': '\uD835\uDCD3',
  '\\mathmit{E}': '\uD835\uDCD4',
  '\\mathmit{F}': '\uD835\uDCD5',
  '\\mathmit{G}': '\uD835\uDCD6',
  '\\mathmit{H}': '\uD835\uDCD7',
  '\\mathmit{I}': '\uD835\uDCD8',
  '\\mathmit{J}': '\uD835\uDCD9',
  '\\mathmit{K}': '\uD835\uDCDA',
  '\\mathmit{L}': '\uD835\uDCDB',
  '\\mathmit{M}': '\uD835\uDCDC',
  '\\mathmit{N}': '\uD835\uDCDD',
  '\\mathmit{O}': '\uD835\uDCDE',
  '\\mathmit{P}': '\uD835\uDCDF',
  '\\mathmit{Q}': '\uD835\uDCE0',
  '\\mathmit{R}': '\uD835\uDCE1',
  '\\mathmit{S}': '\uD835\uDCE2',
  '\\mathmit{T}': '\uD835\uDCE3',
  '\\mathmit{U}': '\uD835\uDCE4',
  '\\mathmit{V}': '\uD835\uDCE5',
  '\\mathmit{W}': '\uD835\uDCE6',
  '\\mathmit{X}': '\uD835\uDCE7',
  '\\mathmit{Y}': '\uD835\uDCE8',
  '\\mathmit{Z}': '\uD835\uDCE9',
  '\\mathmit{a}': '\uD835\uDCEA',
  '\\mathmit{b}': '\uD835\uDCEB',
  '\\mathmit{c}': '\uD835\uDCEC',
  '\\mathmit{d}': '\uD835\uDCED',
  '\\mathmit{e}': '\uD835\uDCEE',
  '\\mathmit{f}': '\uD835\uDCEF',
  '\\mathmit{g}': '\uD835\uDCF0',
  '\\mathmit{h}': '\uD835\uDCF1',
  '\\mathmit{i}': '\uD835\uDCF2',
  '\\mathmit{j}': '\uD835\uDCF3',
  '\\mathmit{k}': '\uD835\uDCF4',
  '\\mathmit{l}': '\uD835\uDCF5',
  '\\mathmit{m}': '\uD835\uDCF6',
  '\\mathmit{n}': '\uD835\uDCF7',
  '\\mathmit{o}': '\uD835\uDCF8',
  '\\mathmit{p}': '\uD835\uDCF9',
  '\\mathmit{q}': '\uD835\uDCFA',
  '\\mathmit{r}': '\uD835\uDCFB',
  '\\mathmit{s}': '\uD835\uDCFC',
  '\\mathmit{t}': '\uD835\uDCFD',
  '\\mathmit{u}': '\uD835\uDCFE',
  '\\mathmit{v}': '\uD835\uDCFF',
  '\\mathmit{w}': '\uD835\uDD00',
  '\\mathmit{x}': '\uD835\uDD01',
  '\\mathmit{y}': '\uD835\uDD02',
  '\\mathmit{z}': '\uD835\uDD03',
  '\\mathfrak{A}': '\uD835\uDD04',
  '\\mathfrak{B}': '\uD835\uDD05',
  '\\mathfrak{D}': '\uD835\uDD07',
  '\\mathfrak{E}': '\uD835\uDD08',
  '\\mathfrak{F}': '\uD835\uDD09',
  '\\mathfrak{G}': '\uD835\uDD0A',
  '\\mathfrak{J}': '\uD835\uDD0D',
  '\\mathfrak{K}': '\uD835\uDD0E',
  '\\mathfrak{L}': '\uD835\uDD0F',
  '\\mathfrak{M}': '\uD835\uDD10',
  '\\mathfrak{N}': '\uD835\uDD11',
  '\\mathfrak{O}': '\uD835\uDD12',
  '\\mathfrak{P}': '\uD835\uDD13',
  '\\mathfrak{Q}': '\uD835\uDD14',
  '\\mathfrak{S}': '\uD835\uDD16',
  '\\mathfrak{T}': '\uD835\uDD17',
  '\\mathfrak{U}': '\uD835\uDD18',
  '\\mathfrak{V}': '\uD835\uDD19',
  '\\mathfrak{W}': '\uD835\uDD1A',
  '\\mathfrak{X}': '\uD835\uDD1B',
  '\\mathfrak{Y}': '\uD835\uDD1C',
  '\\mathfrak{a}': '\uD835\uDD1E',
  '\\mathfrak{b}': '\uD835\uDD1F',
  '\\mathfrak{c}': '\uD835\uDD20',
  '\\mathfrak{d}': '\uD835\uDD21',
  '\\mathfrak{e}': '\uD835\uDD22',
  '\\mathfrak{f}': '\uD835\uDD23',
  '\\mathfrak{g}': '\uD835\uDD24',
  '\\mathfrak{h}': '\uD835\uDD25',
  '\\mathfrak{i}': '\uD835\uDD26',
  '\\mathfrak{j}': '\uD835\uDD27',
  '\\mathfrak{k}': '\uD835\uDD28',
  '\\mathfrak{l}': '\uD835\uDD29',
  '\\mathfrak{m}': '\uD835\uDD2A',
  '\\mathfrak{n}': '\uD835\uDD2B',
  '\\mathfrak{o}': '\uD835\uDD2C',
  '\\mathfrak{p}': '\uD835\uDD2D',
  '\\mathfrak{q}': '\uD835\uDD2E',
  '\\mathfrak{r}': '\uD835\uDD2F',
  '\\mathfrak{s}': '\uD835\uDD30',
  '\\mathfrak{t}': '\uD835\uDD31',
  '\\mathfrak{u}': '\uD835\uDD32',
  '\\mathfrak{v}': '\uD835\uDD33',
  '\\mathfrak{w}': '\uD835\uDD34',
  '\\mathfrak{x}': '\uD835\uDD35',
  '\\mathfrak{y}': '\uD835\uDD36',
  '\\mathfrak{z}': '\uD835\uDD37',
  '\\mathbb{A}': '\uD835\uDD38',
  '\\mathbb{B}': '\uD835\uDD39',
  '\\mathbb{D}': '\uD835\uDD3B',
  '\\mathbb{E}': '\uD835\uDD3C',
  '\\mathbb{F}': '\uD835\uDD3D',
  '\\mathbb{G}': '\uD835\uDD3E',
  '\\mathbb{I}': '\uD835\uDD40',
  '\\mathbb{J}': '\uD835\uDD41',
  '\\mathbb{K}': '\uD835\uDD42',
  '\\mathbb{L}': '\uD835\uDD43',
  '\\mathbb{M}': '\uD835\uDD44',
  '\\mathbb{O}': '\uD835\uDD46',
  '\\mathbb{S}': '\uD835\uDD4A',
  '\\mathbb{T}': '\uD835\uDD4B',
  '\\mathbb{U}': '\uD835\uDD4C',
  '\\mathbb{V}': '\uD835\uDD4D',
  '\\mathbb{W}': '\uD835\uDD4E',
  '\\mathbb{X}': '\uD835\uDD4F',
  '\\mathbb{Y}': '\uD835\uDD50',
  '\\mathbb{a}': '\uD835\uDD52',
  '\\mathbb{b}': '\uD835\uDD53',
  '\\mathbb{c}': '\uD835\uDD54',
  '\\mathbb{d}': '\uD835\uDD55',
  '\\mathbb{e}': '\uD835\uDD56',
  '\\mathbb{f}': '\uD835\uDD57',
  '\\mathbb{g}': '\uD835\uDD58',
  '\\mathbb{h}': '\uD835\uDD59',
  '\\mathbb{i}': '\uD835\uDD5A',
  '\\mathbb{j}': '\uD835\uDD5B',
  '\\mathbb{k}': '\uD835\uDD5C',
  '\\mathbb{l}': '\uD835\uDD5D',
  '\\mathbb{m}': '\uD835\uDD5E',
  '\\mathbb{n}': '\uD835\uDD5F',
  '\\mathbb{o}': '\uD835\uDD60',
  '\\mathbb{p}': '\uD835\uDD61',
  '\\mathbb{q}': '\uD835\uDD62',
  '\\mathbb{r}': '\uD835\uDD63',
  '\\mathbb{s}': '\uD835\uDD64',
  '\\mathbb{t}': '\uD835\uDD65',
  '\\mathbb{u}': '\uD835\uDD66',
  '\\mathbb{v}': '\uD835\uDD67',
  '\\mathbb{w}': '\uD835\uDD68',
  '\\mathbb{x}': '\uD835\uDD69',
  '\\mathbb{y}': '\uD835\uDD6A',
  '\\mathbb{z}': '\uD835\uDD6B',
  '\\mathslbb{A}': '\uD835\uDD6C',
  '\\mathslbb{B}': '\uD835\uDD6D',
  '\\mathslbb{C}': '\uD835\uDD6E',
  '\\mathslbb{D}': '\uD835\uDD6F',
  '\\mathslbb{E}': '\uD835\uDD70',
  '\\mathslbb{F}': '\uD835\uDD71',
  '\\mathslbb{G}': '\uD835\uDD72',
  '\\mathslbb{H}': '\uD835\uDD73',
  '\\mathslbb{I}': '\uD835\uDD74',
  '\\mathslbb{J}': '\uD835\uDD75',
  '\\mathslbb{K}': '\uD835\uDD76',
  '\\mathslbb{L}': '\uD835\uDD77',
  '\\mathslbb{M}': '\uD835\uDD78',
  '\\mathslbb{N}': '\uD835\uDD79',
  '\\mathslbb{O}': '\uD835\uDD7A',
  '\\mathslbb{P}': '\uD835\uDD7B',
  '\\mathslbb{Q}': '\uD835\uDD7C',
  '\\mathslbb{R}': '\uD835\uDD7D',
  '\\mathslbb{S}': '\uD835\uDD7E',
  '\\mathslbb{T}': '\uD835\uDD7F',
  '\\mathslbb{U}': '\uD835\uDD80',
  '\\mathslbb{V}': '\uD835\uDD81',
  '\\mathslbb{W}': '\uD835\uDD82',
  '\\mathslbb{X}': '\uD835\uDD83',
  '\\mathslbb{Y}': '\uD835\uDD84',
  '\\mathslbb{Z}': '\uD835\uDD85',
  '\\mathslbb{a}': '\uD835\uDD86',
  '\\mathslbb{b}': '\uD835\uDD87',
  '\\mathslbb{c}': '\uD835\uDD88',
  '\\mathslbb{d}': '\uD835\uDD89',
  '\\mathslbb{e}': '\uD835\uDD8A',
  '\\mathslbb{f}': '\uD835\uDD8B',
  '\\mathslbb{g}': '\uD835\uDD8C',
  '\\mathslbb{h}': '\uD835\uDD8D',
  '\\mathslbb{i}': '\uD835\uDD8E',
  '\\mathslbb{j}': '\uD835\uDD8F',
  '\\mathslbb{k}': '\uD835\uDD90',
  '\\mathslbb{l}': '\uD835\uDD91',
  '\\mathslbb{m}': '\uD835\uDD92',
  '\\mathslbb{n}': '\uD835\uDD93',
  '\\mathslbb{o}': '\uD835\uDD94',
  '\\mathslbb{p}': '\uD835\uDD95',
  '\\mathslbb{q}': '\uD835\uDD96',
  '\\mathslbb{r}': '\uD835\uDD97',
  '\\mathslbb{s}': '\uD835\uDD98',
  '\\mathslbb{t}': '\uD835\uDD99',
  '\\mathslbb{u}': '\uD835\uDD9A',
  '\\mathslbb{v}': '\uD835\uDD9B',
  '\\mathslbb{w}': '\uD835\uDD9C',
  '\\mathslbb{x}': '\uD835\uDD9D',
  '\\mathslbb{y}': '\uD835\uDD9E',
  '\\mathslbb{z}': '\uD835\uDD9F',
  '\\mathsf{A}': '\uD835\uDDA0',
  '\\mathsf{B}': '\uD835\uDDA1',
  '\\mathsf{C}': '\uD835\uDDA2',
  '\\mathsf{D}': '\uD835\uDDA3',
  '\\mathsf{E}': '\uD835\uDDA4',
  '\\mathsf{F}': '\uD835\uDDA5',
  '\\mathsf{G}': '\uD835\uDDA6',
  '\\mathsf{H}': '\uD835\uDDA7',
  '\\mathsf{I}': '\uD835\uDDA8',
  '\\mathsf{J}': '\uD835\uDDA9',
  '\\mathsf{K}': '\uD835\uDDAA',
  '\\mathsf{L}': '\uD835\uDDAB',
  '\\mathsf{M}': '\uD835\uDDAC',
  '\\mathsf{N}': '\uD835\uDDAD',
  '\\mathsf{O}': '\uD835\uDDAE',
  '\\mathsf{P}': '\uD835\uDDAF',
  '\\mathsf{Q}': '\uD835\uDDB0',
  '\\mathsf{R}': '\uD835\uDDB1',
  '\\mathsf{S}': '\uD835\uDDB2',
  '\\mathsf{T}': '\uD835\uDDB3',
  '\\mathsf{U}': '\uD835\uDDB4',
  '\\mathsf{V}': '\uD835\uDDB5',
  '\\mathsf{W}': '\uD835\uDDB6',
  '\\mathsf{X}': '\uD835\uDDB7',
  '\\mathsf{Y}': '\uD835\uDDB8',
  '\\mathsf{Z}': '\uD835\uDDB9',
  '\\mathsf{a}': '\uD835\uDDBA',
  '\\mathsf{b}': '\uD835\uDDBB',
  '\\mathsf{c}': '\uD835\uDDBC',
  '\\mathsf{d}': '\uD835\uDDBD',
  '\\mathsf{e}': '\uD835\uDDBE',
  '\\mathsf{f}': '\uD835\uDDBF',
  '\\mathsf{g}': '\uD835\uDDC0',
  '\\mathsf{h}': '\uD835\uDDC1',
  '\\mathsf{i}': '\uD835\uDDC2',
  '\\mathsf{j}': '\uD835\uDDC3',
  '\\mathsf{k}': '\uD835\uDDC4',
  '\\mathsf{l}': '\uD835\uDDC5',
  '\\mathsf{m}': '\uD835\uDDC6',
  '\\mathsf{n}': '\uD835\uDDC7',
  '\\mathsf{o}': '\uD835\uDDC8',
  '\\mathsf{p}': '\uD835\uDDC9',
  '\\mathsf{q}': '\uD835\uDDCA',
  '\\mathsf{r}': '\uD835\uDDCB',
  '\\mathsf{s}': '\uD835\uDDCC',
  '\\mathsf{t}': '\uD835\uDDCD',
  '\\mathsf{u}': '\uD835\uDDCE',
  '\\mathsf{v}': '\uD835\uDDCF',
  '\\mathsf{w}': '\uD835\uDDD0',
  '\\mathsf{x}': '\uD835\uDDD1',
  '\\mathsf{y}': '\uD835\uDDD2',
  '\\mathsf{z}': '\uD835\uDDD3',
  '\\mathsfbf{A}': '\uD835\uDF70',
  '\\mathsfbf{B}': '\uD835\uDF71',
  '\\mathsfbf{C}': '\uD835\uDDD6',
  '\\mathsfbf{D}': '\uD835\uDDD7',
  '\\mathsfbf{E}': '\uD835\uDF74',
  '\\mathsfbf{F}': '\uD835\uDDD9',
  '\\mathsfbf{G}': '\uD835\uDDDA',
  '\\mathsfbf{H}': '\uD835\uDF76',
  '\\mathsfbf{I}': '\uD835\uDF78',
  '\\mathsfbf{J}': '\uD835\uDDDD',
  '\\mathsfbf{K}': '\uD835\uDF79',
  '\\mathsfbf{L}': '\uD835\uDDDF',
  '\\mathsfbf{M}': '\uD835\uDDE0',
  '\\mathsfbf{N}': '\uD835\uDDE1',
  '\\mathsfbf{O}': '\uD835\uDDE2',
  '\\mathsfbf{P}': '\uD835\uDF80',
  '\\mathsfbf{Q}': '\uD835\uDDE4',
  '\\mathsfbf{R}': '\uD835\uDDE5',
  '\\mathsfbf{S}': '\uD835\uDDE6',
  '\\mathsfbf{T}': '\uD835\uDF83',
  '\\mathsfbf{U}': '\uD835\uDDE8',
  '\\mathsfbf{V}': '\uD835\uDDE9',
  '\\mathsfbf{W}': '\uD835\uDDEA',
  '\\mathsfbf{X}': '\uD835\uDF86',
  '\\mathsfbf{Y}': '\uD835\uDDEC',
  '\\mathsfbf{Z}': '\uD835\uDF75',
  '\\mathsfbf{a}': '\uD835\uDDEE',
  '\\mathsfbf{b}': '\uD835\uDDEF',
  '\\mathsfbf{c}': '\uD835\uDDF0',
  '\\mathsfbf{d}': '\uD835\uDDF1',
  '\\mathsfbf{e}': '\uD835\uDDF2',
  '\\mathsfbf{f}': '\uD835\uDDF3',
  '\\mathsfbf{g}': '\uD835\uDDF4',
  '\\mathsfbf{h}': '\uD835\uDDF5',
  '\\mathsfbf{i}': '\uD835\uDDF6',
  '\\mathsfbf{j}': '\uD835\uDDF7',
  '\\mathsfbf{k}': '\uD835\uDDF8',
  '\\mathsfbf{l}': '\uD835\uDDF9',
  '\\mathsfbf{m}': '\uD835\uDDFA',
  '\\mathsfbf{n}': '\uD835\uDDFB',
  '\\mathsfbf{o}': '\uD835\uDDFC',
  '\\mathsfbf{p}': '\uD835\uDDFD',
  '\\mathsfbf{q}': '\uD835\uDDFE',
  '\\mathsfbf{r}': '\uD835\uDDFF',
  '\\mathsfbf{s}': '\uD835\uDE00',
  '\\mathsfbf{t}': '\uD835\uDE01',
  '\\mathsfbf{u}': '\uD835\uDE02',
  '\\mathsfbf{v}': '\uD835\uDE03',
  '\\mathsfbf{w}': '\uD835\uDE04',
  '\\mathsfbf{x}': '\uD835\uDE05',
  '\\mathsfbf{y}': '\uD835\uDE06',
  '\\mathsfbf{z}': '\uD835\uDE07',
  '\\mathsfsl{A}': '\uD835\uDE08',
  '\\mathsfsl{B}': '\uD835\uDE09',
  '\\mathsfsl{C}': '\uD835\uDE0A',
  '\\mathsfsl{D}': '\uD835\uDE0B',
  '\\mathsfsl{E}': '\uD835\uDE0C',
  '\\mathsfsl{F}': '\uD835\uDE0D',
  '\\mathsfsl{G}': '\uD835\uDE0E',
  '\\mathsfsl{H}': '\uD835\uDE0F',
  '\\mathsfsl{I}': '\uD835\uDE10',
  '\\mathsfsl{J}': '\uD835\uDE11',
  '\\mathsfsl{K}': '\uD835\uDE12',
  '\\mathsfsl{L}': '\uD835\uDE13',
  '\\mathsfsl{M}': '\uD835\uDE14',
  '\\mathsfsl{N}': '\uD835\uDE15',
  '\\mathsfsl{O}': '\uD835\uDE16',
  '\\mathsfsl{P}': '\uD835\uDE17',
  '\\mathsfsl{Q}': '\uD835\uDE18',
  '\\mathsfsl{R}': '\uD835\uDE19',
  '\\mathsfsl{S}': '\uD835\uDE1A',
  '\\mathsfsl{T}': '\uD835\uDE1B',
  '\\mathsfsl{U}': '\uD835\uDE1C',
  '\\mathsfsl{V}': '\uD835\uDE1D',
  '\\mathsfsl{W}': '\uD835\uDE1E',
  '\\mathsfsl{X}': '\uD835\uDE1F',
  '\\mathsfsl{Y}': '\uD835\uDE20',
  '\\mathsfsl{Z}': '\uD835\uDE21',
  '\\mathsfsl{a}': '\uD835\uDE22',
  '\\mathsfsl{b}': '\uD835\uDE23',
  '\\mathsfsl{c}': '\uD835\uDE24',
  '\\mathsfsl{d}': '\uD835\uDE25',
  '\\mathsfsl{e}': '\uD835\uDE26',
  '\\mathsfsl{f}': '\uD835\uDE27',
  '\\mathsfsl{g}': '\uD835\uDE28',
  '\\mathsfsl{h}': '\uD835\uDE29',
  '\\mathsfsl{i}': '\uD835\uDE2A',
  '\\mathsfsl{j}': '\uD835\uDE2B',
  '\\mathsfsl{k}': '\uD835\uDE2C',
  '\\mathsfsl{l}': '\uD835\uDE2D',
  '\\mathsfsl{m}': '\uD835\uDE2E',
  '\\mathsfsl{n}': '\uD835\uDE2F',
  '\\mathsfsl{o}': '\uD835\uDE30',
  '\\mathsfsl{p}': '\uD835\uDE31',
  '\\mathsfsl{q}': '\uD835\uDE32',
  '\\mathsfsl{r}': '\uD835\uDE33',
  '\\mathsfsl{s}': '\uD835\uDE34',
  '\\mathsfsl{t}': '\uD835\uDE35',
  '\\mathsfsl{u}': '\uD835\uDE36',
  '\\mathsfsl{v}': '\uD835\uDE37',
  '\\mathsfsl{w}': '\uD835\uDE38',
  '\\mathsfsl{x}': '\uD835\uDE39',
  '\\mathsfsl{y}': '\uD835\uDE3A',
  '\\mathsfsl{z}': '\uD835\uDE3B',
  '\\mathsfbfsl{A}': '\uD835\uDFAA',
  '\\mathsfbfsl{B}': '\uD835\uDFAB',
  '\\mathsfbfsl{C}': '\uD835\uDE3E',
  '\\mathsfbfsl{D}': '\uD835\uDE3F',
  '\\mathsfbfsl{E}': '\uD835\uDFAE',
  '\\mathsfbfsl{F}': '\uD835\uDE41',
  '\\mathsfbfsl{G}': '\uD835\uDE42',
  '\\mathsfbfsl{H}': '\uD835\uDFB0',
  '\\mathsfbfsl{I}': '\uD835\uDFB2',
  '\\mathsfbfsl{J}': '\uD835\uDE45',
  '\\mathsfbfsl{K}': '\uD835\uDFB3',
  '\\mathsfbfsl{L}': '\uD835\uDE47',
  '\\mathsfbfsl{M}': '\uD835\uDE48',
  '\\mathsfbfsl{N}': '\uD835\uDE49',
  '\\mathsfbfsl{O}': '\uD835\uDE4A',
  '\\mathsfbfsl{P}': '\uD835\uDFBA',
  '\\mathsfbfsl{Q}': '\uD835\uDE4C',
  '\\mathsfbfsl{R}': '\uD835\uDE4D',
  '\\mathsfbfsl{S}': '\uD835\uDE4E',
  '\\mathsfbfsl{T}': '\uD835\uDFBD',
  '\\mathsfbfsl{U}': '\uD835\uDE50',
  '\\mathsfbfsl{V}': '\uD835\uDE51',
  '\\mathsfbfsl{W}': '\uD835\uDE52',
  '\\mathsfbfsl{X}': '\uD835\uDFC0',
  '\\mathsfbfsl{Y}': '\uD835\uDE54',
  '\\mathsfbfsl{Z}': '\uD835\uDFAF',
  '\\mathsfbfsl{a}': '\uD835\uDE56',
  '\\mathsfbfsl{b}': '\uD835\uDE57',
  '\\mathsfbfsl{c}': '\uD835\uDE58',
  '\\mathsfbfsl{d}': '\uD835\uDE59',
  '\\mathsfbfsl{e}': '\uD835\uDE5A',
  '\\mathsfbfsl{f}': '\uD835\uDE5B',
  '\\mathsfbfsl{g}': '\uD835\uDE5C',
  '\\mathsfbfsl{h}': '\uD835\uDE5D',
  '\\mathsfbfsl{i}': '\uD835\uDE5E',
  '\\mathsfbfsl{j}': '\uD835\uDE5F',
  '\\mathsfbfsl{k}': '\uD835\uDE60',
  '\\mathsfbfsl{l}': '\uD835\uDE61',
  '\\mathsfbfsl{m}': '\uD835\uDE62',
  '\\mathsfbfsl{n}': '\uD835\uDE63',
  '\\mathsfbfsl{o}': '\uD835\uDE64',
  '\\mathsfbfsl{p}': '\uD835\uDE65',
  '\\mathsfbfsl{q}': '\uD835\uDE66',
  '\\mathsfbfsl{r}': '\uD835\uDE67',
  '\\mathsfbfsl{s}': '\uD835\uDE68',
  '\\mathsfbfsl{t}': '\uD835\uDE69',
  '\\mathsfbfsl{u}': '\uD835\uDE6A',
  '\\mathsfbfsl{v}': '\uD835\uDE6B',
  '\\mathsfbfsl{w}': '\uD835\uDE6C',
  '\\mathsfbfsl{x}': '\uD835\uDE6D',
  '\\mathsfbfsl{y}': '\uD835\uDE6E',
  '\\mathsfbfsl{z}': '\uD835\uDE6F',
  '\\mathtt{A}': '\uD835\uDE70',
  '\\mathtt{B}': '\uD835\uDE71',
  '\\mathtt{C}': '\uD835\uDE72',
  '\\mathtt{D}': '\uD835\uDE73',
  '\\mathtt{E}': '\uD835\uDE74',
  '\\mathtt{F}': '\uD835\uDE75',
  '\\mathtt{G}': '\uD835\uDE76',
  '\\mathtt{H}': '\uD835\uDE77',
  '\\mathtt{I}': '\uD835\uDE78',
  '\\mathtt{J}': '\uD835\uDE79',
  '\\mathtt{K}': '\uD835\uDE7A',
  '\\mathtt{L}': '\uD835\uDE7B',
  '\\mathtt{M}': '\uD835\uDE7C',
  '\\mathtt{N}': '\uD835\uDE7D',
  '\\mathtt{O}': '\uD835\uDE7E',
  '\\mathtt{P}': '\uD835\uDE7F',
  '\\mathtt{Q}': '\uD835\uDE80',
  '\\mathtt{R}': '\uD835\uDE81',
  '\\mathtt{S}': '\uD835\uDE82',
  '\\mathtt{T}': '\uD835\uDE83',
  '\\mathtt{U}': '\uD835\uDE84',
  '\\mathtt{V}': '\uD835\uDE85',
  '\\mathtt{W}': '\uD835\uDE86',
  '\\mathtt{X}': '\uD835\uDE87',
  '\\mathtt{Y}': '\uD835\uDE88',
  '\\mathtt{Z}': '\uD835\uDE89',
  '\\mathtt{a}': '\uD835\uDE8A',
  '\\mathtt{b}': '\uD835\uDE8B',
  '\\mathtt{c}': '\uD835\uDE8C',
  '\\mathtt{d}': '\uD835\uDE8D',
  '\\mathtt{e}': '\uD835\uDE8E',
  '\\mathtt{f}': '\uD835\uDE8F',
  '\\mathtt{g}': '\uD835\uDE90',
  '\\mathtt{h}': '\uD835\uDE91',
  '\\mathtt{i}': '\uD835\uDE92',
  '\\mathtt{j}': '\uD835\uDE93',
  '\\mathtt{k}': '\uD835\uDE94',
  '\\mathtt{l}': '\uD835\uDE95',
  '\\mathtt{m}': '\uD835\uDE96',
  '\\mathtt{n}': '\uD835\uDE97',
  '\\mathtt{o}': '\uD835\uDE98',
  '\\mathtt{p}': '\uD835\uDE99',
  '\\mathtt{q}': '\uD835\uDE9A',
  '\\mathtt{r}': '\uD835\uDE9B',
  '\\mathtt{s}': '\uD835\uDE9C',
  '\\mathtt{t}': '\uD835\uDE9D',
  '\\mathtt{u}': '\uD835\uDE9E',
  '\\mathtt{v}': '\uD835\uDE9F',
  '\\mathtt{w}': '\uD835\uDEA0',
  '\\mathtt{x}': '\uD835\uDEA1',
  '\\mathtt{y}': '\uD835\uDEA2',
  '\\mathtt{z}': '\uD835\uDEA3',
  '\\mathbf{\\Gamma}': '\uD835\uDEC4',
  '\\mathbf{\\Delta}': '\uD835\uDEC5',
  '\\mathbf{\\Theta}': '\uD835\uDEAF',
  '\\mathbf{\\Lambda}': '\uD835\uDECC',
  '\\mathbf{\\Xi}': '\uD835\uDECF',
  '\\mathbf{\\Pi}': '\uD835\uDED1',
  '\\mathbf{\\vartheta}': '\uD835\uDEDD',
  '\\mathbf{\\Sigma}': '\uD835\uDED4',
  '\\mathbf{\\Upsilon}': '\uD835\uDED6',
  '\\mathbf{\\Phi}': '\uD835\uDED7',
  '\\mathbf{\\Psi}': '\uD835\uDED9',
  '\\mathbf{\\Omega}': '\uD835\uDEDA',
  '\\mathbf{\\nabla}': '\uD835\uDEC1',
  '\\mathbf{\\theta}': '\uD835\uDEC9',
  '\\mathbf{\\varsigma}': '\uD835\uDED3',
  '\\mathbf{\\varkappa}': '\uD835\uDEDE',
  '\\mathbf{\\phi}': '\uD835\uDEDF',
  '\\mathbf{\\varrho}': '\uD835\uDEE0',
  '\\mathbf{\\varpi}': '\uD835\uDEE1',
  '\\mathsl{\\Gamma}': '\uD835\uDEFE',
  '\\mathsl{\\Delta}': '\uD835\uDEFF',
  '\\mathsl{\\Theta}': '\uD835\uDF03',
  '\\mathsl{\\Lambda}': '\uD835\uDF06',
  '\\mathsl{\\Xi}': '\uD835\uDF09',
  '\\mathsl{\\Pi}': '\uD835\uDF0B',
  '\\mathsl{\\vartheta}': '\uD835\uDF17',
  '\\mathsl{\\Sigma}': '\uD835\uDF0E',
  '\\mathsl{\\Upsilon}': '\uD835\uDF10',
  '\\mathsl{\\Phi}': '\uD835\uDF11',
  '\\mathsl{\\Psi}': '\uD835\uDF13',
  '\\mathsl{\\Omega}': '\uD835\uDF14',
  '\\mathsl{\\nabla}': '\uD835\uDEFB',
  '\\mathsl{\\varsigma}': '\uD835\uDF0D',
  '\\mathsl{\\varkappa}': '\uD835\uDF18',
  '\\mathsl{\\phi}': '\uD835\uDF19',
  '\\mathsl{\\varrho}': '\uD835\uDF1A',
  '\\mathsl{\\varpi}': '\uD835\uDF1B',
  '\\mathbit{\\Gamma}': '\uD835\uDF38',
  '\\mathbit{\\Delta}': '\uD835\uDF39',
  '\\mathbit{\\Theta}': '\uD835\uDF3D',
  '\\mathbit{\\Lambda}': '\uD835\uDF40',
  '\\mathbit{\\Xi}': '\uD835\uDF43',
  '\\mathbit{\\Pi}': '\uD835\uDF45',
  '\\mathbit{\\Sigma}': '\uD835\uDF48',
  '\\mathbit{\\Upsilon}': '\uD835\uDF4A',
  '\\mathbit{\\Phi}': '\uD835\uDF4B',
  '\\mathbit{\\Psi}': '\uD835\uDF4D',
  '\\mathbit{\\Omega}': '\uD835\uDF4E',
  '\\mathbit{\\nabla}': '\uD835\uDF35',
  '\\mathbit{\\varsigma}': '\uD835\uDF47',
  '\\mathbit{\\vartheta}': '\uD835\uDF51',
  '\\mathbit{\\varkappa}': '\uD835\uDF52',
  '\\mathbit{\\phi}': '\uD835\uDF53',
  '\\mathbit{\\varrho}': '\uD835\uDF54',
  '\\mathbit{\\varpi}': '\uD835\uDF55',
  '\\mathsfbf{\\Gamma}': '\uD835\uDF72',
  '\\mathsfbf{\\Delta}': '\uD835\uDF73',
  '\\mathsfbf{\\Theta}': '\uD835\uDF77',
  '\\mathsfbf{\\Lambda}': '\uD835\uDF7A',
  '\\mathsfbf{\\Xi}': '\uD835\uDF7D',
  '\\mathsfbf{\\Pi}': '\uD835\uDF7F',
  '\\mathsfbf{\\vartheta}': '\uD835\uDF8B',
  '\\mathsfbf{\\Sigma}': '\uD835\uDF82',
  '\\mathsfbf{\\Upsilon}': '\uD835\uDF84',
  '\\mathsfbf{\\Phi}': '\uD835\uDF85',
  '\\mathsfbf{\\Psi}': '\uD835\uDF87',
  '\\mathsfbf{\\Omega}': '\uD835\uDF88',
  '\\mathsfbf{\\nabla}': '\uD835\uDF6F',
  '\\mathsfbf{\\varsigma}': '\uD835\uDF81',
  '\\mathsfbf{\\varkappa}': '\uD835\uDF8C',
  '\\mathsfbf{\\phi}': '\uD835\uDF8D',
  '\\mathsfbf{\\varrho}': '\uD835\uDF8E',
  '\\mathsfbf{\\varpi}': '\uD835\uDF8F',
  '\\mathsfbfsl{\\Gamma}': '\uD835\uDFAC',
  '\\mathsfbfsl{\\Delta}': '\uD835\uDFAD',
  '\\mathsfbfsl{\\vartheta}': '\uD835\uDFC5',
  '\\mathsfbfsl{\\Lambda}': '\uD835\uDFB4',
  '\\mathsfbfsl{\\Xi}': '\uD835\uDFB7',
  '\\mathsfbfsl{\\Pi}': '\uD835\uDFB9',
  '\\mathsfbfsl{\\Sigma}': '\uD835\uDFBC',
  '\\mathsfbfsl{\\Upsilon}': '\uD835\uDFBE',
  '\\mathsfbfsl{\\Phi}': '\uD835\uDFBF',
  '\\mathsfbfsl{\\Psi}': '\uD835\uDFC1',
  '\\mathsfbfsl{\\Omega}': '\uD835\uDFC2',
  '\\mathsfbfsl{\\nabla}': '\uD835\uDFA9',
  '\\mathsfbfsl{\\varsigma}': '\uD835\uDFBB',
  '\\mathsfbfsl{\\varkappa}': '\uD835\uDFC6',
  '\\mathsfbfsl{\\phi}': '\uD835\uDFC7',
  '\\mathsfbfsl{\\varrho}': '\uD835\uDFC8',
  '\\mathsfbfsl{\\varpi}': '\uD835\uDFC9',
  '\\mbfDigamma': '\uD835\uDFCA',
  '\\mbfdigamma': '\uD835\uDFCB',
  '\\mathbf{0}': '\uD835\uDFCE',
  '\\mathbf{1}': '\uD835\uDFCF',
  '\\mathbf{2}': '\uD835\uDFD0',
  '\\mathbf{3}': '\uD835\uDFD1',
  '\\mathbf{4}': '\uD835\uDFD2',
  '\\mathbf{5}': '\uD835\uDFD3',
  '\\mathbf{6}': '\uD835\uDFD4',
  '\\mathbf{7}': '\uD835\uDFD5',
  '\\mathbf{8}': '\uD835\uDFD6',
  '\\mathbf{9}': '\uD835\uDFD7',
  '\\mathbb{0}': '\uD835\uDFD8',
  '\\mathbb{1}': '\uD835\uDFD9',
  '\\mathbb{2}': '\uD835\uDFDA',
  '\\mathbb{3}': '\uD835\uDFDB',
  '\\mathbb{4}': '\uD835\uDFDC',
  '\\mathbb{5}': '\uD835\uDFDD',
  '\\mathbb{6}': '\uD835\uDFDE',
  '\\mathbb{7}': '\uD835\uDFDF',
  '\\mathbb{8}': '\uD835\uDFE0',
  '\\mathbb{9}': '\uD835\uDFE1',
  '\\mathsf{0}': '\uD835\uDFE2',
  '\\mathsf{1}': '\uD835\uDFE3',
  '\\mathsf{2}': '\uD835\uDFE4',
  '\\mathsf{3}': '\uD835\uDFE5',
  '\\mathsf{4}': '\uD835\uDFE6',
  '\\mathsf{5}': '\uD835\uDFE7',
  '\\mathsf{6}': '\uD835\uDFE8',
  '\\mathsf{7}': '\uD835\uDFE9',
  '\\mathsf{8}': '\uD835\uDFEA',
  '\\mathsf{9}': '\uD835\uDFEB',
  '\\mathsfbf{0}': '\uD835\uDFEC',
  '\\mathsfbf{1}': '\uD835\uDFED',
  '\\mathsfbf{2}': '\uD835\uDFEE',
  '\\mathsfbf{3}': '\uD835\uDFEF',
  '\\mathsfbf{4}': '\uD835\uDFF0',
  '\\mathsfbf{5}': '\uD835\uDFF1',
  '\\mathsfbf{6}': '\uD835\uDFF2',
  '\\mathsfbf{7}': '\uD835\uDFF3',
  '\\mathsfbf{8}': '\uD835\uDFF4',
  '\\mathsfbf{9}': '\uD835\uDFF5',
  '\\mathtt{0}': '\uD835\uDFF6',
  '\\mathtt{1}': '\uD835\uDFF7',
  '\\mathtt{2}': '\uD835\uDFF8',
  '\\mathtt{3}': '\uD835\uDFF9',
  '\\mathtt{4}': '\uD835\uDFFA',
  '\\mathtt{5}': '\uD835\uDFFB',
  '\\mathtt{6}': '\uD835\uDFFC',
  '\\mathtt{7}': '\uD835\uDFFD',
  '\\mathtt{8}': '\uD835\uDFFE',
  '\\mathtt{9}': '\uD835\uDFFF',
  '\\t{ia}': 'i\uFE20a\uFE21',
  '\\textmu{}': '\u03BC',
  '\\to{}': '\u2192',
  '\\varGamma{}': '\u0393',
  '\\ocirc{u}': '\u016F',
  '\\textless{}': '<',
  '\\textgreater{}': '>',
  '{\\~ w}': 'w\u0303',
  '\\textasciitilde{}': '~',
  '\\LaTeX{}': 'LaTeX',
  '{\\c e}': '\u1E1D',
  '\\neg{}': '\xAC',
  '\\Box{}': '\u25A1',
  '\\le{}': '\u2264',
  '\\\'\\i': '\xED',
  '\\relax': '\u200C'
}

/***/ }),

/***/ "../node_modules/astrocite-bibtex/lib/grammar.js":
/*!*******************************************************!*\
  !*** ../node_modules/astrocite-bibtex/lib/grammar.js ***!
  \*******************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
}
function peg$SyntaxError(message, expected, found, location) {
    this.message = message;
    this.expected = expected;
    this.found = found;
    this.location = location;
    this.name = "SyntaxError";
    if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, peg$SyntaxError);
    }
}
peg$subclass(peg$SyntaxError, Error);
peg$SyntaxError.buildMessage = function (expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
        literal: function (expectation) {
            return "\"" + literalEscape(expectation.text) + "\"";
        },
        "class": function (expectation) {
            var escapedParts = "", i;
            for (i = 0; i < expectation.parts.length; i++) {
                escapedParts += expectation.parts[i] instanceof Array
                    ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
                    : classEscape(expectation.parts[i]);
            }
            return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },
        any: function (expectation) {
            return "any character";
        },
        end: function (expectation) {
            return "end of input";
        },
        other: function (expectation) {
            return expectation.description;
        }
    };
    function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
    }
    function literalEscape(s) {
        return s
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\0/g, '\\0')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/[\x00-\x0F]/g, function (ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return '\\x' + hex(ch); });
    }
    function classEscape(s) {
        return s
            .replace(/\\/g, '\\\\')
            .replace(/\]/g, '\\]')
            .replace(/\^/g, '\\^')
            .replace(/-/g, '\\-')
            .replace(/\0/g, '\\0')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/[\x00-\x0F]/g, function (ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return '\\x' + hex(ch); });
    }
    function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }
    function describeExpected(expected) {
        var descriptions = new Array(expected.length), i, j;
        for (i = 0; i < expected.length; i++) {
            descriptions[i] = describeExpectation(expected[i]);
        }
        descriptions.sort();
        if (descriptions.length > 0) {
            for (i = 1, j = 1; i < descriptions.length; i++) {
                if (descriptions[i - 1] !== descriptions[i]) {
                    descriptions[j] = descriptions[i];
                    j++;
                }
            }
            descriptions.length = j;
        }
        switch (descriptions.length) {
            case 1:
                return descriptions[0];
            case 2:
                return descriptions[0] + " or " + descriptions[1];
            default:
                return descriptions.slice(0, -1).join(", ")
                    + ", or "
                    + descriptions[descriptions.length - 1];
        }
    }
    function describeFound(found) {
        return found ? "\"" + literalEscape(found) + "\"" : "end of input";
    }
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse(input, options) {
    options = options !== void 0 ? options : {};
    var peg$FAILED = {}, peg$startRuleFunctions = { File: peg$parseFile }, peg$startRuleFunction = peg$parseFile, peg$c0 = function (r) {
        return {
            kind: 'File',
            loc: location(),
            children: r,
        };
    }, peg$c1 = "@comment", peg$c2 = peg$literalExpectation("@comment", true), peg$c3 = function (v) {
        return {
            kind: 'BracedComment',
            loc: location(),
            value: v.slice(1, -1),
        };
    }, peg$c4 = /^[^\n\r]/, peg$c5 = peg$classExpectation(["\n", "\r"], true, false), peg$c6 = /^[\n\r]/, peg$c7 = peg$classExpectation(["\n", "\r"], false, false), peg$c8 = function (v) {
        return {
            kind: 'LineComment',
            loc: location(),
            value: simpleLatexConversions(normalizeWhitespace(v)),
        };
    }, peg$c9 = /^[^@]/, peg$c10 = peg$classExpectation(["@"], true, false), peg$c11 = function (v) {
        return {
            kind: 'NonEntryText',
            loc: location(),
            value: simpleLatexConversions(normalizeWhitespace(v)),
        };
    }, peg$c12 = function (n) { return n; }, peg$c13 = "{", peg$c14 = peg$literalExpectation("{", false), peg$c15 = /^[^{}]/, peg$c16 = peg$classExpectation(["{", "}"], true, false), peg$c17 = "}", peg$c18 = peg$literalExpectation("}", false), peg$c19 = function (comment) { return '{' + comment.join('') + '}'; }, peg$c20 = "@", peg$c21 = peg$literalExpectation("@", false), peg$c22 = /^[A-Za-z]/, peg$c23 = peg$classExpectation([["A", "Z"], ["a", "z"]], false, false), peg$c24 = /^[({]/, peg$c25 = peg$classExpectation(["(", "{"], false, false), peg$c26 = /^[})]/, peg$c27 = peg$classExpectation(["}", ")"], false, false), peg$c28 = function (type, id, props) {
        return {
            kind: 'Entry',
            id: id || '',
            type: type.toLowerCase(),
            loc: location(),
            properties: props,
        };
    }, peg$c29 = "@preamble", peg$c30 = peg$literalExpectation("@preamble", true), peg$c31 = function (v) {
        return {
            kind: 'PreambleExpression',
            loc: location(),
            value: v.reduce(function (a, b) { return a.concat(b); }, []),
        };
    }, peg$c32 = "@string", peg$c33 = peg$literalExpectation("@string", true), peg$c34 = function (k, v) {
        return {
            kind: 'StringExpression',
            loc: location(),
            key: k,
            value: v.reduce(function (a, b) { return a.concat(b); }, []),
        };
    }, peg$c35 = /^[^ \t\r\n,]/, peg$c36 = peg$classExpectation([" ", "\t", "\r", "\n", ","], true, false), peg$c37 = ",", peg$c38 = peg$literalExpectation(",", false), peg$c39 = function (id) { return id; }, peg$c40 = function (k) { verbatim.property = k; return true; }, peg$c41 = function (k, v) { return verbatim.leaveProperty(); }, peg$c42 = function (k, v) {
        return {
            kind: 'Property',
            loc: location(),
            key: k.toLowerCase(),
            value: v,
        };
    }, peg$c43 = /^[_:a-zA-Z0-9\-]/, peg$c44 = peg$classExpectation(["_", ":", ["a", "z"], ["A", "Z"], ["0", "9"], "-"], false, false), peg$c45 = function (k) { return k; }, peg$c46 = function (v) {
        return v.reduce(function (a, b) { return a.concat(b); }, []);
    }, peg$c47 = "\"", peg$c48 = peg$literalExpectation("\"", false), peg$c49 = function () { return verbatim.enterProperty('"'); }, peg$c50 = function (v) { return v; }, peg$c51 = function () { return verbatim.enterProperty('{}'); }, peg$c52 = function () { return verbatim.active && verbatim.closer === '"'; }, peg$c53 = /^[^"]/, peg$c54 = peg$classExpectation(["\""], true, false), peg$c55 = function (v) {
        return {
            kind: 'Text',
            loc: location(),
            value: simpleLatexConversions(normalizeWhitespace(v)),
        };
    }, peg$c56 = function () { return verbatim.active && verbatim.closer === '{}'; }, peg$c57 = /^[^\^_${}\\]/, peg$c58 = peg$classExpectation(["^", "_", "$", "{", "}", "\\"], true, false), peg$c59 = /^[^\^_${}"\\]/, peg$c60 = peg$classExpectation(["^", "_", "$", "{", "}", "\"", "\\"], true, false), peg$c61 = /^[0-9]/, peg$c62 = peg$classExpectation([["0", "9"]], false, false), peg$c63 = function (v) {
        return {
            kind: 'Number',
            loc: location(),
            value: parseInt(v, 10),
        };
    }, peg$c64 = function (v) {
        return {
            kind: 'String',
            loc: location(),
            value: v,
        };
    }, peg$c65 = "{\\", peg$c66 = peg$literalExpectation("{\\", false), peg$c67 = " ", peg$c68 = peg$literalExpectation(" ", false), peg$c69 = /^[a-zA-Z0-9]/, peg$c70 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"]], false, false), peg$c71 = "\\", peg$c72 = peg$literalExpectation("\\", false), peg$c73 = /^[ij]/, peg$c74 = peg$classExpectation(["i", "j"], false, false), peg$c75 = function (mark, char) {
        return {
            kind: 'DicraticalCommand',
            loc: location(),
            mark: mark,
            dotless: !!char[1],
            character: char[1] || char[0],
        };
    }, peg$c76 = function (v) {
        return {
            kind: 'NestedLiteral',
            loc: location(),
            value: v,
        };
    }, peg$c77 = "%", peg$c78 = peg$literalExpectation("%", false), peg$c79 = /^[^\r\n]/, peg$c80 = peg$classExpectation(["\r", "\n"], true, false), peg$c81 = function (v) {
        return {
            kind: 'LineComment',
            loc: location(),
            value: v,
        };
    }, peg$c82 = /^[_\^]/, peg$c83 = peg$classExpectation(["_", "^"], false, false), peg$c84 = function (mode, v) {
        return {
            kind: (mode === '_' ? 'Sub' : 'Super') + 'scriptCommand',
            loc: location(),
            value: v
        };
    }, peg$c85 = peg$anyExpectation(), peg$c86 = function (mark, char) {
        return {
            kind: 'DicraticalCommand',
            loc: location(),
            mark: mark,
            dotless: !!char[1],
            character: char[1] || char[0],
        };
    }, peg$c87 = "$", peg$c88 = peg$literalExpectation("$", false), peg$c89 = function () {
        return {
            kind: 'MathMode',
            loc: location(),
            value: '$',
        };
    }, peg$c90 = /^[^A-Za-z0-9\t\r\n]/, peg$c91 = peg$classExpectation([["A", "Z"], ["a", "z"], ["0", "9"], "\t", "\r", "\n"], true, false), peg$c92 = function (v) {
        return {
            kind: 'SymbolCommand',
            loc: location(),
            value: v,
        };
    }, peg$c93 = function (v) { return verbatim.enterCommand(v); }, peg$c94 = function (v, args) { return verbatim.leaveCommand(v); }, peg$c95 = function (v, args) {
        return {
            kind: 'RegularCommand',
            loc: location(),
            value: v,
            arguments: args,
        };
    }, peg$c96 = "[", peg$c97 = peg$literalExpectation("[", false), peg$c98 = /^[^\]]/, peg$c99 = peg$classExpectation(["]"], true, false), peg$c100 = "]", peg$c101 = peg$literalExpectation("]", false), peg$c102 = function (v) {
        return {
            kind: 'OptionalArgument',
            loc: location(),
            value: v,
        };
    }, peg$c103 = function (v) {
        return {
            kind: 'RequiredArgument',
            loc: location(),
            value: v,
        };
    }, peg$c104 = /^[a-zA-Z\-_]/, peg$c105 = peg$classExpectation([["a", "z"], ["A", "Z"], "-", "_"], false, false), peg$c106 = /^[a-zA-Z0-9\-&_:]/, peg$c107 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "-", "&", "_", ":"], false, false), peg$c108 = /^['`"=~\^.]/, peg$c109 = peg$classExpectation(["'", "`", "\"", "=", "~", "^", "."], false, false), peg$c110 = /^['`"=~\^.cbuvdrHk]/, peg$c111 = peg$classExpectation(["'", "`", "\"", "=", "~", "^", ".", "c", "b", "u", "v", "d", "r", "H", "k"], false, false), peg$c112 = "=", peg$c113 = peg$literalExpectation("=", false), peg$c114 = "#", peg$c115 = peg$literalExpectation("#", false), peg$c116 = /^[\r\n]/, peg$c117 = peg$classExpectation(["\r", "\n"], false, false), peg$c118 = peg$otherExpectation("Mandatory Horizontal Whitespace"), peg$c119 = /^[ \t]/, peg$c120 = peg$classExpectation([" ", "\t"], false, false), peg$c121 = peg$otherExpectation("Optional Horizontal Whitespace"), peg$c122 = peg$otherExpectation("Mandatory Vertical Whitespace"), peg$c123 = peg$otherExpectation("Optional Vertical Whitespace"), peg$c124 = peg$otherExpectation("Mandatory Whitespace"), peg$c125 = /^[ \t\n\r]/, peg$c126 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false), peg$c127 = peg$otherExpectation("Optional Whitespace"), peg$currPos = 0, peg$savedPos = 0, peg$posDetailsCache = [{ line: 1, column: 1 }], peg$maxFailPos = 0, peg$maxFailExpected = [], peg$silentFails = 0, peg$result;
    if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }
    function text() {
        return input.substring(peg$savedPos, peg$currPos);
    }
    function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
    }
    function expected(description, location) {
        location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError([peg$otherExpectation(description)], input.substring(peg$savedPos, peg$currPos), location);
    }
    function error(message, location) {
        location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location);
    }
    function peg$literalExpectation(text, ignoreCase) {
        return { type: "literal", text: text, ignoreCase: ignoreCase };
    }
    function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
    }
    function peg$anyExpectation() {
        return { type: "any" };
    }
    function peg$endExpectation() {
        return { type: "end" };
    }
    function peg$otherExpectation(description) {
        return { type: "other", description: description };
    }
    function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos], p;
        if (details) {
            return details;
        }
        else {
            p = pos - 1;
            while (!peg$posDetailsCache[p]) {
                p--;
            }
            details = peg$posDetailsCache[p];
            details = {
                line: details.line,
                column: details.column
            };
            while (p < pos) {
                if (input.charCodeAt(p) === 10) {
                    details.line++;
                    details.column = 1;
                }
                else {
                    details.column++;
                }
                p++;
            }
            peg$posDetailsCache[pos] = details;
            return details;
        }
    }
    function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos), endPosDetails = peg$computePosDetails(endPos);
        return {
            start: {
                offset: startPos,
                line: startPosDetails.line,
                column: startPosDetails.column
            },
            end: {
                offset: endPos,
                line: endPosDetails.line,
                column: endPosDetails.column
            }
        };
    }
    function peg$fail(expected) {
        if (peg$currPos < peg$maxFailPos) {
            return;
        }
        if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected);
    }
    function peg$buildSimpleError(message, location) {
        return new peg$SyntaxError(message, null, null, location);
    }
    function peg$buildStructuredError(expected, found, location) {
        return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
    }
    function peg$parseFile() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parseNode();
            while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parseNode();
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__();
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c0(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseComment() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 8).toLowerCase() === peg$c1) {
            s1 = input.substr(peg$currPos, 8);
            peg$currPos += 8;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c2);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__h();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseBracedComment();
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c3(s3);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 8).toLowerCase() === peg$c1) {
                s1 = input.substr(peg$currPos, 8);
                peg$currPos += 8;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c2);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse__h();
                if (s2 !== peg$FAILED) {
                    s3 = [];
                    if (peg$c4.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c5);
                        }
                    }
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        if (peg$c4.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c5);
                            }
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        s4 = [];
                        if (peg$c6.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c7);
                            }
                        }
                        while (s5 !== peg$FAILED) {
                            s4.push(s5);
                            if (peg$c6.test(input.charAt(peg$currPos))) {
                                s5 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c7);
                                }
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c8(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$currPos;
                if (peg$c9.test(input.charAt(peg$currPos))) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c10);
                    }
                }
                if (s2 !== peg$FAILED) {
                    s3 = [];
                    if (peg$c4.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c5);
                        }
                    }
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        if (peg$c4.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c5);
                            }
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        s2 = [s2, s3];
                        s1 = s2;
                    }
                    else {
                        peg$currPos = s1;
                        s1 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
                if (s1 !== peg$FAILED) {
                    s2 = [];
                    if (peg$c6.test(input.charAt(peg$currPos))) {
                        s3 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c7);
                        }
                    }
                    while (s3 !== peg$FAILED) {
                        s2.push(s3);
                        if (peg$c6.test(input.charAt(peg$currPos))) {
                            s3 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c7);
                            }
                        }
                    }
                    if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c11(s1);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
        }
        return s0;
    }
    function peg$parseNode() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parseComment();
        if (s1 === peg$FAILED) {
            s1 = peg$parsePreambleExpression();
            if (s1 === peg$FAILED) {
                s1 = peg$parseStringExpression();
                if (s1 === peg$FAILED) {
                    s1 = peg$parseEntry();
                }
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c12(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseBracedComment() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c13;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c14);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = [];
            if (peg$c15.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c16);
                }
            }
            if (s3 === peg$FAILED) {
                s3 = peg$parseBracedComment();
            }
            while (s3 !== peg$FAILED) {
                s2.push(s3);
                if (peg$c15.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c16);
                    }
                }
                if (s3 === peg$FAILED) {
                    s3 = peg$parseBracedComment();
                }
            }
            if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                    s3 = peg$c17;
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c18);
                    }
                }
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c19(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseEntry() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 64) {
            s1 = peg$c20;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c21);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            if (peg$c22.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c23);
                }
            }
            if (s4 !== peg$FAILED) {
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    if (peg$c22.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c23);
                        }
                    }
                }
            }
            else {
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                s2 = input.substring(s2, peg$currPos);
            }
            else {
                s2 = s3;
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__();
                if (s3 !== peg$FAILED) {
                    if (peg$c24.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c25);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s5 = peg$parse__();
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parseEntryId();
                            if (s6 === peg$FAILED) {
                                s6 = null;
                            }
                            if (s6 !== peg$FAILED) {
                                s7 = peg$parse__();
                                if (s7 !== peg$FAILED) {
                                    s8 = [];
                                    s9 = peg$parseProperty();
                                    while (s9 !== peg$FAILED) {
                                        s8.push(s9);
                                        s9 = peg$parseProperty();
                                    }
                                    if (s8 !== peg$FAILED) {
                                        s9 = peg$parse__();
                                        if (s9 !== peg$FAILED) {
                                            if (peg$c26.test(input.charAt(peg$currPos))) {
                                                s10 = input.charAt(peg$currPos);
                                                peg$currPos++;
                                            }
                                            else {
                                                s10 = peg$FAILED;
                                                if (peg$silentFails === 0) {
                                                    peg$fail(peg$c27);
                                                }
                                            }
                                            if (s10 !== peg$FAILED) {
                                                s11 = peg$parse__();
                                                if (s11 !== peg$FAILED) {
                                                    peg$savedPos = s0;
                                                    s1 = peg$c28(s2, s6, s8);
                                                    s0 = s1;
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsePreambleExpression() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 9).toLowerCase() === peg$c29) {
            s1 = input.substr(peg$currPos, 9);
            peg$currPos += 9;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c30);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__();
            if (s2 !== peg$FAILED) {
                if (peg$c24.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c25);
                    }
                }
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse__();
                    if (s4 !== peg$FAILED) {
                        s5 = [];
                        s6 = peg$parseRegularValue();
                        while (s6 !== peg$FAILED) {
                            s5.push(s6);
                            s6 = peg$parseRegularValue();
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parse__();
                            if (s6 !== peg$FAILED) {
                                if (peg$c26.test(input.charAt(peg$currPos))) {
                                    s7 = input.charAt(peg$currPos);
                                    peg$currPos++;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c27);
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse__();
                                    if (s8 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c31(s5);
                                        s0 = s1;
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseStringExpression() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 7).toLowerCase() === peg$c32) {
            s1 = input.substr(peg$currPos, 7);
            peg$currPos += 7;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c33);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__();
            if (s2 !== peg$FAILED) {
                if (peg$c24.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c25);
                    }
                }
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse__();
                    if (s4 !== peg$FAILED) {
                        s5 = peg$parseVariableName();
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parsePropertySeparator();
                            if (s6 !== peg$FAILED) {
                                s7 = [];
                                s8 = peg$parseRegularValue();
                                if (s8 !== peg$FAILED) {
                                    while (s8 !== peg$FAILED) {
                                        s7.push(s8);
                                        s8 = peg$parseRegularValue();
                                    }
                                }
                                else {
                                    s7 = peg$FAILED;
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse__();
                                    if (s8 !== peg$FAILED) {
                                        if (peg$c26.test(input.charAt(peg$currPos))) {
                                            s9 = input.charAt(peg$currPos);
                                            peg$currPos++;
                                        }
                                        else {
                                            s9 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c27);
                                            }
                                        }
                                        if (s9 !== peg$FAILED) {
                                            s10 = peg$parse__();
                                            if (s10 !== peg$FAILED) {
                                                peg$savedPos = s0;
                                                s1 = peg$c34(s5, s7);
                                                s0 = s1;
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseEntryId() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            if (peg$c35.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c36);
                }
            }
            while (s4 !== peg$FAILED) {
                s3.push(s4);
                if (peg$c35.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c36);
                    }
                }
            }
            if (s3 !== peg$FAILED) {
                s2 = input.substring(s2, peg$currPos);
            }
            else {
                s2 = s3;
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__();
                if (s3 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                        s4 = peg$c37;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c38);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c39(s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseProperty() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        s1 = peg$parsePropertyKey();
        if (s1 !== peg$FAILED) {
            s2 = peg$parsePropertySeparator();
            if (s2 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s3 = peg$c40(s1);
                if (s3) {
                    s3 = void 0;
                }
                else {
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    s4 = peg$parsePropertyValue();
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = peg$currPos;
                        s5 = peg$c41(s1, s4);
                        if (s5) {
                            s5 = void 0;
                        }
                        else {
                            s5 = peg$FAILED;
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parsePropertyTerminator();
                            if (s6 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c42(s1, s4);
                                s0 = s1;
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsePropertyKey() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            if (peg$c43.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c44);
                }
            }
            if (s4 !== peg$FAILED) {
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    if (peg$c43.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c44);
                        }
                    }
                }
            }
            else {
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                s2 = input.substring(s2, peg$currPos);
            }
            else {
                s2 = s3;
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c45(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsePropertyValue() {
        var s0, s1, s2;
        s0 = peg$parseNumber();
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parseRegularValue();
            if (s2 === peg$FAILED) {
                s2 = peg$parseStringValue();
            }
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parseRegularValue();
                if (s2 === peg$FAILED) {
                    s2 = peg$parseStringValue();
                }
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c46(s1);
            }
            s0 = s1;
        }
        return s0;
    }
    function peg$parseRegularValue() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
            s1 = peg$c47;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c48);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s2 = peg$c49();
            if (s2) {
                s2 = void 0;
            }
            else {
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$parseNestedLiteral();
                if (s4 === peg$FAILED) {
                    s4 = peg$parseVerbatimText();
                    if (s4 === peg$FAILED) {
                        s4 = peg$parseCommand();
                        if (s4 === peg$FAILED) {
                            s4 = peg$parseTextNoQuotes();
                        }
                    }
                }
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parseNestedLiteral();
                    if (s4 === peg$FAILED) {
                        s4 = peg$parseVerbatimText();
                        if (s4 === peg$FAILED) {
                            s4 = peg$parseCommand();
                            if (s4 === peg$FAILED) {
                                s4 = peg$parseTextNoQuotes();
                            }
                        }
                    }
                }
                if (s3 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 34) {
                        s4 = peg$c47;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c48);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s5 = peg$parseConcat();
                        if (s5 === peg$FAILED) {
                            s5 = null;
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c50(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c13;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s2 = peg$c51();
                if (s2) {
                    s2 = void 0;
                }
                else {
                    s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$parseNestedLiteral();
                    if (s4 === peg$FAILED) {
                        s4 = peg$parseVerbatimText();
                        if (s4 === peg$FAILED) {
                            s4 = peg$parseCommand();
                            if (s4 === peg$FAILED) {
                                s4 = peg$parseText();
                            }
                        }
                    }
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parseNestedLiteral();
                        if (s4 === peg$FAILED) {
                            s4 = peg$parseVerbatimText();
                            if (s4 === peg$FAILED) {
                                s4 = peg$parseCommand();
                                if (s4 === peg$FAILED) {
                                    s4 = peg$parseText();
                                }
                            }
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                            s4 = peg$c17;
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c18);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            s5 = peg$parseConcat();
                            if (s5 === peg$FAILED) {
                                s5 = null;
                            }
                            if (s5 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c50(s3);
                                s0 = s1;
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parseStringValue() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseString();
        if (s1 !== peg$FAILED) {
            s2 = peg$parseConcat();
            if (s2 === peg$FAILED) {
                s2 = null;
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c50(s1);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseVerbatimText() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        peg$savedPos = peg$currPos;
        s1 = peg$c52();
        if (s1) {
            s1 = void 0;
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s2 = [];
            if (peg$c53.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c54);
                }
            }
            if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    if (peg$c53.test(input.charAt(peg$currPos))) {
                        s3 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c54);
                        }
                    }
                }
            }
            else {
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c55(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            peg$savedPos = peg$currPos;
            s1 = peg$c56();
            if (s1) {
                s1 = void 0;
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s2 = [];
                if (peg$c15.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c16);
                    }
                }
                if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                        s2.push(s3);
                        if (peg$c15.test(input.charAt(peg$currPos))) {
                            s3 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c16);
                            }
                        }
                    }
                }
                else {
                    s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c55(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parseText() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        if (peg$c57.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c58);
            }
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                if (peg$c57.test(input.charAt(peg$currPos))) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c58);
                    }
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c55(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseTextNoQuotes() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        if (peg$c59.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c60);
            }
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                if (peg$c59.test(input.charAt(peg$currPos))) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c60);
                    }
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c55(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseNumber() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        if (peg$c61.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c62);
            }
        }
        if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
                s2.push(s3);
                if (peg$c61.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c62);
                    }
                }
            }
        }
        else {
            s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
            s1 = input.substring(s1, peg$currPos);
        }
        else {
            s1 = s2;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c63(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseString() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parseVariableName();
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c64(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseNestedLiteral() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c65) {
            s1 = peg$c65;
            peg$currPos += 2;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c66);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseExtendedDicratical();
            if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 32) {
                    s3 = peg$c67;
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c68);
                    }
                }
                if (s3 !== peg$FAILED) {
                    if (peg$c69.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c70);
                        }
                    }
                    if (s4 === peg$FAILED) {
                        s4 = peg$currPos;
                        if (input.charCodeAt(peg$currPos) === 92) {
                            s5 = peg$c71;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c72);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            if (peg$c73.test(input.charAt(peg$currPos))) {
                                s6 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s6 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c74);
                                }
                            }
                            if (s6 !== peg$FAILED) {
                                s5 = [s5, s6];
                                s4 = s5;
                            }
                            else {
                                peg$currPos = s4;
                                s4 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                            s5 = peg$c17;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c18);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c75(s2, s4);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c13;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$parseVerbatimText();
                if (s3 === peg$FAILED) {
                    s3 = peg$parseText();
                    if (s3 === peg$FAILED) {
                        s3 = peg$parseCommand();
                        if (s3 === peg$FAILED) {
                            s3 = peg$parseNestedLiteral();
                        }
                    }
                }
                while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parseVerbatimText();
                    if (s3 === peg$FAILED) {
                        s3 = peg$parseText();
                        if (s3 === peg$FAILED) {
                            s3 = peg$parseCommand();
                            if (s3 === peg$FAILED) {
                                s3 = peg$parseNestedLiteral();
                            }
                        }
                    }
                }
                if (s2 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 125) {
                        s3 = peg$c17;
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c18);
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c76(s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parseLineComment() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 37) {
            s1 = peg$c77;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c78);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__h();
            if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                s4 = [];
                if (peg$c79.test(input.charAt(peg$currPos))) {
                    s5 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c80);
                    }
                }
                if (s5 !== peg$FAILED) {
                    while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        if (peg$c79.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c80);
                            }
                        }
                    }
                }
                else {
                    s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                    s3 = input.substring(s3, peg$currPos);
                }
                else {
                    s3 = s4;
                }
                if (s3 !== peg$FAILED) {
                    s4 = [];
                    s5 = peg$parseEOL();
                    if (s5 !== peg$FAILED) {
                        while (s5 !== peg$FAILED) {
                            s4.push(s5);
                            s5 = peg$parseEOL();
                        }
                    }
                    else {
                        s4 = peg$FAILED;
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c81(s3);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseCommand() {
        var s0;
        s0 = peg$parseScriptCommand();
        if (s0 === peg$FAILED) {
            s0 = peg$parseDicraticalCommand();
            if (s0 === peg$FAILED) {
                s0 = peg$parseRegularCommand();
                if (s0 === peg$FAILED) {
                    s0 = peg$parseSymbolCommand();
                    if (s0 === peg$FAILED) {
                        s0 = peg$parseMathMode();
                    }
                }
            }
        }
        return s0;
    }
    function peg$parseScriptCommand() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (peg$c82.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c83);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            if (input.charCodeAt(peg$currPos) === 123) {
                s3 = peg$c13;
                peg$currPos++;
            }
            else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            peg$silentFails--;
            if (s3 !== peg$FAILED) {
                peg$currPos = s2;
                s2 = void 0;
            }
            else {
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parseRegularValue();
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c84(s1, s3);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (peg$c82.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c83);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                peg$silentFails++;
                if (input.charCodeAt(peg$currPos) === 92) {
                    s3 = peg$c71;
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c72);
                    }
                }
                peg$silentFails--;
                if (s3 !== peg$FAILED) {
                    peg$currPos = s2;
                    s2 = void 0;
                }
                else {
                    s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseCommand();
                    if (s3 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c84(s1, s3);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (peg$c82.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c83);
                    }
                }
                if (s1 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                        s2 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s2 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c85);
                        }
                    }
                    if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c84(s1, s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
        }
        return s0;
    }
    function peg$parseDicraticalCommand() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
            s1 = peg$c71;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c72);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseSimpleDicratical();
            if (s2 !== peg$FAILED) {
                if (peg$c69.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c70);
                    }
                }
                if (s3 === peg$FAILED) {
                    s3 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 92) {
                        s4 = peg$c71;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c72);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        if (peg$c73.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c74);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            s4 = [s4, s5];
                            s3 = s4;
                        }
                        else {
                            peg$currPos = s3;
                            s3 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                    }
                }
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c86(s2, s3);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 92) {
                s1 = peg$c71;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c72);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parseExtendedDicratical();
                if (s2 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 123) {
                        s3 = peg$c13;
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c14);
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        if (peg$c69.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c70);
                            }
                        }
                        if (s4 === peg$FAILED) {
                            s4 = peg$currPos;
                            if (input.charCodeAt(peg$currPos) === 92) {
                                s5 = peg$c71;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c72);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                if (peg$c73.test(input.charAt(peg$currPos))) {
                                    s6 = input.charAt(peg$currPos);
                                    peg$currPos++;
                                }
                                else {
                                    s6 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c74);
                                    }
                                }
                                if (s6 !== peg$FAILED) {
                                    s5 = [s5, s6];
                                    s4 = s5;
                                }
                                else {
                                    peg$currPos = s4;
                                    s4 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s4;
                                s4 = peg$FAILED;
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 125) {
                                s5 = peg$c17;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c18);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c75(s2, s4);
                                s0 = s1;
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 92) {
                    s1 = peg$c71;
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c72);
                    }
                }
                if (s1 !== peg$FAILED) {
                    s2 = peg$parseExtendedDicratical();
                    if (s2 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 32) {
                            s3 = peg$c67;
                            peg$currPos++;
                        }
                        else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c68);
                            }
                        }
                        if (s3 !== peg$FAILED) {
                            if (peg$c69.test(input.charAt(peg$currPos))) {
                                s4 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s4 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c70);
                                }
                            }
                            if (s4 === peg$FAILED) {
                                s4 = peg$currPos;
                                if (input.charCodeAt(peg$currPos) === 92) {
                                    s5 = peg$c71;
                                    peg$currPos++;
                                }
                                else {
                                    s5 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c72);
                                    }
                                }
                                if (s5 !== peg$FAILED) {
                                    if (peg$c73.test(input.charAt(peg$currPos))) {
                                        s6 = input.charAt(peg$currPos);
                                        peg$currPos++;
                                    }
                                    else {
                                        s6 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c74);
                                        }
                                    }
                                    if (s6 !== peg$FAILED) {
                                        s5 = [s5, s6];
                                        s4 = s5;
                                    }
                                    else {
                                        peg$currPos = s4;
                                        s4 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s4;
                                    s4 = peg$FAILED;
                                }
                            }
                            if (s4 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c75(s2, s4);
                                s0 = s1;
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
        }
        return s0;
    }
    function peg$parseMathMode() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 36) {
            s1 = peg$c87;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c88);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c89();
        }
        s0 = s1;
        return s0;
    }
    function peg$parseSymbolCommand() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
            s1 = peg$c71;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c72);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            if (peg$c90.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c91);
                }
            }
            if (s3 !== peg$FAILED) {
                s2 = input.substring(s2, peg$currPos);
            }
            else {
                s2 = s3;
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c92(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseRegularCommand() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
            s1 = peg$c71;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c72);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            if (peg$c22.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c23);
                }
            }
            if (s4 !== peg$FAILED) {
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    if (peg$c22.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c23);
                        }
                    }
                }
            }
            else {
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                s2 = input.substring(s2, peg$currPos);
            }
            else {
                s2 = s3;
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s3 = peg$c93(s2);
                if (s3) {
                    s3 = void 0;
                }
                else {
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    s4 = [];
                    s5 = peg$parseArgument();
                    while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parseArgument();
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = peg$currPos;
                        s5 = peg$c94(s2, s4);
                        if (s5) {
                            s5 = void 0;
                        }
                        else {
                            s5 = peg$FAILED;
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c95(s2, s4);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseArgument() {
        var s0;
        s0 = peg$parseRequiredArgument();
        if (s0 === peg$FAILED) {
            s0 = peg$parseOptionalArgument();
        }
        return s0;
    }
    function peg$parseOptionalArgument() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
            s1 = peg$c96;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c97);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__h();
            if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                s4 = [];
                if (peg$c98.test(input.charAt(peg$currPos))) {
                    s5 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c99);
                    }
                }
                if (s5 !== peg$FAILED) {
                    while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        if (peg$c98.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c99);
                            }
                        }
                    }
                }
                else {
                    s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                    s3 = input.substring(s3, peg$currPos);
                }
                else {
                    s3 = s4;
                }
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse__h();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 93) {
                            s5 = peg$c100;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c101);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c102(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseRequiredArgument() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c13;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c14);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse__h();
            if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$parseCommand();
                if (s4 === peg$FAILED) {
                    s4 = peg$parseText();
                }
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parseCommand();
                    if (s4 === peg$FAILED) {
                        s4 = peg$parseText();
                    }
                }
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse__h();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                            s5 = peg$c17;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c18);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c103(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseVariableName() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (peg$c104.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c105);
            }
        }
        if (s2 !== peg$FAILED) {
            s3 = [];
            if (peg$c106.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c107);
                }
            }
            while (s4 !== peg$FAILED) {
                s3.push(s4);
                if (peg$c106.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c107);
                    }
                }
            }
            if (s3 !== peg$FAILED) {
                s2 = [s2, s3];
                s1 = s2;
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s1;
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        return s0;
    }
    function peg$parseSimpleDicratical() {
        var s0;
        if (peg$c108.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c109);
            }
        }
        return s0;
    }
    function peg$parseExtendedDicratical() {
        var s0;
        if (peg$c110.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c111);
            }
        }
        return s0;
    }
    function peg$parsePropertySeparator() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
                s2 = peg$c112;
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c113);
                }
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__();
                if (s3 !== peg$FAILED) {
                    s1 = [s1, s2, s3];
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsePropertyTerminator() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
                s2 = peg$c37;
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c38);
                }
            }
            if (s2 === peg$FAILED) {
                s2 = null;
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__h();
                if (s3 !== peg$FAILED) {
                    s4 = [];
                    s5 = peg$parseLineComment();
                    if (s5 === peg$FAILED) {
                        s5 = peg$parseEOL();
                    }
                    while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parseLineComment();
                        if (s5 === peg$FAILED) {
                            s5 = peg$parseEOL();
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s1 = [s1, s2, s3, s4];
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseConcat() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 35) {
                s2 = peg$c114;
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c115);
                }
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parse__();
                if (s3 !== peg$FAILED) {
                    s1 = [s1, s2, s3];
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseEOL() {
        var s0;
        if (peg$c116.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c117);
            }
        }
        return s0;
    }
    function peg$parse_h() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c119.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c120);
            }
        }
        if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
                s0.push(s1);
                if (peg$c119.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c120);
                    }
                }
            }
        }
        else {
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c118);
            }
        }
        return s0;
    }
    function peg$parse__h() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c119.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c120);
            }
        }
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c119.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c120);
                }
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c121);
            }
        }
        return s0;
    }
    function peg$parse_v() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c116.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c117);
            }
        }
        if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
                s0.push(s1);
                if (peg$c116.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c117);
                    }
                }
            }
        }
        else {
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c122);
            }
        }
        return s0;
    }
    function peg$parse__v() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c116.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c117);
            }
        }
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c116.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c117);
                }
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c123);
            }
        }
        return s0;
    }
    function peg$parse_() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c125.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c126);
            }
        }
        if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
                s0.push(s1);
                if (peg$c125.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c126);
                    }
                }
            }
        }
        else {
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c124);
            }
        }
        return s0;
    }
    function peg$parse__() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c125.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c126);
            }
        }
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c125.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c126);
                }
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c127);
            }
        }
        return s0;
    }
    var verbatim = {
        active: 0,
        property: null,
        closer: null,
        verbatimProperties: options.verbatimProperties ? options.verbatimProperties.map(function (prop) { return prop.toLowerCase(); }) : [
            'url',
            'doi',
            'file',
            'eprint',
            'verba',
            'verbb',
            'verbc',
        ],
        verbatimCommands: options.verbatimCommands ? options.verbatimCommands.map(function (cmd) { return cmd.toLowerCase(); }) : [
            'url',
        ],
        verbatimProperty: function (prop) {
            return this.verbatimProperties.includes(prop.toLowerCase());
        },
        enterProperty: function (closer) {
            if (!this.property || !this.verbatimProperty(this.property))
                return true;
            this.property = null;
            this.active = 1;
            this.closer = closer;
            return true;
        },
        leaveProperty: function () {
            this.active = 0;
            this.closer = '';
            this.property = '';
            return true;
        },
        verbatimCommand: function (cmd) {
            return this.verbatimCommands.includes(cmd.toLowerCase());
        },
        enterCommand: function (cmd) {
            if (this.verbatimCommand(cmd))
                this.active++;
            return true;
        },
        leaveCommand: function (cmd) {
            if (this.verbatimCommand(cmd))
                this.active--;
            if (this.active < 0)
                this.active = 0;
            return true;
        },
    };
    function simpleLatexConversions(text) {
        if (verbatim.active) {
            return text;
        }
        else {
            return text
                .replace(/---/g, '\u2014')
                .replace(/--/g, '\u2013')
                .replace(/</g, '\u00A1')
                .replace(/>/g, '\u00BF')
                .replace(/~/g, '\u00A0');
        }
    }
    function normalizeWhitespace(textArr) {
        return textArr.reduce(function (prev, curr) {
            if (/\s/.test(curr)) {
                if (/\s/.test(prev[prev.length - 1])) {
                    return prev;
                }
                else {
                    return prev + ' ';
                }
            }
            return prev + curr;
        }, '');
    }
    peg$result = peg$startRuleFunction();
    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
    }
    else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length
            ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
            : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
    }
}
module.exports = {
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
};


/***/ }),

/***/ "../node_modules/he/he.js":
/*!********************************!*\
  !*** ../node_modules/he/he.js ***!
  \********************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(module, global) {var __WEBPACK_AMD_DEFINE_RESULT__;/*! https://mths.be/he v1.2.0 by @mathias | MIT license */
;(function(root) {

	// Detect free variables `exports`.
	var freeExports =  true && exports;

	// Detect free variable `module`.
	var freeModule =  true && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`.
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	// All astral symbols.
	var regexAstralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	// All ASCII symbols (not just printable ASCII) except those listed in the
	// first column of the overrides table.
	// https://html.spec.whatwg.org/multipage/syntax.html#table-charref-overrides
	var regexAsciiWhitelist = /[\x01-\x7F]/g;
	// All BMP symbols that are not ASCII newlines, printable ASCII symbols, or
	// code points listed in the first column of the overrides table on
	// https://html.spec.whatwg.org/multipage/syntax.html#table-charref-overrides.
	var regexBmpWhitelist = /[\x01-\t\x0B\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g;

	var regexEncodeNonAscii = /<\u20D2|=\u20E5|>\u20D2|\u205F\u200A|\u219D\u0338|\u2202\u0338|\u2220\u20D2|\u2229\uFE00|\u222A\uFE00|\u223C\u20D2|\u223D\u0331|\u223E\u0333|\u2242\u0338|\u224B\u0338|\u224D\u20D2|\u224E\u0338|\u224F\u0338|\u2250\u0338|\u2261\u20E5|\u2264\u20D2|\u2265\u20D2|\u2266\u0338|\u2267\u0338|\u2268\uFE00|\u2269\uFE00|\u226A\u0338|\u226A\u20D2|\u226B\u0338|\u226B\u20D2|\u227F\u0338|\u2282\u20D2|\u2283\u20D2|\u228A\uFE00|\u228B\uFE00|\u228F\u0338|\u2290\u0338|\u2293\uFE00|\u2294\uFE00|\u22B4\u20D2|\u22B5\u20D2|\u22D8\u0338|\u22D9\u0338|\u22DA\uFE00|\u22DB\uFE00|\u22F5\u0338|\u22F9\u0338|\u2933\u0338|\u29CF\u0338|\u29D0\u0338|\u2A6D\u0338|\u2A70\u0338|\u2A7D\u0338|\u2A7E\u0338|\u2AA1\u0338|\u2AA2\u0338|\u2AAC\uFE00|\u2AAD\uFE00|\u2AAF\u0338|\u2AB0\u0338|\u2AC5\u0338|\u2AC6\u0338|\u2ACB\uFE00|\u2ACC\uFE00|\u2AFD\u20E5|[\xA0-\u0113\u0116-\u0122\u0124-\u012B\u012E-\u014D\u0150-\u017E\u0192\u01B5\u01F5\u0237\u02C6\u02C7\u02D8-\u02DD\u0311\u0391-\u03A1\u03A3-\u03A9\u03B1-\u03C9\u03D1\u03D2\u03D5\u03D6\u03DC\u03DD\u03F0\u03F1\u03F5\u03F6\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E\u045F\u2002-\u2005\u2007-\u2010\u2013-\u2016\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2025\u2026\u2030-\u2035\u2039\u203A\u203E\u2041\u2043\u2044\u204F\u2057\u205F-\u2063\u20AC\u20DB\u20DC\u2102\u2105\u210A-\u2113\u2115-\u211E\u2122\u2124\u2127-\u2129\u212C\u212D\u212F-\u2131\u2133-\u2138\u2145-\u2148\u2153-\u215E\u2190-\u219B\u219D-\u21A7\u21A9-\u21AE\u21B0-\u21B3\u21B5-\u21B7\u21BA-\u21DB\u21DD\u21E4\u21E5\u21F5\u21FD-\u2205\u2207-\u2209\u220B\u220C\u220F-\u2214\u2216-\u2218\u221A\u221D-\u2238\u223A-\u2257\u2259\u225A\u225C\u225F-\u2262\u2264-\u228B\u228D-\u229B\u229D-\u22A5\u22A7-\u22B0\u22B2-\u22BB\u22BD-\u22DB\u22DE-\u22E3\u22E6-\u22F7\u22F9-\u22FE\u2305\u2306\u2308-\u2310\u2312\u2313\u2315\u2316\u231C-\u231F\u2322\u2323\u232D\u232E\u2336\u233D\u233F\u237C\u23B0\u23B1\u23B4-\u23B6\u23DC-\u23DF\u23E2\u23E7\u2423\u24C8\u2500\u2502\u250C\u2510\u2514\u2518\u251C\u2524\u252C\u2534\u253C\u2550-\u256C\u2580\u2584\u2588\u2591-\u2593\u25A1\u25AA\u25AB\u25AD\u25AE\u25B1\u25B3-\u25B5\u25B8\u25B9\u25BD-\u25BF\u25C2\u25C3\u25CA\u25CB\u25EC\u25EF\u25F8-\u25FC\u2605\u2606\u260E\u2640\u2642\u2660\u2663\u2665\u2666\u266A\u266D-\u266F\u2713\u2717\u2720\u2736\u2758\u2772\u2773\u27C8\u27C9\u27E6-\u27ED\u27F5-\u27FA\u27FC\u27FF\u2902-\u2905\u290C-\u2913\u2916\u2919-\u2920\u2923-\u292A\u2933\u2935-\u2939\u293C\u293D\u2945\u2948-\u294B\u294E-\u2976\u2978\u2979\u297B-\u297F\u2985\u2986\u298B-\u2996\u299A\u299C\u299D\u29A4-\u29B7\u29B9\u29BB\u29BC\u29BE-\u29C5\u29C9\u29CD-\u29D0\u29DC-\u29DE\u29E3-\u29E5\u29EB\u29F4\u29F6\u2A00-\u2A02\u2A04\u2A06\u2A0C\u2A0D\u2A10-\u2A17\u2A22-\u2A27\u2A29\u2A2A\u2A2D-\u2A31\u2A33-\u2A3C\u2A3F\u2A40\u2A42-\u2A4D\u2A50\u2A53-\u2A58\u2A5A-\u2A5D\u2A5F\u2A66\u2A6A\u2A6D-\u2A75\u2A77-\u2A9A\u2A9D-\u2AA2\u2AA4-\u2AB0\u2AB3-\u2AC8\u2ACB\u2ACC\u2ACF-\u2ADB\u2AE4\u2AE6-\u2AE9\u2AEB-\u2AF3\u2AFD\uFB00-\uFB04]|\uD835[\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDD6B]/g;
	var encodeMap = {'\xAD':'shy','\u200C':'zwnj','\u200D':'zwj','\u200E':'lrm','\u2063':'ic','\u2062':'it','\u2061':'af','\u200F':'rlm','\u200B':'ZeroWidthSpace','\u2060':'NoBreak','\u0311':'DownBreve','\u20DB':'tdot','\u20DC':'DotDot','\t':'Tab','\n':'NewLine','\u2008':'puncsp','\u205F':'MediumSpace','\u2009':'thinsp','\u200A':'hairsp','\u2004':'emsp13','\u2002':'ensp','\u2005':'emsp14','\u2003':'emsp','\u2007':'numsp','\xA0':'nbsp','\u205F\u200A':'ThickSpace','\u203E':'oline','_':'lowbar','\u2010':'dash','\u2013':'ndash','\u2014':'mdash','\u2015':'horbar',',':'comma',';':'semi','\u204F':'bsemi',':':'colon','\u2A74':'Colone','!':'excl','\xA1':'iexcl','?':'quest','\xBF':'iquest','.':'period','\u2025':'nldr','\u2026':'mldr','\xB7':'middot','\'':'apos','\u2018':'lsquo','\u2019':'rsquo','\u201A':'sbquo','\u2039':'lsaquo','\u203A':'rsaquo','"':'quot','\u201C':'ldquo','\u201D':'rdquo','\u201E':'bdquo','\xAB':'laquo','\xBB':'raquo','(':'lpar',')':'rpar','[':'lsqb',']':'rsqb','{':'lcub','}':'rcub','\u2308':'lceil','\u2309':'rceil','\u230A':'lfloor','\u230B':'rfloor','\u2985':'lopar','\u2986':'ropar','\u298B':'lbrke','\u298C':'rbrke','\u298D':'lbrkslu','\u298E':'rbrksld','\u298F':'lbrksld','\u2990':'rbrkslu','\u2991':'langd','\u2992':'rangd','\u2993':'lparlt','\u2994':'rpargt','\u2995':'gtlPar','\u2996':'ltrPar','\u27E6':'lobrk','\u27E7':'robrk','\u27E8':'lang','\u27E9':'rang','\u27EA':'Lang','\u27EB':'Rang','\u27EC':'loang','\u27ED':'roang','\u2772':'lbbrk','\u2773':'rbbrk','\u2016':'Vert','\xA7':'sect','\xB6':'para','@':'commat','*':'ast','/':'sol','undefined':null,'&':'amp','#':'num','%':'percnt','\u2030':'permil','\u2031':'pertenk','\u2020':'dagger','\u2021':'Dagger','\u2022':'bull','\u2043':'hybull','\u2032':'prime','\u2033':'Prime','\u2034':'tprime','\u2057':'qprime','\u2035':'bprime','\u2041':'caret','`':'grave','\xB4':'acute','\u02DC':'tilde','^':'Hat','\xAF':'macr','\u02D8':'breve','\u02D9':'dot','\xA8':'die','\u02DA':'ring','\u02DD':'dblac','\xB8':'cedil','\u02DB':'ogon','\u02C6':'circ','\u02C7':'caron','\xB0':'deg','\xA9':'copy','\xAE':'reg','\u2117':'copysr','\u2118':'wp','\u211E':'rx','\u2127':'mho','\u2129':'iiota','\u2190':'larr','\u219A':'nlarr','\u2192':'rarr','\u219B':'nrarr','\u2191':'uarr','\u2193':'darr','\u2194':'harr','\u21AE':'nharr','\u2195':'varr','\u2196':'nwarr','\u2197':'nearr','\u2198':'searr','\u2199':'swarr','\u219D':'rarrw','\u219D\u0338':'nrarrw','\u219E':'Larr','\u219F':'Uarr','\u21A0':'Rarr','\u21A1':'Darr','\u21A2':'larrtl','\u21A3':'rarrtl','\u21A4':'mapstoleft','\u21A5':'mapstoup','\u21A6':'map','\u21A7':'mapstodown','\u21A9':'larrhk','\u21AA':'rarrhk','\u21AB':'larrlp','\u21AC':'rarrlp','\u21AD':'harrw','\u21B0':'lsh','\u21B1':'rsh','\u21B2':'ldsh','\u21B3':'rdsh','\u21B5':'crarr','\u21B6':'cularr','\u21B7':'curarr','\u21BA':'olarr','\u21BB':'orarr','\u21BC':'lharu','\u21BD':'lhard','\u21BE':'uharr','\u21BF':'uharl','\u21C0':'rharu','\u21C1':'rhard','\u21C2':'dharr','\u21C3':'dharl','\u21C4':'rlarr','\u21C5':'udarr','\u21C6':'lrarr','\u21C7':'llarr','\u21C8':'uuarr','\u21C9':'rrarr','\u21CA':'ddarr','\u21CB':'lrhar','\u21CC':'rlhar','\u21D0':'lArr','\u21CD':'nlArr','\u21D1':'uArr','\u21D2':'rArr','\u21CF':'nrArr','\u21D3':'dArr','\u21D4':'iff','\u21CE':'nhArr','\u21D5':'vArr','\u21D6':'nwArr','\u21D7':'neArr','\u21D8':'seArr','\u21D9':'swArr','\u21DA':'lAarr','\u21DB':'rAarr','\u21DD':'zigrarr','\u21E4':'larrb','\u21E5':'rarrb','\u21F5':'duarr','\u21FD':'loarr','\u21FE':'roarr','\u21FF':'hoarr','\u2200':'forall','\u2201':'comp','\u2202':'part','\u2202\u0338':'npart','\u2203':'exist','\u2204':'nexist','\u2205':'empty','\u2207':'Del','\u2208':'in','\u2209':'notin','\u220B':'ni','\u220C':'notni','\u03F6':'bepsi','\u220F':'prod','\u2210':'coprod','\u2211':'sum','+':'plus','\xB1':'pm','\xF7':'div','\xD7':'times','<':'lt','\u226E':'nlt','<\u20D2':'nvlt','=':'equals','\u2260':'ne','=\u20E5':'bne','\u2A75':'Equal','>':'gt','\u226F':'ngt','>\u20D2':'nvgt','\xAC':'not','|':'vert','\xA6':'brvbar','\u2212':'minus','\u2213':'mp','\u2214':'plusdo','\u2044':'frasl','\u2216':'setmn','\u2217':'lowast','\u2218':'compfn','\u221A':'Sqrt','\u221D':'prop','\u221E':'infin','\u221F':'angrt','\u2220':'ang','\u2220\u20D2':'nang','\u2221':'angmsd','\u2222':'angsph','\u2223':'mid','\u2224':'nmid','\u2225':'par','\u2226':'npar','\u2227':'and','\u2228':'or','\u2229':'cap','\u2229\uFE00':'caps','\u222A':'cup','\u222A\uFE00':'cups','\u222B':'int','\u222C':'Int','\u222D':'tint','\u2A0C':'qint','\u222E':'oint','\u222F':'Conint','\u2230':'Cconint','\u2231':'cwint','\u2232':'cwconint','\u2233':'awconint','\u2234':'there4','\u2235':'becaus','\u2236':'ratio','\u2237':'Colon','\u2238':'minusd','\u223A':'mDDot','\u223B':'homtht','\u223C':'sim','\u2241':'nsim','\u223C\u20D2':'nvsim','\u223D':'bsim','\u223D\u0331':'race','\u223E':'ac','\u223E\u0333':'acE','\u223F':'acd','\u2240':'wr','\u2242':'esim','\u2242\u0338':'nesim','\u2243':'sime','\u2244':'nsime','\u2245':'cong','\u2247':'ncong','\u2246':'simne','\u2248':'ap','\u2249':'nap','\u224A':'ape','\u224B':'apid','\u224B\u0338':'napid','\u224C':'bcong','\u224D':'CupCap','\u226D':'NotCupCap','\u224D\u20D2':'nvap','\u224E':'bump','\u224E\u0338':'nbump','\u224F':'bumpe','\u224F\u0338':'nbumpe','\u2250':'doteq','\u2250\u0338':'nedot','\u2251':'eDot','\u2252':'efDot','\u2253':'erDot','\u2254':'colone','\u2255':'ecolon','\u2256':'ecir','\u2257':'cire','\u2259':'wedgeq','\u225A':'veeeq','\u225C':'trie','\u225F':'equest','\u2261':'equiv','\u2262':'nequiv','\u2261\u20E5':'bnequiv','\u2264':'le','\u2270':'nle','\u2264\u20D2':'nvle','\u2265':'ge','\u2271':'nge','\u2265\u20D2':'nvge','\u2266':'lE','\u2266\u0338':'nlE','\u2267':'gE','\u2267\u0338':'ngE','\u2268\uFE00':'lvnE','\u2268':'lnE','\u2269':'gnE','\u2269\uFE00':'gvnE','\u226A':'ll','\u226A\u0338':'nLtv','\u226A\u20D2':'nLt','\u226B':'gg','\u226B\u0338':'nGtv','\u226B\u20D2':'nGt','\u226C':'twixt','\u2272':'lsim','\u2274':'nlsim','\u2273':'gsim','\u2275':'ngsim','\u2276':'lg','\u2278':'ntlg','\u2277':'gl','\u2279':'ntgl','\u227A':'pr','\u2280':'npr','\u227B':'sc','\u2281':'nsc','\u227C':'prcue','\u22E0':'nprcue','\u227D':'sccue','\u22E1':'nsccue','\u227E':'prsim','\u227F':'scsim','\u227F\u0338':'NotSucceedsTilde','\u2282':'sub','\u2284':'nsub','\u2282\u20D2':'vnsub','\u2283':'sup','\u2285':'nsup','\u2283\u20D2':'vnsup','\u2286':'sube','\u2288':'nsube','\u2287':'supe','\u2289':'nsupe','\u228A\uFE00':'vsubne','\u228A':'subne','\u228B\uFE00':'vsupne','\u228B':'supne','\u228D':'cupdot','\u228E':'uplus','\u228F':'sqsub','\u228F\u0338':'NotSquareSubset','\u2290':'sqsup','\u2290\u0338':'NotSquareSuperset','\u2291':'sqsube','\u22E2':'nsqsube','\u2292':'sqsupe','\u22E3':'nsqsupe','\u2293':'sqcap','\u2293\uFE00':'sqcaps','\u2294':'sqcup','\u2294\uFE00':'sqcups','\u2295':'oplus','\u2296':'ominus','\u2297':'otimes','\u2298':'osol','\u2299':'odot','\u229A':'ocir','\u229B':'oast','\u229D':'odash','\u229E':'plusb','\u229F':'minusb','\u22A0':'timesb','\u22A1':'sdotb','\u22A2':'vdash','\u22AC':'nvdash','\u22A3':'dashv','\u22A4':'top','\u22A5':'bot','\u22A7':'models','\u22A8':'vDash','\u22AD':'nvDash','\u22A9':'Vdash','\u22AE':'nVdash','\u22AA':'Vvdash','\u22AB':'VDash','\u22AF':'nVDash','\u22B0':'prurel','\u22B2':'vltri','\u22EA':'nltri','\u22B3':'vrtri','\u22EB':'nrtri','\u22B4':'ltrie','\u22EC':'nltrie','\u22B4\u20D2':'nvltrie','\u22B5':'rtrie','\u22ED':'nrtrie','\u22B5\u20D2':'nvrtrie','\u22B6':'origof','\u22B7':'imof','\u22B8':'mumap','\u22B9':'hercon','\u22BA':'intcal','\u22BB':'veebar','\u22BD':'barvee','\u22BE':'angrtvb','\u22BF':'lrtri','\u22C0':'Wedge','\u22C1':'Vee','\u22C2':'xcap','\u22C3':'xcup','\u22C4':'diam','\u22C5':'sdot','\u22C6':'Star','\u22C7':'divonx','\u22C8':'bowtie','\u22C9':'ltimes','\u22CA':'rtimes','\u22CB':'lthree','\u22CC':'rthree','\u22CD':'bsime','\u22CE':'cuvee','\u22CF':'cuwed','\u22D0':'Sub','\u22D1':'Sup','\u22D2':'Cap','\u22D3':'Cup','\u22D4':'fork','\u22D5':'epar','\u22D6':'ltdot','\u22D7':'gtdot','\u22D8':'Ll','\u22D8\u0338':'nLl','\u22D9':'Gg','\u22D9\u0338':'nGg','\u22DA\uFE00':'lesg','\u22DA':'leg','\u22DB':'gel','\u22DB\uFE00':'gesl','\u22DE':'cuepr','\u22DF':'cuesc','\u22E6':'lnsim','\u22E7':'gnsim','\u22E8':'prnsim','\u22E9':'scnsim','\u22EE':'vellip','\u22EF':'ctdot','\u22F0':'utdot','\u22F1':'dtdot','\u22F2':'disin','\u22F3':'isinsv','\u22F4':'isins','\u22F5':'isindot','\u22F5\u0338':'notindot','\u22F6':'notinvc','\u22F7':'notinvb','\u22F9':'isinE','\u22F9\u0338':'notinE','\u22FA':'nisd','\u22FB':'xnis','\u22FC':'nis','\u22FD':'notnivc','\u22FE':'notnivb','\u2305':'barwed','\u2306':'Barwed','\u230C':'drcrop','\u230D':'dlcrop','\u230E':'urcrop','\u230F':'ulcrop','\u2310':'bnot','\u2312':'profline','\u2313':'profsurf','\u2315':'telrec','\u2316':'target','\u231C':'ulcorn','\u231D':'urcorn','\u231E':'dlcorn','\u231F':'drcorn','\u2322':'frown','\u2323':'smile','\u232D':'cylcty','\u232E':'profalar','\u2336':'topbot','\u233D':'ovbar','\u233F':'solbar','\u237C':'angzarr','\u23B0':'lmoust','\u23B1':'rmoust','\u23B4':'tbrk','\u23B5':'bbrk','\u23B6':'bbrktbrk','\u23DC':'OverParenthesis','\u23DD':'UnderParenthesis','\u23DE':'OverBrace','\u23DF':'UnderBrace','\u23E2':'trpezium','\u23E7':'elinters','\u2423':'blank','\u2500':'boxh','\u2502':'boxv','\u250C':'boxdr','\u2510':'boxdl','\u2514':'boxur','\u2518':'boxul','\u251C':'boxvr','\u2524':'boxvl','\u252C':'boxhd','\u2534':'boxhu','\u253C':'boxvh','\u2550':'boxH','\u2551':'boxV','\u2552':'boxdR','\u2553':'boxDr','\u2554':'boxDR','\u2555':'boxdL','\u2556':'boxDl','\u2557':'boxDL','\u2558':'boxuR','\u2559':'boxUr','\u255A':'boxUR','\u255B':'boxuL','\u255C':'boxUl','\u255D':'boxUL','\u255E':'boxvR','\u255F':'boxVr','\u2560':'boxVR','\u2561':'boxvL','\u2562':'boxVl','\u2563':'boxVL','\u2564':'boxHd','\u2565':'boxhD','\u2566':'boxHD','\u2567':'boxHu','\u2568':'boxhU','\u2569':'boxHU','\u256A':'boxvH','\u256B':'boxVh','\u256C':'boxVH','\u2580':'uhblk','\u2584':'lhblk','\u2588':'block','\u2591':'blk14','\u2592':'blk12','\u2593':'blk34','\u25A1':'squ','\u25AA':'squf','\u25AB':'EmptyVerySmallSquare','\u25AD':'rect','\u25AE':'marker','\u25B1':'fltns','\u25B3':'xutri','\u25B4':'utrif','\u25B5':'utri','\u25B8':'rtrif','\u25B9':'rtri','\u25BD':'xdtri','\u25BE':'dtrif','\u25BF':'dtri','\u25C2':'ltrif','\u25C3':'ltri','\u25CA':'loz','\u25CB':'cir','\u25EC':'tridot','\u25EF':'xcirc','\u25F8':'ultri','\u25F9':'urtri','\u25FA':'lltri','\u25FB':'EmptySmallSquare','\u25FC':'FilledSmallSquare','\u2605':'starf','\u2606':'star','\u260E':'phone','\u2640':'female','\u2642':'male','\u2660':'spades','\u2663':'clubs','\u2665':'hearts','\u2666':'diams','\u266A':'sung','\u2713':'check','\u2717':'cross','\u2720':'malt','\u2736':'sext','\u2758':'VerticalSeparator','\u27C8':'bsolhsub','\u27C9':'suphsol','\u27F5':'xlarr','\u27F6':'xrarr','\u27F7':'xharr','\u27F8':'xlArr','\u27F9':'xrArr','\u27FA':'xhArr','\u27FC':'xmap','\u27FF':'dzigrarr','\u2902':'nvlArr','\u2903':'nvrArr','\u2904':'nvHarr','\u2905':'Map','\u290C':'lbarr','\u290D':'rbarr','\u290E':'lBarr','\u290F':'rBarr','\u2910':'RBarr','\u2911':'DDotrahd','\u2912':'UpArrowBar','\u2913':'DownArrowBar','\u2916':'Rarrtl','\u2919':'latail','\u291A':'ratail','\u291B':'lAtail','\u291C':'rAtail','\u291D':'larrfs','\u291E':'rarrfs','\u291F':'larrbfs','\u2920':'rarrbfs','\u2923':'nwarhk','\u2924':'nearhk','\u2925':'searhk','\u2926':'swarhk','\u2927':'nwnear','\u2928':'toea','\u2929':'tosa','\u292A':'swnwar','\u2933':'rarrc','\u2933\u0338':'nrarrc','\u2935':'cudarrr','\u2936':'ldca','\u2937':'rdca','\u2938':'cudarrl','\u2939':'larrpl','\u293C':'curarrm','\u293D':'cularrp','\u2945':'rarrpl','\u2948':'harrcir','\u2949':'Uarrocir','\u294A':'lurdshar','\u294B':'ldrushar','\u294E':'LeftRightVector','\u294F':'RightUpDownVector','\u2950':'DownLeftRightVector','\u2951':'LeftUpDownVector','\u2952':'LeftVectorBar','\u2953':'RightVectorBar','\u2954':'RightUpVectorBar','\u2955':'RightDownVectorBar','\u2956':'DownLeftVectorBar','\u2957':'DownRightVectorBar','\u2958':'LeftUpVectorBar','\u2959':'LeftDownVectorBar','\u295A':'LeftTeeVector','\u295B':'RightTeeVector','\u295C':'RightUpTeeVector','\u295D':'RightDownTeeVector','\u295E':'DownLeftTeeVector','\u295F':'DownRightTeeVector','\u2960':'LeftUpTeeVector','\u2961':'LeftDownTeeVector','\u2962':'lHar','\u2963':'uHar','\u2964':'rHar','\u2965':'dHar','\u2966':'luruhar','\u2967':'ldrdhar','\u2968':'ruluhar','\u2969':'rdldhar','\u296A':'lharul','\u296B':'llhard','\u296C':'rharul','\u296D':'lrhard','\u296E':'udhar','\u296F':'duhar','\u2970':'RoundImplies','\u2971':'erarr','\u2972':'simrarr','\u2973':'larrsim','\u2974':'rarrsim','\u2975':'rarrap','\u2976':'ltlarr','\u2978':'gtrarr','\u2979':'subrarr','\u297B':'suplarr','\u297C':'lfisht','\u297D':'rfisht','\u297E':'ufisht','\u297F':'dfisht','\u299A':'vzigzag','\u299C':'vangrt','\u299D':'angrtvbd','\u29A4':'ange','\u29A5':'range','\u29A6':'dwangle','\u29A7':'uwangle','\u29A8':'angmsdaa','\u29A9':'angmsdab','\u29AA':'angmsdac','\u29AB':'angmsdad','\u29AC':'angmsdae','\u29AD':'angmsdaf','\u29AE':'angmsdag','\u29AF':'angmsdah','\u29B0':'bemptyv','\u29B1':'demptyv','\u29B2':'cemptyv','\u29B3':'raemptyv','\u29B4':'laemptyv','\u29B5':'ohbar','\u29B6':'omid','\u29B7':'opar','\u29B9':'operp','\u29BB':'olcross','\u29BC':'odsold','\u29BE':'olcir','\u29BF':'ofcir','\u29C0':'olt','\u29C1':'ogt','\u29C2':'cirscir','\u29C3':'cirE','\u29C4':'solb','\u29C5':'bsolb','\u29C9':'boxbox','\u29CD':'trisb','\u29CE':'rtriltri','\u29CF':'LeftTriangleBar','\u29CF\u0338':'NotLeftTriangleBar','\u29D0':'RightTriangleBar','\u29D0\u0338':'NotRightTriangleBar','\u29DC':'iinfin','\u29DD':'infintie','\u29DE':'nvinfin','\u29E3':'eparsl','\u29E4':'smeparsl','\u29E5':'eqvparsl','\u29EB':'lozf','\u29F4':'RuleDelayed','\u29F6':'dsol','\u2A00':'xodot','\u2A01':'xoplus','\u2A02':'xotime','\u2A04':'xuplus','\u2A06':'xsqcup','\u2A0D':'fpartint','\u2A10':'cirfnint','\u2A11':'awint','\u2A12':'rppolint','\u2A13':'scpolint','\u2A14':'npolint','\u2A15':'pointint','\u2A16':'quatint','\u2A17':'intlarhk','\u2A22':'pluscir','\u2A23':'plusacir','\u2A24':'simplus','\u2A25':'plusdu','\u2A26':'plussim','\u2A27':'plustwo','\u2A29':'mcomma','\u2A2A':'minusdu','\u2A2D':'loplus','\u2A2E':'roplus','\u2A2F':'Cross','\u2A30':'timesd','\u2A31':'timesbar','\u2A33':'smashp','\u2A34':'lotimes','\u2A35':'rotimes','\u2A36':'otimesas','\u2A37':'Otimes','\u2A38':'odiv','\u2A39':'triplus','\u2A3A':'triminus','\u2A3B':'tritime','\u2A3C':'iprod','\u2A3F':'amalg','\u2A40':'capdot','\u2A42':'ncup','\u2A43':'ncap','\u2A44':'capand','\u2A45':'cupor','\u2A46':'cupcap','\u2A47':'capcup','\u2A48':'cupbrcap','\u2A49':'capbrcup','\u2A4A':'cupcup','\u2A4B':'capcap','\u2A4C':'ccups','\u2A4D':'ccaps','\u2A50':'ccupssm','\u2A53':'And','\u2A54':'Or','\u2A55':'andand','\u2A56':'oror','\u2A57':'orslope','\u2A58':'andslope','\u2A5A':'andv','\u2A5B':'orv','\u2A5C':'andd','\u2A5D':'ord','\u2A5F':'wedbar','\u2A66':'sdote','\u2A6A':'simdot','\u2A6D':'congdot','\u2A6D\u0338':'ncongdot','\u2A6E':'easter','\u2A6F':'apacir','\u2A70':'apE','\u2A70\u0338':'napE','\u2A71':'eplus','\u2A72':'pluse','\u2A73':'Esim','\u2A77':'eDDot','\u2A78':'equivDD','\u2A79':'ltcir','\u2A7A':'gtcir','\u2A7B':'ltquest','\u2A7C':'gtquest','\u2A7D':'les','\u2A7D\u0338':'nles','\u2A7E':'ges','\u2A7E\u0338':'nges','\u2A7F':'lesdot','\u2A80':'gesdot','\u2A81':'lesdoto','\u2A82':'gesdoto','\u2A83':'lesdotor','\u2A84':'gesdotol','\u2A85':'lap','\u2A86':'gap','\u2A87':'lne','\u2A88':'gne','\u2A89':'lnap','\u2A8A':'gnap','\u2A8B':'lEg','\u2A8C':'gEl','\u2A8D':'lsime','\u2A8E':'gsime','\u2A8F':'lsimg','\u2A90':'gsiml','\u2A91':'lgE','\u2A92':'glE','\u2A93':'lesges','\u2A94':'gesles','\u2A95':'els','\u2A96':'egs','\u2A97':'elsdot','\u2A98':'egsdot','\u2A99':'el','\u2A9A':'eg','\u2A9D':'siml','\u2A9E':'simg','\u2A9F':'simlE','\u2AA0':'simgE','\u2AA1':'LessLess','\u2AA1\u0338':'NotNestedLessLess','\u2AA2':'GreaterGreater','\u2AA2\u0338':'NotNestedGreaterGreater','\u2AA4':'glj','\u2AA5':'gla','\u2AA6':'ltcc','\u2AA7':'gtcc','\u2AA8':'lescc','\u2AA9':'gescc','\u2AAA':'smt','\u2AAB':'lat','\u2AAC':'smte','\u2AAC\uFE00':'smtes','\u2AAD':'late','\u2AAD\uFE00':'lates','\u2AAE':'bumpE','\u2AAF':'pre','\u2AAF\u0338':'npre','\u2AB0':'sce','\u2AB0\u0338':'nsce','\u2AB3':'prE','\u2AB4':'scE','\u2AB5':'prnE','\u2AB6':'scnE','\u2AB7':'prap','\u2AB8':'scap','\u2AB9':'prnap','\u2ABA':'scnap','\u2ABB':'Pr','\u2ABC':'Sc','\u2ABD':'subdot','\u2ABE':'supdot','\u2ABF':'subplus','\u2AC0':'supplus','\u2AC1':'submult','\u2AC2':'supmult','\u2AC3':'subedot','\u2AC4':'supedot','\u2AC5':'subE','\u2AC5\u0338':'nsubE','\u2AC6':'supE','\u2AC6\u0338':'nsupE','\u2AC7':'subsim','\u2AC8':'supsim','\u2ACB\uFE00':'vsubnE','\u2ACB':'subnE','\u2ACC\uFE00':'vsupnE','\u2ACC':'supnE','\u2ACF':'csub','\u2AD0':'csup','\u2AD1':'csube','\u2AD2':'csupe','\u2AD3':'subsup','\u2AD4':'supsub','\u2AD5':'subsub','\u2AD6':'supsup','\u2AD7':'suphsub','\u2AD8':'supdsub','\u2AD9':'forkv','\u2ADA':'topfork','\u2ADB':'mlcp','\u2AE4':'Dashv','\u2AE6':'Vdashl','\u2AE7':'Barv','\u2AE8':'vBar','\u2AE9':'vBarv','\u2AEB':'Vbar','\u2AEC':'Not','\u2AED':'bNot','\u2AEE':'rnmid','\u2AEF':'cirmid','\u2AF0':'midcir','\u2AF1':'topcir','\u2AF2':'nhpar','\u2AF3':'parsim','\u2AFD':'parsl','\u2AFD\u20E5':'nparsl','\u266D':'flat','\u266E':'natur','\u266F':'sharp','\xA4':'curren','\xA2':'cent','$':'dollar','\xA3':'pound','\xA5':'yen','\u20AC':'euro','\xB9':'sup1','\xBD':'half','\u2153':'frac13','\xBC':'frac14','\u2155':'frac15','\u2159':'frac16','\u215B':'frac18','\xB2':'sup2','\u2154':'frac23','\u2156':'frac25','\xB3':'sup3','\xBE':'frac34','\u2157':'frac35','\u215C':'frac38','\u2158':'frac45','\u215A':'frac56','\u215D':'frac58','\u215E':'frac78','\uD835\uDCB6':'ascr','\uD835\uDD52':'aopf','\uD835\uDD1E':'afr','\uD835\uDD38':'Aopf','\uD835\uDD04':'Afr','\uD835\uDC9C':'Ascr','\xAA':'ordf','\xE1':'aacute','\xC1':'Aacute','\xE0':'agrave','\xC0':'Agrave','\u0103':'abreve','\u0102':'Abreve','\xE2':'acirc','\xC2':'Acirc','\xE5':'aring','\xC5':'angst','\xE4':'auml','\xC4':'Auml','\xE3':'atilde','\xC3':'Atilde','\u0105':'aogon','\u0104':'Aogon','\u0101':'amacr','\u0100':'Amacr','\xE6':'aelig','\xC6':'AElig','\uD835\uDCB7':'bscr','\uD835\uDD53':'bopf','\uD835\uDD1F':'bfr','\uD835\uDD39':'Bopf','\u212C':'Bscr','\uD835\uDD05':'Bfr','\uD835\uDD20':'cfr','\uD835\uDCB8':'cscr','\uD835\uDD54':'copf','\u212D':'Cfr','\uD835\uDC9E':'Cscr','\u2102':'Copf','\u0107':'cacute','\u0106':'Cacute','\u0109':'ccirc','\u0108':'Ccirc','\u010D':'ccaron','\u010C':'Ccaron','\u010B':'cdot','\u010A':'Cdot','\xE7':'ccedil','\xC7':'Ccedil','\u2105':'incare','\uD835\uDD21':'dfr','\u2146':'dd','\uD835\uDD55':'dopf','\uD835\uDCB9':'dscr','\uD835\uDC9F':'Dscr','\uD835\uDD07':'Dfr','\u2145':'DD','\uD835\uDD3B':'Dopf','\u010F':'dcaron','\u010E':'Dcaron','\u0111':'dstrok','\u0110':'Dstrok','\xF0':'eth','\xD0':'ETH','\u2147':'ee','\u212F':'escr','\uD835\uDD22':'efr','\uD835\uDD56':'eopf','\u2130':'Escr','\uD835\uDD08':'Efr','\uD835\uDD3C':'Eopf','\xE9':'eacute','\xC9':'Eacute','\xE8':'egrave','\xC8':'Egrave','\xEA':'ecirc','\xCA':'Ecirc','\u011B':'ecaron','\u011A':'Ecaron','\xEB':'euml','\xCB':'Euml','\u0117':'edot','\u0116':'Edot','\u0119':'eogon','\u0118':'Eogon','\u0113':'emacr','\u0112':'Emacr','\uD835\uDD23':'ffr','\uD835\uDD57':'fopf','\uD835\uDCBB':'fscr','\uD835\uDD09':'Ffr','\uD835\uDD3D':'Fopf','\u2131':'Fscr','\uFB00':'fflig','\uFB03':'ffilig','\uFB04':'ffllig','\uFB01':'filig','fj':'fjlig','\uFB02':'fllig','\u0192':'fnof','\u210A':'gscr','\uD835\uDD58':'gopf','\uD835\uDD24':'gfr','\uD835\uDCA2':'Gscr','\uD835\uDD3E':'Gopf','\uD835\uDD0A':'Gfr','\u01F5':'gacute','\u011F':'gbreve','\u011E':'Gbreve','\u011D':'gcirc','\u011C':'Gcirc','\u0121':'gdot','\u0120':'Gdot','\u0122':'Gcedil','\uD835\uDD25':'hfr','\u210E':'planckh','\uD835\uDCBD':'hscr','\uD835\uDD59':'hopf','\u210B':'Hscr','\u210C':'Hfr','\u210D':'Hopf','\u0125':'hcirc','\u0124':'Hcirc','\u210F':'hbar','\u0127':'hstrok','\u0126':'Hstrok','\uD835\uDD5A':'iopf','\uD835\uDD26':'ifr','\uD835\uDCBE':'iscr','\u2148':'ii','\uD835\uDD40':'Iopf','\u2110':'Iscr','\u2111':'Im','\xED':'iacute','\xCD':'Iacute','\xEC':'igrave','\xCC':'Igrave','\xEE':'icirc','\xCE':'Icirc','\xEF':'iuml','\xCF':'Iuml','\u0129':'itilde','\u0128':'Itilde','\u0130':'Idot','\u012F':'iogon','\u012E':'Iogon','\u012B':'imacr','\u012A':'Imacr','\u0133':'ijlig','\u0132':'IJlig','\u0131':'imath','\uD835\uDCBF':'jscr','\uD835\uDD5B':'jopf','\uD835\uDD27':'jfr','\uD835\uDCA5':'Jscr','\uD835\uDD0D':'Jfr','\uD835\uDD41':'Jopf','\u0135':'jcirc','\u0134':'Jcirc','\u0237':'jmath','\uD835\uDD5C':'kopf','\uD835\uDCC0':'kscr','\uD835\uDD28':'kfr','\uD835\uDCA6':'Kscr','\uD835\uDD42':'Kopf','\uD835\uDD0E':'Kfr','\u0137':'kcedil','\u0136':'Kcedil','\uD835\uDD29':'lfr','\uD835\uDCC1':'lscr','\u2113':'ell','\uD835\uDD5D':'lopf','\u2112':'Lscr','\uD835\uDD0F':'Lfr','\uD835\uDD43':'Lopf','\u013A':'lacute','\u0139':'Lacute','\u013E':'lcaron','\u013D':'Lcaron','\u013C':'lcedil','\u013B':'Lcedil','\u0142':'lstrok','\u0141':'Lstrok','\u0140':'lmidot','\u013F':'Lmidot','\uD835\uDD2A':'mfr','\uD835\uDD5E':'mopf','\uD835\uDCC2':'mscr','\uD835\uDD10':'Mfr','\uD835\uDD44':'Mopf','\u2133':'Mscr','\uD835\uDD2B':'nfr','\uD835\uDD5F':'nopf','\uD835\uDCC3':'nscr','\u2115':'Nopf','\uD835\uDCA9':'Nscr','\uD835\uDD11':'Nfr','\u0144':'nacute','\u0143':'Nacute','\u0148':'ncaron','\u0147':'Ncaron','\xF1':'ntilde','\xD1':'Ntilde','\u0146':'ncedil','\u0145':'Ncedil','\u2116':'numero','\u014B':'eng','\u014A':'ENG','\uD835\uDD60':'oopf','\uD835\uDD2C':'ofr','\u2134':'oscr','\uD835\uDCAA':'Oscr','\uD835\uDD12':'Ofr','\uD835\uDD46':'Oopf','\xBA':'ordm','\xF3':'oacute','\xD3':'Oacute','\xF2':'ograve','\xD2':'Ograve','\xF4':'ocirc','\xD4':'Ocirc','\xF6':'ouml','\xD6':'Ouml','\u0151':'odblac','\u0150':'Odblac','\xF5':'otilde','\xD5':'Otilde','\xF8':'oslash','\xD8':'Oslash','\u014D':'omacr','\u014C':'Omacr','\u0153':'oelig','\u0152':'OElig','\uD835\uDD2D':'pfr','\uD835\uDCC5':'pscr','\uD835\uDD61':'popf','\u2119':'Popf','\uD835\uDD13':'Pfr','\uD835\uDCAB':'Pscr','\uD835\uDD62':'qopf','\uD835\uDD2E':'qfr','\uD835\uDCC6':'qscr','\uD835\uDCAC':'Qscr','\uD835\uDD14':'Qfr','\u211A':'Qopf','\u0138':'kgreen','\uD835\uDD2F':'rfr','\uD835\uDD63':'ropf','\uD835\uDCC7':'rscr','\u211B':'Rscr','\u211C':'Re','\u211D':'Ropf','\u0155':'racute','\u0154':'Racute','\u0159':'rcaron','\u0158':'Rcaron','\u0157':'rcedil','\u0156':'Rcedil','\uD835\uDD64':'sopf','\uD835\uDCC8':'sscr','\uD835\uDD30':'sfr','\uD835\uDD4A':'Sopf','\uD835\uDD16':'Sfr','\uD835\uDCAE':'Sscr','\u24C8':'oS','\u015B':'sacute','\u015A':'Sacute','\u015D':'scirc','\u015C':'Scirc','\u0161':'scaron','\u0160':'Scaron','\u015F':'scedil','\u015E':'Scedil','\xDF':'szlig','\uD835\uDD31':'tfr','\uD835\uDCC9':'tscr','\uD835\uDD65':'topf','\uD835\uDCAF':'Tscr','\uD835\uDD17':'Tfr','\uD835\uDD4B':'Topf','\u0165':'tcaron','\u0164':'Tcaron','\u0163':'tcedil','\u0162':'Tcedil','\u2122':'trade','\u0167':'tstrok','\u0166':'Tstrok','\uD835\uDCCA':'uscr','\uD835\uDD66':'uopf','\uD835\uDD32':'ufr','\uD835\uDD4C':'Uopf','\uD835\uDD18':'Ufr','\uD835\uDCB0':'Uscr','\xFA':'uacute','\xDA':'Uacute','\xF9':'ugrave','\xD9':'Ugrave','\u016D':'ubreve','\u016C':'Ubreve','\xFB':'ucirc','\xDB':'Ucirc','\u016F':'uring','\u016E':'Uring','\xFC':'uuml','\xDC':'Uuml','\u0171':'udblac','\u0170':'Udblac','\u0169':'utilde','\u0168':'Utilde','\u0173':'uogon','\u0172':'Uogon','\u016B':'umacr','\u016A':'Umacr','\uD835\uDD33':'vfr','\uD835\uDD67':'vopf','\uD835\uDCCB':'vscr','\uD835\uDD19':'Vfr','\uD835\uDD4D':'Vopf','\uD835\uDCB1':'Vscr','\uD835\uDD68':'wopf','\uD835\uDCCC':'wscr','\uD835\uDD34':'wfr','\uD835\uDCB2':'Wscr','\uD835\uDD4E':'Wopf','\uD835\uDD1A':'Wfr','\u0175':'wcirc','\u0174':'Wcirc','\uD835\uDD35':'xfr','\uD835\uDCCD':'xscr','\uD835\uDD69':'xopf','\uD835\uDD4F':'Xopf','\uD835\uDD1B':'Xfr','\uD835\uDCB3':'Xscr','\uD835\uDD36':'yfr','\uD835\uDCCE':'yscr','\uD835\uDD6A':'yopf','\uD835\uDCB4':'Yscr','\uD835\uDD1C':'Yfr','\uD835\uDD50':'Yopf','\xFD':'yacute','\xDD':'Yacute','\u0177':'ycirc','\u0176':'Ycirc','\xFF':'yuml','\u0178':'Yuml','\uD835\uDCCF':'zscr','\uD835\uDD37':'zfr','\uD835\uDD6B':'zopf','\u2128':'Zfr','\u2124':'Zopf','\uD835\uDCB5':'Zscr','\u017A':'zacute','\u0179':'Zacute','\u017E':'zcaron','\u017D':'Zcaron','\u017C':'zdot','\u017B':'Zdot','\u01B5':'imped','\xFE':'thorn','\xDE':'THORN','\u0149':'napos','\u03B1':'alpha','\u0391':'Alpha','\u03B2':'beta','\u0392':'Beta','\u03B3':'gamma','\u0393':'Gamma','\u03B4':'delta','\u0394':'Delta','\u03B5':'epsi','\u03F5':'epsiv','\u0395':'Epsilon','\u03DD':'gammad','\u03DC':'Gammad','\u03B6':'zeta','\u0396':'Zeta','\u03B7':'eta','\u0397':'Eta','\u03B8':'theta','\u03D1':'thetav','\u0398':'Theta','\u03B9':'iota','\u0399':'Iota','\u03BA':'kappa','\u03F0':'kappav','\u039A':'Kappa','\u03BB':'lambda','\u039B':'Lambda','\u03BC':'mu','\xB5':'micro','\u039C':'Mu','\u03BD':'nu','\u039D':'Nu','\u03BE':'xi','\u039E':'Xi','\u03BF':'omicron','\u039F':'Omicron','\u03C0':'pi','\u03D6':'piv','\u03A0':'Pi','\u03C1':'rho','\u03F1':'rhov','\u03A1':'Rho','\u03C3':'sigma','\u03A3':'Sigma','\u03C2':'sigmaf','\u03C4':'tau','\u03A4':'Tau','\u03C5':'upsi','\u03A5':'Upsilon','\u03D2':'Upsi','\u03C6':'phi','\u03D5':'phiv','\u03A6':'Phi','\u03C7':'chi','\u03A7':'Chi','\u03C8':'psi','\u03A8':'Psi','\u03C9':'omega','\u03A9':'ohm','\u0430':'acy','\u0410':'Acy','\u0431':'bcy','\u0411':'Bcy','\u0432':'vcy','\u0412':'Vcy','\u0433':'gcy','\u0413':'Gcy','\u0453':'gjcy','\u0403':'GJcy','\u0434':'dcy','\u0414':'Dcy','\u0452':'djcy','\u0402':'DJcy','\u0435':'iecy','\u0415':'IEcy','\u0451':'iocy','\u0401':'IOcy','\u0454':'jukcy','\u0404':'Jukcy','\u0436':'zhcy','\u0416':'ZHcy','\u0437':'zcy','\u0417':'Zcy','\u0455':'dscy','\u0405':'DScy','\u0438':'icy','\u0418':'Icy','\u0456':'iukcy','\u0406':'Iukcy','\u0457':'yicy','\u0407':'YIcy','\u0439':'jcy','\u0419':'Jcy','\u0458':'jsercy','\u0408':'Jsercy','\u043A':'kcy','\u041A':'Kcy','\u045C':'kjcy','\u040C':'KJcy','\u043B':'lcy','\u041B':'Lcy','\u0459':'ljcy','\u0409':'LJcy','\u043C':'mcy','\u041C':'Mcy','\u043D':'ncy','\u041D':'Ncy','\u045A':'njcy','\u040A':'NJcy','\u043E':'ocy','\u041E':'Ocy','\u043F':'pcy','\u041F':'Pcy','\u0440':'rcy','\u0420':'Rcy','\u0441':'scy','\u0421':'Scy','\u0442':'tcy','\u0422':'Tcy','\u045B':'tshcy','\u040B':'TSHcy','\u0443':'ucy','\u0423':'Ucy','\u045E':'ubrcy','\u040E':'Ubrcy','\u0444':'fcy','\u0424':'Fcy','\u0445':'khcy','\u0425':'KHcy','\u0446':'tscy','\u0426':'TScy','\u0447':'chcy','\u0427':'CHcy','\u045F':'dzcy','\u040F':'DZcy','\u0448':'shcy','\u0428':'SHcy','\u0449':'shchcy','\u0429':'SHCHcy','\u044A':'hardcy','\u042A':'HARDcy','\u044B':'ycy','\u042B':'Ycy','\u044C':'softcy','\u042C':'SOFTcy','\u044D':'ecy','\u042D':'Ecy','\u044E':'yucy','\u042E':'YUcy','\u044F':'yacy','\u042F':'YAcy','\u2135':'aleph','\u2136':'beth','\u2137':'gimel','\u2138':'daleth'};

	var regexEscape = /["&'<>`]/g;
	var escapeMap = {
		'"': '&quot;',
		'&': '&amp;',
		'\'': '&#x27;',
		'<': '&lt;',
		// See https://mathiasbynens.be/notes/ambiguous-ampersands: in HTML, the
		// following is not strictly necessary unless it’s part of a tag or an
		// unquoted attribute value. We’re only escaping it to support those
		// situations, and for XML support.
		'>': '&gt;',
		// In Internet Explorer ≤ 8, the backtick character can be used
		// to break out of (un)quoted attribute values or HTML comments.
		// See http://html5sec.org/#102, http://html5sec.org/#108, and
		// http://html5sec.org/#133.
		'`': '&#x60;'
	};

	var regexInvalidEntity = /&#(?:[xX][^a-fA-F0-9]|[^0-9xX])/;
	var regexInvalidRawCodePoint = /[\0-\x08\x0B\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
	var regexDecode = /&(CounterClockwiseContourIntegral|DoubleLongLeftRightArrow|ClockwiseContourIntegral|NotNestedGreaterGreater|NotSquareSupersetEqual|DiacriticalDoubleAcute|NotRightTriangleEqual|NotSucceedsSlantEqual|NotPrecedesSlantEqual|CloseCurlyDoubleQuote|NegativeVeryThinSpace|DoubleContourIntegral|FilledVerySmallSquare|CapitalDifferentialD|OpenCurlyDoubleQuote|EmptyVerySmallSquare|NestedGreaterGreater|DoubleLongRightArrow|NotLeftTriangleEqual|NotGreaterSlantEqual|ReverseUpEquilibrium|DoubleLeftRightArrow|NotSquareSubsetEqual|NotDoubleVerticalBar|RightArrowLeftArrow|NotGreaterFullEqual|NotRightTriangleBar|SquareSupersetEqual|DownLeftRightVector|DoubleLongLeftArrow|leftrightsquigarrow|LeftArrowRightArrow|NegativeMediumSpace|blacktriangleright|RightDownVectorBar|PrecedesSlantEqual|RightDoubleBracket|SucceedsSlantEqual|NotLeftTriangleBar|RightTriangleEqual|SquareIntersection|RightDownTeeVector|ReverseEquilibrium|NegativeThickSpace|longleftrightarrow|Longleftrightarrow|LongLeftRightArrow|DownRightTeeVector|DownRightVectorBar|GreaterSlantEqual|SquareSubsetEqual|LeftDownVectorBar|LeftDoubleBracket|VerticalSeparator|rightleftharpoons|NotGreaterGreater|NotSquareSuperset|blacktriangleleft|blacktriangledown|NegativeThinSpace|LeftDownTeeVector|NotLessSlantEqual|leftrightharpoons|DoubleUpDownArrow|DoubleVerticalBar|LeftTriangleEqual|FilledSmallSquare|twoheadrightarrow|NotNestedLessLess|DownLeftTeeVector|DownLeftVectorBar|RightAngleBracket|NotTildeFullEqual|NotReverseElement|RightUpDownVector|DiacriticalTilde|NotSucceedsTilde|circlearrowright|NotPrecedesEqual|rightharpoondown|DoubleRightArrow|NotSucceedsEqual|NonBreakingSpace|NotRightTriangle|LessEqualGreater|RightUpTeeVector|LeftAngleBracket|GreaterFullEqual|DownArrowUpArrow|RightUpVectorBar|twoheadleftarrow|GreaterEqualLess|downharpoonright|RightTriangleBar|ntrianglerighteq|NotSupersetEqual|LeftUpDownVector|DiacriticalAcute|rightrightarrows|vartriangleright|UpArrowDownArrow|DiacriticalGrave|UnderParenthesis|EmptySmallSquare|LeftUpVectorBar|leftrightarrows|DownRightVector|downharpoonleft|trianglerighteq|ShortRightArrow|OverParenthesis|DoubleLeftArrow|DoubleDownArrow|NotSquareSubset|bigtriangledown|ntrianglelefteq|UpperRightArrow|curvearrowright|vartriangleleft|NotLeftTriangle|nleftrightarrow|LowerRightArrow|NotHumpDownHump|NotGreaterTilde|rightthreetimes|LeftUpTeeVector|NotGreaterEqual|straightepsilon|LeftTriangleBar|rightsquigarrow|ContourIntegral|rightleftarrows|CloseCurlyQuote|RightDownVector|LeftRightVector|nLeftrightarrow|leftharpoondown|circlearrowleft|SquareSuperset|OpenCurlyQuote|hookrightarrow|HorizontalLine|DiacriticalDot|NotLessGreater|ntriangleright|DoubleRightTee|InvisibleComma|InvisibleTimes|LowerLeftArrow|DownLeftVector|NotSubsetEqual|curvearrowleft|trianglelefteq|NotVerticalBar|TildeFullEqual|downdownarrows|NotGreaterLess|RightTeeVector|ZeroWidthSpace|looparrowright|LongRightArrow|doublebarwedge|ShortLeftArrow|ShortDownArrow|RightVectorBar|GreaterGreater|ReverseElement|rightharpoonup|LessSlantEqual|leftthreetimes|upharpoonright|rightarrowtail|LeftDownVector|Longrightarrow|NestedLessLess|UpperLeftArrow|nshortparallel|leftleftarrows|leftrightarrow|Leftrightarrow|LeftRightArrow|longrightarrow|upharpoonleft|RightArrowBar|ApplyFunction|LeftTeeVector|leftarrowtail|NotEqualTilde|varsubsetneqq|varsupsetneqq|RightTeeArrow|SucceedsEqual|SucceedsTilde|LeftVectorBar|SupersetEqual|hookleftarrow|DifferentialD|VerticalTilde|VeryThinSpace|blacktriangle|bigtriangleup|LessFullEqual|divideontimes|leftharpoonup|UpEquilibrium|ntriangleleft|RightTriangle|measuredangle|shortparallel|longleftarrow|Longleftarrow|LongLeftArrow|DoubleLeftTee|Poincareplane|PrecedesEqual|triangleright|DoubleUpArrow|RightUpVector|fallingdotseq|looparrowleft|PrecedesTilde|NotTildeEqual|NotTildeTilde|smallsetminus|Proportional|triangleleft|triangledown|UnderBracket|NotHumpEqual|exponentiale|ExponentialE|NotLessTilde|HilbertSpace|RightCeiling|blacklozenge|varsupsetneq|HumpDownHump|GreaterEqual|VerticalLine|LeftTeeArrow|NotLessEqual|DownTeeArrow|LeftTriangle|varsubsetneq|Intersection|NotCongruent|DownArrowBar|LeftUpVector|LeftArrowBar|risingdotseq|GreaterTilde|RoundImplies|SquareSubset|ShortUpArrow|NotSuperset|quaternions|precnapprox|backepsilon|preccurlyeq|OverBracket|blacksquare|MediumSpace|VerticalBar|circledcirc|circleddash|CircleMinus|CircleTimes|LessGreater|curlyeqprec|curlyeqsucc|diamondsuit|UpDownArrow|Updownarrow|RuleDelayed|Rrightarrow|updownarrow|RightVector|nRightarrow|nrightarrow|eqslantless|LeftCeiling|Equilibrium|SmallCircle|expectation|NotSucceeds|thickapprox|GreaterLess|SquareUnion|NotPrecedes|NotLessLess|straightphi|succnapprox|succcurlyeq|SubsetEqual|sqsupseteq|Proportion|Laplacetrf|ImaginaryI|supsetneqq|NotGreater|gtreqqless|NotElement|ThickSpace|TildeEqual|TildeTilde|Fouriertrf|rmoustache|EqualTilde|eqslantgtr|UnderBrace|LeftVector|UpArrowBar|nLeftarrow|nsubseteqq|subsetneqq|nsupseteqq|nleftarrow|succapprox|lessapprox|UpTeeArrow|upuparrows|curlywedge|lesseqqgtr|varepsilon|varnothing|RightFloor|complement|CirclePlus|sqsubseteq|Lleftarrow|circledast|RightArrow|Rightarrow|rightarrow|lmoustache|Bernoullis|precapprox|mapstoleft|mapstodown|longmapsto|dotsquare|downarrow|DoubleDot|nsubseteq|supsetneq|leftarrow|nsupseteq|subsetneq|ThinSpace|ngeqslant|subseteqq|HumpEqual|NotSubset|triangleq|NotCupCap|lesseqgtr|heartsuit|TripleDot|Leftarrow|Coproduct|Congruent|varpropto|complexes|gvertneqq|LeftArrow|LessTilde|supseteqq|MinusPlus|CircleDot|nleqslant|NotExists|gtreqless|nparallel|UnionPlus|LeftFloor|checkmark|CenterDot|centerdot|Mellintrf|gtrapprox|bigotimes|OverBrace|spadesuit|therefore|pitchfork|rationals|PlusMinus|Backslash|Therefore|DownBreve|backsimeq|backprime|DownArrow|nshortmid|Downarrow|lvertneqq|eqvparsl|imagline|imagpart|infintie|integers|Integral|intercal|LessLess|Uarrocir|intlarhk|sqsupset|angmsdaf|sqsubset|llcorner|vartheta|cupbrcap|lnapprox|Superset|SuchThat|succnsim|succneqq|angmsdag|biguplus|curlyvee|trpezium|Succeeds|NotTilde|bigwedge|angmsdah|angrtvbd|triminus|cwconint|fpartint|lrcorner|smeparsl|subseteq|urcorner|lurdshar|laemptyv|DDotrahd|approxeq|ldrushar|awconint|mapstoup|backcong|shortmid|triangle|geqslant|gesdotol|timesbar|circledR|circledS|setminus|multimap|naturals|scpolint|ncongdot|RightTee|boxminus|gnapprox|boxtimes|andslope|thicksim|angmsdaa|varsigma|cirfnint|rtriltri|angmsdab|rppolint|angmsdac|barwedge|drbkarow|clubsuit|thetasym|bsolhsub|capbrcup|dzigrarr|doteqdot|DotEqual|dotminus|UnderBar|NotEqual|realpart|otimesas|ulcorner|hksearow|hkswarow|parallel|PartialD|elinters|emptyset|plusacir|bbrktbrk|angmsdad|pointint|bigoplus|angmsdae|Precedes|bigsqcup|varkappa|notindot|supseteq|precneqq|precnsim|profalar|profline|profsurf|leqslant|lesdotor|raemptyv|subplus|notnivb|notnivc|subrarr|zigrarr|vzigzag|submult|subedot|Element|between|cirscir|larrbfs|larrsim|lotimes|lbrksld|lbrkslu|lozenge|ldrdhar|dbkarow|bigcirc|epsilon|simrarr|simplus|ltquest|Epsilon|luruhar|gtquest|maltese|npolint|eqcolon|npreceq|bigodot|ddagger|gtrless|bnequiv|harrcir|ddotseq|equivDD|backsim|demptyv|nsqsube|nsqsupe|Upsilon|nsubset|upsilon|minusdu|nsucceq|swarrow|nsupset|coloneq|searrow|boxplus|napprox|natural|asympeq|alefsym|congdot|nearrow|bigstar|diamond|supplus|tritime|LeftTee|nvinfin|triplus|NewLine|nvltrie|nvrtrie|nwarrow|nexists|Diamond|ruluhar|Implies|supmult|angzarr|suplarr|suphsub|questeq|because|digamma|Because|olcross|bemptyv|omicron|Omicron|rotimes|NoBreak|intprod|angrtvb|orderof|uwangle|suphsol|lesdoto|orslope|DownTee|realine|cudarrl|rdldhar|OverBar|supedot|lessdot|supdsub|topfork|succsim|rbrkslu|rbrksld|pertenk|cudarrr|isindot|planckh|lessgtr|pluscir|gesdoto|plussim|plustwo|lesssim|cularrp|rarrsim|Cayleys|notinva|notinvb|notinvc|UpArrow|Uparrow|uparrow|NotLess|dwangle|precsim|Product|curarrm|Cconint|dotplus|rarrbfs|ccupssm|Cedilla|cemptyv|notniva|quatint|frac35|frac38|frac45|frac56|frac58|frac78|tridot|xoplus|gacute|gammad|Gammad|lfisht|lfloor|bigcup|sqsupe|gbreve|Gbreve|lharul|sqsube|sqcups|Gcedil|apacir|llhard|lmidot|Lmidot|lmoust|andand|sqcaps|approx|Abreve|spades|circeq|tprime|divide|topcir|Assign|topbot|gesdot|divonx|xuplus|timesd|gesles|atilde|solbar|SOFTcy|loplus|timesb|lowast|lowbar|dlcorn|dlcrop|softcy|dollar|lparlt|thksim|lrhard|Atilde|lsaquo|smashp|bigvee|thinsp|wreath|bkarow|lsquor|lstrok|Lstrok|lthree|ltimes|ltlarr|DotDot|simdot|ltrPar|weierp|xsqcup|angmsd|sigmav|sigmaf|zeetrf|Zcaron|zcaron|mapsto|vsupne|thetav|cirmid|marker|mcomma|Zacute|vsubnE|there4|gtlPar|vsubne|bottom|gtrarr|SHCHcy|shchcy|midast|midcir|middot|minusb|minusd|gtrdot|bowtie|sfrown|mnplus|models|colone|seswar|Colone|mstpos|searhk|gtrsim|nacute|Nacute|boxbox|telrec|hairsp|Tcedil|nbumpe|scnsim|ncaron|Ncaron|ncedil|Ncedil|hamilt|Scedil|nearhk|hardcy|HARDcy|tcedil|Tcaron|commat|nequiv|nesear|tcaron|target|hearts|nexist|varrho|scedil|Scaron|scaron|hellip|Sacute|sacute|hercon|swnwar|compfn|rtimes|rthree|rsquor|rsaquo|zacute|wedgeq|homtht|barvee|barwed|Barwed|rpargt|horbar|conint|swarhk|roplus|nltrie|hslash|hstrok|Hstrok|rmoust|Conint|bprime|hybull|hyphen|iacute|Iacute|supsup|supsub|supsim|varphi|coprod|brvbar|agrave|Supset|supset|igrave|Igrave|notinE|Agrave|iiiint|iinfin|copysr|wedbar|Verbar|vangrt|becaus|incare|verbar|inodot|bullet|drcorn|intcal|drcrop|cularr|vellip|Utilde|bumpeq|cupcap|dstrok|Dstrok|CupCap|cupcup|cupdot|eacute|Eacute|supdot|iquest|easter|ecaron|Ecaron|ecolon|isinsv|utilde|itilde|Itilde|curarr|succeq|Bumpeq|cacute|ulcrop|nparsl|Cacute|nprcue|egrave|Egrave|nrarrc|nrarrw|subsup|subsub|nrtrie|jsercy|nsccue|Jsercy|kappav|kcedil|Kcedil|subsim|ulcorn|nsimeq|egsdot|veebar|kgreen|capand|elsdot|Subset|subset|curren|aacute|lacute|Lacute|emptyv|ntilde|Ntilde|lagran|lambda|Lambda|capcap|Ugrave|langle|subdot|emsp13|numero|emsp14|nvdash|nvDash|nVdash|nVDash|ugrave|ufisht|nvHarr|larrfs|nvlArr|larrhk|larrlp|larrpl|nvrArr|Udblac|nwarhk|larrtl|nwnear|oacute|Oacute|latail|lAtail|sstarf|lbrace|odblac|Odblac|lbrack|udblac|odsold|eparsl|lcaron|Lcaron|ograve|Ograve|lcedil|Lcedil|Aacute|ssmile|ssetmn|squarf|ldquor|capcup|ominus|cylcty|rharul|eqcirc|dagger|rfloor|rfisht|Dagger|daleth|equals|origof|capdot|equest|dcaron|Dcaron|rdquor|oslash|Oslash|otilde|Otilde|otimes|Otimes|urcrop|Ubreve|ubreve|Yacute|Uacute|uacute|Rcedil|rcedil|urcorn|parsim|Rcaron|Vdashl|rcaron|Tstrok|percnt|period|permil|Exists|yacute|rbrack|rbrace|phmmat|ccaron|Ccaron|planck|ccedil|plankv|tstrok|female|plusdo|plusdu|ffilig|plusmn|ffllig|Ccedil|rAtail|dfisht|bernou|ratail|Rarrtl|rarrtl|angsph|rarrpl|rarrlp|rarrhk|xwedge|xotime|forall|ForAll|Vvdash|vsupnE|preceq|bigcap|frac12|frac13|frac14|primes|rarrfs|prnsim|frac15|Square|frac16|square|lesdot|frac18|frac23|propto|prurel|rarrap|rangle|puncsp|frac25|Racute|qprime|racute|lesges|frac34|abreve|AElig|eqsim|utdot|setmn|urtri|Equal|Uring|seArr|uring|searr|dashv|Dashv|mumap|nabla|iogon|Iogon|sdote|sdotb|scsim|napid|napos|equiv|natur|Acirc|dblac|erarr|nbump|iprod|erDot|ucirc|awint|esdot|angrt|ncong|isinE|scnap|Scirc|scirc|ndash|isins|Ubrcy|nearr|neArr|isinv|nedot|ubrcy|acute|Ycirc|iukcy|Iukcy|xutri|nesim|caret|jcirc|Jcirc|caron|twixt|ddarr|sccue|exist|jmath|sbquo|ngeqq|angst|ccaps|lceil|ngsim|UpTee|delta|Delta|rtrif|nharr|nhArr|nhpar|rtrie|jukcy|Jukcy|kappa|rsquo|Kappa|nlarr|nlArr|TSHcy|rrarr|aogon|Aogon|fflig|xrarr|tshcy|ccirc|nleqq|filig|upsih|nless|dharl|nlsim|fjlig|ropar|nltri|dharr|robrk|roarr|fllig|fltns|roang|rnmid|subnE|subne|lAarr|trisb|Ccirc|acirc|ccups|blank|VDash|forkv|Vdash|langd|cedil|blk12|blk14|laquo|strns|diams|notin|vDash|larrb|blk34|block|disin|uplus|vdash|vBarv|aelig|starf|Wedge|check|xrArr|lates|lbarr|lBarr|notni|lbbrk|bcong|frasl|lbrke|frown|vrtri|vprop|vnsup|gamma|Gamma|wedge|xodot|bdquo|srarr|doteq|ldquo|boxdl|boxdL|gcirc|Gcirc|boxDl|boxDL|boxdr|boxdR|boxDr|TRADE|trade|rlhar|boxDR|vnsub|npart|vltri|rlarr|boxhd|boxhD|nprec|gescc|nrarr|nrArr|boxHd|boxHD|boxhu|boxhU|nrtri|boxHu|clubs|boxHU|times|colon|Colon|gimel|xlArr|Tilde|nsime|tilde|nsmid|nspar|THORN|thorn|xlarr|nsube|nsubE|thkap|xhArr|comma|nsucc|boxul|boxuL|nsupe|nsupE|gneqq|gnsim|boxUl|boxUL|grave|boxur|boxuR|boxUr|boxUR|lescc|angle|bepsi|boxvh|varpi|boxvH|numsp|Theta|gsime|gsiml|theta|boxVh|boxVH|boxvl|gtcir|gtdot|boxvL|boxVl|boxVL|crarr|cross|Cross|nvsim|boxvr|nwarr|nwArr|sqsup|dtdot|Uogon|lhard|lharu|dtrif|ocirc|Ocirc|lhblk|duarr|odash|sqsub|Hacek|sqcup|llarr|duhar|oelig|OElig|ofcir|boxvR|uogon|lltri|boxVr|csube|uuarr|ohbar|csupe|ctdot|olarr|olcir|harrw|oline|sqcap|omacr|Omacr|omega|Omega|boxVR|aleph|lneqq|lnsim|loang|loarr|rharu|lobrk|hcirc|operp|oplus|rhard|Hcirc|orarr|Union|order|ecirc|Ecirc|cuepr|szlig|cuesc|breve|reals|eDDot|Breve|hoarr|lopar|utrif|rdquo|Umacr|umacr|efDot|swArr|ultri|alpha|rceil|ovbar|swarr|Wcirc|wcirc|smtes|smile|bsemi|lrarr|aring|parsl|lrhar|bsime|uhblk|lrtri|cupor|Aring|uharr|uharl|slarr|rbrke|bsolb|lsime|rbbrk|RBarr|lsimg|phone|rBarr|rbarr|icirc|lsquo|Icirc|emacr|Emacr|ratio|simne|plusb|simlE|simgE|simeq|pluse|ltcir|ltdot|empty|xharr|xdtri|iexcl|Alpha|ltrie|rarrw|pound|ltrif|xcirc|bumpe|prcue|bumpE|asymp|amacr|cuvee|Sigma|sigma|iiint|udhar|iiota|ijlig|IJlig|supnE|imacr|Imacr|prime|Prime|image|prnap|eogon|Eogon|rarrc|mdash|mDDot|cuwed|imath|supne|imped|Amacr|udarr|prsim|micro|rarrb|cwint|raquo|infin|eplus|range|rangd|Ucirc|radic|minus|amalg|veeeq|rAarr|epsiv|ycirc|quest|sharp|quot|zwnj|Qscr|race|qscr|Qopf|qopf|qint|rang|Rang|Zscr|zscr|Zopf|zopf|rarr|rArr|Rarr|Pscr|pscr|prop|prod|prnE|prec|ZHcy|zhcy|prap|Zeta|zeta|Popf|popf|Zdot|plus|zdot|Yuml|yuml|phiv|YUcy|yucy|Yscr|yscr|perp|Yopf|yopf|part|para|YIcy|Ouml|rcub|yicy|YAcy|rdca|ouml|osol|Oscr|rdsh|yacy|real|oscr|xvee|andd|rect|andv|Xscr|oror|ordm|ordf|xscr|ange|aopf|Aopf|rHar|Xopf|opar|Oopf|xopf|xnis|rhov|oopf|omid|xmap|oint|apid|apos|ogon|ascr|Ascr|odot|odiv|xcup|xcap|ocir|oast|nvlt|nvle|nvgt|nvge|nvap|Wscr|wscr|auml|ntlg|ntgl|nsup|nsub|nsim|Nscr|nscr|nsce|Wopf|ring|npre|wopf|npar|Auml|Barv|bbrk|Nopf|nopf|nmid|nLtv|beta|ropf|Ropf|Beta|beth|nles|rpar|nleq|bnot|bNot|nldr|NJcy|rscr|Rscr|Vscr|vscr|rsqb|njcy|bopf|nisd|Bopf|rtri|Vopf|nGtv|ngtr|vopf|boxh|boxH|boxv|nges|ngeq|boxV|bscr|scap|Bscr|bsim|Vert|vert|bsol|bull|bump|caps|cdot|ncup|scnE|ncap|nbsp|napE|Cdot|cent|sdot|Vbar|nang|vBar|chcy|Mscr|mscr|sect|semi|CHcy|Mopf|mopf|sext|circ|cire|mldr|mlcp|cirE|comp|shcy|SHcy|vArr|varr|cong|copf|Copf|copy|COPY|malt|male|macr|lvnE|cscr|ltri|sime|ltcc|simg|Cscr|siml|csub|Uuml|lsqb|lsim|uuml|csup|Lscr|lscr|utri|smid|lpar|cups|smte|lozf|darr|Lopf|Uscr|solb|lopf|sopf|Sopf|lneq|uscr|spar|dArr|lnap|Darr|dash|Sqrt|LJcy|ljcy|lHar|dHar|Upsi|upsi|diam|lesg|djcy|DJcy|leqq|dopf|Dopf|dscr|Dscr|dscy|ldsh|ldca|squf|DScy|sscr|Sscr|dsol|lcub|late|star|Star|Uopf|Larr|lArr|larr|uopf|dtri|dzcy|sube|subE|Lang|lang|Kscr|kscr|Kopf|kopf|KJcy|kjcy|KHcy|khcy|DZcy|ecir|edot|eDot|Jscr|jscr|succ|Jopf|jopf|Edot|uHar|emsp|ensp|Iuml|iuml|eopf|isin|Iscr|iscr|Eopf|epar|sung|epsi|escr|sup1|sup2|sup3|Iota|iota|supe|supE|Iopf|iopf|IOcy|iocy|Escr|esim|Esim|imof|Uarr|QUOT|uArr|uarr|euml|IEcy|iecy|Idot|Euml|euro|excl|Hscr|hscr|Hopf|hopf|TScy|tscy|Tscr|hbar|tscr|flat|tbrk|fnof|hArr|harr|half|fopf|Fopf|tdot|gvnE|fork|trie|gtcc|fscr|Fscr|gdot|gsim|Gscr|gscr|Gopf|gopf|gneq|Gdot|tosa|gnap|Topf|topf|geqq|toea|GJcy|gjcy|tint|gesl|mid|Sfr|ggg|top|ges|gla|glE|glj|geq|gne|gEl|gel|gnE|Gcy|gcy|gap|Tfr|tfr|Tcy|tcy|Hat|Tau|Ffr|tau|Tab|hfr|Hfr|ffr|Fcy|fcy|icy|Icy|iff|ETH|eth|ifr|Ifr|Eta|eta|int|Int|Sup|sup|ucy|Ucy|Sum|sum|jcy|ENG|ufr|Ufr|eng|Jcy|jfr|els|ell|egs|Efr|efr|Jfr|uml|kcy|Kcy|Ecy|ecy|kfr|Kfr|lap|Sub|sub|lat|lcy|Lcy|leg|Dot|dot|lEg|leq|les|squ|div|die|lfr|Lfr|lgE|Dfr|dfr|Del|deg|Dcy|dcy|lne|lnE|sol|loz|smt|Cup|lrm|cup|lsh|Lsh|sim|shy|map|Map|mcy|Mcy|mfr|Mfr|mho|gfr|Gfr|sfr|cir|Chi|chi|nap|Cfr|vcy|Vcy|cfr|Scy|scy|ncy|Ncy|vee|Vee|Cap|cap|nfr|scE|sce|Nfr|nge|ngE|nGg|vfr|Vfr|ngt|bot|nGt|nis|niv|Rsh|rsh|nle|nlE|bne|Bfr|bfr|nLl|nlt|nLt|Bcy|bcy|not|Not|rlm|wfr|Wfr|npr|nsc|num|ocy|ast|Ocy|ofr|xfr|Xfr|Ofr|ogt|ohm|apE|olt|Rho|ape|rho|Rfr|rfr|ord|REG|ang|reg|orv|And|and|AMP|Rcy|amp|Afr|ycy|Ycy|yen|yfr|Yfr|rcy|par|pcy|Pcy|pfr|Pfr|phi|Phi|afr|Acy|acy|zcy|Zcy|piv|acE|acd|zfr|Zfr|pre|prE|psi|Psi|qfr|Qfr|zwj|Or|ge|Gg|gt|gg|el|oS|lt|Lt|LT|Re|lg|gl|eg|ne|Im|it|le|DD|wp|wr|nu|Nu|dd|lE|Sc|sc|pi|Pi|ee|af|ll|Ll|rx|gE|xi|pm|Xi|ic|pr|Pr|in|ni|mp|mu|ac|Mu|or|ap|Gt|GT|ii);|&(Aacute|Agrave|Atilde|Ccedil|Eacute|Egrave|Iacute|Igrave|Ntilde|Oacute|Ograve|Oslash|Otilde|Uacute|Ugrave|Yacute|aacute|agrave|atilde|brvbar|ccedil|curren|divide|eacute|egrave|frac12|frac14|frac34|iacute|igrave|iquest|middot|ntilde|oacute|ograve|oslash|otilde|plusmn|uacute|ugrave|yacute|AElig|Acirc|Aring|Ecirc|Icirc|Ocirc|THORN|Ucirc|acirc|acute|aelig|aring|cedil|ecirc|icirc|iexcl|laquo|micro|ocirc|pound|raquo|szlig|thorn|times|ucirc|Auml|COPY|Euml|Iuml|Ouml|QUOT|Uuml|auml|cent|copy|euml|iuml|macr|nbsp|ordf|ordm|ouml|para|quot|sect|sup1|sup2|sup3|uuml|yuml|AMP|ETH|REG|amp|deg|eth|not|reg|shy|uml|yen|GT|LT|gt|lt)(?!;)([=a-zA-Z0-9]?)|&#([0-9]+)(;?)|&#[xX]([a-fA-F0-9]+)(;?)|&([0-9a-zA-Z]+)/g;
	var decodeMap = {'aacute':'\xE1','Aacute':'\xC1','abreve':'\u0103','Abreve':'\u0102','ac':'\u223E','acd':'\u223F','acE':'\u223E\u0333','acirc':'\xE2','Acirc':'\xC2','acute':'\xB4','acy':'\u0430','Acy':'\u0410','aelig':'\xE6','AElig':'\xC6','af':'\u2061','afr':'\uD835\uDD1E','Afr':'\uD835\uDD04','agrave':'\xE0','Agrave':'\xC0','alefsym':'\u2135','aleph':'\u2135','alpha':'\u03B1','Alpha':'\u0391','amacr':'\u0101','Amacr':'\u0100','amalg':'\u2A3F','amp':'&','AMP':'&','and':'\u2227','And':'\u2A53','andand':'\u2A55','andd':'\u2A5C','andslope':'\u2A58','andv':'\u2A5A','ang':'\u2220','ange':'\u29A4','angle':'\u2220','angmsd':'\u2221','angmsdaa':'\u29A8','angmsdab':'\u29A9','angmsdac':'\u29AA','angmsdad':'\u29AB','angmsdae':'\u29AC','angmsdaf':'\u29AD','angmsdag':'\u29AE','angmsdah':'\u29AF','angrt':'\u221F','angrtvb':'\u22BE','angrtvbd':'\u299D','angsph':'\u2222','angst':'\xC5','angzarr':'\u237C','aogon':'\u0105','Aogon':'\u0104','aopf':'\uD835\uDD52','Aopf':'\uD835\uDD38','ap':'\u2248','apacir':'\u2A6F','ape':'\u224A','apE':'\u2A70','apid':'\u224B','apos':'\'','ApplyFunction':'\u2061','approx':'\u2248','approxeq':'\u224A','aring':'\xE5','Aring':'\xC5','ascr':'\uD835\uDCB6','Ascr':'\uD835\uDC9C','Assign':'\u2254','ast':'*','asymp':'\u2248','asympeq':'\u224D','atilde':'\xE3','Atilde':'\xC3','auml':'\xE4','Auml':'\xC4','awconint':'\u2233','awint':'\u2A11','backcong':'\u224C','backepsilon':'\u03F6','backprime':'\u2035','backsim':'\u223D','backsimeq':'\u22CD','Backslash':'\u2216','Barv':'\u2AE7','barvee':'\u22BD','barwed':'\u2305','Barwed':'\u2306','barwedge':'\u2305','bbrk':'\u23B5','bbrktbrk':'\u23B6','bcong':'\u224C','bcy':'\u0431','Bcy':'\u0411','bdquo':'\u201E','becaus':'\u2235','because':'\u2235','Because':'\u2235','bemptyv':'\u29B0','bepsi':'\u03F6','bernou':'\u212C','Bernoullis':'\u212C','beta':'\u03B2','Beta':'\u0392','beth':'\u2136','between':'\u226C','bfr':'\uD835\uDD1F','Bfr':'\uD835\uDD05','bigcap':'\u22C2','bigcirc':'\u25EF','bigcup':'\u22C3','bigodot':'\u2A00','bigoplus':'\u2A01','bigotimes':'\u2A02','bigsqcup':'\u2A06','bigstar':'\u2605','bigtriangledown':'\u25BD','bigtriangleup':'\u25B3','biguplus':'\u2A04','bigvee':'\u22C1','bigwedge':'\u22C0','bkarow':'\u290D','blacklozenge':'\u29EB','blacksquare':'\u25AA','blacktriangle':'\u25B4','blacktriangledown':'\u25BE','blacktriangleleft':'\u25C2','blacktriangleright':'\u25B8','blank':'\u2423','blk12':'\u2592','blk14':'\u2591','blk34':'\u2593','block':'\u2588','bne':'=\u20E5','bnequiv':'\u2261\u20E5','bnot':'\u2310','bNot':'\u2AED','bopf':'\uD835\uDD53','Bopf':'\uD835\uDD39','bot':'\u22A5','bottom':'\u22A5','bowtie':'\u22C8','boxbox':'\u29C9','boxdl':'\u2510','boxdL':'\u2555','boxDl':'\u2556','boxDL':'\u2557','boxdr':'\u250C','boxdR':'\u2552','boxDr':'\u2553','boxDR':'\u2554','boxh':'\u2500','boxH':'\u2550','boxhd':'\u252C','boxhD':'\u2565','boxHd':'\u2564','boxHD':'\u2566','boxhu':'\u2534','boxhU':'\u2568','boxHu':'\u2567','boxHU':'\u2569','boxminus':'\u229F','boxplus':'\u229E','boxtimes':'\u22A0','boxul':'\u2518','boxuL':'\u255B','boxUl':'\u255C','boxUL':'\u255D','boxur':'\u2514','boxuR':'\u2558','boxUr':'\u2559','boxUR':'\u255A','boxv':'\u2502','boxV':'\u2551','boxvh':'\u253C','boxvH':'\u256A','boxVh':'\u256B','boxVH':'\u256C','boxvl':'\u2524','boxvL':'\u2561','boxVl':'\u2562','boxVL':'\u2563','boxvr':'\u251C','boxvR':'\u255E','boxVr':'\u255F','boxVR':'\u2560','bprime':'\u2035','breve':'\u02D8','Breve':'\u02D8','brvbar':'\xA6','bscr':'\uD835\uDCB7','Bscr':'\u212C','bsemi':'\u204F','bsim':'\u223D','bsime':'\u22CD','bsol':'\\','bsolb':'\u29C5','bsolhsub':'\u27C8','bull':'\u2022','bullet':'\u2022','bump':'\u224E','bumpe':'\u224F','bumpE':'\u2AAE','bumpeq':'\u224F','Bumpeq':'\u224E','cacute':'\u0107','Cacute':'\u0106','cap':'\u2229','Cap':'\u22D2','capand':'\u2A44','capbrcup':'\u2A49','capcap':'\u2A4B','capcup':'\u2A47','capdot':'\u2A40','CapitalDifferentialD':'\u2145','caps':'\u2229\uFE00','caret':'\u2041','caron':'\u02C7','Cayleys':'\u212D','ccaps':'\u2A4D','ccaron':'\u010D','Ccaron':'\u010C','ccedil':'\xE7','Ccedil':'\xC7','ccirc':'\u0109','Ccirc':'\u0108','Cconint':'\u2230','ccups':'\u2A4C','ccupssm':'\u2A50','cdot':'\u010B','Cdot':'\u010A','cedil':'\xB8','Cedilla':'\xB8','cemptyv':'\u29B2','cent':'\xA2','centerdot':'\xB7','CenterDot':'\xB7','cfr':'\uD835\uDD20','Cfr':'\u212D','chcy':'\u0447','CHcy':'\u0427','check':'\u2713','checkmark':'\u2713','chi':'\u03C7','Chi':'\u03A7','cir':'\u25CB','circ':'\u02C6','circeq':'\u2257','circlearrowleft':'\u21BA','circlearrowright':'\u21BB','circledast':'\u229B','circledcirc':'\u229A','circleddash':'\u229D','CircleDot':'\u2299','circledR':'\xAE','circledS':'\u24C8','CircleMinus':'\u2296','CirclePlus':'\u2295','CircleTimes':'\u2297','cire':'\u2257','cirE':'\u29C3','cirfnint':'\u2A10','cirmid':'\u2AEF','cirscir':'\u29C2','ClockwiseContourIntegral':'\u2232','CloseCurlyDoubleQuote':'\u201D','CloseCurlyQuote':'\u2019','clubs':'\u2663','clubsuit':'\u2663','colon':':','Colon':'\u2237','colone':'\u2254','Colone':'\u2A74','coloneq':'\u2254','comma':',','commat':'@','comp':'\u2201','compfn':'\u2218','complement':'\u2201','complexes':'\u2102','cong':'\u2245','congdot':'\u2A6D','Congruent':'\u2261','conint':'\u222E','Conint':'\u222F','ContourIntegral':'\u222E','copf':'\uD835\uDD54','Copf':'\u2102','coprod':'\u2210','Coproduct':'\u2210','copy':'\xA9','COPY':'\xA9','copysr':'\u2117','CounterClockwiseContourIntegral':'\u2233','crarr':'\u21B5','cross':'\u2717','Cross':'\u2A2F','cscr':'\uD835\uDCB8','Cscr':'\uD835\uDC9E','csub':'\u2ACF','csube':'\u2AD1','csup':'\u2AD0','csupe':'\u2AD2','ctdot':'\u22EF','cudarrl':'\u2938','cudarrr':'\u2935','cuepr':'\u22DE','cuesc':'\u22DF','cularr':'\u21B6','cularrp':'\u293D','cup':'\u222A','Cup':'\u22D3','cupbrcap':'\u2A48','cupcap':'\u2A46','CupCap':'\u224D','cupcup':'\u2A4A','cupdot':'\u228D','cupor':'\u2A45','cups':'\u222A\uFE00','curarr':'\u21B7','curarrm':'\u293C','curlyeqprec':'\u22DE','curlyeqsucc':'\u22DF','curlyvee':'\u22CE','curlywedge':'\u22CF','curren':'\xA4','curvearrowleft':'\u21B6','curvearrowright':'\u21B7','cuvee':'\u22CE','cuwed':'\u22CF','cwconint':'\u2232','cwint':'\u2231','cylcty':'\u232D','dagger':'\u2020','Dagger':'\u2021','daleth':'\u2138','darr':'\u2193','dArr':'\u21D3','Darr':'\u21A1','dash':'\u2010','dashv':'\u22A3','Dashv':'\u2AE4','dbkarow':'\u290F','dblac':'\u02DD','dcaron':'\u010F','Dcaron':'\u010E','dcy':'\u0434','Dcy':'\u0414','dd':'\u2146','DD':'\u2145','ddagger':'\u2021','ddarr':'\u21CA','DDotrahd':'\u2911','ddotseq':'\u2A77','deg':'\xB0','Del':'\u2207','delta':'\u03B4','Delta':'\u0394','demptyv':'\u29B1','dfisht':'\u297F','dfr':'\uD835\uDD21','Dfr':'\uD835\uDD07','dHar':'\u2965','dharl':'\u21C3','dharr':'\u21C2','DiacriticalAcute':'\xB4','DiacriticalDot':'\u02D9','DiacriticalDoubleAcute':'\u02DD','DiacriticalGrave':'`','DiacriticalTilde':'\u02DC','diam':'\u22C4','diamond':'\u22C4','Diamond':'\u22C4','diamondsuit':'\u2666','diams':'\u2666','die':'\xA8','DifferentialD':'\u2146','digamma':'\u03DD','disin':'\u22F2','div':'\xF7','divide':'\xF7','divideontimes':'\u22C7','divonx':'\u22C7','djcy':'\u0452','DJcy':'\u0402','dlcorn':'\u231E','dlcrop':'\u230D','dollar':'$','dopf':'\uD835\uDD55','Dopf':'\uD835\uDD3B','dot':'\u02D9','Dot':'\xA8','DotDot':'\u20DC','doteq':'\u2250','doteqdot':'\u2251','DotEqual':'\u2250','dotminus':'\u2238','dotplus':'\u2214','dotsquare':'\u22A1','doublebarwedge':'\u2306','DoubleContourIntegral':'\u222F','DoubleDot':'\xA8','DoubleDownArrow':'\u21D3','DoubleLeftArrow':'\u21D0','DoubleLeftRightArrow':'\u21D4','DoubleLeftTee':'\u2AE4','DoubleLongLeftArrow':'\u27F8','DoubleLongLeftRightArrow':'\u27FA','DoubleLongRightArrow':'\u27F9','DoubleRightArrow':'\u21D2','DoubleRightTee':'\u22A8','DoubleUpArrow':'\u21D1','DoubleUpDownArrow':'\u21D5','DoubleVerticalBar':'\u2225','downarrow':'\u2193','Downarrow':'\u21D3','DownArrow':'\u2193','DownArrowBar':'\u2913','DownArrowUpArrow':'\u21F5','DownBreve':'\u0311','downdownarrows':'\u21CA','downharpoonleft':'\u21C3','downharpoonright':'\u21C2','DownLeftRightVector':'\u2950','DownLeftTeeVector':'\u295E','DownLeftVector':'\u21BD','DownLeftVectorBar':'\u2956','DownRightTeeVector':'\u295F','DownRightVector':'\u21C1','DownRightVectorBar':'\u2957','DownTee':'\u22A4','DownTeeArrow':'\u21A7','drbkarow':'\u2910','drcorn':'\u231F','drcrop':'\u230C','dscr':'\uD835\uDCB9','Dscr':'\uD835\uDC9F','dscy':'\u0455','DScy':'\u0405','dsol':'\u29F6','dstrok':'\u0111','Dstrok':'\u0110','dtdot':'\u22F1','dtri':'\u25BF','dtrif':'\u25BE','duarr':'\u21F5','duhar':'\u296F','dwangle':'\u29A6','dzcy':'\u045F','DZcy':'\u040F','dzigrarr':'\u27FF','eacute':'\xE9','Eacute':'\xC9','easter':'\u2A6E','ecaron':'\u011B','Ecaron':'\u011A','ecir':'\u2256','ecirc':'\xEA','Ecirc':'\xCA','ecolon':'\u2255','ecy':'\u044D','Ecy':'\u042D','eDDot':'\u2A77','edot':'\u0117','eDot':'\u2251','Edot':'\u0116','ee':'\u2147','efDot':'\u2252','efr':'\uD835\uDD22','Efr':'\uD835\uDD08','eg':'\u2A9A','egrave':'\xE8','Egrave':'\xC8','egs':'\u2A96','egsdot':'\u2A98','el':'\u2A99','Element':'\u2208','elinters':'\u23E7','ell':'\u2113','els':'\u2A95','elsdot':'\u2A97','emacr':'\u0113','Emacr':'\u0112','empty':'\u2205','emptyset':'\u2205','EmptySmallSquare':'\u25FB','emptyv':'\u2205','EmptyVerySmallSquare':'\u25AB','emsp':'\u2003','emsp13':'\u2004','emsp14':'\u2005','eng':'\u014B','ENG':'\u014A','ensp':'\u2002','eogon':'\u0119','Eogon':'\u0118','eopf':'\uD835\uDD56','Eopf':'\uD835\uDD3C','epar':'\u22D5','eparsl':'\u29E3','eplus':'\u2A71','epsi':'\u03B5','epsilon':'\u03B5','Epsilon':'\u0395','epsiv':'\u03F5','eqcirc':'\u2256','eqcolon':'\u2255','eqsim':'\u2242','eqslantgtr':'\u2A96','eqslantless':'\u2A95','Equal':'\u2A75','equals':'=','EqualTilde':'\u2242','equest':'\u225F','Equilibrium':'\u21CC','equiv':'\u2261','equivDD':'\u2A78','eqvparsl':'\u29E5','erarr':'\u2971','erDot':'\u2253','escr':'\u212F','Escr':'\u2130','esdot':'\u2250','esim':'\u2242','Esim':'\u2A73','eta':'\u03B7','Eta':'\u0397','eth':'\xF0','ETH':'\xD0','euml':'\xEB','Euml':'\xCB','euro':'\u20AC','excl':'!','exist':'\u2203','Exists':'\u2203','expectation':'\u2130','exponentiale':'\u2147','ExponentialE':'\u2147','fallingdotseq':'\u2252','fcy':'\u0444','Fcy':'\u0424','female':'\u2640','ffilig':'\uFB03','fflig':'\uFB00','ffllig':'\uFB04','ffr':'\uD835\uDD23','Ffr':'\uD835\uDD09','filig':'\uFB01','FilledSmallSquare':'\u25FC','FilledVerySmallSquare':'\u25AA','fjlig':'fj','flat':'\u266D','fllig':'\uFB02','fltns':'\u25B1','fnof':'\u0192','fopf':'\uD835\uDD57','Fopf':'\uD835\uDD3D','forall':'\u2200','ForAll':'\u2200','fork':'\u22D4','forkv':'\u2AD9','Fouriertrf':'\u2131','fpartint':'\u2A0D','frac12':'\xBD','frac13':'\u2153','frac14':'\xBC','frac15':'\u2155','frac16':'\u2159','frac18':'\u215B','frac23':'\u2154','frac25':'\u2156','frac34':'\xBE','frac35':'\u2157','frac38':'\u215C','frac45':'\u2158','frac56':'\u215A','frac58':'\u215D','frac78':'\u215E','frasl':'\u2044','frown':'\u2322','fscr':'\uD835\uDCBB','Fscr':'\u2131','gacute':'\u01F5','gamma':'\u03B3','Gamma':'\u0393','gammad':'\u03DD','Gammad':'\u03DC','gap':'\u2A86','gbreve':'\u011F','Gbreve':'\u011E','Gcedil':'\u0122','gcirc':'\u011D','Gcirc':'\u011C','gcy':'\u0433','Gcy':'\u0413','gdot':'\u0121','Gdot':'\u0120','ge':'\u2265','gE':'\u2267','gel':'\u22DB','gEl':'\u2A8C','geq':'\u2265','geqq':'\u2267','geqslant':'\u2A7E','ges':'\u2A7E','gescc':'\u2AA9','gesdot':'\u2A80','gesdoto':'\u2A82','gesdotol':'\u2A84','gesl':'\u22DB\uFE00','gesles':'\u2A94','gfr':'\uD835\uDD24','Gfr':'\uD835\uDD0A','gg':'\u226B','Gg':'\u22D9','ggg':'\u22D9','gimel':'\u2137','gjcy':'\u0453','GJcy':'\u0403','gl':'\u2277','gla':'\u2AA5','glE':'\u2A92','glj':'\u2AA4','gnap':'\u2A8A','gnapprox':'\u2A8A','gne':'\u2A88','gnE':'\u2269','gneq':'\u2A88','gneqq':'\u2269','gnsim':'\u22E7','gopf':'\uD835\uDD58','Gopf':'\uD835\uDD3E','grave':'`','GreaterEqual':'\u2265','GreaterEqualLess':'\u22DB','GreaterFullEqual':'\u2267','GreaterGreater':'\u2AA2','GreaterLess':'\u2277','GreaterSlantEqual':'\u2A7E','GreaterTilde':'\u2273','gscr':'\u210A','Gscr':'\uD835\uDCA2','gsim':'\u2273','gsime':'\u2A8E','gsiml':'\u2A90','gt':'>','Gt':'\u226B','GT':'>','gtcc':'\u2AA7','gtcir':'\u2A7A','gtdot':'\u22D7','gtlPar':'\u2995','gtquest':'\u2A7C','gtrapprox':'\u2A86','gtrarr':'\u2978','gtrdot':'\u22D7','gtreqless':'\u22DB','gtreqqless':'\u2A8C','gtrless':'\u2277','gtrsim':'\u2273','gvertneqq':'\u2269\uFE00','gvnE':'\u2269\uFE00','Hacek':'\u02C7','hairsp':'\u200A','half':'\xBD','hamilt':'\u210B','hardcy':'\u044A','HARDcy':'\u042A','harr':'\u2194','hArr':'\u21D4','harrcir':'\u2948','harrw':'\u21AD','Hat':'^','hbar':'\u210F','hcirc':'\u0125','Hcirc':'\u0124','hearts':'\u2665','heartsuit':'\u2665','hellip':'\u2026','hercon':'\u22B9','hfr':'\uD835\uDD25','Hfr':'\u210C','HilbertSpace':'\u210B','hksearow':'\u2925','hkswarow':'\u2926','hoarr':'\u21FF','homtht':'\u223B','hookleftarrow':'\u21A9','hookrightarrow':'\u21AA','hopf':'\uD835\uDD59','Hopf':'\u210D','horbar':'\u2015','HorizontalLine':'\u2500','hscr':'\uD835\uDCBD','Hscr':'\u210B','hslash':'\u210F','hstrok':'\u0127','Hstrok':'\u0126','HumpDownHump':'\u224E','HumpEqual':'\u224F','hybull':'\u2043','hyphen':'\u2010','iacute':'\xED','Iacute':'\xCD','ic':'\u2063','icirc':'\xEE','Icirc':'\xCE','icy':'\u0438','Icy':'\u0418','Idot':'\u0130','iecy':'\u0435','IEcy':'\u0415','iexcl':'\xA1','iff':'\u21D4','ifr':'\uD835\uDD26','Ifr':'\u2111','igrave':'\xEC','Igrave':'\xCC','ii':'\u2148','iiiint':'\u2A0C','iiint':'\u222D','iinfin':'\u29DC','iiota':'\u2129','ijlig':'\u0133','IJlig':'\u0132','Im':'\u2111','imacr':'\u012B','Imacr':'\u012A','image':'\u2111','ImaginaryI':'\u2148','imagline':'\u2110','imagpart':'\u2111','imath':'\u0131','imof':'\u22B7','imped':'\u01B5','Implies':'\u21D2','in':'\u2208','incare':'\u2105','infin':'\u221E','infintie':'\u29DD','inodot':'\u0131','int':'\u222B','Int':'\u222C','intcal':'\u22BA','integers':'\u2124','Integral':'\u222B','intercal':'\u22BA','Intersection':'\u22C2','intlarhk':'\u2A17','intprod':'\u2A3C','InvisibleComma':'\u2063','InvisibleTimes':'\u2062','iocy':'\u0451','IOcy':'\u0401','iogon':'\u012F','Iogon':'\u012E','iopf':'\uD835\uDD5A','Iopf':'\uD835\uDD40','iota':'\u03B9','Iota':'\u0399','iprod':'\u2A3C','iquest':'\xBF','iscr':'\uD835\uDCBE','Iscr':'\u2110','isin':'\u2208','isindot':'\u22F5','isinE':'\u22F9','isins':'\u22F4','isinsv':'\u22F3','isinv':'\u2208','it':'\u2062','itilde':'\u0129','Itilde':'\u0128','iukcy':'\u0456','Iukcy':'\u0406','iuml':'\xEF','Iuml':'\xCF','jcirc':'\u0135','Jcirc':'\u0134','jcy':'\u0439','Jcy':'\u0419','jfr':'\uD835\uDD27','Jfr':'\uD835\uDD0D','jmath':'\u0237','jopf':'\uD835\uDD5B','Jopf':'\uD835\uDD41','jscr':'\uD835\uDCBF','Jscr':'\uD835\uDCA5','jsercy':'\u0458','Jsercy':'\u0408','jukcy':'\u0454','Jukcy':'\u0404','kappa':'\u03BA','Kappa':'\u039A','kappav':'\u03F0','kcedil':'\u0137','Kcedil':'\u0136','kcy':'\u043A','Kcy':'\u041A','kfr':'\uD835\uDD28','Kfr':'\uD835\uDD0E','kgreen':'\u0138','khcy':'\u0445','KHcy':'\u0425','kjcy':'\u045C','KJcy':'\u040C','kopf':'\uD835\uDD5C','Kopf':'\uD835\uDD42','kscr':'\uD835\uDCC0','Kscr':'\uD835\uDCA6','lAarr':'\u21DA','lacute':'\u013A','Lacute':'\u0139','laemptyv':'\u29B4','lagran':'\u2112','lambda':'\u03BB','Lambda':'\u039B','lang':'\u27E8','Lang':'\u27EA','langd':'\u2991','langle':'\u27E8','lap':'\u2A85','Laplacetrf':'\u2112','laquo':'\xAB','larr':'\u2190','lArr':'\u21D0','Larr':'\u219E','larrb':'\u21E4','larrbfs':'\u291F','larrfs':'\u291D','larrhk':'\u21A9','larrlp':'\u21AB','larrpl':'\u2939','larrsim':'\u2973','larrtl':'\u21A2','lat':'\u2AAB','latail':'\u2919','lAtail':'\u291B','late':'\u2AAD','lates':'\u2AAD\uFE00','lbarr':'\u290C','lBarr':'\u290E','lbbrk':'\u2772','lbrace':'{','lbrack':'[','lbrke':'\u298B','lbrksld':'\u298F','lbrkslu':'\u298D','lcaron':'\u013E','Lcaron':'\u013D','lcedil':'\u013C','Lcedil':'\u013B','lceil':'\u2308','lcub':'{','lcy':'\u043B','Lcy':'\u041B','ldca':'\u2936','ldquo':'\u201C','ldquor':'\u201E','ldrdhar':'\u2967','ldrushar':'\u294B','ldsh':'\u21B2','le':'\u2264','lE':'\u2266','LeftAngleBracket':'\u27E8','leftarrow':'\u2190','Leftarrow':'\u21D0','LeftArrow':'\u2190','LeftArrowBar':'\u21E4','LeftArrowRightArrow':'\u21C6','leftarrowtail':'\u21A2','LeftCeiling':'\u2308','LeftDoubleBracket':'\u27E6','LeftDownTeeVector':'\u2961','LeftDownVector':'\u21C3','LeftDownVectorBar':'\u2959','LeftFloor':'\u230A','leftharpoondown':'\u21BD','leftharpoonup':'\u21BC','leftleftarrows':'\u21C7','leftrightarrow':'\u2194','Leftrightarrow':'\u21D4','LeftRightArrow':'\u2194','leftrightarrows':'\u21C6','leftrightharpoons':'\u21CB','leftrightsquigarrow':'\u21AD','LeftRightVector':'\u294E','LeftTee':'\u22A3','LeftTeeArrow':'\u21A4','LeftTeeVector':'\u295A','leftthreetimes':'\u22CB','LeftTriangle':'\u22B2','LeftTriangleBar':'\u29CF','LeftTriangleEqual':'\u22B4','LeftUpDownVector':'\u2951','LeftUpTeeVector':'\u2960','LeftUpVector':'\u21BF','LeftUpVectorBar':'\u2958','LeftVector':'\u21BC','LeftVectorBar':'\u2952','leg':'\u22DA','lEg':'\u2A8B','leq':'\u2264','leqq':'\u2266','leqslant':'\u2A7D','les':'\u2A7D','lescc':'\u2AA8','lesdot':'\u2A7F','lesdoto':'\u2A81','lesdotor':'\u2A83','lesg':'\u22DA\uFE00','lesges':'\u2A93','lessapprox':'\u2A85','lessdot':'\u22D6','lesseqgtr':'\u22DA','lesseqqgtr':'\u2A8B','LessEqualGreater':'\u22DA','LessFullEqual':'\u2266','LessGreater':'\u2276','lessgtr':'\u2276','LessLess':'\u2AA1','lesssim':'\u2272','LessSlantEqual':'\u2A7D','LessTilde':'\u2272','lfisht':'\u297C','lfloor':'\u230A','lfr':'\uD835\uDD29','Lfr':'\uD835\uDD0F','lg':'\u2276','lgE':'\u2A91','lHar':'\u2962','lhard':'\u21BD','lharu':'\u21BC','lharul':'\u296A','lhblk':'\u2584','ljcy':'\u0459','LJcy':'\u0409','ll':'\u226A','Ll':'\u22D8','llarr':'\u21C7','llcorner':'\u231E','Lleftarrow':'\u21DA','llhard':'\u296B','lltri':'\u25FA','lmidot':'\u0140','Lmidot':'\u013F','lmoust':'\u23B0','lmoustache':'\u23B0','lnap':'\u2A89','lnapprox':'\u2A89','lne':'\u2A87','lnE':'\u2268','lneq':'\u2A87','lneqq':'\u2268','lnsim':'\u22E6','loang':'\u27EC','loarr':'\u21FD','lobrk':'\u27E6','longleftarrow':'\u27F5','Longleftarrow':'\u27F8','LongLeftArrow':'\u27F5','longleftrightarrow':'\u27F7','Longleftrightarrow':'\u27FA','LongLeftRightArrow':'\u27F7','longmapsto':'\u27FC','longrightarrow':'\u27F6','Longrightarrow':'\u27F9','LongRightArrow':'\u27F6','looparrowleft':'\u21AB','looparrowright':'\u21AC','lopar':'\u2985','lopf':'\uD835\uDD5D','Lopf':'\uD835\uDD43','loplus':'\u2A2D','lotimes':'\u2A34','lowast':'\u2217','lowbar':'_','LowerLeftArrow':'\u2199','LowerRightArrow':'\u2198','loz':'\u25CA','lozenge':'\u25CA','lozf':'\u29EB','lpar':'(','lparlt':'\u2993','lrarr':'\u21C6','lrcorner':'\u231F','lrhar':'\u21CB','lrhard':'\u296D','lrm':'\u200E','lrtri':'\u22BF','lsaquo':'\u2039','lscr':'\uD835\uDCC1','Lscr':'\u2112','lsh':'\u21B0','Lsh':'\u21B0','lsim':'\u2272','lsime':'\u2A8D','lsimg':'\u2A8F','lsqb':'[','lsquo':'\u2018','lsquor':'\u201A','lstrok':'\u0142','Lstrok':'\u0141','lt':'<','Lt':'\u226A','LT':'<','ltcc':'\u2AA6','ltcir':'\u2A79','ltdot':'\u22D6','lthree':'\u22CB','ltimes':'\u22C9','ltlarr':'\u2976','ltquest':'\u2A7B','ltri':'\u25C3','ltrie':'\u22B4','ltrif':'\u25C2','ltrPar':'\u2996','lurdshar':'\u294A','luruhar':'\u2966','lvertneqq':'\u2268\uFE00','lvnE':'\u2268\uFE00','macr':'\xAF','male':'\u2642','malt':'\u2720','maltese':'\u2720','map':'\u21A6','Map':'\u2905','mapsto':'\u21A6','mapstodown':'\u21A7','mapstoleft':'\u21A4','mapstoup':'\u21A5','marker':'\u25AE','mcomma':'\u2A29','mcy':'\u043C','Mcy':'\u041C','mdash':'\u2014','mDDot':'\u223A','measuredangle':'\u2221','MediumSpace':'\u205F','Mellintrf':'\u2133','mfr':'\uD835\uDD2A','Mfr':'\uD835\uDD10','mho':'\u2127','micro':'\xB5','mid':'\u2223','midast':'*','midcir':'\u2AF0','middot':'\xB7','minus':'\u2212','minusb':'\u229F','minusd':'\u2238','minusdu':'\u2A2A','MinusPlus':'\u2213','mlcp':'\u2ADB','mldr':'\u2026','mnplus':'\u2213','models':'\u22A7','mopf':'\uD835\uDD5E','Mopf':'\uD835\uDD44','mp':'\u2213','mscr':'\uD835\uDCC2','Mscr':'\u2133','mstpos':'\u223E','mu':'\u03BC','Mu':'\u039C','multimap':'\u22B8','mumap':'\u22B8','nabla':'\u2207','nacute':'\u0144','Nacute':'\u0143','nang':'\u2220\u20D2','nap':'\u2249','napE':'\u2A70\u0338','napid':'\u224B\u0338','napos':'\u0149','napprox':'\u2249','natur':'\u266E','natural':'\u266E','naturals':'\u2115','nbsp':'\xA0','nbump':'\u224E\u0338','nbumpe':'\u224F\u0338','ncap':'\u2A43','ncaron':'\u0148','Ncaron':'\u0147','ncedil':'\u0146','Ncedil':'\u0145','ncong':'\u2247','ncongdot':'\u2A6D\u0338','ncup':'\u2A42','ncy':'\u043D','Ncy':'\u041D','ndash':'\u2013','ne':'\u2260','nearhk':'\u2924','nearr':'\u2197','neArr':'\u21D7','nearrow':'\u2197','nedot':'\u2250\u0338','NegativeMediumSpace':'\u200B','NegativeThickSpace':'\u200B','NegativeThinSpace':'\u200B','NegativeVeryThinSpace':'\u200B','nequiv':'\u2262','nesear':'\u2928','nesim':'\u2242\u0338','NestedGreaterGreater':'\u226B','NestedLessLess':'\u226A','NewLine':'\n','nexist':'\u2204','nexists':'\u2204','nfr':'\uD835\uDD2B','Nfr':'\uD835\uDD11','nge':'\u2271','ngE':'\u2267\u0338','ngeq':'\u2271','ngeqq':'\u2267\u0338','ngeqslant':'\u2A7E\u0338','nges':'\u2A7E\u0338','nGg':'\u22D9\u0338','ngsim':'\u2275','ngt':'\u226F','nGt':'\u226B\u20D2','ngtr':'\u226F','nGtv':'\u226B\u0338','nharr':'\u21AE','nhArr':'\u21CE','nhpar':'\u2AF2','ni':'\u220B','nis':'\u22FC','nisd':'\u22FA','niv':'\u220B','njcy':'\u045A','NJcy':'\u040A','nlarr':'\u219A','nlArr':'\u21CD','nldr':'\u2025','nle':'\u2270','nlE':'\u2266\u0338','nleftarrow':'\u219A','nLeftarrow':'\u21CD','nleftrightarrow':'\u21AE','nLeftrightarrow':'\u21CE','nleq':'\u2270','nleqq':'\u2266\u0338','nleqslant':'\u2A7D\u0338','nles':'\u2A7D\u0338','nless':'\u226E','nLl':'\u22D8\u0338','nlsim':'\u2274','nlt':'\u226E','nLt':'\u226A\u20D2','nltri':'\u22EA','nltrie':'\u22EC','nLtv':'\u226A\u0338','nmid':'\u2224','NoBreak':'\u2060','NonBreakingSpace':'\xA0','nopf':'\uD835\uDD5F','Nopf':'\u2115','not':'\xAC','Not':'\u2AEC','NotCongruent':'\u2262','NotCupCap':'\u226D','NotDoubleVerticalBar':'\u2226','NotElement':'\u2209','NotEqual':'\u2260','NotEqualTilde':'\u2242\u0338','NotExists':'\u2204','NotGreater':'\u226F','NotGreaterEqual':'\u2271','NotGreaterFullEqual':'\u2267\u0338','NotGreaterGreater':'\u226B\u0338','NotGreaterLess':'\u2279','NotGreaterSlantEqual':'\u2A7E\u0338','NotGreaterTilde':'\u2275','NotHumpDownHump':'\u224E\u0338','NotHumpEqual':'\u224F\u0338','notin':'\u2209','notindot':'\u22F5\u0338','notinE':'\u22F9\u0338','notinva':'\u2209','notinvb':'\u22F7','notinvc':'\u22F6','NotLeftTriangle':'\u22EA','NotLeftTriangleBar':'\u29CF\u0338','NotLeftTriangleEqual':'\u22EC','NotLess':'\u226E','NotLessEqual':'\u2270','NotLessGreater':'\u2278','NotLessLess':'\u226A\u0338','NotLessSlantEqual':'\u2A7D\u0338','NotLessTilde':'\u2274','NotNestedGreaterGreater':'\u2AA2\u0338','NotNestedLessLess':'\u2AA1\u0338','notni':'\u220C','notniva':'\u220C','notnivb':'\u22FE','notnivc':'\u22FD','NotPrecedes':'\u2280','NotPrecedesEqual':'\u2AAF\u0338','NotPrecedesSlantEqual':'\u22E0','NotReverseElement':'\u220C','NotRightTriangle':'\u22EB','NotRightTriangleBar':'\u29D0\u0338','NotRightTriangleEqual':'\u22ED','NotSquareSubset':'\u228F\u0338','NotSquareSubsetEqual':'\u22E2','NotSquareSuperset':'\u2290\u0338','NotSquareSupersetEqual':'\u22E3','NotSubset':'\u2282\u20D2','NotSubsetEqual':'\u2288','NotSucceeds':'\u2281','NotSucceedsEqual':'\u2AB0\u0338','NotSucceedsSlantEqual':'\u22E1','NotSucceedsTilde':'\u227F\u0338','NotSuperset':'\u2283\u20D2','NotSupersetEqual':'\u2289','NotTilde':'\u2241','NotTildeEqual':'\u2244','NotTildeFullEqual':'\u2247','NotTildeTilde':'\u2249','NotVerticalBar':'\u2224','npar':'\u2226','nparallel':'\u2226','nparsl':'\u2AFD\u20E5','npart':'\u2202\u0338','npolint':'\u2A14','npr':'\u2280','nprcue':'\u22E0','npre':'\u2AAF\u0338','nprec':'\u2280','npreceq':'\u2AAF\u0338','nrarr':'\u219B','nrArr':'\u21CF','nrarrc':'\u2933\u0338','nrarrw':'\u219D\u0338','nrightarrow':'\u219B','nRightarrow':'\u21CF','nrtri':'\u22EB','nrtrie':'\u22ED','nsc':'\u2281','nsccue':'\u22E1','nsce':'\u2AB0\u0338','nscr':'\uD835\uDCC3','Nscr':'\uD835\uDCA9','nshortmid':'\u2224','nshortparallel':'\u2226','nsim':'\u2241','nsime':'\u2244','nsimeq':'\u2244','nsmid':'\u2224','nspar':'\u2226','nsqsube':'\u22E2','nsqsupe':'\u22E3','nsub':'\u2284','nsube':'\u2288','nsubE':'\u2AC5\u0338','nsubset':'\u2282\u20D2','nsubseteq':'\u2288','nsubseteqq':'\u2AC5\u0338','nsucc':'\u2281','nsucceq':'\u2AB0\u0338','nsup':'\u2285','nsupe':'\u2289','nsupE':'\u2AC6\u0338','nsupset':'\u2283\u20D2','nsupseteq':'\u2289','nsupseteqq':'\u2AC6\u0338','ntgl':'\u2279','ntilde':'\xF1','Ntilde':'\xD1','ntlg':'\u2278','ntriangleleft':'\u22EA','ntrianglelefteq':'\u22EC','ntriangleright':'\u22EB','ntrianglerighteq':'\u22ED','nu':'\u03BD','Nu':'\u039D','num':'#','numero':'\u2116','numsp':'\u2007','nvap':'\u224D\u20D2','nvdash':'\u22AC','nvDash':'\u22AD','nVdash':'\u22AE','nVDash':'\u22AF','nvge':'\u2265\u20D2','nvgt':'>\u20D2','nvHarr':'\u2904','nvinfin':'\u29DE','nvlArr':'\u2902','nvle':'\u2264\u20D2','nvlt':'<\u20D2','nvltrie':'\u22B4\u20D2','nvrArr':'\u2903','nvrtrie':'\u22B5\u20D2','nvsim':'\u223C\u20D2','nwarhk':'\u2923','nwarr':'\u2196','nwArr':'\u21D6','nwarrow':'\u2196','nwnear':'\u2927','oacute':'\xF3','Oacute':'\xD3','oast':'\u229B','ocir':'\u229A','ocirc':'\xF4','Ocirc':'\xD4','ocy':'\u043E','Ocy':'\u041E','odash':'\u229D','odblac':'\u0151','Odblac':'\u0150','odiv':'\u2A38','odot':'\u2299','odsold':'\u29BC','oelig':'\u0153','OElig':'\u0152','ofcir':'\u29BF','ofr':'\uD835\uDD2C','Ofr':'\uD835\uDD12','ogon':'\u02DB','ograve':'\xF2','Ograve':'\xD2','ogt':'\u29C1','ohbar':'\u29B5','ohm':'\u03A9','oint':'\u222E','olarr':'\u21BA','olcir':'\u29BE','olcross':'\u29BB','oline':'\u203E','olt':'\u29C0','omacr':'\u014D','Omacr':'\u014C','omega':'\u03C9','Omega':'\u03A9','omicron':'\u03BF','Omicron':'\u039F','omid':'\u29B6','ominus':'\u2296','oopf':'\uD835\uDD60','Oopf':'\uD835\uDD46','opar':'\u29B7','OpenCurlyDoubleQuote':'\u201C','OpenCurlyQuote':'\u2018','operp':'\u29B9','oplus':'\u2295','or':'\u2228','Or':'\u2A54','orarr':'\u21BB','ord':'\u2A5D','order':'\u2134','orderof':'\u2134','ordf':'\xAA','ordm':'\xBA','origof':'\u22B6','oror':'\u2A56','orslope':'\u2A57','orv':'\u2A5B','oS':'\u24C8','oscr':'\u2134','Oscr':'\uD835\uDCAA','oslash':'\xF8','Oslash':'\xD8','osol':'\u2298','otilde':'\xF5','Otilde':'\xD5','otimes':'\u2297','Otimes':'\u2A37','otimesas':'\u2A36','ouml':'\xF6','Ouml':'\xD6','ovbar':'\u233D','OverBar':'\u203E','OverBrace':'\u23DE','OverBracket':'\u23B4','OverParenthesis':'\u23DC','par':'\u2225','para':'\xB6','parallel':'\u2225','parsim':'\u2AF3','parsl':'\u2AFD','part':'\u2202','PartialD':'\u2202','pcy':'\u043F','Pcy':'\u041F','percnt':'%','period':'.','permil':'\u2030','perp':'\u22A5','pertenk':'\u2031','pfr':'\uD835\uDD2D','Pfr':'\uD835\uDD13','phi':'\u03C6','Phi':'\u03A6','phiv':'\u03D5','phmmat':'\u2133','phone':'\u260E','pi':'\u03C0','Pi':'\u03A0','pitchfork':'\u22D4','piv':'\u03D6','planck':'\u210F','planckh':'\u210E','plankv':'\u210F','plus':'+','plusacir':'\u2A23','plusb':'\u229E','pluscir':'\u2A22','plusdo':'\u2214','plusdu':'\u2A25','pluse':'\u2A72','PlusMinus':'\xB1','plusmn':'\xB1','plussim':'\u2A26','plustwo':'\u2A27','pm':'\xB1','Poincareplane':'\u210C','pointint':'\u2A15','popf':'\uD835\uDD61','Popf':'\u2119','pound':'\xA3','pr':'\u227A','Pr':'\u2ABB','prap':'\u2AB7','prcue':'\u227C','pre':'\u2AAF','prE':'\u2AB3','prec':'\u227A','precapprox':'\u2AB7','preccurlyeq':'\u227C','Precedes':'\u227A','PrecedesEqual':'\u2AAF','PrecedesSlantEqual':'\u227C','PrecedesTilde':'\u227E','preceq':'\u2AAF','precnapprox':'\u2AB9','precneqq':'\u2AB5','precnsim':'\u22E8','precsim':'\u227E','prime':'\u2032','Prime':'\u2033','primes':'\u2119','prnap':'\u2AB9','prnE':'\u2AB5','prnsim':'\u22E8','prod':'\u220F','Product':'\u220F','profalar':'\u232E','profline':'\u2312','profsurf':'\u2313','prop':'\u221D','Proportion':'\u2237','Proportional':'\u221D','propto':'\u221D','prsim':'\u227E','prurel':'\u22B0','pscr':'\uD835\uDCC5','Pscr':'\uD835\uDCAB','psi':'\u03C8','Psi':'\u03A8','puncsp':'\u2008','qfr':'\uD835\uDD2E','Qfr':'\uD835\uDD14','qint':'\u2A0C','qopf':'\uD835\uDD62','Qopf':'\u211A','qprime':'\u2057','qscr':'\uD835\uDCC6','Qscr':'\uD835\uDCAC','quaternions':'\u210D','quatint':'\u2A16','quest':'?','questeq':'\u225F','quot':'"','QUOT':'"','rAarr':'\u21DB','race':'\u223D\u0331','racute':'\u0155','Racute':'\u0154','radic':'\u221A','raemptyv':'\u29B3','rang':'\u27E9','Rang':'\u27EB','rangd':'\u2992','range':'\u29A5','rangle':'\u27E9','raquo':'\xBB','rarr':'\u2192','rArr':'\u21D2','Rarr':'\u21A0','rarrap':'\u2975','rarrb':'\u21E5','rarrbfs':'\u2920','rarrc':'\u2933','rarrfs':'\u291E','rarrhk':'\u21AA','rarrlp':'\u21AC','rarrpl':'\u2945','rarrsim':'\u2974','rarrtl':'\u21A3','Rarrtl':'\u2916','rarrw':'\u219D','ratail':'\u291A','rAtail':'\u291C','ratio':'\u2236','rationals':'\u211A','rbarr':'\u290D','rBarr':'\u290F','RBarr':'\u2910','rbbrk':'\u2773','rbrace':'}','rbrack':']','rbrke':'\u298C','rbrksld':'\u298E','rbrkslu':'\u2990','rcaron':'\u0159','Rcaron':'\u0158','rcedil':'\u0157','Rcedil':'\u0156','rceil':'\u2309','rcub':'}','rcy':'\u0440','Rcy':'\u0420','rdca':'\u2937','rdldhar':'\u2969','rdquo':'\u201D','rdquor':'\u201D','rdsh':'\u21B3','Re':'\u211C','real':'\u211C','realine':'\u211B','realpart':'\u211C','reals':'\u211D','rect':'\u25AD','reg':'\xAE','REG':'\xAE','ReverseElement':'\u220B','ReverseEquilibrium':'\u21CB','ReverseUpEquilibrium':'\u296F','rfisht':'\u297D','rfloor':'\u230B','rfr':'\uD835\uDD2F','Rfr':'\u211C','rHar':'\u2964','rhard':'\u21C1','rharu':'\u21C0','rharul':'\u296C','rho':'\u03C1','Rho':'\u03A1','rhov':'\u03F1','RightAngleBracket':'\u27E9','rightarrow':'\u2192','Rightarrow':'\u21D2','RightArrow':'\u2192','RightArrowBar':'\u21E5','RightArrowLeftArrow':'\u21C4','rightarrowtail':'\u21A3','RightCeiling':'\u2309','RightDoubleBracket':'\u27E7','RightDownTeeVector':'\u295D','RightDownVector':'\u21C2','RightDownVectorBar':'\u2955','RightFloor':'\u230B','rightharpoondown':'\u21C1','rightharpoonup':'\u21C0','rightleftarrows':'\u21C4','rightleftharpoons':'\u21CC','rightrightarrows':'\u21C9','rightsquigarrow':'\u219D','RightTee':'\u22A2','RightTeeArrow':'\u21A6','RightTeeVector':'\u295B','rightthreetimes':'\u22CC','RightTriangle':'\u22B3','RightTriangleBar':'\u29D0','RightTriangleEqual':'\u22B5','RightUpDownVector':'\u294F','RightUpTeeVector':'\u295C','RightUpVector':'\u21BE','RightUpVectorBar':'\u2954','RightVector':'\u21C0','RightVectorBar':'\u2953','ring':'\u02DA','risingdotseq':'\u2253','rlarr':'\u21C4','rlhar':'\u21CC','rlm':'\u200F','rmoust':'\u23B1','rmoustache':'\u23B1','rnmid':'\u2AEE','roang':'\u27ED','roarr':'\u21FE','robrk':'\u27E7','ropar':'\u2986','ropf':'\uD835\uDD63','Ropf':'\u211D','roplus':'\u2A2E','rotimes':'\u2A35','RoundImplies':'\u2970','rpar':')','rpargt':'\u2994','rppolint':'\u2A12','rrarr':'\u21C9','Rrightarrow':'\u21DB','rsaquo':'\u203A','rscr':'\uD835\uDCC7','Rscr':'\u211B','rsh':'\u21B1','Rsh':'\u21B1','rsqb':']','rsquo':'\u2019','rsquor':'\u2019','rthree':'\u22CC','rtimes':'\u22CA','rtri':'\u25B9','rtrie':'\u22B5','rtrif':'\u25B8','rtriltri':'\u29CE','RuleDelayed':'\u29F4','ruluhar':'\u2968','rx':'\u211E','sacute':'\u015B','Sacute':'\u015A','sbquo':'\u201A','sc':'\u227B','Sc':'\u2ABC','scap':'\u2AB8','scaron':'\u0161','Scaron':'\u0160','sccue':'\u227D','sce':'\u2AB0','scE':'\u2AB4','scedil':'\u015F','Scedil':'\u015E','scirc':'\u015D','Scirc':'\u015C','scnap':'\u2ABA','scnE':'\u2AB6','scnsim':'\u22E9','scpolint':'\u2A13','scsim':'\u227F','scy':'\u0441','Scy':'\u0421','sdot':'\u22C5','sdotb':'\u22A1','sdote':'\u2A66','searhk':'\u2925','searr':'\u2198','seArr':'\u21D8','searrow':'\u2198','sect':'\xA7','semi':';','seswar':'\u2929','setminus':'\u2216','setmn':'\u2216','sext':'\u2736','sfr':'\uD835\uDD30','Sfr':'\uD835\uDD16','sfrown':'\u2322','sharp':'\u266F','shchcy':'\u0449','SHCHcy':'\u0429','shcy':'\u0448','SHcy':'\u0428','ShortDownArrow':'\u2193','ShortLeftArrow':'\u2190','shortmid':'\u2223','shortparallel':'\u2225','ShortRightArrow':'\u2192','ShortUpArrow':'\u2191','shy':'\xAD','sigma':'\u03C3','Sigma':'\u03A3','sigmaf':'\u03C2','sigmav':'\u03C2','sim':'\u223C','simdot':'\u2A6A','sime':'\u2243','simeq':'\u2243','simg':'\u2A9E','simgE':'\u2AA0','siml':'\u2A9D','simlE':'\u2A9F','simne':'\u2246','simplus':'\u2A24','simrarr':'\u2972','slarr':'\u2190','SmallCircle':'\u2218','smallsetminus':'\u2216','smashp':'\u2A33','smeparsl':'\u29E4','smid':'\u2223','smile':'\u2323','smt':'\u2AAA','smte':'\u2AAC','smtes':'\u2AAC\uFE00','softcy':'\u044C','SOFTcy':'\u042C','sol':'/','solb':'\u29C4','solbar':'\u233F','sopf':'\uD835\uDD64','Sopf':'\uD835\uDD4A','spades':'\u2660','spadesuit':'\u2660','spar':'\u2225','sqcap':'\u2293','sqcaps':'\u2293\uFE00','sqcup':'\u2294','sqcups':'\u2294\uFE00','Sqrt':'\u221A','sqsub':'\u228F','sqsube':'\u2291','sqsubset':'\u228F','sqsubseteq':'\u2291','sqsup':'\u2290','sqsupe':'\u2292','sqsupset':'\u2290','sqsupseteq':'\u2292','squ':'\u25A1','square':'\u25A1','Square':'\u25A1','SquareIntersection':'\u2293','SquareSubset':'\u228F','SquareSubsetEqual':'\u2291','SquareSuperset':'\u2290','SquareSupersetEqual':'\u2292','SquareUnion':'\u2294','squarf':'\u25AA','squf':'\u25AA','srarr':'\u2192','sscr':'\uD835\uDCC8','Sscr':'\uD835\uDCAE','ssetmn':'\u2216','ssmile':'\u2323','sstarf':'\u22C6','star':'\u2606','Star':'\u22C6','starf':'\u2605','straightepsilon':'\u03F5','straightphi':'\u03D5','strns':'\xAF','sub':'\u2282','Sub':'\u22D0','subdot':'\u2ABD','sube':'\u2286','subE':'\u2AC5','subedot':'\u2AC3','submult':'\u2AC1','subne':'\u228A','subnE':'\u2ACB','subplus':'\u2ABF','subrarr':'\u2979','subset':'\u2282','Subset':'\u22D0','subseteq':'\u2286','subseteqq':'\u2AC5','SubsetEqual':'\u2286','subsetneq':'\u228A','subsetneqq':'\u2ACB','subsim':'\u2AC7','subsub':'\u2AD5','subsup':'\u2AD3','succ':'\u227B','succapprox':'\u2AB8','succcurlyeq':'\u227D','Succeeds':'\u227B','SucceedsEqual':'\u2AB0','SucceedsSlantEqual':'\u227D','SucceedsTilde':'\u227F','succeq':'\u2AB0','succnapprox':'\u2ABA','succneqq':'\u2AB6','succnsim':'\u22E9','succsim':'\u227F','SuchThat':'\u220B','sum':'\u2211','Sum':'\u2211','sung':'\u266A','sup':'\u2283','Sup':'\u22D1','sup1':'\xB9','sup2':'\xB2','sup3':'\xB3','supdot':'\u2ABE','supdsub':'\u2AD8','supe':'\u2287','supE':'\u2AC6','supedot':'\u2AC4','Superset':'\u2283','SupersetEqual':'\u2287','suphsol':'\u27C9','suphsub':'\u2AD7','suplarr':'\u297B','supmult':'\u2AC2','supne':'\u228B','supnE':'\u2ACC','supplus':'\u2AC0','supset':'\u2283','Supset':'\u22D1','supseteq':'\u2287','supseteqq':'\u2AC6','supsetneq':'\u228B','supsetneqq':'\u2ACC','supsim':'\u2AC8','supsub':'\u2AD4','supsup':'\u2AD6','swarhk':'\u2926','swarr':'\u2199','swArr':'\u21D9','swarrow':'\u2199','swnwar':'\u292A','szlig':'\xDF','Tab':'\t','target':'\u2316','tau':'\u03C4','Tau':'\u03A4','tbrk':'\u23B4','tcaron':'\u0165','Tcaron':'\u0164','tcedil':'\u0163','Tcedil':'\u0162','tcy':'\u0442','Tcy':'\u0422','tdot':'\u20DB','telrec':'\u2315','tfr':'\uD835\uDD31','Tfr':'\uD835\uDD17','there4':'\u2234','therefore':'\u2234','Therefore':'\u2234','theta':'\u03B8','Theta':'\u0398','thetasym':'\u03D1','thetav':'\u03D1','thickapprox':'\u2248','thicksim':'\u223C','ThickSpace':'\u205F\u200A','thinsp':'\u2009','ThinSpace':'\u2009','thkap':'\u2248','thksim':'\u223C','thorn':'\xFE','THORN':'\xDE','tilde':'\u02DC','Tilde':'\u223C','TildeEqual':'\u2243','TildeFullEqual':'\u2245','TildeTilde':'\u2248','times':'\xD7','timesb':'\u22A0','timesbar':'\u2A31','timesd':'\u2A30','tint':'\u222D','toea':'\u2928','top':'\u22A4','topbot':'\u2336','topcir':'\u2AF1','topf':'\uD835\uDD65','Topf':'\uD835\uDD4B','topfork':'\u2ADA','tosa':'\u2929','tprime':'\u2034','trade':'\u2122','TRADE':'\u2122','triangle':'\u25B5','triangledown':'\u25BF','triangleleft':'\u25C3','trianglelefteq':'\u22B4','triangleq':'\u225C','triangleright':'\u25B9','trianglerighteq':'\u22B5','tridot':'\u25EC','trie':'\u225C','triminus':'\u2A3A','TripleDot':'\u20DB','triplus':'\u2A39','trisb':'\u29CD','tritime':'\u2A3B','trpezium':'\u23E2','tscr':'\uD835\uDCC9','Tscr':'\uD835\uDCAF','tscy':'\u0446','TScy':'\u0426','tshcy':'\u045B','TSHcy':'\u040B','tstrok':'\u0167','Tstrok':'\u0166','twixt':'\u226C','twoheadleftarrow':'\u219E','twoheadrightarrow':'\u21A0','uacute':'\xFA','Uacute':'\xDA','uarr':'\u2191','uArr':'\u21D1','Uarr':'\u219F','Uarrocir':'\u2949','ubrcy':'\u045E','Ubrcy':'\u040E','ubreve':'\u016D','Ubreve':'\u016C','ucirc':'\xFB','Ucirc':'\xDB','ucy':'\u0443','Ucy':'\u0423','udarr':'\u21C5','udblac':'\u0171','Udblac':'\u0170','udhar':'\u296E','ufisht':'\u297E','ufr':'\uD835\uDD32','Ufr':'\uD835\uDD18','ugrave':'\xF9','Ugrave':'\xD9','uHar':'\u2963','uharl':'\u21BF','uharr':'\u21BE','uhblk':'\u2580','ulcorn':'\u231C','ulcorner':'\u231C','ulcrop':'\u230F','ultri':'\u25F8','umacr':'\u016B','Umacr':'\u016A','uml':'\xA8','UnderBar':'_','UnderBrace':'\u23DF','UnderBracket':'\u23B5','UnderParenthesis':'\u23DD','Union':'\u22C3','UnionPlus':'\u228E','uogon':'\u0173','Uogon':'\u0172','uopf':'\uD835\uDD66','Uopf':'\uD835\uDD4C','uparrow':'\u2191','Uparrow':'\u21D1','UpArrow':'\u2191','UpArrowBar':'\u2912','UpArrowDownArrow':'\u21C5','updownarrow':'\u2195','Updownarrow':'\u21D5','UpDownArrow':'\u2195','UpEquilibrium':'\u296E','upharpoonleft':'\u21BF','upharpoonright':'\u21BE','uplus':'\u228E','UpperLeftArrow':'\u2196','UpperRightArrow':'\u2197','upsi':'\u03C5','Upsi':'\u03D2','upsih':'\u03D2','upsilon':'\u03C5','Upsilon':'\u03A5','UpTee':'\u22A5','UpTeeArrow':'\u21A5','upuparrows':'\u21C8','urcorn':'\u231D','urcorner':'\u231D','urcrop':'\u230E','uring':'\u016F','Uring':'\u016E','urtri':'\u25F9','uscr':'\uD835\uDCCA','Uscr':'\uD835\uDCB0','utdot':'\u22F0','utilde':'\u0169','Utilde':'\u0168','utri':'\u25B5','utrif':'\u25B4','uuarr':'\u21C8','uuml':'\xFC','Uuml':'\xDC','uwangle':'\u29A7','vangrt':'\u299C','varepsilon':'\u03F5','varkappa':'\u03F0','varnothing':'\u2205','varphi':'\u03D5','varpi':'\u03D6','varpropto':'\u221D','varr':'\u2195','vArr':'\u21D5','varrho':'\u03F1','varsigma':'\u03C2','varsubsetneq':'\u228A\uFE00','varsubsetneqq':'\u2ACB\uFE00','varsupsetneq':'\u228B\uFE00','varsupsetneqq':'\u2ACC\uFE00','vartheta':'\u03D1','vartriangleleft':'\u22B2','vartriangleright':'\u22B3','vBar':'\u2AE8','Vbar':'\u2AEB','vBarv':'\u2AE9','vcy':'\u0432','Vcy':'\u0412','vdash':'\u22A2','vDash':'\u22A8','Vdash':'\u22A9','VDash':'\u22AB','Vdashl':'\u2AE6','vee':'\u2228','Vee':'\u22C1','veebar':'\u22BB','veeeq':'\u225A','vellip':'\u22EE','verbar':'|','Verbar':'\u2016','vert':'|','Vert':'\u2016','VerticalBar':'\u2223','VerticalLine':'|','VerticalSeparator':'\u2758','VerticalTilde':'\u2240','VeryThinSpace':'\u200A','vfr':'\uD835\uDD33','Vfr':'\uD835\uDD19','vltri':'\u22B2','vnsub':'\u2282\u20D2','vnsup':'\u2283\u20D2','vopf':'\uD835\uDD67','Vopf':'\uD835\uDD4D','vprop':'\u221D','vrtri':'\u22B3','vscr':'\uD835\uDCCB','Vscr':'\uD835\uDCB1','vsubne':'\u228A\uFE00','vsubnE':'\u2ACB\uFE00','vsupne':'\u228B\uFE00','vsupnE':'\u2ACC\uFE00','Vvdash':'\u22AA','vzigzag':'\u299A','wcirc':'\u0175','Wcirc':'\u0174','wedbar':'\u2A5F','wedge':'\u2227','Wedge':'\u22C0','wedgeq':'\u2259','weierp':'\u2118','wfr':'\uD835\uDD34','Wfr':'\uD835\uDD1A','wopf':'\uD835\uDD68','Wopf':'\uD835\uDD4E','wp':'\u2118','wr':'\u2240','wreath':'\u2240','wscr':'\uD835\uDCCC','Wscr':'\uD835\uDCB2','xcap':'\u22C2','xcirc':'\u25EF','xcup':'\u22C3','xdtri':'\u25BD','xfr':'\uD835\uDD35','Xfr':'\uD835\uDD1B','xharr':'\u27F7','xhArr':'\u27FA','xi':'\u03BE','Xi':'\u039E','xlarr':'\u27F5','xlArr':'\u27F8','xmap':'\u27FC','xnis':'\u22FB','xodot':'\u2A00','xopf':'\uD835\uDD69','Xopf':'\uD835\uDD4F','xoplus':'\u2A01','xotime':'\u2A02','xrarr':'\u27F6','xrArr':'\u27F9','xscr':'\uD835\uDCCD','Xscr':'\uD835\uDCB3','xsqcup':'\u2A06','xuplus':'\u2A04','xutri':'\u25B3','xvee':'\u22C1','xwedge':'\u22C0','yacute':'\xFD','Yacute':'\xDD','yacy':'\u044F','YAcy':'\u042F','ycirc':'\u0177','Ycirc':'\u0176','ycy':'\u044B','Ycy':'\u042B','yen':'\xA5','yfr':'\uD835\uDD36','Yfr':'\uD835\uDD1C','yicy':'\u0457','YIcy':'\u0407','yopf':'\uD835\uDD6A','Yopf':'\uD835\uDD50','yscr':'\uD835\uDCCE','Yscr':'\uD835\uDCB4','yucy':'\u044E','YUcy':'\u042E','yuml':'\xFF','Yuml':'\u0178','zacute':'\u017A','Zacute':'\u0179','zcaron':'\u017E','Zcaron':'\u017D','zcy':'\u0437','Zcy':'\u0417','zdot':'\u017C','Zdot':'\u017B','zeetrf':'\u2128','ZeroWidthSpace':'\u200B','zeta':'\u03B6','Zeta':'\u0396','zfr':'\uD835\uDD37','Zfr':'\u2128','zhcy':'\u0436','ZHcy':'\u0416','zigrarr':'\u21DD','zopf':'\uD835\uDD6B','Zopf':'\u2124','zscr':'\uD835\uDCCF','Zscr':'\uD835\uDCB5','zwj':'\u200D','zwnj':'\u200C'};
	var decodeMapLegacy = {'aacute':'\xE1','Aacute':'\xC1','acirc':'\xE2','Acirc':'\xC2','acute':'\xB4','aelig':'\xE6','AElig':'\xC6','agrave':'\xE0','Agrave':'\xC0','amp':'&','AMP':'&','aring':'\xE5','Aring':'\xC5','atilde':'\xE3','Atilde':'\xC3','auml':'\xE4','Auml':'\xC4','brvbar':'\xA6','ccedil':'\xE7','Ccedil':'\xC7','cedil':'\xB8','cent':'\xA2','copy':'\xA9','COPY':'\xA9','curren':'\xA4','deg':'\xB0','divide':'\xF7','eacute':'\xE9','Eacute':'\xC9','ecirc':'\xEA','Ecirc':'\xCA','egrave':'\xE8','Egrave':'\xC8','eth':'\xF0','ETH':'\xD0','euml':'\xEB','Euml':'\xCB','frac12':'\xBD','frac14':'\xBC','frac34':'\xBE','gt':'>','GT':'>','iacute':'\xED','Iacute':'\xCD','icirc':'\xEE','Icirc':'\xCE','iexcl':'\xA1','igrave':'\xEC','Igrave':'\xCC','iquest':'\xBF','iuml':'\xEF','Iuml':'\xCF','laquo':'\xAB','lt':'<','LT':'<','macr':'\xAF','micro':'\xB5','middot':'\xB7','nbsp':'\xA0','not':'\xAC','ntilde':'\xF1','Ntilde':'\xD1','oacute':'\xF3','Oacute':'\xD3','ocirc':'\xF4','Ocirc':'\xD4','ograve':'\xF2','Ograve':'\xD2','ordf':'\xAA','ordm':'\xBA','oslash':'\xF8','Oslash':'\xD8','otilde':'\xF5','Otilde':'\xD5','ouml':'\xF6','Ouml':'\xD6','para':'\xB6','plusmn':'\xB1','pound':'\xA3','quot':'"','QUOT':'"','raquo':'\xBB','reg':'\xAE','REG':'\xAE','sect':'\xA7','shy':'\xAD','sup1':'\xB9','sup2':'\xB2','sup3':'\xB3','szlig':'\xDF','thorn':'\xFE','THORN':'\xDE','times':'\xD7','uacute':'\xFA','Uacute':'\xDA','ucirc':'\xFB','Ucirc':'\xDB','ugrave':'\xF9','Ugrave':'\xD9','uml':'\xA8','uuml':'\xFC','Uuml':'\xDC','yacute':'\xFD','Yacute':'\xDD','yen':'\xA5','yuml':'\xFF'};
	var decodeMapNumeric = {'0':'\uFFFD','128':'\u20AC','130':'\u201A','131':'\u0192','132':'\u201E','133':'\u2026','134':'\u2020','135':'\u2021','136':'\u02C6','137':'\u2030','138':'\u0160','139':'\u2039','140':'\u0152','142':'\u017D','145':'\u2018','146':'\u2019','147':'\u201C','148':'\u201D','149':'\u2022','150':'\u2013','151':'\u2014','152':'\u02DC','153':'\u2122','154':'\u0161','155':'\u203A','156':'\u0153','158':'\u017E','159':'\u0178'};
	var invalidReferenceCodePoints = [1,2,3,4,5,6,7,8,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,64976,64977,64978,64979,64980,64981,64982,64983,64984,64985,64986,64987,64988,64989,64990,64991,64992,64993,64994,64995,64996,64997,64998,64999,65000,65001,65002,65003,65004,65005,65006,65007,65534,65535,131070,131071,196606,196607,262142,262143,327678,327679,393214,393215,458750,458751,524286,524287,589822,589823,655358,655359,720894,720895,786430,786431,851966,851967,917502,917503,983038,983039,1048574,1048575,1114110,1114111];

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;

	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
	var has = function(object, propertyName) {
		return hasOwnProperty.call(object, propertyName);
	};

	var contains = function(array, value) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			if (array[index] == value) {
				return true;
			}
		}
		return false;
	};

	var merge = function(options, defaults) {
		if (!options) {
			return defaults;
		}
		var result = {};
		var key;
		for (key in defaults) {
			// A `hasOwnProperty` check is not needed here, since only recognized
			// option names are used anyway. Any others are ignored.
			result[key] = has(options, key) ? options[key] : defaults[key];
		}
		return result;
	};

	// Modified version of `ucs2encode`; see https://mths.be/punycode.
	var codePointToSymbol = function(codePoint, strict) {
		var output = '';
		if ((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF) {
			// See issue #4:
			// “Otherwise, if the number is in the range 0xD800 to 0xDFFF or is
			// greater than 0x10FFFF, then this is a parse error. Return a U+FFFD
			// REPLACEMENT CHARACTER.”
			if (strict) {
				parseError('character reference outside the permissible Unicode range');
			}
			return '\uFFFD';
		}
		if (has(decodeMapNumeric, codePoint)) {
			if (strict) {
				parseError('disallowed character reference');
			}
			return decodeMapNumeric[codePoint];
		}
		if (strict && contains(invalidReferenceCodePoints, codePoint)) {
			parseError('disallowed character reference');
		}
		if (codePoint > 0xFFFF) {
			codePoint -= 0x10000;
			output += stringFromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
			codePoint = 0xDC00 | codePoint & 0x3FF;
		}
		output += stringFromCharCode(codePoint);
		return output;
	};

	var hexEscape = function(codePoint) {
		return '&#x' + codePoint.toString(16).toUpperCase() + ';';
	};

	var decEscape = function(codePoint) {
		return '&#' + codePoint + ';';
	};

	var parseError = function(message) {
		throw Error('Parse error: ' + message);
	};

	/*--------------------------------------------------------------------------*/

	var encode = function(string, options) {
		options = merge(options, encode.options);
		var strict = options.strict;
		if (strict && regexInvalidRawCodePoint.test(string)) {
			parseError('forbidden code point');
		}
		var encodeEverything = options.encodeEverything;
		var useNamedReferences = options.useNamedReferences;
		var allowUnsafeSymbols = options.allowUnsafeSymbols;
		var escapeCodePoint = options.decimal ? decEscape : hexEscape;

		var escapeBmpSymbol = function(symbol) {
			return escapeCodePoint(symbol.charCodeAt(0));
		};

		if (encodeEverything) {
			// Encode ASCII symbols.
			string = string.replace(regexAsciiWhitelist, function(symbol) {
				// Use named references if requested & possible.
				if (useNamedReferences && has(encodeMap, symbol)) {
					return '&' + encodeMap[symbol] + ';';
				}
				return escapeBmpSymbol(symbol);
			});
			// Shorten a few escapes that represent two symbols, of which at least one
			// is within the ASCII range.
			if (useNamedReferences) {
				string = string
					.replace(/&gt;\u20D2/g, '&nvgt;')
					.replace(/&lt;\u20D2/g, '&nvlt;')
					.replace(/&#x66;&#x6A;/g, '&fjlig;');
			}
			// Encode non-ASCII symbols.
			if (useNamedReferences) {
				// Encode non-ASCII symbols that can be replaced with a named reference.
				string = string.replace(regexEncodeNonAscii, function(string) {
					// Note: there is no need to check `has(encodeMap, string)` here.
					return '&' + encodeMap[string] + ';';
				});
			}
			// Note: any remaining non-ASCII symbols are handled outside of the `if`.
		} else if (useNamedReferences) {
			// Apply named character references.
			// Encode `<>"'&` using named character references.
			if (!allowUnsafeSymbols) {
				string = string.replace(regexEscape, function(string) {
					return '&' + encodeMap[string] + ';'; // no need to check `has()` here
				});
			}
			// Shorten escapes that represent two symbols, of which at least one is
			// `<>"'&`.
			string = string
				.replace(/&gt;\u20D2/g, '&nvgt;')
				.replace(/&lt;\u20D2/g, '&nvlt;');
			// Encode non-ASCII symbols that can be replaced with a named reference.
			string = string.replace(regexEncodeNonAscii, function(string) {
				// Note: there is no need to check `has(encodeMap, string)` here.
				return '&' + encodeMap[string] + ';';
			});
		} else if (!allowUnsafeSymbols) {
			// Encode `<>"'&` using hexadecimal escapes, now that they’re not handled
			// using named character references.
			string = string.replace(regexEscape, escapeBmpSymbol);
		}
		return string
			// Encode astral symbols.
			.replace(regexAstralSymbols, function($0) {
				// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
				var high = $0.charCodeAt(0);
				var low = $0.charCodeAt(1);
				var codePoint = (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
				return escapeCodePoint(codePoint);
			})
			// Encode any remaining BMP symbols that are not printable ASCII symbols
			// using a hexadecimal escape.
			.replace(regexBmpWhitelist, escapeBmpSymbol);
	};
	// Expose default options (so they can be overridden globally).
	encode.options = {
		'allowUnsafeSymbols': false,
		'encodeEverything': false,
		'strict': false,
		'useNamedReferences': false,
		'decimal' : false
	};

	var decode = function(html, options) {
		options = merge(options, decode.options);
		var strict = options.strict;
		if (strict && regexInvalidEntity.test(html)) {
			parseError('malformed character reference');
		}
		return html.replace(regexDecode, function($0, $1, $2, $3, $4, $5, $6, $7, $8) {
			var codePoint;
			var semicolon;
			var decDigits;
			var hexDigits;
			var reference;
			var next;

			if ($1) {
				reference = $1;
				// Note: there is no need to check `has(decodeMap, reference)`.
				return decodeMap[reference];
			}

			if ($2) {
				// Decode named character references without trailing `;`, e.g. `&amp`.
				// This is only a parse error if it gets converted to `&`, or if it is
				// followed by `=` in an attribute context.
				reference = $2;
				next = $3;
				if (next && options.isAttributeValue) {
					if (strict && next == '=') {
						parseError('`&` did not start a character reference');
					}
					return $0;
				} else {
					if (strict) {
						parseError(
							'named character reference was not terminated by a semicolon'
						);
					}
					// Note: there is no need to check `has(decodeMapLegacy, reference)`.
					return decodeMapLegacy[reference] + (next || '');
				}
			}

			if ($4) {
				// Decode decimal escapes, e.g. `&#119558;`.
				decDigits = $4;
				semicolon = $5;
				if (strict && !semicolon) {
					parseError('character reference was not terminated by a semicolon');
				}
				codePoint = parseInt(decDigits, 10);
				return codePointToSymbol(codePoint, strict);
			}

			if ($6) {
				// Decode hexadecimal escapes, e.g. `&#x1D306;`.
				hexDigits = $6;
				semicolon = $7;
				if (strict && !semicolon) {
					parseError('character reference was not terminated by a semicolon');
				}
				codePoint = parseInt(hexDigits, 16);
				return codePointToSymbol(codePoint, strict);
			}

			// If we’re still here, `if ($7)` is implied; it’s an ambiguous
			// ampersand for sure. https://mths.be/notes/ambiguous-ampersands
			if (strict) {
				parseError(
					'named character reference was not terminated by a semicolon'
				);
			}
			return $0;
		});
	};
	// Expose default options (so they can be overridden globally).
	decode.options = {
		'isAttributeValue': false,
		'strict': false
	};

	var escape = function(string) {
		return string.replace(regexEscape, function($0) {
			// Note: there is no need to check `has(escapeMap, $0)` here.
			return escapeMap[$0];
		});
	};

	/*--------------------------------------------------------------------------*/

	var he = {
		'version': '1.2.0',
		'encode': encode,
		'decode': decode,
		'escape': escape,
		'unescape': decode
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		true
	) {
		!(__WEBPACK_AMD_DEFINE_RESULT__ = (function() {
			return he;
		}).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}	else { var key; }

}(this));

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/module.js */ "../node_modules/webpack/buildin/module.js")(module), __webpack_require__(/*! ./../webpack/buildin/global.js */ "../node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "../node_modules/unicode2latex/index.js":
/*!**********************************************!*\
  !*** ../node_modules/unicode2latex/index.js ***!
  \**********************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = {
  ascii: __webpack_require__(/*! ./tables/ascii.json */ "../node_modules/unicode2latex/tables/ascii.json"),
  unicode: __webpack_require__(/*! ./tables/unicode.json */ "../node_modules/unicode2latex/tables/unicode.json"),
};


/***/ }),

/***/ "../node_modules/unicode2latex/tables/ascii.json":
/*!*******************************************************!*\
  !*** ../node_modules/unicode2latex/tables/ascii.json ***!
  \*******************************************************/
/*! exports provided: _, {, }, &, #, %, ^, <, >, ~, $, \,  , ¡, ¢, £, ¤, ¥, ¦, §, ¨, ©, ª, «, ¬, ­, ®, ¯, °, ±, ², ³, ´, µ, ¶, ·, ¸, ¹, º, », ¼, ½, ¾, ¿, À, Á, Â, Ã, Ä, Å, Æ, Ç, È, É, Ê, Ë, Ì, Í, Î, Ï, Ð, Ñ, Ò, Ó, Ô, Õ, Ö, ×, Ø, Ù, Ú, Û, Ü, Ý, Þ, ß, à, á, â, ã, ä, å, æ, ç, è, é, ê, ë, ì, í, î, ï, ð, ñ, ò, ó, ô, õ, ö, ÷, ø, ù, ú, û, ü, ý, þ, ÿ, Ā, ā, Ă, ă, Ą, ą, Ć, ć, Ĉ, ĉ, Ċ, ċ, Č, č, Ď, ď, Đ, đ, Ē, ē, Ĕ, ĕ, Ė, ė, Ę, ę, Ě, ě, Ĝ, ĝ, Ğ, ğ, Ġ, ġ, Ģ, ģ, Ĥ, ĥ, Ħ, ħ, Ĩ, ĩ, Ī, ī, Ĭ, ĭ, Į, į, İ, ı, Ĳ, ĳ, Ĵ, ĵ, Ķ, ķ, ĸ, Ĺ, ĺ, Ļ, ļ, Ľ, ľ, Ŀ, ŀ, Ł, ł, Ń, ń, Ņ, ņ, Ň, ň, ŉ, Ŋ, ŋ, Ō, ō, Ŏ, ŏ, Ő, ő, Œ, œ, Ŕ, ŕ, Ŗ, ŗ, Ř, ř, Ś, ś, Ŝ, ŝ, Ş, ş, Š, š, Ţ, ţ, Ť, ť, Ŧ, ŧ, Ũ, ũ, Ū, ū, Ŭ, ŭ, Ů, ů, Ű, ű, Ų, ų, Ŵ, ŵ, Ŷ, ŷ, Ÿ, Ź, ź, Ż, ż, Ž, ž, ſ, ƒ, ƕ, ƞ, ƪ, Ƶ, ƺ, ǂ, Ǎ, ǎ, Ǐ, ǐ, Ǒ, ǒ, Ǔ, ǔ, Ǧ, ǧ, Ǩ, ǩ, Ǫ, ǫ, ǰ, Ǵ, ǵ, ȷ, ɐ, ɒ, ɔ, ɖ, ɘ, ə, ɛ, ɡ, ɣ, ɤ, ɥ, ɬ, ɭ, ɯ, ɰ, ɱ, ɲ, ɳ, ɷ, ɸ, ɹ, ɺ, ɻ, ɼ, ɽ, ɾ, ɿ, ʂ, ʃ, ʇ, ʈ, ʊ, ʋ, ʌ, ʍ, ʎ, ʐ, ʒ, ʔ, ʕ, ʖ, ʞ, ʤ, ʧ, ʹ, ʻ, ʼ, ʽ, ˆ, ˇ, ˈ, ˉ, ˌ, ː, ˑ, ˒, ˓, ˔, ˕, ˘, ˙, ˚, ˛, ˜, ˝, ˥, ˦, ˧, ˨, ˩, ̀, ́, ̂, ̃, ̄, ̅, ̆, ̇, ̈, ̉, ̊, ̋, ̌, ̏, ̐, ̑, ̒, ̕, ̘, ̙, ̚, ̡, ̢, ̧, ̨, ̪, ̫, ̯, ̰, ̱, ̲, ̵, ̶, ̷, ̸, ̺, ̻, ̼, ̽, ͡, ʹ, ͵, ;, Ά, Έ, Ή, Ί, Ό, Ύ, Ώ, ΐ, Α, Β, Γ, Δ, Ε, Ζ, Η, Θ, Ι, Κ, Λ, Μ, Ν, Ξ, Ο, Π, Ρ, Σ, Τ, Υ, Φ, Χ, Ψ, Ω, Ϊ, Ϋ, ά, έ, ή, ί, ΰ, α, β, γ, δ, ε, ζ, η, θ, ι, κ, λ, μ, ν, ξ, ο, π, ρ, ς, σ, τ, υ, φ, χ, ψ, ω, ϊ, ϋ, ό, ύ, ώ, ϐ, ϑ, ϒ, ϕ, ϖ, Ϙ, ϙ, Ϛ, ϛ, Ϝ, ϝ, Ϟ, ϟ, Ϡ, ϡ, ϰ, ϱ, ϴ, ϵ, ϶, Ё, Ђ, Ѓ, Є, Ѕ, І, Ї, Ј, Љ, Њ, Ћ, Ќ, Ў, Џ, А, Б, В, Г, Д, Е, Ж, З, И, Й, К, Л, М, Н, О, П, Р, С, Т, У, Ф, Х, Ц, Ч, Ш, Щ, Ъ, Ы, Ь, Э, Ю, Я, а, б, в, г, д, е, ж, з, и, й, к, л, м, н, о, п, р, с, т, у, ф, х, ц, ч, ш, щ, ъ, ы, ь, э, ю, я, ё, ђ, ѓ, є, ѕ, і, ї, ј, љ, њ, ћ, ќ, ў, џ, Ѡ, ѡ, Ѣ, Ѥ, ѥ, Ѧ, ѧ, Ѩ, ѩ, Ѫ, Ѭ, ѭ, Ѯ, ѯ, Ѱ, ѱ, Ѳ, Ѵ, Ѹ, ѹ, Ѻ, ѻ, Ѽ, ѽ, Ѿ, ѿ, Ҁ, ҁ, ҂, ҈, ҉, Ҍ, ҍ, Ҏ, ҏ, Ґ, ґ, Ғ, ғ, Ҕ, ҕ, Җ, җ, Ҙ, ҙ, Қ, қ, Ҝ, ҝ, Ҟ, ҟ, Ҡ, ҡ, Ң, ң, Ҥ, ҥ, Ҧ, ҧ, Ҩ, ҩ, Ҫ, ҫ, Ҭ, ҭ, Ү, ү, Ұ, ұ, Ҳ, ҳ, Ҵ, ҵ, Ҷ, ҷ, Ҹ, ҹ, Һ, һ, Ҽ, ҽ, Ҿ, ҿ, Ӏ, Ӄ, ӄ, Ӈ, ӈ, Ӌ, ӌ, Ӕ, ӕ, Ә, ә, Ӡ, ӡ, Ө, ө, ࡱ, Ḃ, ḃ, Ḅ, ḅ, Ḇ, ḇ, Ḋ, ḋ, Ḍ, ḍ, Ḏ, ḏ, Ḑ, ḑ, Ḟ, ḟ, Ḡ, ḡ, Ḣ, ḣ, Ḥ, ḥ, Ḧ, ḧ, Ḩ, ḩ, Ḱ, ḱ, Ḳ, ḳ, Ḵ, ḵ, Ḷ, ḷ, Ḻ, ḻ, Ḿ, ḿ, Ṁ, ṁ, Ṃ, ṃ, Ṅ, ṅ, Ṇ, ṇ, Ṉ, ṉ, Ṕ, ṕ, Ṗ, ṗ, Ṙ, ṙ, Ṛ, ṛ, Ṟ, ṟ, Ṡ, ṡ, Ṣ, ṣ, Ṫ, ṫ, Ṭ, ṭ, Ṯ, ṯ, Ṽ, ṽ, Ṿ, ṿ, Ẁ, ẁ, Ẃ, ẃ, Ẅ, ẅ, Ẇ, ẇ, Ẉ, ẉ, Ẋ, ẋ, Ẍ, ẍ, Ẏ, ẏ, Ẑ, ẑ, Ẓ, ẓ, Ẕ, ẕ, ẖ, ẗ, ẘ, ẙ, Ạ, ạ, Ẹ, ẹ, Ẽ, ẽ, Ị, ị, Ọ, ọ, Ụ, ụ, Ỳ, ỳ, Ỵ, ỵ, Ỹ, ỹ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  , ​, ‌, ‐, ‑, ‒, –, —, ―, ‖, ‗, ‘, ’, ‚, ‛, “, ”, „, ‟, †, ‡, •, ‣, ․, ‥, …, ‧,  , ‰, ‱, ′, ″, ‴, ‵, ‶, ‷, ‸, ‹, ›, ‼, ‾, ⁃, ⁄, ⁇, ⁈, ⁉, ⁊, ⁐, ⁗,  , ⁠, ⁰, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁺, ⁻, ⁼, ⁽, ⁾, ⁿ, ⁱ, ᵃ, ᵇ, ᶜ, ᵈ, ᵉ, ᶠ, ᵍ, ʰ, ʲ, ᵏ, ˡ, ᵐ, ᵒ, ᵖ, ʳ, ˢ, ᵗ, ᵘ, ᵛ, ʷ, ˣ, ʸ, ᶻ, ₀, ₁, ₂, ₃, ₄, ₅, ₆, ₇, ₈, ₉, ₊, ₋, ₌, ₍, ₎, ₐ, ₑ, ₒ, ₓ, ₔ, ₕ, ₖ, ₗ, ₘ, ₙ, ₚ, ₛ, ₜ, ₧, €, ⃐, ⃑, ⃒, ⃖, ⃗, ⃛, ⃜, ⃝, ⃞, ⃟, ⃡, ⃤, ⃧, ⃨, ⃩, ⃬, ⃭, ⃮, ⃯, ⃰, ℀, ℁, ℂ, ℃, ℅, ℆, ℇ, ℉, ℊ, ℋ, ℌ, ℍ, ℎ, ℏ, ℐ, ℑ, ℒ, ℓ, ℕ, №, ℗, ℘, ℙ, ℚ, ℛ, ℜ, ℝ, ℞, ℠, ℡, ™, ℤ, Ω, ℧, ℨ, ℩, K, Å, ℬ, ℭ, ℮, ℯ, ℰ, ℱ, Ⅎ, ℳ, ℴ, ℵ, ℶ, ℷ, ℸ, ℼ, ℽ, ℾ, ℿ, ⅀, ⅁, ⅂, ⅃, ⅄, ⅅ, ⅆ, ⅇ, ⅈ, ⅉ, ⅊, ⅋, ⅓, ⅔, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅛, ⅜, ⅝, ⅞, ⅟, Ⅰ, Ⅱ, Ⅲ, Ⅳ, Ⅴ, Ⅵ, Ⅶ, Ⅷ, Ⅸ, Ⅹ, Ⅺ, Ⅻ, Ⅼ, Ⅽ, Ⅾ, Ⅿ, ⅰ, ⅱ, ⅲ, ⅳ, ⅴ, ⅵ, ⅶ, ⅷ, ⅸ, ⅹ, ⅺ, ⅻ, ⅼ, ⅽ, ⅾ, ⅿ, ←, ↑, →, ↓, ↔, ↕, ↖, ↗, ↘, ↙, ↚, ↛, ↜, ↝, ↞, ↟, ↠, ↡, ↢, ↣, ↤, ↥, ↦, ↧, ↨, ↩, ↪, ↫, ↬, ↭, ↮, ↯, ↰, ↱, ↲, ↳, ↴, ↵, ↶, ↷, ↸, ↹, ↺, ↻, ↼, ↽, ↾, ↿, ⇀, ⇁, ⇂, ⇃, ⇄, ⇅, ⇆, ⇇, ⇈, ⇉, ⇊, ⇋, ⇌, ⇍, ⇎, ⇏, ⇐, ⇑, ⇒, ⇓, ⇔, ⇕, ⇖, ⇗, ⇘, ⇙, ⇚, ⇛, ⇜, ⇝, ⇞, ⇟, ⇠, ⇡, ⇢, ⇣, ⇤, ⇥, ⇦, ⇧, ⇨, ⇩, ⇪, ⇴, ⇵, ⇶, ⇷, ⇸, ⇹, ⇺, ⇻, ⇼, ⇽, ⇾, ⇿, ∀, ∁, ∂, ∃, ∄, ∅, ∆, ∇, ∈, ∉, ∊, ∋, ∌, ∍, ∎, ∏, ∐, ∑, −, ∓, ∔, ∕, ∖, ∗, ∘, ∙, √, ∛, ∜, ∝, ∞, ∟, ∠, ∡, ∢, ∣, ∤, ∥, ∦, ∧, ∨, ∩, ∪, ∫, ∬, ∭, ∮, ∯, ∰, ∱, ∲, ∳, ∴, ∵, ∶, ∷, ∸, ∹, ∺, ∻, ∼, ∽, ∾, ∿, ≀, ≁, ≂, ≃, ≄, ≅, ≆, ≇, ≈, ≉, ≊, ≋, ≌, ≍, ≎, ≏, ≐, ≑, ≒, ≓, ≔, ≕, ≖, ≗, ≘, ≙, ≚, ≛, ≜, ≝, ≞, ≟, ≠, ≡, ≢, ≣, ≤, ≥, ≦, ≧, ≨, ≩, ≪, ≫, ≬, ≭, ≮, ≯, ≰, ≱, ≲, ≳, ≴, ≵, ≶, ≷, ≸, ≹, ≺, ≻, ≼, ≽, ≾, ≿, ⊀, ⊁, ⊂, ⊃, ⊄, ⊅, ⊆, ⊇, ⊈, ⊉, ⊊, ⊋, ⊌, ⊍, ⊎, ⊏, ⊐, ⊑, ⊒, ⊓, ⊔, ⊕, ⊖, ⊗, ⊘, ⊙, ⊚, ⊛, ⊜, ⊝, ⊞, ⊟, ⊠, ⊡, ⊢, ⊣, ⊤, ⊥, ⊦, ⊧, ⊨, ⊩, ⊪, ⊫, ⊬, ⊭, ⊮, ⊯, ⊰, ⊱, ⊲, ⊳, ⊴, ⊵, ⊶, ⊷, ⊸, ⊹, ⊺, ⊻, ⊼, ⊽, ⊾, ⊿, ⋀, ⋁, ⋂, ⋃, ⋄, ⋅, ⋆, ⋇, ⋈, ⋉, ⋊, ⋋, ⋌, ⋍, ⋎, ⋏, ⋐, ⋑, ⋒, ⋓, ⋔, ⋕, ⋖, ⋗, ⋘, ⋙, ⋚, ⋛, ⋜, ⋝, ⋞, ⋟, ⋠, ⋡, ⋢, ⋣, ⋤, ⋥, ⋦, ⋧, ⋨, ⋩, ⋪, ⋫, ⋬, ⋭, ⋮, ⋯, ⋰, ⋱, ⋲, ⋳, ⋴, ⋵, ⋶, ⋷, ⋸, ⋹, ⋺, ⋻, ⋼, ⋽, ⋾, ⋿, ⌀, ⌂, ⌅, ⌆, ⌈, ⌉, ⌊, ⌋, ⌐, ⌑, ⌒, ⌓, ⌕, ⌖, ⌗, ⌙, ⌜, ⌝, ⌞, ⌟, ⌠, ⌡, ⌢, ⌣, 〈, 〉, ⌬, ⌲, ⌶, ⌹, ⌽, ⌿, ⍀, ⍇, ⍈, ⍉, ⍐, ⍓, ⍗, ⍝, ⍞, ⍟, ⍰, ⍼, ⎔, ⎛, ⎜, ⎝, ⎞, ⎟, ⎠, ⎡, ⎢, ⎣, ⎤, ⎥, ⎦, ⎧, ⎨, ⎩, ⎪, ⎫, ⎬, ⎭, ⎮, ⎯, ⎰, ⎱, ⎲, ⎳, ⎴, ⎵, ⎶, ⎷, ⎸, ⎹, ⏎, ⏜, ⏝, ⏞, ⏟, ⏠, ⏡, ⏢, ⏣, ⏤, ⏥, ⏦, ⏧, ␀, ␁, ␂, ␃, ␄, ␅, ␆, ␇, ␈, ␉, ␊, ␋, ␌, ␍, ␎, ␏, ␐, ␑, ␒, ␓, ␔, ␕, ␖, ␗, ␘, ␙, ␚, ␛, ␜, ␝, ␞, ␟, ␠, ␡, ␣, ␤, ␥, ␦, ①, ②, ③, ④, ⑤, ⑥, ⑦, ⑧, ⑨, ⑩, ⑪, ⑫, ⑬, ⑭, ⑮, ⑯, ⑰, ⑱, ⑲, ⑳, ⑴, ⑵, ⑶, ⑷, ⑸, ⑹, ⑺, ⑻, ⑼, ⑽, ⑾, ⑿, ⒀, ⒁, ⒂, ⒃, ⒄, ⒅, ⒆, ⒇, ⒈, ⒉, ⒊, ⒋, ⒌, ⒍, ⒎, ⒏, ⒐, ⒑, ⒒, ⒓, ⒔, ⒕, ⒖, ⒗, ⒘, ⒙, ⒚, ⒛, ⒜, ⒝, ⒞, ⒟, ⒠, ⒡, ⒢, ⒣, ⒤, ⒥, ⒦, ⒧, ⒨, ⒩, ⒪, ⒫, ⒬, ⒭, ⒮, ⒯, ⒰, ⒱, ⒲, ⒳, ⒴, ⒵, Ⓐ, Ⓑ, Ⓒ, Ⓓ, Ⓔ, Ⓕ, Ⓖ, Ⓗ, Ⓘ, Ⓙ, Ⓚ, Ⓛ, Ⓜ, Ⓝ, Ⓞ, Ⓟ, Ⓠ, Ⓡ, Ⓢ, Ⓣ, Ⓤ, Ⓥ, Ⓦ, Ⓧ, Ⓨ, Ⓩ, ⓐ, ⓑ, ⓒ, ⓓ, ⓔ, ⓕ, ⓖ, ⓗ, ⓘ, ⓙ, ⓚ, ⓛ, ⓜ, ⓝ, ⓞ, ⓟ, ⓠ, ⓡ, ⓢ, ⓣ, ⓤ, ⓥ, ⓦ, ⓧ, ⓨ, ⓩ, ⓪, ─, ━, │, ┃, ┄, ┅, ┆, ┇, ┈, ┉, ┊, ┋, ┌, ┍, ┎, ┏, ┐, ┑, ┒, ┓, └, ┕, ┖, ┗, ┘, ┙, ┚, ┛, ├, ┝, ┞, ┟, ┠, ┡, ┢, ┣, ┤, ┥, ┦, ┧, ┨, ┩, ┪, ┫, ┬, ┭, ┮, ┯, ┰, ┱, ┲, ┳, ┴, ┵, ┶, ┷, ┸, ┹, ┺, ┻, ┼, ┽, ┾, ┿, ╀, ╁, ╂, ╃, ╄, ╅, ╆, ╇, ╈, ╉, ╊, ╋, ╌, ╍, ╎, ╏, ═, ║, ╒, ╓, ╔, ╕, ╖, ╗, ╘, ╙, ╚, ╛, ╜, ╝, ╞, ╟, ╠, ╡, ╢, ╣, ╤, ╥, ╦, ╧, ╨, ╩, ╪, ╫, ╬, ╭, ╮, ╯, ╰, ╱, ╲, ╳, ╼, ╽, ╾, ╿, ▀, ▄, █, ▌, ▐, ░, ▒, ▓, ■, □, ▢, ▣, ▤, ▥, ▦, ▧, ▨, ▩, ▪, ▫, ▬, ▭, ▮, ▯, ▰, ▱, ▲, △, ▴, ▵, ▶, ▷, ▸, ▹, ►, ▻, ▼, ▽, ▾, ▿, ◀, ◁, ◂, ◃, ◄, ◅, ◆, ◇, ◈, ◉, ◊, ○, ◌, ◍, ◎, ●, ◐, ◑, ◒, ◓, ◔, ◕, ◖, ◗, ◘, ◙, ◚, ◛, ◜, ◝, ◞, ◟, ◠, ◡, ◢, ◣, ◤, ◥, ◦, ◧, ◨, ◩, ◪, ◫, ◬, ◭, ◮, ◯, ◰, ◱, ◲, ◳, ◴, ◵, ◶, ◷, ◸, ◹, ◺, ◻, ◼, ◽, ◾, ◿, ★, ☆, ☉, ☎, ☐, ☑, ☒, ☓, ☕, ☛, ☞, ☠, ☡, ☢, ☣, ☯, ☹, ☺, ☻, ☼, ☽, ☾, ☿, ♀, ♁, ♂, ♃, ♄, ♅, ♆, ♇, ♈, ♉, ♊, ♋, ♌, ♍, ♎, ♏, ♐, ♑, ♒, ♓, ♠, ♡, ♢, ♣, ♤, ♥, ♦, ♧, ♩, ♪, ♫, ♬, ♭, ♮, ♯, ♻, ♾, ⚀, ⚁, ⚂, ⚃, ⚄, ⚅, ⚆, ⚇, ⚈, ⚉, ⚓, ⚔, ⚠, ⚥, ⚪, ⚫, ⚬, ⚲, ✁, ✂, ✃, ✄, ✆, ✇, ✈, ✉, ✌, ✍, ✎, ✏, ✐, ✑, ✒, ✓, ✔, ✕, ✖, ✗, ✘, ✙, ✚, ✛, ✜, ✝, ✞, ✟, ✠, ✡, ✢, ✣, ✤, ✥, ✦, ✧, ✩, ✪, ✫, ✬, ✭, ✮, ✯, ✰, ✱, ✲, ✳, ✴, ✵, ✶, ✷, ✸, ✹, ✺, ✻, ✼, ✽, ✾, ✿, ❀, ❁, ❂, ❃, ❄, ❅, ❆, ❇, ❈, ❉, ❊, ❋, ❍, ❏, ❐, ❑, ❒, ❖, ❘, ❙, ❚, ❛, ❜, ❝, ❞, ❡, ❢, ❣, ❤, ❥, ❦, ❧, ❲, ❳, ❶, ❷, ❸, ❹, ❺, ❻, ❼, ❽, ❾, ❿, ➀, ➁, ➂, ➃, ➄, ➅, ➆, ➇, ➈, ➉, ➊, ➋, ➌, ➍, ➎, ➏, ➐, ➑, ➒, ➓, ➔, ➘, ➙, ➚, ➛, ➜, ➝, ➞, ➟, ➠, ➡, ➢, ➣, ➤, ➥, ➦, ➧, ➨, ➩, ➪, ➫, ➬, ➭, ➮, ➯, ➱, ➲, ➳, ➴, ➵, ➶, ➷, ➸, ➹, ➺, ➻, ➼, ➽, ➾, ⟀, ⟁, ⟂, ⟃, ⟄, ⟅, ⟆, ⟇, ⟈, ⟉, ⟌, ⟐, ⟑, ⟒, ⟓, ⟔, ⟕, ⟖, ⟗, ⟘, ⟙, ⟚, ⟛, ⟜, ⟝, ⟞, ⟟, ⟠, ⟡, ⟢, ⟣, ⟤, ⟥, ⟦, ⟧, ⟨, ⟩, ⟪, ⟫, ⟬, ⟭, ⟮, ⟯, ⟰, ⟱, ⟲, ⟳, ⟴, ⟵, ⟶, ⟷, ⟸, ⟹, ⟺, ⟻, ⟼, ⟽, ⟾, ⟿, ⤀, ⤁, ⤂, ⤃, ⤄, ⤅, ⤆, ⤇, ⤈, ⤉, ⤊, ⤋, ⤌, ⤍, ⤎, ⤏, ⤐, ⤑, ⤒, ⤓, ⤔, ⤕, ⤖, ⤗, ⤘, ⤙, ⤚, ⤛, ⤜, ⤝, ⤞, ⤟, ⤠, ⤡, ⤢, ⤣, ⤤, ⤥, ⤦, ⤧, ⤨, ⤩, ⤪, ⤫, ⤬, ⤭, ⤮, ⤯, ⤰, ⤱, ⤲, ⤳, ⤴, ⤵, ⤶, ⤷, ⤸, ⤹, ⤺, ⤻, ⤼, ⤽, ⤾, ⤿, ⥀, ⥁, ⥂, ⥃, ⥄, ⥅, ⥆, ⥇, ⥈, ⥉, ⥊, ⥋, ⥌, ⥍, ⥎, ⥏, ⥐, ⥑, ⥒, ⥓, ⥔, ⥕, ⥖, ⥗, ⥘, ⥙, ⥚, ⥛, ⥜, ⥝, ⥞, ⥟, ⥠, ⥡, ⥢, ⥣, ⥤, ⥥, ⥦, ⥧, ⥨, ⥩, ⥪, ⥫, ⥬, ⥭, ⥮, ⥯, ⥰, ⥱, ⥲, ⥳, ⥴, ⥵, ⥶, ⥷, ⥸, ⥹, ⥺, ⥻, ⥼, ⥽, ⥾, ⥿, ⦀, ⦁, ⦂, ⦃, ⦄, ⦅, ⦆, ⦇, ⦈, ⦉, ⦊, ⦋, ⦌, ⦍, ⦎, ⦏, ⦐, ⦑, ⦒, ⦓, ⦔, ⦕, ⦖, ⦗, ⦘, ⦙, ⦚, ⦛, ⦜, ⦝, ⦞, ⦟, ⦠, ⦡, ⦢, ⦣, ⦤, ⦥, ⦦, ⦧, ⦨, ⦩, ⦪, ⦫, ⦬, ⦭, ⦮, ⦯, ⦰, ⦱, ⦲, ⦳, ⦴, ⦵, ⦶, ⦷, ⦸, ⦹, ⦺, ⦻, ⦼, ⦽, ⦾, ⦿, ⧀, ⧁, ⧂, ⧃, ⧄, ⧅, ⧆, ⧇, ⧈, ⧉, ⧊, ⧋, ⧌, ⧍, ⧎, ⧏, ⧐, ⧑, ⧒, ⧓, ⧔, ⧕, ⧖, ⧗, ⧘, ⧙, ⧚, ⧛, ⧜, ⧝, ⧞, ⧟, ⧠, ⧡, ⧢, ⧣, ⧤, ⧥, ⧦, ⧧, ⧨, ⧩, ⧪, ⧫, ⧬, ⧭, ⧮, ⧯, ⧰, ⧱, ⧲, ⧳, ⧴, ⧵, ⧶, ⧷, ⧸, ⧹, ⧺, ⧻, ⧼, ⧽, ⧾, ⧿, ⨀, ⨁, ⨂, ⨃, ⨄, ⨅, ⨆, ⨇, ⨈, ⨉, ⨊, ⨋, ⨌, ⨍, ⨎, ⨏, ⨐, ⨑, ⨒, ⨓, ⨔, ⨕, ⨖, ⨗, ⨘, ⨙, ⨚, ⨛, ⨜, ⨝, ⨞, ⨟, ⨠, ⨡, ⨢, ⨣, ⨤, ⨥, ⨦, ⨧, ⨨, ⨩, ⨪, ⨫, ⨬, ⨭, ⨮, ⨯, ⨰, ⨱, ⨲, ⨳, ⨴, ⨵, ⨶, ⨷, ⨸, ⨹, ⨺, ⨻, ⨼, ⨽, ⨾, ⨿, ⩀, ⩁, ⩂, ⩃, ⩄, ⩅, ⩆, ⩇, ⩈, ⩉, ⩊, ⩋, ⩌, ⩍, ⩎, ⩏, ⩐, ⩑, ⩒, ⩓, ⩔, ⩕, ⩖, ⩗, ⩘, ⩙, ⩚, ⩛, ⩜, ⩝, ⩞, ⩟, ⩠, ⩡, ⩢, ⩣, ⩤, ⩥, ⩦, ⩧, ⩨, ⩩, ⩪, ⩫, ⩬, ⩭, ⩮, ⩯, ⩰, ⩱, ⩲, ⩳, ⩴, ⩵, ⩶, ⩷, ⩸, ⩹, ⩺, ⩻, ⩼, ⩽, ⩾, ⩿, ⪀, ⪁, ⪂, ⪃, ⪄, ⪅, ⪆, ⪇, ⪈, ⪉, ⪊, ⪋, ⪌, ⪍, ⪎, ⪏, ⪐, ⪑, ⪒, ⪓, ⪔, ⪕, ⪖, ⪗, ⪘, ⪙, ⪚, ⪛, ⪜, ⪝, ⪞, ⪟, ⪠, ⪡, ⪢, ⪣, ⪤, ⪥, ⪦, ⪧, ⪨, ⪩, ⪪, ⪫, ⪬, ⪭, ⪮, ⪯, ⪰, ⪱, ⪲, ⪳, ⪴, ⪵, ⪶, ⪷, ⪸, ⪹, ⪺, ⪻, ⪼, ⪽, ⪾, ⪿, ⫀, ⫁, ⫂, ⫃, ⫄, ⫅, ⫆, ⫇, ⫈, ⫉, ⫊, ⫋, ⫌, ⫍, ⫎, ⫏, ⫐, ⫑, ⫒, ⫓, ⫔, ⫕, ⫖, ⫗, ⫘, ⫙, ⫚, ⫛, ⫝̸, ⫝, ⫞, ⫟, ⫠, ⫡, ⫢, ⫣, ⫤, ⫥, ⫦, ⫧, ⫨, ⫩, ⫪, ⫫, ⫬, ⫭, ⫮, ⫯, ⫰, ⫱, ⫲, ⫳, ⫴, ⫵, ⫶, ⫷, ⫸, ⫹, ⫺, ⫻, ⫼, ⫽, ⫾, ⫿, ⬒, ⬓, ⬔, ⬕, ⬖, ⬗, ⬘, ⬙, ⬚, ⬛, ⬜, ⬝, ⬞, ⬟, ⬠, ⬡, ⬢, ⬣, ⬤, ⬥, ⬦, ⬧, ⬨, ⬩, ⬪, ⬫, ⬬, ⬭, ⬮, ⬯, ⬰, ⬱, ⬲, ⬳, ⬴, ⬵, ⬶, ⬷, ⬸, ⬹, ⬺, ⬻, ⬼, ⬽, ⬾, ⬿, ⭀, ⭁, ⭂, ⭃, ⭄, ⭅, ⭆, ⭇, ⭈, ⭉, ⭊, ⭋, ⭌, ⭐, ⭑, ⭒, ⭓, ⭔, 〈, 〉, 《, 》, 〒, 〔, 〕, 〘, 〙, 〚, 〛, 〰, ﬀ, ﬁ, ﬂ, ﬃ, ﬄ, ﬅ, ﬆ, �, ≂̸, ≋̸, ≎̸, ≏̸, ≐̸, ≨︀, ≩︀, ≪̸, ≫̸, ≾̸, ≿̸, ⊊︀, ⊋︀, ⊏̸, ⊐̸, ⤳̸, ⧏̸, ⧐̸, ⩽̸, ⩾̸, ⪡̸, ⪢̸, ⪯̸, ⪰̸, ⫅̸, ⫆̸, ⫝̸, ⫽⃥, 𝐀, 𝐁, 𝐂, 𝐃, 𝐄, 𝐅, 𝐆, 𝐇, 𝐈, 𝐉, 𝐊, 𝐋, 𝐌, 𝐍, 𝐎, 𝐏, 𝐐, 𝐑, 𝐒, 𝐓, 𝐔, 𝐕, 𝐖, 𝐗, 𝐘, 𝐙, 𝐚, 𝐛, 𝐜, 𝐝, 𝐞, 𝐟, 𝐠, 𝐡, 𝐢, 𝐣, 𝐤, 𝐥, 𝐦, 𝐧, 𝐨, 𝐩, 𝐪, 𝐫, 𝐬, 𝐭, 𝐮, 𝐯, 𝐰, 𝐱, 𝐲, 𝐳, 𝐴, 𝐵, 𝐶, 𝐷, 𝐸, 𝐹, 𝐺, 𝐻, 𝐼, 𝐽, 𝐾, 𝐿, 𝑀, 𝑁, 𝑂, 𝑃, 𝑄, 𝑅, 𝑆, 𝑇, 𝑈, 𝑉, 𝑊, 𝑋, 𝑌, 𝑍, 𝑎, 𝑏, 𝑐, 𝑑, 𝑒, 𝑓, 𝑔, 𝑖, 𝑗, 𝑘, 𝑙, 𝑚, 𝑛, 𝑜, 𝑝, 𝑞, 𝑟, 𝑠, 𝑡, 𝑢, 𝑣, 𝑤, 𝑥, 𝑦, 𝑧, 𝑨, 𝑩, 𝑪, 𝑫, 𝑬, 𝑭, 𝑮, 𝑯, 𝑰, 𝑱, 𝑲, 𝑳, 𝑴, 𝑵, 𝑶, 𝑷, 𝑸, 𝑹, 𝑺, 𝑻, 𝑼, 𝑽, 𝑾, 𝑿, 𝒀, 𝒁, 𝒂, 𝒃, 𝒄, 𝒅, 𝒆, 𝒇, 𝒈, 𝒉, 𝒊, 𝒋, 𝒌, 𝒍, 𝒎, 𝒏, 𝒐, 𝒑, 𝒒, 𝒓, 𝒔, 𝒕, 𝒖, 𝒗, 𝒘, 𝒙, 𝒚, 𝒛, 𝒜, 𝒞, 𝒟, 𝒢, 𝒥, 𝒦, 𝒩, 𝒪, 𝒫, 𝒬, 𝒮, 𝒯, 𝒰, 𝒱, 𝒲, 𝒳, 𝒴, 𝒵, 𝒶, 𝒷, 𝒸, 𝒹, 𝒻, 𝒽, 𝒾, 𝒿, 𝓀, 𝓁, 𝓂, 𝓃, 𝓅, 𝓆, 𝓇, 𝓈, 𝓉, 𝓊, 𝓋, 𝓌, 𝓍, 𝓎, 𝓏, 𝓐, 𝓑, 𝓒, 𝓓, 𝓔, 𝓕, 𝓖, 𝓗, 𝓘, 𝓙, 𝓚, 𝓛, 𝓜, 𝓝, 𝓞, 𝓟, 𝓠, 𝓡, 𝓢, 𝓣, 𝓤, 𝓥, 𝓦, 𝓧, 𝓨, 𝓩, 𝓪, 𝓫, 𝓬, 𝓭, 𝓮, 𝓯, 𝓰, 𝓱, 𝓲, 𝓳, 𝓴, 𝓵, 𝓶, 𝓷, 𝓸, 𝓹, 𝓺, 𝓻, 𝓼, 𝓽, 𝓾, 𝓿, 𝔀, 𝔁, 𝔂, 𝔃, 𝔄, 𝔅, 𝔇, 𝔈, 𝔉, 𝔊, 𝔍, 𝔎, 𝔏, 𝔐, 𝔑, 𝔒, 𝔓, 𝔔, 𝔖, 𝔗, 𝔘, 𝔙, 𝔚, 𝔛, 𝔜, 𝔞, 𝔟, 𝔠, 𝔡, 𝔢, 𝔣, 𝔤, 𝔥, 𝔦, 𝔧, 𝔨, 𝔩, 𝔪, 𝔫, 𝔬, 𝔭, 𝔮, 𝔯, 𝔰, 𝔱, 𝔲, 𝔳, 𝔴, 𝔵, 𝔶, 𝔷, 𝔸, 𝔹, 𝔻, 𝔼, 𝔽, 𝔾, 𝕀, 𝕁, 𝕂, 𝕃, 𝕄, 𝕆, 𝕊, 𝕋, 𝕌, 𝕍, 𝕎, 𝕏, 𝕐, 𝕒, 𝕓, 𝕔, 𝕕, 𝕖, 𝕗, 𝕘, 𝕙, 𝕚, 𝕛, 𝕜, 𝕝, 𝕞, 𝕟, 𝕠, 𝕡, 𝕢, 𝕣, 𝕤, 𝕥, 𝕦, 𝕧, 𝕨, 𝕩, 𝕪, 𝕫, 𝕬, 𝕭, 𝕮, 𝕯, 𝕰, 𝕱, 𝕲, 𝕳, 𝕴, 𝕵, 𝕶, 𝕷, 𝕸, 𝕹, 𝕺, 𝕻, 𝕼, 𝕽, 𝕾, 𝕿, 𝖀, 𝖁, 𝖂, 𝖃, 𝖄, 𝖅, 𝖆, 𝖇, 𝖈, 𝖉, 𝖊, 𝖋, 𝖌, 𝖍, 𝖎, 𝖏, 𝖐, 𝖑, 𝖒, 𝖓, 𝖔, 𝖕, 𝖖, 𝖗, 𝖘, 𝖙, 𝖚, 𝖛, 𝖜, 𝖝, 𝖞, 𝖟, 𝖠, 𝖡, 𝖢, 𝖣, 𝖤, 𝖥, 𝖦, 𝖧, 𝖨, 𝖩, 𝖪, 𝖫, 𝖬, 𝖭, 𝖮, 𝖯, 𝖰, 𝖱, 𝖲, 𝖳, 𝖴, 𝖵, 𝖶, 𝖷, 𝖸, 𝖹, 𝖺, 𝖻, 𝖼, 𝖽, 𝖾, 𝖿, 𝗀, 𝗁, 𝗂, 𝗃, 𝗄, 𝗅, 𝗆, 𝗇, 𝗈, 𝗉, 𝗊, 𝗋, 𝗌, 𝗍, 𝗎, 𝗏, 𝗐, 𝗑, 𝗒, 𝗓, 𝗔, 𝗕, 𝗖, 𝗗, 𝗘, 𝗙, 𝗚, 𝗛, 𝗜, 𝗝, 𝗞, 𝗟, 𝗠, 𝗡, 𝗢, 𝗣, 𝗤, 𝗥, 𝗦, 𝗧, 𝗨, 𝗩, 𝗪, 𝗫, 𝗬, 𝗭, 𝗮, 𝗯, 𝗰, 𝗱, 𝗲, 𝗳, 𝗴, 𝗵, 𝗶, 𝗷, 𝗸, 𝗹, 𝗺, 𝗻, 𝗼, 𝗽, 𝗾, 𝗿, 𝘀, 𝘁, 𝘂, 𝘃, 𝘄, 𝘅, 𝘆, 𝘇, 𝘈, 𝘉, 𝘊, 𝘋, 𝘌, 𝘍, 𝘎, 𝘏, 𝘐, 𝘑, 𝘒, 𝘓, 𝘔, 𝘕, 𝘖, 𝘗, 𝘘, 𝘙, 𝘚, 𝘛, 𝘜, 𝘝, 𝘞, 𝘟, 𝘠, 𝘡, 𝘢, 𝘣, 𝘤, 𝘥, 𝘦, 𝘧, 𝘨, 𝘩, 𝘪, 𝘫, 𝘬, 𝘭, 𝘮, 𝘯, 𝘰, 𝘱, 𝘲, 𝘳, 𝘴, 𝘵, 𝘶, 𝘷, 𝘸, 𝘹, 𝘺, 𝘻, 𝘼, 𝘽, 𝘾, 𝘿, 𝙀, 𝙁, 𝙂, 𝙃, 𝙄, 𝙅, 𝙆, 𝙇, 𝙈, 𝙉, 𝙊, 𝙋, 𝙌, 𝙍, 𝙎, 𝙏, 𝙐, 𝙑, 𝙒, 𝙓, 𝙔, 𝙕, 𝙖, 𝙗, 𝙘, 𝙙, 𝙚, 𝙛, 𝙜, 𝙝, 𝙞, 𝙟, 𝙠, 𝙡, 𝙢, 𝙣, 𝙤, 𝙥, 𝙦, 𝙧, 𝙨, 𝙩, 𝙪, 𝙫, 𝙬, 𝙭, 𝙮, 𝙯, 𝙰, 𝙱, 𝙲, 𝙳, 𝙴, 𝙵, 𝙶, 𝙷, 𝙸, 𝙹, 𝙺, 𝙻, 𝙼, 𝙽, 𝙾, 𝙿, 𝚀, 𝚁, 𝚂, 𝚃, 𝚄, 𝚅, 𝚆, 𝚇, 𝚈, 𝚉, 𝚊, 𝚋, 𝚌, 𝚍, 𝚎, 𝚏, 𝚐, 𝚑, 𝚒, 𝚓, 𝚔, 𝚕, 𝚖, 𝚗, 𝚘, 𝚙, 𝚚, 𝚛, 𝚜, 𝚝, 𝚞, 𝚟, 𝚠, 𝚡, 𝚢, 𝚣, 𝚤, 𝚥, 𝚨, 𝚩, 𝚪, 𝚫, 𝚬, 𝚭, 𝚮, 𝚯, 𝚰, 𝚱, 𝚲, 𝚳, 𝚴, 𝚵, 𝚶, 𝚷, 𝚸, 𝚹, 𝚺, 𝚻, 𝚼, 𝚽, 𝚾, 𝚿, 𝛀, 𝛁, 𝛂, 𝛃, 𝛄, 𝛅, 𝛆, 𝛇, 𝛈, 𝛉, 𝛊, 𝛋, 𝛌, 𝛍, 𝛎, 𝛏, 𝛐, 𝛑, 𝛒, 𝛓, 𝛔, 𝛕, 𝛖, 𝛗, 𝛘, 𝛙, 𝛚, 𝛛, 𝛜, 𝛝, 𝛞, 𝛟, 𝛠, 𝛡, 𝛢, 𝛣, 𝛤, 𝛥, 𝛦, 𝛧, 𝛨, 𝛩, 𝛪, 𝛫, 𝛬, 𝛭, 𝛮, 𝛯, 𝛰, 𝛱, 𝛲, 𝛳, 𝛴, 𝛵, 𝛶, 𝛷, 𝛸, 𝛹, 𝛺, 𝛻, 𝛼, 𝛽, 𝛾, 𝛿, 𝜀, 𝜁, 𝜂, 𝜃, 𝜄, 𝜅, 𝜆, 𝜇, 𝜈, 𝜉, 𝜊, 𝜋, 𝜌, 𝜍, 𝜎, 𝜏, 𝜐, 𝜑, 𝜒, 𝜓, 𝜔, 𝜕, 𝜖, 𝜗, 𝜘, 𝜙, 𝜚, 𝜛, 𝜜, 𝜝, 𝜞, 𝜟, 𝜠, 𝜡, 𝜢, 𝜣, 𝜤, 𝜥, 𝜦, 𝜧, 𝜨, 𝜩, 𝜪, 𝜫, 𝜬, 𝜭, 𝜮, 𝜯, 𝜰, 𝜱, 𝜲, 𝜳, 𝜴, 𝜵, 𝜶, 𝜷, 𝜸, 𝜹, 𝜺, 𝜻, 𝜼, 𝜽, 𝜾, 𝜿, 𝝀, 𝝁, 𝝂, 𝝃, 𝝄, 𝝅, 𝝆, 𝝇, 𝝈, 𝝉, 𝝊, 𝝋, 𝝌, 𝝍, 𝝎, 𝝏, 𝝐, 𝝑, 𝝒, 𝝓, 𝝔, 𝝕, 𝝖, 𝝗, 𝝘, 𝝙, 𝝚, 𝝛, 𝝜, 𝝝, 𝝞, 𝝟, 𝝠, 𝝡, 𝝢, 𝝣, 𝝤, 𝝥, 𝝦, 𝝧, 𝝨, 𝝩, 𝝪, 𝝫, 𝝬, 𝝭, 𝝮, 𝝯, 𝝰, 𝝱, 𝝲, 𝝳, 𝝴, 𝝵, 𝝶, 𝝷, 𝝸, 𝝹, 𝝺, 𝝻, 𝝼, 𝝽, 𝝾, 𝝿, 𝞀, 𝞁, 𝞂, 𝞃, 𝞄, 𝞅, 𝞆, 𝞇, 𝞈, 𝞉, 𝞊, 𝞋, 𝞌, 𝞍, 𝞎, 𝞏, 𝞐, 𝞑, 𝞒, 𝞓, 𝞔, 𝞕, 𝞖, 𝞗, 𝞘, 𝞙, 𝞚, 𝞛, 𝞜, 𝞝, 𝞞, 𝞟, 𝞠, 𝞡, 𝞢, 𝞣, 𝞤, 𝞥, 𝞦, 𝞧, 𝞨, 𝞩, 𝞪, 𝞫, 𝞬, 𝞭, 𝞮, 𝞯, 𝞰, 𝞱, 𝞲, 𝞳, 𝞴, 𝞵, 𝞶, 𝞷, 𝞸, 𝞹, 𝞺, 𝞻, 𝞼, 𝞽, 𝞾, 𝞿, 𝟀, 𝟁, 𝟂, 𝟃, 𝟄, 𝟅, 𝟆, 𝟇, 𝟈, 𝟉, 𝟊, 𝟋, 𝟎, 𝟏, 𝟐, 𝟑, 𝟒, 𝟓, 𝟔, 𝟕, 𝟖, 𝟗, 𝟘, 𝟙, 𝟚, 𝟛, 𝟜, 𝟝, 𝟞, 𝟟, 𝟠, 𝟡, 𝟢, 𝟣, 𝟤, 𝟥, 𝟦, 𝟧, 𝟨, 𝟩, 𝟪, 𝟫, 𝟬, 𝟭, 𝟮, 𝟯, 𝟰, 𝟱, 𝟲, 𝟳, 𝟴, 𝟵, 𝟶, 𝟷, 𝟸, 𝟹, 𝟺, 𝟻, 𝟼, 𝟽, 𝟾, 𝟿, i︠a︡, default */
/*! all exports used */
/***/ (function(module) {

module.exports = JSON.parse("{\"_\":{\"math\":\"\\\\_\",\"text\":\"\\\\_\"},\"{\":{\"math\":\"\\\\lbrace{}\",\"text\":\"\\\\{\"},\"}\":{\"math\":\"\\\\rbrace{}\",\"text\":\"\\\\}\"},\"&\":{\"math\":\"\\\\&\",\"text\":\"\\\\&\"},\"#\":{\"math\":\"\\\\#\",\"text\":\"\\\\#\"},\"%\":{\"math\":\"\\\\%\",\"text\":\"\\\\%\"},\"^\":{\"math\":\"\\\\sphat{}\",\"text\":\"\\\\^\"},\"<\":{\"math\":\"<\"},\">\":{\"math\":\">\"},\"~\":{\"math\":\"\\\\sptilde{}\",\"text\":\"\\\\textasciitilde{}\"},\"$\":{\"math\":\"\\\\$\",\"text\":\"\\\\$\"},\"\\\\\":{\"math\":\"\\\\backslash{}\",\"text\":\"\\\\textbackslash{}\"},\" \":{\"math\":\"~\",\"text\":\"~\",\"space\":true},\"¡\":{\"text\":\"\\\\textexclamdown{}\"},\"¢\":{\"math\":\"\\\\cent{}\",\"text\":\"\\\\textcent{}\",\"textpackage\":\"textcomp\"},\"£\":{\"math\":\"\\\\pounds{}\",\"text\":\"\\\\textsterling{}\",\"textpackage\":\"textcomp\"},\"¤\":{\"text\":\"\\\\textcurrency{}\",\"textpackage\":\"textcomp\"},\"¥\":{\"math\":\"\\\\yen{}\",\"text\":\"\\\\textyen{}\",\"textpackage\":\"textcomp\"},\"¦\":{\"text\":\"\\\\textbrokenbar{}\",\"textpackage\":\"textcomp\"},\"§\":{\"text\":\"\\\\textsection{}\",\"textpackage\":\"textcomp\"},\"¨\":{\"math\":\"\\\\spddot{}\",\"text\":\"\\\\textasciidieresis{}\"},\"©\":{\"text\":\"\\\\textcopyright{}\",\"textpackage\":\"textcomp\"},\"ª\":{\"text\":\"\\\\textordfeminine{}\",\"textpackage\":\"textcomp\"},\"«\":{\"text\":\"\\\\guillemotleft{}\"},\"¬\":{\"math\":\"\\\\lnot{}\"},\"­\":{\"math\":\"\\\\-\",\"text\":\"\\\\-\"},\"®\":{\"math\":\"\\\\circledR{}\",\"text\":\"\\\\textregistered{}\",\"textpackage\":\"textcomp\"},\"¯\":{\"text\":\"\\\\textasciimacron{}\"},\"°\":{\"math\":\"^\\\\circ{}\",\"text\":\"\\\\textdegree{}\",\"textpackage\":\"textcomp\"},\"±\":{\"math\":\"\\\\pm{}\"},\"²\":{\"math\":\"^{2}\"},\"³\":{\"math\":\"^{3}\"},\"´\":{\"text\":\"\\\\textasciiacute{}\"},\"µ\":{\"math\":\"\\\\mathrm{\\\\mu}\"},\"¶\":{\"text\":\"\\\\textparagraph{}\",\"textpackage\":\"textcomp\"},\"·\":{\"math\":\"\\\\cdot{}\"},\"¸\":{\"text\":\"\\\\c{}\"},\"¹\":{\"math\":\"^{1}\"},\"º\":{\"text\":\"\\\\textordmasculine{}\",\"textpackage\":\"textcomp\"},\"»\":{\"text\":\"\\\\guillemotright{}\"},\"¼\":{\"text\":\"\\\\textonequarter{}\",\"textpackage\":\"textcomp\"},\"½\":{\"text\":\"\\\\textonehalf{}\",\"textpackage\":\"textcomp\"},\"¾\":{\"text\":\"\\\\textthreequarters{}\",\"textpackage\":\"textcomp\"},\"¿\":{\"text\":\"\\\\textquestiondown{}\"},\"À\":{\"text\":\"\\\\`A\"},\"Á\":{\"text\":\"\\\\'A\"},\"Â\":{\"text\":\"\\\\^A\"},\"Ã\":{\"text\":\"\\\\~A\"},\"Ä\":{\"text\":\"\\\\\\\"A\"},\"Å\":{\"text\":\"\\\\AA{}\",\"alttext\":[\"\\\\r{A}\"]},\"Æ\":{\"text\":\"\\\\AE{}\"},\"Ç\":{\"text\":\"{\\\\c C}\"},\"È\":{\"text\":\"\\\\`E\"},\"É\":{\"text\":\"\\\\'E\"},\"Ê\":{\"text\":\"\\\\^E\"},\"Ë\":{\"text\":\"\\\\\\\"E\"},\"Ì\":{\"text\":\"\\\\`I\"},\"Í\":{\"text\":\"\\\\'I\"},\"Î\":{\"text\":\"\\\\^I\"},\"Ï\":{\"text\":\"\\\\\\\"I\"},\"Ð\":{\"text\":\"\\\\DH{}\"},\"Ñ\":{\"text\":\"\\\\~N\"},\"Ò\":{\"text\":\"\\\\`O\"},\"Ó\":{\"text\":\"\\\\'O\"},\"Ô\":{\"text\":\"\\\\^O\"},\"Õ\":{\"text\":\"\\\\~O\"},\"Ö\":{\"text\":\"\\\\\\\"O\"},\"×\":{\"math\":\"\\\\times{}\",\"text\":\"\\\\texttimes{}\"},\"Ø\":{\"text\":\"\\\\O{}\"},\"Ù\":{\"text\":\"\\\\`U\"},\"Ú\":{\"text\":\"\\\\'U\"},\"Û\":{\"text\":\"\\\\^U\"},\"Ü\":{\"text\":\"\\\\\\\"U\"},\"Ý\":{\"text\":\"\\\\'Y\"},\"Þ\":{\"text\":\"\\\\TH{}\"},\"ß\":{\"text\":\"\\\\ss{}\"},\"à\":{\"text\":\"\\\\`a\"},\"á\":{\"text\":\"\\\\'a\"},\"â\":{\"text\":\"\\\\^a\"},\"ã\":{\"text\":\"\\\\~a\"},\"ä\":{\"text\":\"\\\\\\\"a\"},\"å\":{\"text\":\"\\\\aa{}\",\"alttext\":[\"\\\\r{a}\"]},\"æ\":{\"text\":\"\\\\ae{}\"},\"ç\":{\"text\":\"{\\\\c c}\"},\"è\":{\"text\":\"\\\\`e\"},\"é\":{\"text\":\"\\\\'e\"},\"ê\":{\"text\":\"\\\\^e\"},\"ë\":{\"text\":\"\\\\\\\"e\"},\"ì\":{\"text\":\"\\\\`i\"},\"í\":{\"text\":\"\\\\'i\"},\"î\":{\"text\":\"\\\\^i\"},\"ï\":{\"text\":\"\\\\\\\"i\"},\"ð\":{\"math\":\"\\\\eth{}\",\"text\":\"\\\\dh{}\"},\"ñ\":{\"text\":\"\\\\~n\"},\"ò\":{\"text\":\"\\\\`o\"},\"ó\":{\"text\":\"\\\\'o\"},\"ô\":{\"text\":\"\\\\^o\"},\"õ\":{\"text\":\"\\\\~o\"},\"ö\":{\"text\":\"\\\\\\\"o\"},\"÷\":{\"math\":\"\\\\div{}\"},\"ø\":{\"text\":\"\\\\o{}\"},\"ù\":{\"text\":\"\\\\`u\"},\"ú\":{\"text\":\"\\\\'u\"},\"û\":{\"text\":\"\\\\^u\"},\"ü\":{\"text\":\"\\\\\\\"u\"},\"ý\":{\"text\":\"\\\\'y\"},\"þ\":{\"text\":\"\\\\th{}\"},\"ÿ\":{\"text\":\"\\\\\\\"y\"},\"Ā\":{\"text\":\"\\\\=A\"},\"ā\":{\"text\":\"\\\\=a\"},\"Ă\":{\"text\":\"{\\\\u A}\"},\"ă\":{\"text\":\"{\\\\u a}\"},\"Ą\":{\"text\":\"\\\\k{A}\"},\"ą\":{\"text\":\"\\\\k{a}\"},\"Ć\":{\"text\":\"\\\\'C\"},\"ć\":{\"text\":\"\\\\'c\"},\"Ĉ\":{\"text\":\"\\\\^C\"},\"ĉ\":{\"text\":\"\\\\^c\"},\"Ċ\":{\"text\":\"\\\\.C\"},\"ċ\":{\"text\":\"\\\\.c\"},\"Č\":{\"text\":\"{\\\\v C}\"},\"č\":{\"text\":\"{\\\\v c}\"},\"Ď\":{\"text\":\"{\\\\v D}\"},\"ď\":{\"text\":\"{\\\\v d}\"},\"Đ\":{\"text\":\"\\\\DJ{}\"},\"đ\":{\"text\":\"\\\\dj{}\"},\"Ē\":{\"text\":\"\\\\=E\"},\"ē\":{\"text\":\"\\\\=e\"},\"Ĕ\":{\"text\":\"{\\\\u E}\"},\"ĕ\":{\"text\":\"{\\\\u e}\"},\"Ė\":{\"text\":\"\\\\.E\"},\"ė\":{\"text\":\"\\\\.e\"},\"Ę\":{\"text\":\"\\\\k{E}\"},\"ę\":{\"text\":\"\\\\k{e}\"},\"Ě\":{\"text\":\"{\\\\v E}\"},\"ě\":{\"text\":\"{\\\\v e}\"},\"Ĝ\":{\"text\":\"\\\\^G\"},\"ĝ\":{\"text\":\"\\\\^g\"},\"Ğ\":{\"text\":\"{\\\\u G}\"},\"ğ\":{\"text\":\"{\\\\u g}\"},\"Ġ\":{\"text\":\"\\\\.G\"},\"ġ\":{\"text\":\"\\\\.g\"},\"Ģ\":{\"text\":\"{\\\\c G}\"},\"ģ\":{\"text\":\"{\\\\c g}\"},\"Ĥ\":{\"text\":\"\\\\^H\"},\"ĥ\":{\"text\":\"\\\\^h\"},\"Ħ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char40}\"},\"ħ\":{\"math\":\"\\\\Elzxh{}\"},\"Ĩ\":{\"text\":\"\\\\~I\"},\"ĩ\":{\"text\":\"\\\\~i\"},\"Ī\":{\"text\":\"\\\\=I\"},\"ī\":{\"text\":\"\\\\=i\"},\"Ĭ\":{\"text\":\"{\\\\u I}\"},\"ĭ\":{\"text\":\"{\\\\u \\\\i}\"},\"Į\":{\"text\":\"\\\\k{I}\"},\"į\":{\"text\":\"\\\\k{i}\"},\"İ\":{\"text\":\"\\\\.I\"},\"ı\":{\"math\":\"\\\\imath{}\",\"text\":\"\\\\i{}\"},\"Ĳ\":{\"text\":\"IJ\"},\"ĳ\":{\"text\":\"ij\"},\"Ĵ\":{\"text\":\"\\\\^J\"},\"ĵ\":{\"text\":\"\\\\^\\\\j\"},\"Ķ\":{\"text\":\"{\\\\c K}\"},\"ķ\":{\"text\":\"{\\\\c k}\"},\"ĸ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char91}\"},\"Ĺ\":{\"text\":\"\\\\'L\"},\"ĺ\":{\"text\":\"\\\\'l\"},\"Ļ\":{\"text\":\"{\\\\c L}\"},\"ļ\":{\"text\":\"{\\\\c l}\"},\"Ľ\":{\"text\":\"{\\\\v L}\"},\"ľ\":{\"text\":\"{\\\\v l}\"},\"Ŀ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char201}\"},\"ŀ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char202}\"},\"Ł\":{\"text\":\"\\\\L{}\"},\"ł\":{\"text\":\"\\\\l{}\"},\"Ń\":{\"text\":\"\\\\'N\"},\"ń\":{\"text\":\"\\\\'n\"},\"Ņ\":{\"text\":\"{\\\\c N}\"},\"ņ\":{\"text\":\"{\\\\c n}\"},\"Ň\":{\"text\":\"{\\\\v N}\"},\"ň\":{\"text\":\"{\\\\v n}\"},\"ŉ\":{\"text\":\"'n\"},\"Ŋ\":{\"text\":\"\\\\NG{}\"},\"ŋ\":{\"text\":\"\\\\ng{}\"},\"Ō\":{\"text\":\"\\\\=O\"},\"ō\":{\"text\":\"\\\\=o\"},\"Ŏ\":{\"text\":\"{\\\\u O}\"},\"ŏ\":{\"text\":\"{\\\\u o}\"},\"Ő\":{\"text\":\"{\\\\H O}\"},\"ő\":{\"text\":\"{\\\\H o}\"},\"Œ\":{\"text\":\"\\\\OE{}\"},\"œ\":{\"text\":\"\\\\oe{}\"},\"Ŕ\":{\"text\":\"\\\\'R\"},\"ŕ\":{\"text\":\"\\\\'r\"},\"Ŗ\":{\"text\":\"{\\\\c R}\"},\"ŗ\":{\"text\":\"{\\\\c r}\"},\"Ř\":{\"text\":\"{\\\\v R}\"},\"ř\":{\"text\":\"{\\\\v r}\"},\"Ś\":{\"text\":\"\\\\'S\"},\"ś\":{\"text\":\"\\\\'s\"},\"Ŝ\":{\"text\":\"\\\\^S\"},\"ŝ\":{\"text\":\"\\\\^s\"},\"Ş\":{\"text\":\"{\\\\c S}\"},\"ş\":{\"text\":\"{\\\\c s}\"},\"Š\":{\"text\":\"{\\\\v S}\"},\"š\":{\"text\":\"{\\\\v s}\"},\"Ţ\":{\"text\":\"{\\\\c T}\"},\"ţ\":{\"text\":\"{\\\\c t}\"},\"Ť\":{\"text\":\"{\\\\v T}\"},\"ť\":{\"text\":\"{\\\\v t}\"},\"Ŧ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char47}\"},\"ŧ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char63}\"},\"Ũ\":{\"text\":\"\\\\~U\"},\"ũ\":{\"text\":\"\\\\~u\"},\"Ū\":{\"text\":\"\\\\=U\"},\"ū\":{\"text\":\"\\\\=u\"},\"Ŭ\":{\"text\":\"{\\\\u U}\"},\"ŭ\":{\"text\":\"{\\\\u u}\"},\"Ů\":{\"text\":\"\\\\r{U}\"},\"ů\":{\"text\":\"\\\\r{u}\"},\"Ű\":{\"text\":\"{\\\\H U}\"},\"ű\":{\"text\":\"{\\\\H u}\"},\"Ų\":{\"text\":\"\\\\k{U}\"},\"ų\":{\"text\":\"\\\\k{u}\"},\"Ŵ\":{\"text\":\"\\\\^W\"},\"ŵ\":{\"text\":\"\\\\^w\"},\"Ŷ\":{\"text\":\"\\\\^Y\"},\"ŷ\":{\"text\":\"\\\\^y\"},\"Ÿ\":{\"text\":\"\\\\\\\"Y\"},\"Ź\":{\"text\":\"\\\\'Z\"},\"ź\":{\"text\":\"\\\\'z\"},\"Ż\":{\"text\":\"\\\\.Z\"},\"ż\":{\"text\":\"\\\\.z\"},\"Ž\":{\"text\":\"{\\\\v Z}\"},\"ž\":{\"text\":\"{\\\\v z}\"},\"ſ\":{\"text\":\"s\"},\"ƒ\":{\"math\":\"f\"},\"ƕ\":{\"text\":\"\\\\texthvlig{}\"},\"ƞ\":{\"text\":\"\\\\textnrleg{}\"},\"ƪ\":{\"math\":\"\\\\eth{}\"},\"Ƶ\":{\"math\":\"\\\\Zbar{}\"},\"ƺ\":{\"text\":\"{\\\\fontencoding{LELA}\\\\selectfont\\\\char195}\"},\"ǂ\":{\"text\":\"\\\\textdoublepipe{}\"},\"Ǎ\":{\"text\":\"{\\\\v A}\"},\"ǎ\":{\"text\":\"{\\\\v a}\"},\"Ǐ\":{\"text\":\"{\\\\v I}\"},\"ǐ\":{\"text\":\"{\\\\v i}\"},\"Ǒ\":{\"text\":\"{\\\\v O}\"},\"ǒ\":{\"text\":\"{\\\\v o}\"},\"Ǔ\":{\"text\":\"{\\\\v U}\"},\"ǔ\":{\"text\":\"{\\\\v u}\"},\"Ǧ\":{\"text\":\"{\\\\v G}\"},\"ǧ\":{\"text\":\"{\\\\v g}\"},\"Ǩ\":{\"text\":\"{\\\\v K}\"},\"ǩ\":{\"text\":\"{\\\\v k}\"},\"Ǫ\":{\"text\":\"{\\\\k O}\"},\"ǫ\":{\"text\":\"{\\\\k o}\"},\"ǰ\":{\"text\":\"{\\\\v j}\"},\"Ǵ\":{\"text\":\"\\\\'G\"},\"ǵ\":{\"text\":\"\\\\'g\"},\"ȷ\":{\"math\":\"\\\\jmath{}\"},\"ɐ\":{\"math\":\"\\\\Elztrna{}\"},\"ɒ\":{\"math\":\"\\\\Elztrnsa{}\"},\"ɔ\":{\"math\":\"\\\\Elzopeno{}\"},\"ɖ\":{\"math\":\"\\\\Elzrtld{}\"},\"ɘ\":{\"text\":\"{\\\\fontencoding{LEIP}\\\\selectfont\\\\char61}\"},\"ə\":{\"math\":\"\\\\Elzschwa{}\"},\"ɛ\":{\"math\":\"\\\\varepsilon{}\"},\"ɡ\":{\"text\":\"g\"},\"ɣ\":{\"math\":\"\\\\Elzpgamma{}\"},\"ɤ\":{\"math\":\"\\\\Elzpbgam{}\"},\"ɥ\":{\"math\":\"\\\\Elztrnh{}\"},\"ɬ\":{\"math\":\"\\\\Elzbtdl{}\"},\"ɭ\":{\"math\":\"\\\\Elzrtll{}\"},\"ɯ\":{\"math\":\"\\\\Elztrnm{}\"},\"ɰ\":{\"math\":\"\\\\Elztrnmlr{}\"},\"ɱ\":{\"math\":\"\\\\Elzltlmr{}\"},\"ɲ\":{\"text\":\"\\\\Elzltln{}\"},\"ɳ\":{\"math\":\"\\\\Elzrtln{}\"},\"ɷ\":{\"math\":\"\\\\Elzclomeg{}\"},\"ɸ\":{\"text\":\"\\\\textphi{}\"},\"ɹ\":{\"math\":\"\\\\Elztrnr{}\"},\"ɺ\":{\"math\":\"\\\\Elztrnrl{}\"},\"ɻ\":{\"math\":\"\\\\Elzrttrnr{}\"},\"ɼ\":{\"math\":\"\\\\Elzrl{}\"},\"ɽ\":{\"math\":\"\\\\Elzrtlr{}\"},\"ɾ\":{\"math\":\"\\\\Elzfhr{}\"},\"ɿ\":{\"text\":\"{\\\\fontencoding{LEIP}\\\\selectfont\\\\char202}\"},\"ʂ\":{\"math\":\"\\\\Elzrtls{}\"},\"ʃ\":{\"math\":\"\\\\Elzesh{}\"},\"ʇ\":{\"math\":\"\\\\Elztrnt{}\"},\"ʈ\":{\"math\":\"\\\\Elzrtlt{}\"},\"ʊ\":{\"math\":\"\\\\Elzpupsil{}\"},\"ʋ\":{\"math\":\"\\\\Elzpscrv{}\"},\"ʌ\":{\"math\":\"\\\\Elzinvv{}\"},\"ʍ\":{\"math\":\"\\\\Elzinvw{}\"},\"ʎ\":{\"math\":\"\\\\Elztrny{}\"},\"ʐ\":{\"math\":\"\\\\Elzrtlz{}\"},\"ʒ\":{\"math\":\"\\\\Elzyogh{}\"},\"ʔ\":{\"math\":\"\\\\Elzglst{}\"},\"ʕ\":{\"math\":\"\\\\Elzreglst{}\"},\"ʖ\":{\"math\":\"\\\\Elzinglst{}\"},\"ʞ\":{\"text\":\"\\\\textturnk{}\"},\"ʤ\":{\"math\":\"\\\\Elzdyogh{}\"},\"ʧ\":{\"math\":\"\\\\Elztesh{}\"},\"ʹ\":{\"text\":\"'\"},\"ʻ\":{\"text\":\"'\"},\"ʼ\":{\"text\":\"'\"},\"ʽ\":{\"text\":\"'\"},\"ˆ\":{\"text\":\"\\\\textasciicircum{}\"},\"ˇ\":{\"text\":\"\\\\textasciicaron{}\"},\"ˈ\":{\"math\":\"\\\\Elzverts{}\"},\"ˉ\":{\"text\":\"-\"},\"ˌ\":{\"math\":\"\\\\Elzverti{}\"},\"ː\":{\"math\":\"\\\\Elzlmrk{}\"},\"ˑ\":{\"math\":\"\\\\Elzhlmrk{}\"},\"˒\":{\"math\":\"\\\\Elzsbrhr{}\"},\"˓\":{\"math\":\"\\\\Elzsblhr{}\"},\"˔\":{\"math\":\"\\\\Elzrais{}\"},\"˕\":{\"math\":\"\\\\Elzlow{}\"},\"˘\":{\"text\":\"\\\\textasciibreve{}\"},\"˙\":{\"text\":\"\\\\textperiodcentered{}\",\"textpackage\":\"textcomp\"},\"˚\":{\"text\":\"\\\\r{}\"},\"˛\":{\"text\":\"\\\\k{}\"},\"˜\":{\"text\":\"\\\\texttildelow{}\"},\"˝\":{\"text\":\"\\\\H{}\"},\"˥\":{\"text\":\"\\\\tone{55}\"},\"˦\":{\"text\":\"\\\\tone{44}\"},\"˧\":{\"text\":\"\\\\tone{33}\"},\"˨\":{\"text\":\"\\\\tone{22}\"},\"˩\":{\"text\":\"\\\\tone{11}\"},\"̀\":{\"math\":\"\\\\grave{}\",\"text\":\"\\\\`\"},\"́\":{\"math\":\"\\\\acute{}\",\"text\":\"\\\\'\"},\"̂\":{\"math\":\"\\\\hat{}\",\"text\":\"\\\\^\"},\"̃\":{\"math\":\"\\\\tilde{}\",\"text\":\"\\\\~\"},\"̄\":{\"math\":\"\\\\bar{}\",\"text\":\"\\\\=\"},\"̅\":{\"math\":\"\\\\overline{}\"},\"̆\":{\"math\":\"\\\\breve{}\",\"text\":\"\\\\u{}\"},\"̇\":{\"math\":\"\\\\dot{}\",\"text\":\"\\\\.\"},\"̈\":{\"math\":\"\\\\ddot{}\",\"text\":\"\\\\\\\"\"},\"̉\":{\"math\":\"\\\\ovhook{}\"},\"̊\":{\"math\":\"\\\\mathring{}\",\"text\":\"\\\\r{}\"},\"̋\":{\"text\":\"\\\\H{}\"},\"̌\":{\"math\":\"\\\\check{}\",\"text\":\"\\\\v{}\"},\"̏\":{\"text\":\"\\\\cyrchar\\\\C{}\"},\"̐\":{\"math\":\"\\\\candra{}\"},\"̑\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char177}\"},\"̒\":{\"math\":\"\\\\oturnedcomma{}\"},\"̕\":{\"math\":\"\\\\ocommatopright{}\"},\"̘\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char184}\"},\"̙\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char185}\"},\"̚\":{\"math\":\"\\\\droang{}\"},\"̡\":{\"math\":\"\\\\Elzpalh{}\"},\"̢\":{\"text\":\"\\\\Elzrh{}\"},\"̧\":{\"text\":\"\\\\c{}\"},\"̨\":{\"text\":\"\\\\k{}\"},\"̪\":{\"math\":\"\\\\Elzsbbrg{}\"},\"̫\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char203}\"},\"̯\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char207}\"},\"̰\":{\"math\":\"\\\\utilde{}\"},\"̱\":{\"math\":\"\\\\underbar{}\"},\"̲\":{\"math\":\"\\\\underline{}\"},\"̵\":{\"text\":\"\\\\Elzxl{}\"},\"̶\":{\"text\":\"\\\\Elzbar{}\"},\"̷\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char215}\"},\"̸\":{\"math\":\"\\\\not{}\"},\"̺\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char218}\"},\"̻\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char219}\"},\"̼\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char220}\"},\"̽\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char221}\"},\"͡\":{\"text\":\"{\\\\fontencoding{LECO}\\\\selectfont\\\\char225}\"},\"ʹ\":{\"text\":\"'\"},\"͵\":{\"text\":\",\"},\";\":{\"text\":\";\"},\"Ά\":{\"text\":\"\\\\'A\"},\"Έ\":{\"text\":\"\\\\'E\"},\"Ή\":{\"text\":\"\\\\'H\"},\"Ί\":{\"text\":\"{\\\\'{}I}\"},\"Ό\":{\"text\":\"{\\\\'{}O}\"},\"Ύ\":{\"math\":\"\\\\mathrm{'Y}\"},\"Ώ\":{\"math\":\"\\\\mathrm{'\\\\Omega}\"},\"ΐ\":{\"math\":\"\\\\acute{\\\\ddot{\\\\iota}}\"},\"Α\":{\"math\":\"A\"},\"Β\":{\"math\":\"B\"},\"Γ\":{\"math\":\"\\\\Gamma{}\"},\"Δ\":{\"math\":\"\\\\Delta{}\"},\"Ε\":{\"math\":\"E\"},\"Ζ\":{\"math\":\"Z\"},\"Η\":{\"math\":\"H\"},\"Θ\":{\"math\":\"\\\\Theta{}\"},\"Ι\":{\"math\":\"I\"},\"Κ\":{\"math\":\"K\"},\"Λ\":{\"math\":\"\\\\Lambda{}\"},\"Μ\":{\"math\":\"M\"},\"Ν\":{\"math\":\"N\"},\"Ξ\":{\"math\":\"\\\\Xi{}\"},\"Ο\":{\"math\":\"O\"},\"Π\":{\"math\":\"\\\\Pi{}\"},\"Ρ\":{\"math\":\"P\"},\"Σ\":{\"math\":\"\\\\Sigma{}\"},\"Τ\":{\"math\":\"T\"},\"Υ\":{\"math\":\"\\\\Upsilon{}\"},\"Φ\":{\"math\":\"\\\\Phi{}\"},\"Χ\":{\"math\":\"X\"},\"Ψ\":{\"math\":\"\\\\Psi{}\"},\"Ω\":{\"math\":\"\\\\Omega{}\"},\"Ϊ\":{\"math\":\"\\\\mathrm{\\\\ddot{I}}\"},\"Ϋ\":{\"math\":\"\\\\mathrm{\\\\ddot{Y}}\"},\"ά\":{\"text\":\"{\\\\'$\\\\alpha$}\"},\"έ\":{\"math\":\"\\\\acute{\\\\epsilon}\"},\"ή\":{\"math\":\"\\\\acute{\\\\eta}\"},\"ί\":{\"math\":\"\\\\acute{\\\\iota}\"},\"ΰ\":{\"math\":\"\\\\acute{\\\\ddot{\\\\upsilon}}\"},\"α\":{\"math\":\"\\\\alpha{}\"},\"β\":{\"math\":\"\\\\beta{}\"},\"γ\":{\"math\":\"\\\\gamma{}\"},\"δ\":{\"math\":\"\\\\delta{}\"},\"ε\":{\"math\":\"\\\\epsilon{}\"},\"ζ\":{\"math\":\"\\\\zeta{}\"},\"η\":{\"math\":\"\\\\eta{}\"},\"θ\":{\"math\":\"\\\\theta{}\",\"text\":\"\\\\texttheta{}\"},\"ι\":{\"math\":\"\\\\iota{}\"},\"κ\":{\"math\":\"\\\\kappa{}\"},\"λ\":{\"math\":\"\\\\lambda{}\"},\"μ\":{\"math\":\"\\\\mu{}\"},\"ν\":{\"math\":\"\\\\nu{}\"},\"ξ\":{\"math\":\"\\\\xi{}\"},\"ο\":{\"math\":\"o\"},\"π\":{\"math\":\"\\\\pi{}\"},\"ρ\":{\"math\":\"\\\\rho{}\"},\"ς\":{\"math\":\"\\\\varsigma{}\"},\"σ\":{\"math\":\"\\\\sigma{}\"},\"τ\":{\"math\":\"\\\\tau{}\"},\"υ\":{\"math\":\"\\\\upsilon{}\"},\"φ\":{\"math\":\"\\\\varphi{}\"},\"χ\":{\"math\":\"\\\\chi{}\"},\"ψ\":{\"math\":\"\\\\psi{}\"},\"ω\":{\"math\":\"\\\\omega{}\"},\"ϊ\":{\"math\":\"\\\\ddot{\\\\iota}\"},\"ϋ\":{\"math\":\"\\\\ddot{\\\\upsilon}\"},\"ό\":{\"text\":\"\\\\'o\"},\"ύ\":{\"math\":\"\\\\acute{\\\\upsilon}\"},\"ώ\":{\"math\":\"\\\\acute{\\\\omega}\"},\"ϐ\":{\"math\":\"\\\\varbeta{}\",\"text\":\"\\\\Pisymbol{ppi022}{87}\"},\"ϑ\":{\"math\":\"\\\\vartheta{}\",\"text\":\"\\\\textvartheta{}\"},\"ϒ\":{\"math\":\"\\\\Upsilon{}\"},\"ϕ\":{\"math\":\"\\\\phi{}\"},\"ϖ\":{\"math\":\"\\\\varpi{}\"},\"Ϙ\":{\"math\":\"\\\\Qoppa{}\"},\"ϙ\":{\"math\":\"\\\\qoppa{}\"},\"Ϛ\":{\"math\":\"\\\\Stigma{}\"},\"ϛ\":{\"math\":\"\\\\stigma{}\"},\"Ϝ\":{\"math\":\"\\\\Digamma{}\"},\"ϝ\":{\"math\":\"\\\\digamma{}\"},\"Ϟ\":{\"math\":\"\\\\Koppa{}\"},\"ϟ\":{\"math\":\"\\\\koppa{}\"},\"Ϡ\":{\"math\":\"\\\\Sampi{}\"},\"ϡ\":{\"math\":\"\\\\sampi{}\"},\"ϰ\":{\"math\":\"\\\\varkappa{}\"},\"ϱ\":{\"math\":\"\\\\varrho{}\"},\"ϴ\":{\"math\":\"\\\\upvarTheta{}\",\"text\":\"\\\\textTheta{}\"},\"ϵ\":{\"math\":\"\\\\epsilon{}\"},\"϶\":{\"math\":\"\\\\backepsilon{}\"},\"Ё\":{\"text\":\"\\\\cyrchar\\\\CYRYO{}\"},\"Ђ\":{\"text\":\"\\\\cyrchar\\\\CYRDJE{}\"},\"Ѓ\":{\"text\":\"\\\\cyrchar{\\\\'\\\\CYRG}\"},\"Є\":{\"text\":\"\\\\cyrchar\\\\CYRIE{}\"},\"Ѕ\":{\"text\":\"\\\\cyrchar\\\\CYRDZE{}\"},\"І\":{\"text\":\"\\\\cyrchar\\\\CYRII{}\"},\"Ї\":{\"text\":\"\\\\cyrchar\\\\CYRYI{}\"},\"Ј\":{\"text\":\"\\\\cyrchar\\\\CYRJE{}\"},\"Љ\":{\"text\":\"\\\\cyrchar\\\\CYRLJE{}\"},\"Њ\":{\"text\":\"\\\\cyrchar\\\\CYRNJE{}\"},\"Ћ\":{\"text\":\"\\\\cyrchar\\\\CYRTSHE{}\"},\"Ќ\":{\"text\":\"\\\\cyrchar{\\\\'\\\\CYRK}\"},\"Ў\":{\"text\":\"\\\\cyrchar\\\\CYRUSHRT{}\"},\"Џ\":{\"text\":\"\\\\cyrchar\\\\CYRDZHE{}\"},\"А\":{\"text\":\"\\\\cyrchar\\\\CYRA{}\"},\"Б\":{\"text\":\"\\\\cyrchar\\\\CYRB{}\"},\"В\":{\"text\":\"\\\\cyrchar\\\\CYRV{}\"},\"Г\":{\"text\":\"\\\\cyrchar\\\\CYRG{}\"},\"Д\":{\"text\":\"\\\\cyrchar\\\\CYRD{}\"},\"Е\":{\"text\":\"\\\\cyrchar\\\\CYRE{}\"},\"Ж\":{\"text\":\"\\\\cyrchar\\\\CYRZH{}\"},\"З\":{\"text\":\"\\\\cyrchar\\\\CYRZ{}\"},\"И\":{\"text\":\"\\\\cyrchar\\\\CYRI{}\"},\"Й\":{\"text\":\"\\\\cyrchar\\\\CYRISHRT{}\"},\"К\":{\"text\":\"\\\\cyrchar\\\\CYRK{}\"},\"Л\":{\"text\":\"\\\\cyrchar\\\\CYRL{}\"},\"М\":{\"text\":\"\\\\cyrchar\\\\CYRM{}\"},\"Н\":{\"text\":\"\\\\cyrchar\\\\CYRN{}\"},\"О\":{\"text\":\"\\\\cyrchar\\\\CYRO{}\"},\"П\":{\"text\":\"\\\\cyrchar\\\\CYRP{}\"},\"Р\":{\"text\":\"\\\\cyrchar\\\\CYRR{}\"},\"С\":{\"text\":\"\\\\cyrchar\\\\CYRS{}\"},\"Т\":{\"text\":\"\\\\cyrchar\\\\CYRT{}\"},\"У\":{\"text\":\"\\\\cyrchar\\\\CYRU{}\"},\"Ф\":{\"text\":\"\\\\cyrchar\\\\CYRF{}\"},\"Х\":{\"text\":\"\\\\cyrchar\\\\CYRH{}\"},\"Ц\":{\"text\":\"\\\\cyrchar\\\\CYRC{}\"},\"Ч\":{\"text\":\"\\\\cyrchar\\\\CYRCH{}\"},\"Ш\":{\"text\":\"\\\\cyrchar\\\\CYRSH{}\"},\"Щ\":{\"text\":\"\\\\cyrchar\\\\CYRSHCH{}\"},\"Ъ\":{\"text\":\"\\\\cyrchar\\\\CYRHRDSN{}\"},\"Ы\":{\"text\":\"\\\\cyrchar\\\\CYRERY{}\"},\"Ь\":{\"text\":\"\\\\cyrchar\\\\CYRSFTSN{}\"},\"Э\":{\"text\":\"\\\\cyrchar\\\\CYREREV{}\"},\"Ю\":{\"text\":\"\\\\cyrchar\\\\CYRYU{}\"},\"Я\":{\"text\":\"\\\\cyrchar\\\\CYRYA{}\"},\"а\":{\"text\":\"\\\\cyrchar\\\\cyra{}\"},\"б\":{\"text\":\"\\\\cyrchar\\\\cyrb{}\"},\"в\":{\"text\":\"\\\\cyrchar\\\\cyrv{}\"},\"г\":{\"text\":\"\\\\cyrchar\\\\cyrg{}\"},\"д\":{\"text\":\"\\\\cyrchar\\\\cyrd{}\"},\"е\":{\"text\":\"\\\\cyrchar\\\\cyre{}\"},\"ж\":{\"text\":\"\\\\cyrchar\\\\cyrzh{}\"},\"з\":{\"text\":\"\\\\cyrchar\\\\cyrz{}\"},\"и\":{\"text\":\"\\\\cyrchar\\\\cyri{}\"},\"й\":{\"text\":\"\\\\cyrchar\\\\cyrishrt{}\"},\"к\":{\"text\":\"\\\\cyrchar\\\\cyrk{}\"},\"л\":{\"text\":\"\\\\cyrchar\\\\cyrl{}\"},\"м\":{\"text\":\"\\\\cyrchar\\\\cyrm{}\"},\"н\":{\"text\":\"\\\\cyrchar\\\\cyrn{}\"},\"о\":{\"text\":\"\\\\cyrchar\\\\cyro{}\"},\"п\":{\"text\":\"\\\\cyrchar\\\\cyrp{}\"},\"р\":{\"text\":\"\\\\cyrchar\\\\cyrr{}\"},\"с\":{\"text\":\"\\\\cyrchar\\\\cyrs{}\"},\"т\":{\"text\":\"\\\\cyrchar\\\\cyrt{}\"},\"у\":{\"text\":\"\\\\cyrchar\\\\cyru{}\"},\"ф\":{\"text\":\"\\\\cyrchar\\\\cyrf{}\"},\"х\":{\"text\":\"\\\\cyrchar\\\\cyrh{}\"},\"ц\":{\"text\":\"\\\\cyrchar\\\\cyrc{}\"},\"ч\":{\"text\":\"\\\\cyrchar\\\\cyrch{}\"},\"ш\":{\"text\":\"\\\\cyrchar\\\\cyrsh{}\"},\"щ\":{\"text\":\"\\\\cyrchar\\\\cyrshch{}\"},\"ъ\":{\"text\":\"\\\\cyrchar\\\\cyrhrdsn{}\"},\"ы\":{\"text\":\"\\\\cyrchar\\\\cyrery{}\"},\"ь\":{\"text\":\"\\\\cyrchar\\\\cyrsftsn{}\"},\"э\":{\"text\":\"\\\\cyrchar\\\\cyrerev{}\"},\"ю\":{\"text\":\"\\\\cyrchar\\\\cyryu{}\"},\"я\":{\"text\":\"\\\\cyrchar\\\\cyrya{}\"},\"ё\":{\"text\":\"\\\\cyrchar\\\\cyryo{}\"},\"ђ\":{\"text\":\"\\\\cyrchar\\\\cyrdje{}\"},\"ѓ\":{\"text\":\"\\\\cyrchar{\\\\'\\\\cyrg}\"},\"є\":{\"text\":\"\\\\cyrchar\\\\cyrie{}\"},\"ѕ\":{\"text\":\"\\\\cyrchar\\\\cyrdze{}\"},\"і\":{\"text\":\"\\\\cyrchar\\\\cyrii{}\"},\"ї\":{\"text\":\"\\\\cyrchar\\\\cyryi{}\"},\"ј\":{\"text\":\"\\\\cyrchar\\\\cyrje{}\"},\"љ\":{\"text\":\"\\\\cyrchar\\\\cyrlje{}\"},\"њ\":{\"text\":\"\\\\cyrchar\\\\cyrnje{}\"},\"ћ\":{\"text\":\"\\\\cyrchar\\\\cyrtshe{}\"},\"ќ\":{\"text\":\"\\\\cyrchar{\\\\'\\\\cyrk}\"},\"ў\":{\"text\":\"\\\\cyrchar\\\\cyrushrt{}\"},\"џ\":{\"text\":\"\\\\cyrchar\\\\cyrdzhe{}\"},\"Ѡ\":{\"text\":\"\\\\cyrchar\\\\CYROMEGA{}\"},\"ѡ\":{\"text\":\"\\\\cyrchar\\\\cyromega{}\"},\"Ѣ\":{\"text\":\"\\\\cyrchar\\\\CYRYAT{}\"},\"Ѥ\":{\"text\":\"\\\\cyrchar\\\\CYRIOTE{}\"},\"ѥ\":{\"text\":\"\\\\cyrchar\\\\cyriote{}\"},\"Ѧ\":{\"text\":\"\\\\cyrchar\\\\CYRLYUS{}\"},\"ѧ\":{\"text\":\"\\\\cyrchar\\\\cyrlyus{}\"},\"Ѩ\":{\"text\":\"\\\\cyrchar\\\\CYRIOTLYUS{}\"},\"ѩ\":{\"text\":\"\\\\cyrchar\\\\cyriotlyus{}\"},\"Ѫ\":{\"text\":\"\\\\cyrchar\\\\CYRBYUS{}\"},\"Ѭ\":{\"text\":\"\\\\cyrchar\\\\CYRIOTBYUS{}\"},\"ѭ\":{\"text\":\"\\\\cyrchar\\\\cyriotbyus{}\"},\"Ѯ\":{\"text\":\"\\\\cyrchar\\\\CYRKSI{}\"},\"ѯ\":{\"text\":\"\\\\cyrchar\\\\cyrksi{}\"},\"Ѱ\":{\"text\":\"\\\\cyrchar\\\\CYRPSI{}\"},\"ѱ\":{\"text\":\"\\\\cyrchar\\\\cyrpsi{}\"},\"Ѳ\":{\"text\":\"\\\\cyrchar\\\\CYRFITA{}\"},\"Ѵ\":{\"text\":\"\\\\cyrchar\\\\CYRIZH{}\"},\"Ѹ\":{\"text\":\"\\\\cyrchar\\\\CYRUK{}\"},\"ѹ\":{\"text\":\"\\\\cyrchar\\\\cyruk{}\"},\"Ѻ\":{\"text\":\"\\\\cyrchar\\\\CYROMEGARND{}\"},\"ѻ\":{\"text\":\"\\\\cyrchar\\\\cyromegarnd{}\"},\"Ѽ\":{\"text\":\"\\\\cyrchar\\\\CYROMEGATITLO{}\"},\"ѽ\":{\"text\":\"\\\\cyrchar\\\\cyromegatitlo{}\"},\"Ѿ\":{\"text\":\"\\\\cyrchar\\\\CYROT{}\"},\"ѿ\":{\"text\":\"\\\\cyrchar\\\\cyrot{}\"},\"Ҁ\":{\"text\":\"\\\\cyrchar\\\\CYRKOPPA{}\"},\"ҁ\":{\"text\":\"\\\\cyrchar\\\\cyrkoppa{}\"},\"҂\":{\"text\":\"\\\\cyrchar\\\\cyrthousands{}\"},\"҈\":{\"text\":\"\\\\cyrchar\\\\cyrhundredthousands{}\"},\"҉\":{\"text\":\"\\\\cyrchar\\\\cyrmillions{}\"},\"Ҍ\":{\"text\":\"\\\\cyrchar\\\\CYRSEMISFTSN{}\"},\"ҍ\":{\"text\":\"\\\\cyrchar\\\\cyrsemisftsn{}\"},\"Ҏ\":{\"text\":\"\\\\cyrchar\\\\CYRRTICK{}\"},\"ҏ\":{\"text\":\"\\\\cyrchar\\\\cyrrtick{}\"},\"Ґ\":{\"text\":\"\\\\cyrchar\\\\CYRGUP{}\"},\"ґ\":{\"text\":\"\\\\cyrchar\\\\cyrgup{}\"},\"Ғ\":{\"text\":\"\\\\cyrchar\\\\CYRGHCRS{}\"},\"ғ\":{\"text\":\"\\\\cyrchar\\\\cyrghcrs{}\"},\"Ҕ\":{\"text\":\"\\\\cyrchar\\\\CYRGHK{}\"},\"ҕ\":{\"text\":\"\\\\cyrchar\\\\cyrghk{}\"},\"Җ\":{\"text\":\"\\\\cyrchar\\\\CYRZHDSC{}\"},\"җ\":{\"text\":\"\\\\cyrchar\\\\cyrzhdsc{}\"},\"Ҙ\":{\"text\":\"\\\\cyrchar\\\\CYRZDSC{}\"},\"ҙ\":{\"text\":\"\\\\cyrchar\\\\cyrzdsc{}\"},\"Қ\":{\"text\":\"\\\\cyrchar\\\\CYRKDSC{}\"},\"қ\":{\"text\":\"\\\\cyrchar\\\\cyrkdsc{}\"},\"Ҝ\":{\"text\":\"\\\\cyrchar\\\\CYRKVCRS{}\"},\"ҝ\":{\"text\":\"\\\\cyrchar\\\\cyrkvcrs{}\"},\"Ҟ\":{\"text\":\"\\\\cyrchar\\\\CYRKHCRS{}\"},\"ҟ\":{\"text\":\"\\\\cyrchar\\\\cyrkhcrs{}\"},\"Ҡ\":{\"text\":\"\\\\cyrchar\\\\CYRKBEAK{}\"},\"ҡ\":{\"text\":\"\\\\cyrchar\\\\cyrkbeak{}\"},\"Ң\":{\"text\":\"\\\\cyrchar\\\\CYRNDSC{}\"},\"ң\":{\"text\":\"\\\\cyrchar\\\\cyrndsc{}\"},\"Ҥ\":{\"text\":\"\\\\cyrchar\\\\CYRNG{}\"},\"ҥ\":{\"text\":\"\\\\cyrchar\\\\cyrng{}\"},\"Ҧ\":{\"text\":\"\\\\cyrchar\\\\CYRPHK{}\"},\"ҧ\":{\"text\":\"\\\\cyrchar\\\\cyrphk{}\"},\"Ҩ\":{\"text\":\"\\\\cyrchar\\\\CYRABHHA{}\"},\"ҩ\":{\"text\":\"\\\\cyrchar\\\\cyrabhha{}\"},\"Ҫ\":{\"text\":\"\\\\cyrchar\\\\CYRSDSC{}\"},\"ҫ\":{\"text\":\"\\\\cyrchar\\\\cyrsdsc{}\"},\"Ҭ\":{\"text\":\"\\\\cyrchar\\\\CYRTDSC{}\"},\"ҭ\":{\"text\":\"\\\\cyrchar\\\\cyrtdsc{}\"},\"Ү\":{\"text\":\"\\\\cyrchar\\\\CYRY{}\"},\"ү\":{\"text\":\"\\\\cyrchar\\\\cyry{}\"},\"Ұ\":{\"text\":\"\\\\cyrchar\\\\CYRYHCRS{}\"},\"ұ\":{\"text\":\"\\\\cyrchar\\\\cyryhcrs{}\"},\"Ҳ\":{\"text\":\"\\\\cyrchar\\\\CYRHDSC{}\"},\"ҳ\":{\"text\":\"\\\\cyrchar\\\\cyrhdsc{}\"},\"Ҵ\":{\"text\":\"\\\\cyrchar\\\\CYRTETSE{}\"},\"ҵ\":{\"text\":\"\\\\cyrchar\\\\cyrtetse{}\"},\"Ҷ\":{\"text\":\"\\\\cyrchar\\\\CYRCHRDSC{}\"},\"ҷ\":{\"text\":\"\\\\cyrchar\\\\cyrchrdsc{}\"},\"Ҹ\":{\"text\":\"\\\\cyrchar\\\\CYRCHVCRS{}\"},\"ҹ\":{\"text\":\"\\\\cyrchar\\\\cyrchvcrs{}\"},\"Һ\":{\"text\":\"\\\\cyrchar\\\\CYRSHHA{}\"},\"һ\":{\"text\":\"\\\\cyrchar\\\\cyrshha{}\"},\"Ҽ\":{\"text\":\"\\\\cyrchar\\\\CYRABHCH{}\"},\"ҽ\":{\"text\":\"\\\\cyrchar\\\\cyrabhch{}\"},\"Ҿ\":{\"text\":\"\\\\cyrchar\\\\CYRABHCHDSC{}\"},\"ҿ\":{\"text\":\"\\\\cyrchar\\\\cyrabhchdsc{}\"},\"Ӏ\":{\"text\":\"\\\\cyrchar\\\\CYRpalochka{}\"},\"Ӄ\":{\"text\":\"\\\\cyrchar\\\\CYRKHK{}\"},\"ӄ\":{\"text\":\"\\\\cyrchar\\\\cyrkhk{}\"},\"Ӈ\":{\"text\":\"\\\\cyrchar\\\\CYRNHK{}\"},\"ӈ\":{\"text\":\"\\\\cyrchar\\\\cyrnhk{}\"},\"Ӌ\":{\"text\":\"\\\\cyrchar\\\\CYRCHLDSC{}\"},\"ӌ\":{\"text\":\"\\\\cyrchar\\\\cyrchldsc{}\"},\"Ӕ\":{\"text\":\"\\\\cyrchar\\\\CYRAE{}\"},\"ӕ\":{\"text\":\"\\\\cyrchar\\\\cyrae{}\"},\"Ә\":{\"text\":\"\\\\cyrchar\\\\CYRSCHWA{}\"},\"ә\":{\"text\":\"\\\\cyrchar\\\\cyrschwa{}\"},\"Ӡ\":{\"text\":\"\\\\cyrchar\\\\CYRABHDZE{}\"},\"ӡ\":{\"text\":\"\\\\cyrchar\\\\cyrabhdze{}\"},\"Ө\":{\"text\":\"\\\\cyrchar\\\\CYROTLD{}\"},\"ө\":{\"text\":\"\\\\cyrchar\\\\cyrotld{}\"},\"ࡱ\":{\"math\":\"\\\\\\\\backslash{}\"},\"Ḃ\":{\"text\":\"\\\\.B\"},\"ḃ\":{\"text\":\"\\\\.b\"},\"Ḅ\":{\"text\":\"{\\\\d B}\"},\"ḅ\":{\"text\":\"{\\\\d b}\"},\"Ḇ\":{\"text\":\"{\\\\b B}\"},\"ḇ\":{\"text\":\"{\\\\b b}\"},\"Ḋ\":{\"text\":\"\\\\.D\"},\"ḋ\":{\"text\":\"\\\\.d\"},\"Ḍ\":{\"text\":\"{\\\\d D}\"},\"ḍ\":{\"text\":\"{\\\\d d}\"},\"Ḏ\":{\"text\":\"{\\\\b D}\"},\"ḏ\":{\"text\":\"{\\\\b d}\"},\"Ḑ\":{\"text\":\"{\\\\c D}\"},\"ḑ\":{\"text\":\"{\\\\c d}\"},\"Ḟ\":{\"text\":\"\\\\.F\"},\"ḟ\":{\"text\":\"\\\\.f\"},\"Ḡ\":{\"text\":\"\\\\=G\"},\"ḡ\":{\"text\":\"\\\\=g\"},\"Ḣ\":{\"text\":\"\\\\.H\"},\"ḣ\":{\"text\":\"\\\\.h\"},\"Ḥ\":{\"text\":\"{\\\\d H}\"},\"ḥ\":{\"text\":\"{\\\\d h}\"},\"Ḧ\":{\"text\":\"\\\\\\\"H\"},\"ḧ\":{\"text\":\"\\\\\\\"h\"},\"Ḩ\":{\"text\":\"{\\\\c H}\"},\"ḩ\":{\"text\":\"{\\\\c h}\"},\"Ḱ\":{\"text\":\"\\\\'K\"},\"ḱ\":{\"text\":\"\\\\'k\"},\"Ḳ\":{\"text\":\"{\\\\d K}\"},\"ḳ\":{\"text\":\"{\\\\d k}\"},\"Ḵ\":{\"text\":\"{\\\\b K}\"},\"ḵ\":{\"text\":\"{\\\\b k}\"},\"Ḷ\":{\"text\":\"{\\\\d L}\"},\"ḷ\":{\"text\":\"{\\\\d l}\"},\"Ḻ\":{\"text\":\"{\\\\b L}\"},\"ḻ\":{\"text\":\"{\\\\b l}\"},\"Ḿ\":{\"text\":\"\\\\'M\"},\"ḿ\":{\"text\":\"\\\\'m\"},\"Ṁ\":{\"text\":\"\\\\.M\"},\"ṁ\":{\"text\":\"\\\\.m\"},\"Ṃ\":{\"text\":\"{\\\\d M}\"},\"ṃ\":{\"text\":\"{\\\\d m}\"},\"Ṅ\":{\"text\":\"\\\\.N\"},\"ṅ\":{\"text\":\"\\\\.n\"},\"Ṇ\":{\"text\":\"{\\\\d N}\"},\"ṇ\":{\"text\":\"{\\\\d n}\"},\"Ṉ\":{\"text\":\"{\\\\b N}\"},\"ṉ\":{\"text\":\"{\\\\b n}\"},\"Ṕ\":{\"text\":\"\\\\'P\"},\"ṕ\":{\"text\":\"\\\\'p\"},\"Ṗ\":{\"text\":\"\\\\.P\"},\"ṗ\":{\"text\":\"\\\\.p\"},\"Ṙ\":{\"text\":\"\\\\.R\"},\"ṙ\":{\"text\":\"\\\\.r\"},\"Ṛ\":{\"text\":\"{\\\\d R}\"},\"ṛ\":{\"text\":\"{\\\\d r}\"},\"Ṟ\":{\"text\":\"{\\\\b R}\"},\"ṟ\":{\"text\":\"{\\\\b r}\"},\"Ṡ\":{\"text\":\"\\\\.S\"},\"ṡ\":{\"text\":\"\\\\.s\"},\"Ṣ\":{\"text\":\"{\\\\d S}\"},\"ṣ\":{\"text\":\"{\\\\d s}\"},\"Ṫ\":{\"text\":\"\\\\.T\"},\"ṫ\":{\"text\":\"\\\\.t\"},\"Ṭ\":{\"text\":\"{\\\\d T}\"},\"ṭ\":{\"text\":\"{\\\\d t}\"},\"Ṯ\":{\"text\":\"{\\\\b T}\"},\"ṯ\":{\"text\":\"{\\\\b t}\"},\"Ṽ\":{\"text\":\"\\\\~V\"},\"ṽ\":{\"text\":\"\\\\~v\"},\"Ṿ\":{\"text\":\"{\\\\d V}\"},\"ṿ\":{\"text\":\"{\\\\d v}\"},\"Ẁ\":{\"text\":\"\\\\`W\"},\"ẁ\":{\"text\":\"\\\\`w\"},\"Ẃ\":{\"text\":\"\\\\'W\"},\"ẃ\":{\"text\":\"\\\\'w\"},\"Ẅ\":{\"text\":\"\\\\\\\"W\"},\"ẅ\":{\"text\":\"\\\\\\\"w\"},\"Ẇ\":{\"text\":\"\\\\.W\"},\"ẇ\":{\"text\":\"\\\\.w\"},\"Ẉ\":{\"text\":\"{\\\\d W}\"},\"ẉ\":{\"text\":\"{\\\\d w}\"},\"Ẋ\":{\"text\":\"\\\\.X\"},\"ẋ\":{\"text\":\"\\\\.x\"},\"Ẍ\":{\"text\":\"\\\\\\\"X\"},\"ẍ\":{\"text\":\"\\\\\\\"x\"},\"Ẏ\":{\"text\":\"\\\\.Y\"},\"ẏ\":{\"text\":\"\\\\.y\"},\"Ẑ\":{\"text\":\"\\\\^Z\"},\"ẑ\":{\"text\":\"\\\\^z\"},\"Ẓ\":{\"text\":\"{\\\\d Z}\"},\"ẓ\":{\"text\":\"{\\\\d z}\"},\"Ẕ\":{\"text\":\"{\\\\b Z}\"},\"ẕ\":{\"text\":\"{\\\\b z}\"},\"ẖ\":{\"text\":\"{\\\\b h}\"},\"ẗ\":{\"text\":\"\\\\\\\"t\"},\"ẘ\":{\"text\":\"{\\\\r w}\",\"alttext\":[\"\\\\r{w}\"]},\"ẙ\":{\"text\":\"{\\\\r y}\"},\"Ạ\":{\"text\":\"{\\\\d A}\"},\"ạ\":{\"text\":\"{\\\\d a}\"},\"Ẹ\":{\"text\":\"{\\\\d E}\"},\"ẹ\":{\"text\":\"{\\\\d e}\"},\"Ẽ\":{\"text\":\"\\\\~E\"},\"ẽ\":{\"text\":\"\\\\~e\"},\"Ị\":{\"text\":\"{\\\\d I}\"},\"ị\":{\"text\":\"{\\\\d i}\"},\"Ọ\":{\"text\":\"{\\\\d O}\"},\"ọ\":{\"text\":\"{\\\\d o}\"},\"Ụ\":{\"text\":\"{\\\\d U}\"},\"ụ\":{\"text\":\"{\\\\d u}\"},\"Ỳ\":{\"text\":\"\\\\`Y\"},\"ỳ\":{\"text\":\"\\\\`y\"},\"Ỵ\":{\"text\":\"{\\\\d Y}\"},\"ỵ\":{\"text\":\"{\\\\d y}\"},\"Ỹ\":{\"text\":\"\\\\~Y\"},\"ỹ\":{\"text\":\"\\\\~y\"},\" \":{\"text\":\" \",\"space\":true},\" \":{\"math\":\"\\\\quad{}\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.6em}\",\"space\":true},\" \":{\"math\":\"\\\\quad{}\",\"text\":\"\\\\hspace{1em}\",\"space\":true},\" \":{\"text\":\"\\\\;\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.25em}\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.166em}\",\"space\":true},\" \":{\"text\":\"\\\\hphantom{0}\",\"space\":true},\" \":{\"text\":\"\\\\hphantom{,}\",\"space\":true},\" \":{\"text\":\"\\\\,\",\"space\":true},\" \":{\"math\":\"\\\\mkern1mu{}\",\"space\":true},\"​\":{\"text\":\"\\\\mbox{}\",\"space\":true},\"‌\":{\"text\":\"{\\\\aftergroup\\\\ignorespaces}\"},\"‐\":{\"text\":\"-\"},\"‑\":{\"text\":\"-\"},\"‒\":{\"text\":\"-\"},\"–\":{\"text\":\"\\\\textendash{}\"},\"—\":{\"text\":\"\\\\textemdash{}\"},\"―\":{\"math\":\"\\\\horizbar{}\",\"text\":\"\\\\rule{1em}{1pt}\"},\"‖\":{\"math\":\"\\\\Vert{}\"},\"‗\":{\"math\":\"\\\\twolowline{}\"},\"‘\":{\"text\":\"`\"},\"’\":{\"text\":\"'\"},\"‚\":{\"text\":\",\"},\"‛\":{\"math\":\"\\\\Elzreapos{}\"},\"“\":{\"text\":\"``\"},\"”\":{\"text\":\"''\"},\"„\":{\"text\":\",,\"},\"‟\":{\"text\":\"\\\\quotedblbase{}\"},\"†\":{\"math\":\"\\\\dagger{}\",\"text\":\"\\\\textdagger{}\",\"textpackage\":\"textcomp\"},\"‡\":{\"math\":\"\\\\ddagger{}\",\"text\":\"\\\\textdaggerdbl{}\",\"textpackage\":\"textcomp\"},\"•\":{\"math\":\"\\\\bullet{}\",\"text\":\"\\\\textbullet{}\",\"textpackage\":\"textcomp\"},\"‣\":{\"text\":\">\"},\"․\":{\"text\":\".\"},\"‥\":{\"math\":\"\\\\enleadertwodots{}\",\"text\":\"..\"},\"…\":{\"math\":\"\\\\ldots{}\",\"text\":\"\\\\ldots{}\"},\"‧\":{\"text\":\"-\"},\" \":{\"text\":\" \",\"space\":true},\"‰\":{\"text\":\"\\\\textperthousand{}\",\"textpackage\":\"textcomp\"},\"‱\":{\"text\":\"\\\\textpertenthousand{}\",\"textpackage\":\"textcomp\"},\"′\":{\"math\":\"{'}\"},\"″\":{\"math\":\"{''}\"},\"‴\":{\"math\":\"{'''}\"},\"‵\":{\"math\":\"\\\\backprime{}\"},\"‶\":{\"math\":\"\\\\backdprime{}\"},\"‷\":{\"math\":\"\\\\backtrprime{}\"},\"‸\":{\"math\":\"\\\\caretinsert{}\"},\"‹\":{\"text\":\"\\\\guilsinglleft{}\"},\"›\":{\"text\":\"\\\\guilsinglright{}\"},\"‼\":{\"math\":\"\\\\Exclam{}\"},\"‾\":{\"text\":\"-\"},\"⁃\":{\"math\":\"\\\\hyphenbullet{}\"},\"⁄\":{\"math\":\"\\\\fracslash{}\"},\"⁇\":{\"math\":\"\\\\Question{}\"},\"⁈\":{\"text\":\"?!\"},\"⁉\":{\"text\":\"!?\"},\"⁊\":{\"text\":\"7\"},\"⁐\":{\"math\":\"\\\\closure{}\"},\"⁗\":{\"math\":\"''''\"},\" \":{\"math\":\"\\\\:\",\"text\":\"\\\\:\",\"space\":true},\"⁠\":{\"text\":\"\\\\nolinebreak{}\"},\"⁰\":{\"math\":\"^{0}\"},\"⁴\":{\"math\":\"^{4}\"},\"⁵\":{\"math\":\"^{5}\"},\"⁶\":{\"math\":\"^{6}\"},\"⁷\":{\"math\":\"^{7}\"},\"⁸\":{\"math\":\"^{8}\"},\"⁹\":{\"math\":\"^{9}\"},\"⁺\":{\"math\":\"^{+}\"},\"⁻\":{\"math\":\"^{-}\"},\"⁼\":{\"math\":\"^{=}\"},\"⁽\":{\"math\":\"^{(}\"},\"⁾\":{\"math\":\"^{)}\"},\"ⁿ\":{\"text\":\"\\\\textsuperscript{n}\",\"math\":\"^{n}\"},\"ⁱ\":{\"text\":\"\\\\textsuperscript{i}\",\"math\":\"^{i}\"},\"ᵃ\":{\"math\":\"^{a}\",\"text\":\"\\\\textsuperscript{a}\"},\"ᵇ\":{\"math\":\"^{b}\",\"text\":\"\\\\textsuperscript{b}\"},\"ᶜ\":{\"math\":\"^{c}\",\"text\":\"\\\\textsuperscript{c}\"},\"ᵈ\":{\"math\":\"^{d}\",\"text\":\"\\\\textsuperscript{d}\"},\"ᵉ\":{\"math\":\"^{e}\",\"text\":\"\\\\textsuperscript{e}\"},\"ᶠ\":{\"math\":\"^{f}\",\"text\":\"\\\\textsuperscript{f}\"},\"ᵍ\":{\"math\":\"^{g}\",\"text\":\"\\\\textsuperscript{g}\"},\"ʰ\":{\"math\":\"^{h}\",\"text\":\"\\\\textsuperscript{h}\"},\"ʲ\":{\"math\":\"^{j}\",\"text\":\"\\\\textsuperscript{j}\"},\"ᵏ\":{\"math\":\"^{k}\",\"text\":\"\\\\textsuperscript{k}\"},\"ˡ\":{\"math\":\"^{l}\",\"text\":\"\\\\textsuperscript{l}\"},\"ᵐ\":{\"math\":\"^{m}\",\"text\":\"\\\\textsuperscript{m}\"},\"ᵒ\":{\"math\":\"^{o}\",\"text\":\"\\\\textsuperscript{o}\"},\"ᵖ\":{\"math\":\"^{p}\",\"text\":\"\\\\textsuperscript{p}\"},\"ʳ\":{\"math\":\"^{r}\",\"text\":\"\\\\textsuperscript{r}\"},\"ˢ\":{\"math\":\"^{s}\",\"text\":\"\\\\textsuperscript{s}\"},\"ᵗ\":{\"math\":\"^{t}\",\"text\":\"\\\\textsuperscript{t}\"},\"ᵘ\":{\"math\":\"^{u}\",\"text\":\"\\\\textsuperscript{u}\"},\"ᵛ\":{\"math\":\"^{v}\",\"text\":\"\\\\textsuperscript{v}\"},\"ʷ\":{\"math\":\"^{w}\",\"text\":\"\\\\textsuperscript{w}\"},\"ˣ\":{\"math\":\"^{x}\",\"text\":\"\\\\textsuperscript{x}\"},\"ʸ\":{\"math\":\"^{y}\",\"text\":\"\\\\textsuperscript{y}\"},\"ᶻ\":{\"math\":\"^{z}\",\"text\":\"\\\\textsuperscript{z}\"},\"₀\":{\"math\":\"_{0}\"},\"₁\":{\"math\":\"_{1}\"},\"₂\":{\"math\":\"_{2}\"},\"₃\":{\"math\":\"_{3}\"},\"₄\":{\"math\":\"_{4}\"},\"₅\":{\"math\":\"_{5}\"},\"₆\":{\"math\":\"_{6}\"},\"₇\":{\"math\":\"_{7}\"},\"₈\":{\"math\":\"_{8}\"},\"₉\":{\"math\":\"_{9}\"},\"₊\":{\"math\":\"_{+}\"},\"₋\":{\"math\":\"_{-}\"},\"₌\":{\"math\":\"_{=}\"},\"₍\":{\"math\":\"_{(}\"},\"₎\":{\"math\":\"_{)}\"},\"ₐ\":{\"text\":\"\\\\textsubscript{a}\",\"math\":\"_{a}\"},\"ₑ\":{\"text\":\"\\\\textsubscript{e}\",\"math\":\"_{e}\"},\"ₒ\":{\"text\":\"\\\\textsubscript{o}\",\"math\":\"_{o}\"},\"ₓ\":{\"text\":\"\\\\textsubscript{x}\",\"math\":\"_{x}\"},\"ₔ\":{\"text\":\"\\\\textsubscript{\\\\textschwa}\",\"package\":\"tipa\"},\"ₕ\":{\"text\":\"\\\\textsubscript{h}\",\"math\":\"_{h}\"},\"ₖ\":{\"text\":\"\\\\textsubscript{k}\",\"math\":\"_{k}\"},\"ₗ\":{\"text\":\"\\\\textsubscript{l}\",\"math\":\"_{l}\"},\"ₘ\":{\"text\":\"\\\\textsubscript{m}\",\"math\":\"_{m}\"},\"ₙ\":{\"text\":\"\\\\textsubscript{n}\",\"math\":\"_{n}\"},\"ₚ\":{\"text\":\"\\\\textsubscript{p}\",\"math\":\"_{p}\"},\"ₛ\":{\"text\":\"\\\\textsubscript{s}\",\"math\":\"_{s}\"},\"ₜ\":{\"text\":\"\\\\textsubscript{t}\",\"math\":\"_{t}\"},\"₧\":{\"text\":\"\\\\ensuremath{\\\\Elzpes}\"},\"€\":{\"math\":\"\\\\euro{}\",\"text\":\"\\\\texteuro{}\"},\"⃐\":{\"math\":\"\\\\lvec{}\"},\"⃑\":{\"math\":\"\\\\vec{}\"},\"⃒\":{\"math\":\"\\\\vertoverlay{}\"},\"⃖\":{\"math\":\"\\\\LVec{}\"},\"⃗\":{\"math\":\"\\\\vec{}\"},\"⃛\":{\"math\":\"\\\\dddot{}\"},\"⃜\":{\"math\":\"\\\\ddddot{}\"},\"⃝\":{\"math\":\"\\\\enclosecircle{}\"},\"⃞\":{\"math\":\"\\\\enclosesquare{}\"},\"⃟\":{\"math\":\"\\\\enclosediamond{}\"},\"⃡\":{\"math\":\"\\\\overleftrightarrow{}\"},\"⃤\":{\"math\":\"\\\\enclosetriangle{}\"},\"⃧\":{\"math\":\"\\\\annuity{}\"},\"⃨\":{\"math\":\"\\\\threeunderdot{}\"},\"⃩\":{\"math\":\"\\\\widebridgeabove{}\"},\"⃬\":{\"math\":\"\\\\underrightharpoondown{}\"},\"⃭\":{\"math\":\"\\\\underleftharpoondown{}\"},\"⃮\":{\"math\":\"\\\\underleftarrow{}\"},\"⃯\":{\"math\":\"\\\\underrightarrow{}\"},\"⃰\":{\"math\":\"\\\\asteraccent{}\"},\"℀\":{\"text\":\"a/c\"},\"℁\":{\"text\":\"a/s\"},\"ℂ\":{\"math\":\"\\\\mathbb{C}\"},\"℃\":{\"text\":\"\\\\textcelsius{}\"},\"℅\":{\"text\":\"c/o\"},\"℆\":{\"text\":\"c/u\"},\"ℇ\":{\"math\":\"\\\\Euler{}\"},\"℉\":{\"text\":\"F\"},\"ℊ\":{\"math\":\"\\\\mathscr{g}\"},\"ℋ\":{\"math\":\"\\\\mathscr{H}\"},\"ℌ\":{\"math\":\"\\\\mathfrak{H}\"},\"ℍ\":{\"math\":\"\\\\mathbb{H}\"},\"ℎ\":{\"math\":\"\\\\Planckconst{}\"},\"ℏ\":{\"math\":\"\\\\hslash{}\"},\"ℐ\":{\"math\":\"\\\\mathscr{I}\"},\"ℑ\":{\"math\":\"\\\\mathfrak{I}\"},\"ℒ\":{\"math\":\"\\\\mathscr{L}\"},\"ℓ\":{\"math\":\"\\\\mathscr{l}\"},\"ℕ\":{\"math\":\"\\\\mathbb{N}\"},\"№\":{\"text\":\"\\\\cyrchar\\\\textnumero{}\"},\"℗\":{\"text\":\"\\\\textcircledP{}\"},\"℘\":{\"math\":\"\\\\wp{}\"},\"ℙ\":{\"math\":\"\\\\mathbb{P}\"},\"ℚ\":{\"math\":\"\\\\mathbb{Q}\"},\"ℛ\":{\"math\":\"\\\\mathscr{R}\"},\"ℜ\":{\"math\":\"\\\\mathfrak{R}\"},\"ℝ\":{\"math\":\"\\\\mathbb{R}\"},\"℞\":{\"math\":\"\\\\Elzxrat{}\"},\"℠\":{\"text\":\"\\\\textservicemark{}\"},\"℡\":{\"text\":\"TEL\"},\"™\":{\"text\":\"\\\\texttrademark{}\",\"textpackage\":\"textcomp\"},\"ℤ\":{\"math\":\"\\\\mathbb{Z}\"},\"Ω\":{\"math\":\"\\\\Omega{}\"},\"℧\":{\"math\":\"\\\\mho{}\"},\"ℨ\":{\"math\":\"\\\\mathfrak{Z}\"},\"℩\":{\"math\":\"\\\\ElsevierGlyph{2129}\"},\"K\":{\"text\":\"K\"},\"Å\":{\"math\":\"\\\\Angstroem{}\",\"text\":\"\\\\AA{}\"},\"ℬ\":{\"math\":\"\\\\mathscr{B}\"},\"ℭ\":{\"math\":\"\\\\mathfrak{C}\"},\"℮\":{\"text\":\"\\\\textestimated{}\"},\"ℯ\":{\"math\":\"\\\\mathscr{e}\"},\"ℰ\":{\"math\":\"\\\\mathscr{E}\"},\"ℱ\":{\"math\":\"\\\\mathscr{F}\"},\"Ⅎ\":{\"math\":\"\\\\Finv{}\"},\"ℳ\":{\"math\":\"\\\\mathscr{M}\"},\"ℴ\":{\"math\":\"\\\\mathscr{o}\"},\"ℵ\":{\"math\":\"\\\\aleph{}\"},\"ℶ\":{\"math\":\"\\\\beth{}\"},\"ℷ\":{\"math\":\"\\\\gimel{}\"},\"ℸ\":{\"math\":\"\\\\daleth{}\"},\"ℼ\":{\"math\":\"\\\\mathbb{\\\\pi}\"},\"ℽ\":{\"math\":\"\\\\mathbb{\\\\gamma}\"},\"ℾ\":{\"math\":\"\\\\mathbb{\\\\Gamma}\"},\"ℿ\":{\"math\":\"\\\\mathbb{\\\\Pi}\"},\"⅀\":{\"math\":\"\\\\mathbb{\\\\Sigma}\"},\"⅁\":{\"math\":\"\\\\Game{}\"},\"⅂\":{\"math\":\"\\\\sansLturned{}\"},\"⅃\":{\"math\":\"\\\\sansLmirrored{}\"},\"⅄\":{\"math\":\"\\\\Yup{}\"},\"ⅅ\":{\"math\":\"\\\\CapitalDifferentialD{}\"},\"ⅆ\":{\"math\":\"\\\\DifferentialD{}\"},\"ⅇ\":{\"math\":\"\\\\ExponetialE{}\"},\"ⅈ\":{\"math\":\"\\\\ComplexI{}\"},\"ⅉ\":{\"math\":\"\\\\ComplexJ{}\"},\"⅊\":{\"math\":\"\\\\PropertyLine{}\"},\"⅋\":{\"math\":\"\\\\invamp{}\"},\"⅓\":{\"math\":\"\\\\textfrac{1}{3}\"},\"⅔\":{\"math\":\"\\\\textfrac{2}{3}\"},\"⅕\":{\"math\":\"\\\\textfrac{1}{5}\"},\"⅖\":{\"math\":\"\\\\textfrac{2}{5}\"},\"⅗\":{\"math\":\"\\\\textfrac{3}{5}\"},\"⅘\":{\"math\":\"\\\\textfrac{4}{5}\"},\"⅙\":{\"math\":\"\\\\textfrac{1}{6}\"},\"⅚\":{\"math\":\"\\\\textfrac{5}{6}\"},\"⅛\":{\"math\":\"\\\\textfrac{1}{8}\"},\"⅜\":{\"math\":\"\\\\textfrac{3}{8}\"},\"⅝\":{\"math\":\"\\\\textfrac{5}{8}\"},\"⅞\":{\"math\":\"\\\\textfrac{7}{8}\"},\"⅟\":{\"text\":\" 1/\"},\"Ⅰ\":{\"text\":\"I\"},\"Ⅱ\":{\"text\":\"II\"},\"Ⅲ\":{\"text\":\"III\"},\"Ⅳ\":{\"text\":\"IV\"},\"Ⅴ\":{\"text\":\"V\"},\"Ⅵ\":{\"text\":\"VI\"},\"Ⅶ\":{\"text\":\"VII\"},\"Ⅷ\":{\"text\":\"VIII\"},\"Ⅸ\":{\"text\":\"IX\"},\"Ⅹ\":{\"text\":\"X\"},\"Ⅺ\":{\"text\":\"XI\"},\"Ⅻ\":{\"text\":\"XII\"},\"Ⅼ\":{\"text\":\"L\"},\"Ⅽ\":{\"text\":\"C\"},\"Ⅾ\":{\"text\":\"D\"},\"Ⅿ\":{\"text\":\"M\"},\"ⅰ\":{\"text\":\"i\"},\"ⅱ\":{\"text\":\"ii\"},\"ⅲ\":{\"text\":\"iii\"},\"ⅳ\":{\"text\":\"iv\"},\"ⅴ\":{\"text\":\"v\"},\"ⅵ\":{\"text\":\"vi\"},\"ⅶ\":{\"text\":\"vii\"},\"ⅷ\":{\"text\":\"viii\"},\"ⅸ\":{\"text\":\"ix\"},\"ⅹ\":{\"text\":\"x\"},\"ⅺ\":{\"text\":\"xi\"},\"ⅻ\":{\"text\":\"xii\"},\"ⅼ\":{\"text\":\"l\"},\"ⅽ\":{\"text\":\"c\"},\"ⅾ\":{\"text\":\"d\"},\"ⅿ\":{\"text\":\"m\"},\"←\":{\"math\":\"\\\\leftarrow{}\"},\"↑\":{\"math\":\"\\\\uparrow{}\"},\"→\":{\"math\":\"\\\\rightarrow{}\",\"text\":\"\\\\textrightarrow\"},\"↓\":{\"math\":\"\\\\downarrow{}\"},\"↔\":{\"math\":\"\\\\leftrightarrow{}\"},\"↕\":{\"math\":\"\\\\updownarrow{}\"},\"↖\":{\"math\":\"\\\\nwarrow{}\"},\"↗\":{\"math\":\"\\\\nearrow{}\"},\"↘\":{\"math\":\"\\\\searrow{}\"},\"↙\":{\"math\":\"\\\\swarrow{}\"},\"↚\":{\"math\":\"\\\\nleftarrow{}\"},\"↛\":{\"math\":\"\\\\nrightarrow{}\"},\"↜\":{\"math\":\"\\\\arrowwaveleft{}\"},\"↝\":{\"math\":\"\\\\arrowwaveright{}\"},\"↞\":{\"math\":\"\\\\twoheadleftarrow{}\"},\"↟\":{\"math\":\"\\\\twoheaduparrow{}\"},\"↠\":{\"math\":\"\\\\twoheadrightarrow{}\"},\"↡\":{\"math\":\"\\\\twoheaddownarrow{}\"},\"↢\":{\"math\":\"\\\\leftarrowtail{}\"},\"↣\":{\"math\":\"\\\\rightarrowtail{}\"},\"↤\":{\"math\":\"\\\\mapsfrom{}\"},\"↥\":{\"math\":\"\\\\MapsUp{}\"},\"↦\":{\"math\":\"\\\\mapsto{}\"},\"↧\":{\"math\":\"\\\\MapsDown{}\"},\"↨\":{\"math\":\"\\\\updownarrowbar{}\"},\"↩\":{\"math\":\"\\\\hookleftarrow{}\"},\"↪\":{\"math\":\"\\\\hookrightarrow{}\"},\"↫\":{\"math\":\"\\\\looparrowleft{}\"},\"↬\":{\"math\":\"\\\\looparrowright{}\"},\"↭\":{\"math\":\"\\\\leftrightsquigarrow{}\"},\"↮\":{\"math\":\"\\\\nleftrightarrow{}\"},\"↯\":{\"math\":\"\\\\lightning{}\"},\"↰\":{\"math\":\"\\\\Lsh{}\"},\"↱\":{\"math\":\"\\\\Rsh{}\"},\"↲\":{\"math\":\"\\\\dlsh{}\"},\"↳\":{\"math\":\"\\\\ElsevierGlyph{21B3}\"},\"↴\":{\"math\":\"\\\\linefeed{}\"},\"↵\":{\"math\":\"\\\\carriagereturn{}\"},\"↶\":{\"math\":\"\\\\curvearrowleft{}\"},\"↷\":{\"math\":\"\\\\curvearrowright{}\"},\"↸\":{\"math\":\"\\\\barovernorthwestarrow{}\"},\"↹\":{\"math\":\"\\\\barleftarrowrightarrowba{}\"},\"↺\":{\"math\":\"\\\\circlearrowleft{}\"},\"↻\":{\"math\":\"\\\\circlearrowright{}\"},\"↼\":{\"math\":\"\\\\leftharpoonup{}\"},\"↽\":{\"math\":\"\\\\leftharpoondown{}\"},\"↾\":{\"math\":\"\\\\upharpoonright{}\"},\"↿\":{\"math\":\"\\\\upharpoonleft{}\"},\"⇀\":{\"math\":\"\\\\rightharpoonup{}\"},\"⇁\":{\"math\":\"\\\\rightharpoondown{}\"},\"⇂\":{\"math\":\"\\\\downharpoonright{}\"},\"⇃\":{\"math\":\"\\\\downharpoonleft{}\"},\"⇄\":{\"math\":\"\\\\rightleftarrows{}\"},\"⇅\":{\"math\":\"\\\\dblarrowupdown{}\"},\"⇆\":{\"math\":\"\\\\leftrightarrows{}\"},\"⇇\":{\"math\":\"\\\\leftleftarrows{}\"},\"⇈\":{\"math\":\"\\\\upuparrows{}\"},\"⇉\":{\"math\":\"\\\\rightrightarrows{}\"},\"⇊\":{\"math\":\"\\\\downdownarrows{}\"},\"⇋\":{\"math\":\"\\\\leftrightharpoons{}\"},\"⇌\":{\"math\":\"\\\\rightleftharpoons{}\"},\"⇍\":{\"math\":\"\\\\nLeftarrow{}\"},\"⇎\":{\"math\":\"\\\\nLeftrightarrow{}\"},\"⇏\":{\"math\":\"\\\\nRightarrow{}\"},\"⇐\":{\"math\":\"\\\\Leftarrow{}\"},\"⇑\":{\"math\":\"\\\\Uparrow{}\"},\"⇒\":{\"math\":\"\\\\Rightarrow{}\"},\"⇓\":{\"math\":\"\\\\Downarrow{}\"},\"⇔\":{\"math\":\"\\\\Leftrightarrow{}\"},\"⇕\":{\"math\":\"\\\\Updownarrow{}\"},\"⇖\":{\"math\":\"\\\\Nwarrow{}\"},\"⇗\":{\"math\":\"\\\\Nearrow{}\"},\"⇘\":{\"math\":\"\\\\Searrow{}\"},\"⇙\":{\"math\":\"\\\\Swarrow{}\"},\"⇚\":{\"math\":\"\\\\Lleftarrow{}\"},\"⇛\":{\"math\":\"\\\\Rrightarrow{}\"},\"⇜\":{\"math\":\"\\\\leftsquigarrow{}\"},\"⇝\":{\"math\":\"\\\\rightsquigarrow{}\"},\"⇞\":{\"math\":\"\\\\nHuparrow{}\"},\"⇟\":{\"math\":\"\\\\nHdownarrow{}\"},\"⇠\":{\"math\":\"\\\\dashleftarrow{}\"},\"⇡\":{\"math\":\"\\\\updasharrow{}\"},\"⇢\":{\"math\":\"\\\\dashrightarrow{}\"},\"⇣\":{\"math\":\"\\\\downdasharrow{}\"},\"⇤\":{\"math\":\"\\\\LeftArrowBar{}\"},\"⇥\":{\"math\":\"\\\\RightArrowBar{}\"},\"⇦\":{\"math\":\"\\\\leftwhitearrow{}\"},\"⇧\":{\"math\":\"\\\\upwhitearrow{}\"},\"⇨\":{\"math\":\"\\\\rightwhitearrow{}\"},\"⇩\":{\"math\":\"\\\\downwhitearrow{}\"},\"⇪\":{\"math\":\"\\\\whitearrowupfrombar{}\"},\"⇴\":{\"math\":\"\\\\circleonrightarrow{}\"},\"⇵\":{\"math\":\"\\\\DownArrowUpArrow{}\"},\"⇶\":{\"math\":\"\\\\rightthreearrows{}\"},\"⇷\":{\"math\":\"\\\\nvleftarrow{}\"},\"⇸\":{\"math\":\"\\\\pfun{}\"},\"⇹\":{\"math\":\"\\\\nvleftrightarrow{}\"},\"⇺\":{\"math\":\"\\\\nVleftarrow{}\"},\"⇻\":{\"math\":\"\\\\ffun{}\"},\"⇼\":{\"math\":\"\\\\nVleftrightarrow{}\"},\"⇽\":{\"math\":\"\\\\leftarrowtriangle{}\"},\"⇾\":{\"math\":\"\\\\rightarrowtriangle{}\"},\"⇿\":{\"math\":\"\\\\leftrightarrowtriangle{}\"},\"∀\":{\"math\":\"\\\\forall{}\"},\"∁\":{\"math\":\"\\\\complement{}\"},\"∂\":{\"math\":\"\\\\partial{}\"},\"∃\":{\"math\":\"\\\\exists{}\"},\"∄\":{\"math\":\"\\\\nexists{}\"},\"∅\":{\"math\":\"\\\\varnothing{}\"},\"∆\":{\"math\":\"\\\\increment{}\"},\"∇\":{\"math\":\"\\\\nabla{}\"},\"∈\":{\"math\":\"\\\\in{}\"},\"∉\":{\"math\":\"\\\\not\\\\in{}\"},\"∊\":{\"math\":\"\\\\smallin{}\"},\"∋\":{\"math\":\"\\\\ni{}\"},\"∌\":{\"math\":\"\\\\not\\\\ni{}\"},\"∍\":{\"math\":\"\\\\smallni{}\"},\"∎\":{\"math\":\"\\\\QED{}\"},\"∏\":{\"math\":\"\\\\prod{}\"},\"∐\":{\"math\":\"\\\\coprod{}\"},\"∑\":{\"math\":\"\\\\sum{}\"},\"−\":{\"math\":\"-\",\"text\":\"-\"},\"∓\":{\"math\":\"\\\\mp{}\"},\"∔\":{\"math\":\"\\\\dotplus{}\"},\"∕\":{\"math\":\"\\\\slash{}\"},\"∖\":{\"math\":\"\\\\setminus{}\"},\"∗\":{\"math\":\"{_\\\\ast}\"},\"∘\":{\"math\":\"\\\\circ{}\"},\"∙\":{\"math\":\"\\\\bullet{}\"},\"√\":{\"math\":\"\\\\surd{}\"},\"∛\":{\"math\":\"\\\\sqrt[3]\"},\"∜\":{\"math\":\"\\\\sqrt[4]\"},\"∝\":{\"math\":\"\\\\propto{}\"},\"∞\":{\"math\":\"\\\\infty{}\"},\"∟\":{\"math\":\"\\\\rightangle{}\"},\"∠\":{\"math\":\"\\\\angle{}\"},\"∡\":{\"math\":\"\\\\measuredangle{}\"},\"∢\":{\"math\":\"\\\\sphericalangle{}\"},\"∣\":{\"math\":\"\\\\mid{}\"},\"∤\":{\"math\":\"\\\\nmid{}\"},\"∥\":{\"math\":\"\\\\parallel{}\"},\"∦\":{\"math\":\"\\\\nparallel{}\"},\"∧\":{\"math\":\"\\\\wedge{}\"},\"∨\":{\"math\":\"\\\\vee{}\"},\"∩\":{\"math\":\"\\\\cap{}\"},\"∪\":{\"math\":\"\\\\cup{}\"},\"∫\":{\"math\":\"\\\\int{}\"},\"∬\":{\"math\":\"{\\\\int\\\\!\\\\int}\"},\"∭\":{\"math\":\"{\\\\int\\\\!\\\\int\\\\!\\\\int}\"},\"∮\":{\"math\":\"\\\\oint{}\"},\"∯\":{\"math\":\"\\\\surfintegral{}\"},\"∰\":{\"math\":\"\\\\volintegral{}\"},\"∱\":{\"math\":\"\\\\clwintegral{}\"},\"∲\":{\"math\":\"\\\\ElsevierGlyph{2232}\"},\"∳\":{\"math\":\"\\\\ElsevierGlyph{2233}\"},\"∴\":{\"math\":\"\\\\therefore{}\"},\"∵\":{\"math\":\"\\\\because{}\"},\"∶\":{\"math\":\":\"},\"∷\":{\"math\":\"\\\\Colon{}\"},\"∸\":{\"math\":\"\\\\ElsevierGlyph{2238}\"},\"∹\":{\"math\":\"\\\\eqcolon{}\"},\"∺\":{\"math\":\"\\\\mathbin{{:}\\\\!\\\\!{-}\\\\!\\\\!{:}}\"},\"∻\":{\"math\":\"\\\\homothetic{}\"},\"∼\":{\"math\":\"\\\\sim{}\"},\"∽\":{\"math\":\"\\\\backsim{}\"},\"∾\":{\"math\":\"\\\\lazysinv{}\"},\"∿\":{\"math\":\"\\\\AC{}\"},\"≀\":{\"math\":\"\\\\wr{}\"},\"≁\":{\"math\":\"\\\\not\\\\sim{}\"},\"≂\":{\"math\":\"\\\\ElsevierGlyph{2242}\"},\"≃\":{\"math\":\"\\\\simeq{}\"},\"≄\":{\"math\":\"\\\\not\\\\simeq{}\"},\"≅\":{\"math\":\"\\\\cong{}\"},\"≆\":{\"math\":\"\\\\approxnotequal{}\"},\"≇\":{\"math\":\"\\\\not\\\\cong{}\"},\"≈\":{\"math\":\"\\\\approx{}\"},\"≉\":{\"math\":\"\\\\not\\\\approx{}\"},\"≊\":{\"math\":\"\\\\approxeq{}\"},\"≋\":{\"math\":\"\\\\tildetrpl{}\"},\"≌\":{\"math\":\"\\\\allequal{}\"},\"≍\":{\"math\":\"\\\\asymp{}\"},\"≎\":{\"math\":\"\\\\Bumpeq{}\"},\"≏\":{\"math\":\"\\\\bumpeq{}\"},\"≐\":{\"math\":\"\\\\doteq{}\"},\"≑\":{\"math\":\"\\\\doteqdot{}\"},\"≒\":{\"math\":\"\\\\fallingdotseq{}\"},\"≓\":{\"math\":\"\\\\risingdotseq{}\"},\"≔\":{\"math\":\"\\\\coloneq{}\",\"text\":\":=\"},\"≕\":{\"math\":\"=:\"},\"≖\":{\"math\":\"\\\\eqcirc{}\"},\"≗\":{\"math\":\"\\\\circeq{}\"},\"≘\":{\"math\":\"\\\\arceq{}\"},\"≙\":{\"math\":\"\\\\estimates{}\"},\"≚\":{\"math\":\"\\\\ElsevierGlyph{225A}\"},\"≛\":{\"math\":\"\\\\starequal{}\"},\"≜\":{\"math\":\"\\\\triangleq{}\"},\"≝\":{\"math\":\"\\\\eqdef{}\"},\"≞\":{\"math\":\"\\\\measeq{}\"},\"≟\":{\"math\":\"\\\\ElsevierGlyph{225F}\"},\"≠\":{\"math\":\"\\\\not =\"},\"≡\":{\"math\":\"\\\\equiv{}\"},\"≢\":{\"math\":\"\\\\not\\\\equiv{}\"},\"≣\":{\"math\":\"\\\\Equiv{}\"},\"≤\":{\"math\":\"\\\\leq{}\"},\"≥\":{\"math\":\"\\\\geq{}\"},\"≦\":{\"math\":\"\\\\leqq{}\"},\"≧\":{\"math\":\"\\\\geqq{}\"},\"≨\":{\"math\":\"\\\\lneqq{}\"},\"≩\":{\"math\":\"\\\\gneqq{}\"},\"≪\":{\"math\":\"\\\\ll{}\"},\"≫\":{\"math\":\"\\\\gg{}\"},\"≬\":{\"math\":\"\\\\between{}\"},\"≭\":{\"math\":\"{\\\\not\\\\kern-0.3em\\\\times}\"},\"≮\":{\"math\":\"\\\\not<\"},\"≯\":{\"math\":\"\\\\not>\"},\"≰\":{\"math\":\"\\\\not\\\\leq{}\"},\"≱\":{\"math\":\"\\\\not\\\\geq{}\"},\"≲\":{\"math\":\"\\\\lessequivlnt{}\"},\"≳\":{\"math\":\"\\\\greaterequivlnt{}\"},\"≴\":{\"math\":\"\\\\ElsevierGlyph{2274}\"},\"≵\":{\"math\":\"\\\\ElsevierGlyph{2275}\"},\"≶\":{\"math\":\"\\\\lessgtr{}\"},\"≷\":{\"math\":\"\\\\gtrless{}\"},\"≸\":{\"math\":\"\\\\notlessgreater{}\"},\"≹\":{\"math\":\"\\\\notgreaterless{}\"},\"≺\":{\"math\":\"\\\\prec{}\"},\"≻\":{\"math\":\"\\\\succ{}\"},\"≼\":{\"math\":\"\\\\preccurlyeq{}\"},\"≽\":{\"math\":\"\\\\succcurlyeq{}\"},\"≾\":{\"math\":\"\\\\precapprox{}\"},\"≿\":{\"math\":\"\\\\succapprox{}\"},\"⊀\":{\"math\":\"\\\\not\\\\prec{}\"},\"⊁\":{\"math\":\"\\\\not\\\\succ{}\"},\"⊂\":{\"math\":\"\\\\subset{}\"},\"⊃\":{\"math\":\"\\\\supset{}\"},\"⊄\":{\"math\":\"\\\\not\\\\subset{}\"},\"⊅\":{\"math\":\"\\\\not\\\\supset{}\"},\"⊆\":{\"math\":\"\\\\subseteq{}\"},\"⊇\":{\"math\":\"\\\\supseteq{}\"},\"⊈\":{\"math\":\"\\\\not\\\\subseteq{}\"},\"⊉\":{\"math\":\"\\\\not\\\\supseteq{}\"},\"⊊\":{\"math\":\"\\\\subsetneq{}\"},\"⊋\":{\"math\":\"\\\\supsetneq{}\"},\"⊌\":{\"math\":\"\\\\cupleftarrow{}\"},\"⊍\":{\"math\":\"\\\\cupdot{}\"},\"⊎\":{\"math\":\"\\\\uplus{}\"},\"⊏\":{\"math\":\"\\\\sqsubset{}\"},\"⊐\":{\"math\":\"\\\\sqsupset{}\"},\"⊑\":{\"math\":\"\\\\sqsubseteq{}\"},\"⊒\":{\"math\":\"\\\\sqsupseteq{}\"},\"⊓\":{\"math\":\"\\\\sqcap{}\"},\"⊔\":{\"math\":\"\\\\sqcup{}\"},\"⊕\":{\"math\":\"\\\\oplus{}\"},\"⊖\":{\"math\":\"\\\\ominus{}\"},\"⊗\":{\"math\":\"\\\\otimes{}\"},\"⊘\":{\"math\":\"\\\\oslash{}\"},\"⊙\":{\"math\":\"\\\\odot{}\"},\"⊚\":{\"math\":\"\\\\circledcirc{}\"},\"⊛\":{\"math\":\"\\\\circledast{}\"},\"⊜\":{\"math\":\"\\\\circledequal{}\"},\"⊝\":{\"math\":\"\\\\circleddash{}\"},\"⊞\":{\"math\":\"\\\\boxplus{}\"},\"⊟\":{\"math\":\"\\\\boxminus{}\"},\"⊠\":{\"math\":\"\\\\boxtimes{}\"},\"⊡\":{\"math\":\"\\\\boxdot{}\"},\"⊢\":{\"math\":\"\\\\vdash{}\"},\"⊣\":{\"math\":\"\\\\dashv{}\"},\"⊤\":{\"math\":\"\\\\top{}\"},\"⊥\":{\"math\":\"\\\\perp{}\"},\"⊦\":{\"math\":\"\\\\assert{}\"},\"⊧\":{\"math\":\"\\\\truestate{}\"},\"⊨\":{\"math\":\"\\\\forcesextra{}\"},\"⊩\":{\"math\":\"\\\\Vdash{}\"},\"⊪\":{\"math\":\"\\\\Vvdash{}\"},\"⊫\":{\"math\":\"\\\\VDash{}\"},\"⊬\":{\"math\":\"\\\\nvdash{}\"},\"⊭\":{\"math\":\"\\\\nvDash{}\"},\"⊮\":{\"math\":\"\\\\nVdash{}\"},\"⊯\":{\"math\":\"\\\\nVDash{}\"},\"⊰\":{\"math\":\"\\\\prurel{}\"},\"⊱\":{\"math\":\"\\\\scurel{}\"},\"⊲\":{\"math\":\"\\\\vartriangleleft{}\"},\"⊳\":{\"math\":\"\\\\vartriangleright{}\"},\"⊴\":{\"math\":\"\\\\trianglelefteq{}\"},\"⊵\":{\"math\":\"\\\\trianglerighteq{}\"},\"⊶\":{\"math\":\"\\\\original{}\"},\"⊷\":{\"math\":\"\\\\image{}\"},\"⊸\":{\"math\":\"\\\\multimap{}\"},\"⊹\":{\"math\":\"\\\\hermitconjmatrix{}\"},\"⊺\":{\"math\":\"\\\\intercal{}\"},\"⊻\":{\"math\":\"\\\\veebar{}\"},\"⊼\":{\"math\":\"\\\\barwedge{}\"},\"⊽\":{\"math\":\"\\\\barvee{}\"},\"⊾\":{\"math\":\"\\\\rightanglearc{}\"},\"⊿\":{\"math\":\"\\\\varlrtriangle{}\"},\"⋀\":{\"math\":\"\\\\ElsevierGlyph{22C0}\"},\"⋁\":{\"math\":\"\\\\ElsevierGlyph{22C1}\"},\"⋂\":{\"math\":\"\\\\bigcap{}\"},\"⋃\":{\"math\":\"\\\\bigcup{}\"},\"⋄\":{\"math\":\"\\\\diamond{}\"},\"⋅\":{\"math\":\"\\\\cdot{}\"},\"⋆\":{\"math\":\"\\\\star{}\"},\"⋇\":{\"math\":\"\\\\divideontimes{}\"},\"⋈\":{\"math\":\"\\\\bowtie{}\"},\"⋉\":{\"math\":\"\\\\ltimes{}\"},\"⋊\":{\"math\":\"\\\\rtimes{}\"},\"⋋\":{\"math\":\"\\\\leftthreetimes{}\"},\"⋌\":{\"math\":\"\\\\rightthreetimes{}\"},\"⋍\":{\"math\":\"\\\\backsimeq{}\"},\"⋎\":{\"math\":\"\\\\curlyvee{}\"},\"⋏\":{\"math\":\"\\\\curlywedge{}\"},\"⋐\":{\"math\":\"\\\\Subset{}\"},\"⋑\":{\"math\":\"\\\\Supset{}\"},\"⋒\":{\"math\":\"\\\\Cap{}\"},\"⋓\":{\"math\":\"\\\\Cup{}\"},\"⋔\":{\"math\":\"\\\\pitchfork{}\"},\"⋕\":{\"math\":\"\\\\hash{}\"},\"⋖\":{\"math\":\"\\\\lessdot{}\"},\"⋗\":{\"math\":\"\\\\gtrdot{}\"},\"⋘\":{\"math\":\"\\\\verymuchless{}\"},\"⋙\":{\"math\":\"\\\\verymuchgreater{}\"},\"⋚\":{\"math\":\"\\\\lesseqgtr{}\"},\"⋛\":{\"math\":\"\\\\gtreqless{}\"},\"⋜\":{\"math\":\"\\\\eqless{}\"},\"⋝\":{\"math\":\"\\\\eqgtr{}\"},\"⋞\":{\"math\":\"\\\\curlyeqprec{}\"},\"⋟\":{\"math\":\"\\\\curlyeqsucc{}\"},\"⋠\":{\"math\":\"\\\\npreceq{}\"},\"⋡\":{\"math\":\"\\\\nsucceq{}\"},\"⋢\":{\"math\":\"\\\\not\\\\sqsubseteq{}\"},\"⋣\":{\"math\":\"\\\\not\\\\sqsupseteq{}\"},\"⋤\":{\"math\":\"\\\\sqsubsetneq{}\"},\"⋥\":{\"math\":\"\\\\Elzsqspne{}\"},\"⋦\":{\"math\":\"\\\\lnsim{}\"},\"⋧\":{\"math\":\"\\\\gnsim{}\"},\"⋨\":{\"math\":\"\\\\precedesnotsimilar{}\"},\"⋩\":{\"math\":\"\\\\succnsim{}\"},\"⋪\":{\"math\":\"\\\\ntriangleleft{}\"},\"⋫\":{\"math\":\"\\\\ntriangleright{}\"},\"⋬\":{\"math\":\"\\\\ntrianglelefteq{}\"},\"⋭\":{\"math\":\"\\\\ntrianglerighteq{}\"},\"⋮\":{\"math\":\"\\\\vdots{}\"},\"⋯\":{\"math\":\"\\\\cdots{}\"},\"⋰\":{\"math\":\"\\\\upslopeellipsis{}\"},\"⋱\":{\"math\":\"\\\\downslopeellipsis{}\"},\"⋲\":{\"math\":\"\\\\disin{}\"},\"⋳\":{\"math\":\"\\\\varisins{}\"},\"⋴\":{\"math\":\"\\\\isins{}\"},\"⋵\":{\"math\":\"\\\\isindot{}\"},\"⋶\":{\"math\":\"\\\\barin{}\"},\"⋷\":{\"math\":\"\\\\isinobar{}\"},\"⋸\":{\"math\":\"\\\\isinvb{}\"},\"⋹\":{\"math\":\"\\\\isinE{}\"},\"⋺\":{\"math\":\"\\\\nisd{}\"},\"⋻\":{\"math\":\"\\\\varnis{}\"},\"⋼\":{\"math\":\"\\\\nis{}\"},\"⋽\":{\"math\":\"\\\\varniobar{}\"},\"⋾\":{\"math\":\"\\\\niobar{}\"},\"⋿\":{\"math\":\"\\\\bagmember{}\"},\"⌀\":{\"math\":\"\\\\diameter{}\"},\"⌂\":{\"math\":\"\\\\house{}\"},\"⌅\":{\"math\":\"\\\\varbarwedge{}\",\"text\":\"\\\\barwedge{}\"},\"⌆\":{\"math\":\"\\\\perspcorrespond{}\"},\"⌈\":{\"math\":\"\\\\lceil{}\"},\"⌉\":{\"math\":\"\\\\rceil{}\"},\"⌊\":{\"math\":\"\\\\lfloor{}\"},\"⌋\":{\"math\":\"\\\\rfloor{}\"},\"⌐\":{\"math\":\"\\\\invneg{}\"},\"⌑\":{\"math\":\"\\\\wasylozenge{}\"},\"⌒\":{\"math\":\"\\\\profline{}\"},\"⌓\":{\"math\":\"\\\\profsurf{}\"},\"⌕\":{\"math\":\"\\\\recorder{}\"},\"⌖\":{\"math\":\"{\\\\mathchar\\\"2208}\"},\"⌗\":{\"math\":\"\\\\viewdata{}\"},\"⌙\":{\"math\":\"\\\\turnednot{}\"},\"⌜\":{\"math\":\"\\\\ulcorner{}\"},\"⌝\":{\"math\":\"\\\\urcorner{}\"},\"⌞\":{\"math\":\"\\\\llcorner{}\"},\"⌟\":{\"math\":\"\\\\lrcorner{}\"},\"⌠\":{\"math\":\"\\\\inttop{}\"},\"⌡\":{\"math\":\"\\\\intbottom{}\"},\"⌢\":{\"math\":\"\\\\frown{}\"},\"⌣\":{\"math\":\"\\\\smile{}\"},\"〈\":{\"math\":\"\\\\langle{}\"},\"〉\":{\"math\":\"\\\\rangle{}\"},\"⌬\":{\"math\":\"\\\\varhexagonlrbonds{}\"},\"⌲\":{\"math\":\"\\\\conictaper{}\"},\"⌶\":{\"math\":\"\\\\topbot{}\"},\"⌹\":{\"math\":\"\\\\APLinv{}\"},\"⌽\":{\"math\":\"\\\\ElsevierGlyph{E838}\"},\"⌿\":{\"math\":\"\\\\notslash{}\"},\"⍀\":{\"math\":\"\\\\notbackslash{}\"},\"⍇\":{\"math\":\"\\\\APLleftarrowbox{}\"},\"⍈\":{\"math\":\"\\\\APLrightarrowbox{}\"},\"⍉\":{\"math\":\"\\\\invdiameter{}\"},\"⍐\":{\"math\":\"\\\\APLuparrowbox{}\"},\"⍓\":{\"math\":\"\\\\APLboxupcaret{}\"},\"⍗\":{\"math\":\"\\\\APLdownarrowbox{}\"},\"⍝\":{\"math\":\"\\\\APLcomment{}\"},\"⍞\":{\"math\":\"\\\\APLinput{}\"},\"⍟\":{\"math\":\"\\\\APLlog{}\"},\"⍰\":{\"math\":\"\\\\APLboxquestion{}\"},\"⍼\":{\"math\":\"\\\\rangledownzigzagarrow{}\"},\"⎔\":{\"math\":\"\\\\hexagon{}\"},\"⎛\":{\"math\":\"\\\\lparenuend{}\"},\"⎜\":{\"math\":\"\\\\lparenextender{}\"},\"⎝\":{\"math\":\"\\\\lparenlend{}\"},\"⎞\":{\"math\":\"\\\\rparenuend{}\"},\"⎟\":{\"math\":\"\\\\rparenextender{}\"},\"⎠\":{\"math\":\"\\\\rparenlend{}\"},\"⎡\":{\"math\":\"\\\\lbrackuend{}\"},\"⎢\":{\"math\":\"\\\\lbrackextender{}\"},\"⎣\":{\"math\":\"\\\\Elzdlcorn{}\"},\"⎤\":{\"math\":\"\\\\rbrackuend{}\"},\"⎥\":{\"math\":\"\\\\rbrackextender{}\"},\"⎦\":{\"math\":\"\\\\rbracklend{}\"},\"⎧\":{\"math\":\"\\\\lbraceuend{}\"},\"⎨\":{\"math\":\"\\\\lbracemid{}\"},\"⎩\":{\"math\":\"\\\\lbracelend{}\"},\"⎪\":{\"math\":\"\\\\vbraceextender{}\"},\"⎫\":{\"math\":\"\\\\rbraceuend{}\"},\"⎬\":{\"math\":\"\\\\rbracemid{}\"},\"⎭\":{\"math\":\"\\\\rbracelend{}\"},\"⎮\":{\"math\":\"\\\\intextender{}\"},\"⎯\":{\"math\":\"\\\\harrowextender{}\"},\"⎰\":{\"math\":\"\\\\lmoustache{}\"},\"⎱\":{\"math\":\"\\\\rmoustache{}\"},\"⎲\":{\"math\":\"\\\\sumtop{}\"},\"⎳\":{\"math\":\"\\\\sumbottom{}\"},\"⎴\":{\"math\":\"\\\\overbracket{}\"},\"⎵\":{\"math\":\"\\\\underbracket{}\"},\"⎶\":{\"math\":\"\\\\bbrktbrk{}\"},\"⎷\":{\"math\":\"\\\\sqrtbottom{}\"},\"⎸\":{\"math\":\"\\\\lvboxline{}\"},\"⎹\":{\"math\":\"\\\\rvboxline{}\"},\"⏎\":{\"math\":\"\\\\varcarriagereturn{}\"},\"⏜\":{\"math\":\"\\\\overparen{}\"},\"⏝\":{\"math\":\"\\\\underparen{}\"},\"⏞\":{\"math\":\"\\\\overbrace{}\"},\"⏟\":{\"math\":\"\\\\underbrace{}\"},\"⏠\":{\"math\":\"\\\\obrbrak{}\"},\"⏡\":{\"math\":\"\\\\ubrbrak{}\"},\"⏢\":{\"math\":\"\\\\trapezium{}\"},\"⏣\":{\"math\":\"\\\\benzenr{}\"},\"⏤\":{\"math\":\"\\\\strns{}\"},\"⏥\":{\"math\":\"\\\\fltns{}\"},\"⏦\":{\"math\":\"\\\\accurrent{}\"},\"⏧\":{\"math\":\"\\\\elinters{}\"},\"␀\":{\"text\":\"NUL\"},\"␁\":{\"text\":\"SOH\"},\"␂\":{\"text\":\"STX\"},\"␃\":{\"text\":\"ETX\"},\"␄\":{\"text\":\"EOT\"},\"␅\":{\"text\":\"ENQ\"},\"␆\":{\"text\":\"ACK\"},\"␇\":{\"text\":\"BEL\"},\"␈\":{\"text\":\"BS\"},\"␉\":{\"text\":\"HT\"},\"␊\":{\"text\":\"LF\"},\"␋\":{\"text\":\"VT\"},\"␌\":{\"text\":\"FF\"},\"␍\":{\"text\":\"CR\"},\"␎\":{\"text\":\"SO\"},\"␏\":{\"text\":\"SI\"},\"␐\":{\"text\":\"DLE\"},\"␑\":{\"text\":\"DC1\"},\"␒\":{\"text\":\"DC2\"},\"␓\":{\"text\":\"DC3\"},\"␔\":{\"text\":\"DC4\"},\"␕\":{\"text\":\"NAK\"},\"␖\":{\"text\":\"SYN\"},\"␗\":{\"text\":\"ETB\"},\"␘\":{\"text\":\"CAN\"},\"␙\":{\"text\":\"EM\"},\"␚\":{\"text\":\"SUB\"},\"␛\":{\"text\":\"ESC\"},\"␜\":{\"text\":\"FS\"},\"␝\":{\"text\":\"GS\"},\"␞\":{\"text\":\"RS\"},\"␟\":{\"text\":\"US\"},\"␠\":{\"text\":\"SP\"},\"␡\":{\"text\":\"DEL\"},\"␣\":{\"text\":\"\\\\textvisiblespace{}\"},\"␤\":{\"text\":\"NL\"},\"␥\":{\"text\":\"///\"},\"␦\":{\"text\":\"?\"},\"①\":{\"text\":\"\\\\ding{172}\"},\"②\":{\"text\":\"\\\\ding{173}\"},\"③\":{\"text\":\"\\\\ding{174}\"},\"④\":{\"text\":\"\\\\ding{175}\"},\"⑤\":{\"text\":\"\\\\ding{176}\"},\"⑥\":{\"text\":\"\\\\ding{177}\"},\"⑦\":{\"text\":\"\\\\ding{178}\"},\"⑧\":{\"text\":\"\\\\ding{179}\"},\"⑨\":{\"text\":\"\\\\ding{180}\"},\"⑩\":{\"text\":\"\\\\ding{181}\"},\"⑪\":{\"text\":\"(11)\"},\"⑫\":{\"text\":\"(12)\"},\"⑬\":{\"text\":\"(13)\"},\"⑭\":{\"text\":\"(14)\"},\"⑮\":{\"text\":\"(15)\"},\"⑯\":{\"text\":\"(16)\"},\"⑰\":{\"text\":\"(17)\"},\"⑱\":{\"text\":\"(18)\"},\"⑲\":{\"text\":\"(19)\"},\"⑳\":{\"text\":\"(20)\"},\"⑴\":{\"text\":\"(1)\"},\"⑵\":{\"text\":\"(2)\"},\"⑶\":{\"text\":\"(3)\"},\"⑷\":{\"text\":\"(4)\"},\"⑸\":{\"text\":\"(5)\"},\"⑹\":{\"text\":\"(6)\"},\"⑺\":{\"text\":\"(7)\"},\"⑻\":{\"text\":\"(8)\"},\"⑼\":{\"text\":\"(9)\"},\"⑽\":{\"text\":\"(10)\"},\"⑾\":{\"text\":\"(11)\"},\"⑿\":{\"text\":\"(12)\"},\"⒀\":{\"text\":\"(13)\"},\"⒁\":{\"text\":\"(14)\"},\"⒂\":{\"text\":\"(15)\"},\"⒃\":{\"text\":\"(16)\"},\"⒄\":{\"text\":\"(17)\"},\"⒅\":{\"text\":\"(18)\"},\"⒆\":{\"text\":\"(19)\"},\"⒇\":{\"text\":\"(20)\"},\"⒈\":{\"text\":\"1.\"},\"⒉\":{\"text\":\"2.\"},\"⒊\":{\"text\":\"3.\"},\"⒋\":{\"text\":\"4.\"},\"⒌\":{\"text\":\"5.\"},\"⒍\":{\"text\":\"6.\"},\"⒎\":{\"text\":\"7.\"},\"⒏\":{\"text\":\"8.\"},\"⒐\":{\"text\":\"9.\"},\"⒑\":{\"text\":\"10.\"},\"⒒\":{\"text\":\"11.\"},\"⒓\":{\"text\":\"12.\"},\"⒔\":{\"text\":\"13.\"},\"⒕\":{\"text\":\"14.\"},\"⒖\":{\"text\":\"15.\"},\"⒗\":{\"text\":\"16.\"},\"⒘\":{\"text\":\"17.\"},\"⒙\":{\"text\":\"18.\"},\"⒚\":{\"text\":\"19.\"},\"⒛\":{\"text\":\"20.\"},\"⒜\":{\"text\":\"(a)\"},\"⒝\":{\"text\":\"(b)\"},\"⒞\":{\"text\":\"(c)\"},\"⒟\":{\"text\":\"(d)\"},\"⒠\":{\"text\":\"(e)\"},\"⒡\":{\"text\":\"(f)\"},\"⒢\":{\"text\":\"(g)\"},\"⒣\":{\"text\":\"(h)\"},\"⒤\":{\"text\":\"(i)\"},\"⒥\":{\"text\":\"(j)\"},\"⒦\":{\"text\":\"(k)\"},\"⒧\":{\"text\":\"(l)\"},\"⒨\":{\"text\":\"(m)\"},\"⒩\":{\"text\":\"(n)\"},\"⒪\":{\"text\":\"(o)\"},\"⒫\":{\"text\":\"(p)\"},\"⒬\":{\"text\":\"(q)\"},\"⒭\":{\"text\":\"(r)\"},\"⒮\":{\"text\":\"(s)\"},\"⒯\":{\"text\":\"(t)\"},\"⒰\":{\"text\":\"(u)\"},\"⒱\":{\"text\":\"(v)\"},\"⒲\":{\"text\":\"(w)\"},\"⒳\":{\"text\":\"(x)\"},\"⒴\":{\"text\":\"(y)\"},\"⒵\":{\"text\":\"(z)\"},\"Ⓐ\":{\"text\":\"(A)\"},\"Ⓑ\":{\"text\":\"(B)\"},\"Ⓒ\":{\"text\":\"(C)\"},\"Ⓓ\":{\"text\":\"(D)\"},\"Ⓔ\":{\"text\":\"(E)\"},\"Ⓕ\":{\"text\":\"(F)\"},\"Ⓖ\":{\"text\":\"(G)\"},\"Ⓗ\":{\"text\":\"(H)\"},\"Ⓘ\":{\"text\":\"(I)\"},\"Ⓙ\":{\"text\":\"(J)\"},\"Ⓚ\":{\"text\":\"(K)\"},\"Ⓛ\":{\"text\":\"(L)\"},\"Ⓜ\":{\"text\":\"(M)\"},\"Ⓝ\":{\"text\":\"(N)\"},\"Ⓞ\":{\"text\":\"(O)\"},\"Ⓟ\":{\"text\":\"(P)\"},\"Ⓠ\":{\"text\":\"(Q)\"},\"Ⓡ\":{\"text\":\"(R)\"},\"Ⓢ\":{\"math\":\"\\\\circledS{}\"},\"Ⓣ\":{\"text\":\"(T)\"},\"Ⓤ\":{\"text\":\"(U)\"},\"Ⓥ\":{\"text\":\"(V)\"},\"Ⓦ\":{\"text\":\"(W)\"},\"Ⓧ\":{\"text\":\"(X)\"},\"Ⓨ\":{\"text\":\"(Y)\"},\"Ⓩ\":{\"text\":\"(Z)\"},\"ⓐ\":{\"text\":\"(a)\"},\"ⓑ\":{\"text\":\"(b)\"},\"ⓒ\":{\"text\":\"(c)\"},\"ⓓ\":{\"text\":\"(d)\"},\"ⓔ\":{\"text\":\"(e)\"},\"ⓕ\":{\"text\":\"(f)\"},\"ⓖ\":{\"text\":\"(g)\"},\"ⓗ\":{\"text\":\"(h)\"},\"ⓘ\":{\"text\":\"(i)\"},\"ⓙ\":{\"text\":\"(j)\"},\"ⓚ\":{\"text\":\"(k)\"},\"ⓛ\":{\"text\":\"(l)\"},\"ⓜ\":{\"text\":\"(m)\"},\"ⓝ\":{\"text\":\"(n)\"},\"ⓞ\":{\"text\":\"(o)\"},\"ⓟ\":{\"text\":\"(p)\"},\"ⓠ\":{\"text\":\"(q)\"},\"ⓡ\":{\"text\":\"(r)\"},\"ⓢ\":{\"text\":\"(s)\"},\"ⓣ\":{\"text\":\"(t)\"},\"ⓤ\":{\"text\":\"(u)\"},\"ⓥ\":{\"text\":\"(v)\"},\"ⓦ\":{\"text\":\"(w)\"},\"ⓧ\":{\"text\":\"(x)\"},\"ⓨ\":{\"text\":\"(y)\"},\"ⓩ\":{\"text\":\"(z)\"},\"⓪\":{\"text\":\"(0)\"},\"─\":{\"text\":\"-\"},\"━\":{\"text\":\"=\"},\"│\":{\"text\":\"|\"},\"┃\":{\"text\":\"|\"},\"┄\":{\"text\":\"-\"},\"┅\":{\"text\":\"=\"},\"┆\":{\"math\":\"\\\\Elzdshfnc{}\"},\"┇\":{\"text\":\"|\"},\"┈\":{\"text\":\"-\"},\"┉\":{\"text\":\"=\"},\"┊\":{\"text\":\"|\"},\"┋\":{\"text\":\"|\"},\"┌\":{\"text\":\"+\"},\"┍\":{\"text\":\"+\"},\"┎\":{\"text\":\"+\"},\"┏\":{\"text\":\"+\"},\"┐\":{\"text\":\"+\"},\"┑\":{\"text\":\"+\"},\"┒\":{\"text\":\"+\"},\"┓\":{\"text\":\"+\"},\"└\":{\"text\":\"+\"},\"┕\":{\"text\":\"+\"},\"┖\":{\"text\":\"+\"},\"┗\":{\"text\":\"+\"},\"┘\":{\"text\":\"+\"},\"┙\":{\"math\":\"\\\\Elzsqfnw{}\"},\"┚\":{\"text\":\"+\"},\"┛\":{\"text\":\"+\"},\"├\":{\"text\":\"+\"},\"┝\":{\"text\":\"+\"},\"┞\":{\"text\":\"+\"},\"┟\":{\"text\":\"+\"},\"┠\":{\"text\":\"+\"},\"┡\":{\"text\":\"+\"},\"┢\":{\"text\":\"+\"},\"┣\":{\"text\":\"+\"},\"┤\":{\"text\":\"+\"},\"┥\":{\"text\":\"+\"},\"┦\":{\"text\":\"+\"},\"┧\":{\"text\":\"+\"},\"┨\":{\"text\":\"+\"},\"┩\":{\"text\":\"+\"},\"┪\":{\"text\":\"+\"},\"┫\":{\"text\":\"+\"},\"┬\":{\"text\":\"+\"},\"┭\":{\"text\":\"+\"},\"┮\":{\"text\":\"+\"},\"┯\":{\"text\":\"+\"},\"┰\":{\"text\":\"+\"},\"┱\":{\"text\":\"+\"},\"┲\":{\"text\":\"+\"},\"┳\":{\"text\":\"+\"},\"┴\":{\"text\":\"+\"},\"┵\":{\"text\":\"+\"},\"┶\":{\"text\":\"+\"},\"┷\":{\"text\":\"+\"},\"┸\":{\"text\":\"+\"},\"┹\":{\"text\":\"+\"},\"┺\":{\"text\":\"+\"},\"┻\":{\"text\":\"+\"},\"┼\":{\"text\":\"+\"},\"┽\":{\"text\":\"+\"},\"┾\":{\"text\":\"+\"},\"┿\":{\"text\":\"+\"},\"╀\":{\"text\":\"+\"},\"╁\":{\"text\":\"+\"},\"╂\":{\"text\":\"+\"},\"╃\":{\"text\":\"+\"},\"╄\":{\"text\":\"+\"},\"╅\":{\"text\":\"+\"},\"╆\":{\"text\":\"+\"},\"╇\":{\"text\":\"+\"},\"╈\":{\"text\":\"+\"},\"╉\":{\"text\":\"+\"},\"╊\":{\"text\":\"+\"},\"╋\":{\"text\":\"+\"},\"╌\":{\"text\":\"-\"},\"╍\":{\"text\":\"=\"},\"╎\":{\"text\":\"|\"},\"╏\":{\"text\":\"|\"},\"═\":{\"text\":\"=\"},\"║\":{\"text\":\"|\"},\"╒\":{\"text\":\"+\"},\"╓\":{\"text\":\"+\"},\"╔\":{\"text\":\"+\"},\"╕\":{\"text\":\"+\"},\"╖\":{\"text\":\"+\"},\"╗\":{\"text\":\"+\"},\"╘\":{\"text\":\"+\"},\"╙\":{\"text\":\"+\"},\"╚\":{\"text\":\"+\"},\"╛\":{\"text\":\"+\"},\"╜\":{\"text\":\"+\"},\"╝\":{\"text\":\"+\"},\"╞\":{\"text\":\"+\"},\"╟\":{\"text\":\"+\"},\"╠\":{\"text\":\"+\"},\"╡\":{\"text\":\"+\"},\"╢\":{\"text\":\"+\"},\"╣\":{\"text\":\"+\"},\"╤\":{\"text\":\"+\"},\"╥\":{\"text\":\"+\"},\"╦\":{\"text\":\"+\"},\"╧\":{\"text\":\"+\"},\"╨\":{\"text\":\"+\"},\"╩\":{\"text\":\"+\"},\"╪\":{\"text\":\"+\"},\"╫\":{\"text\":\"+\"},\"╬\":{\"text\":\"+\"},\"╭\":{\"text\":\"+\"},\"╮\":{\"text\":\"+\"},\"╯\":{\"text\":\"+\"},\"╰\":{\"text\":\"+\"},\"╱\":{\"math\":\"\\\\diagup{}\"},\"╲\":{\"text\":\"\\\\\"},\"╳\":{\"text\":\"X\"},\"╼\":{\"text\":\"-\"},\"╽\":{\"text\":\"|\"},\"╾\":{\"text\":\"-\"},\"╿\":{\"text\":\"|\"},\"▀\":{\"math\":\"\\\\blockuphalf{}\"},\"▄\":{\"math\":\"\\\\blocklowhalf{}\"},\"█\":{\"math\":\"\\\\blockfull{}\"},\"▌\":{\"math\":\"\\\\blocklefthalf{}\"},\"▐\":{\"math\":\"\\\\blockrighthalf{}\"},\"░\":{\"math\":\"\\\\blockqtrshaded{}\"},\"▒\":{\"math\":\"\\\\blockhalfshaded{}\"},\"▓\":{\"math\":\"\\\\blockthreeqtrshaded{}\"},\"■\":{\"math\":\"\\\\mdlgblksquare{}\",\"text\":\"\\\\ding{110}\"},\"□\":{\"math\":\"\\\\square{}\"},\"▢\":{\"math\":\"\\\\squoval{}\"},\"▣\":{\"math\":\"\\\\blackinwhitesquare{}\"},\"▤\":{\"math\":\"\\\\squarehfill{}\"},\"▥\":{\"math\":\"\\\\squarevfill{}\"},\"▦\":{\"math\":\"\\\\squarehvfill{}\"},\"▧\":{\"math\":\"\\\\squarenwsefill{}\"},\"▨\":{\"math\":\"\\\\squareneswfill{}\"},\"▩\":{\"math\":\"\\\\squarecrossfill{}\"},\"▪\":{\"math\":\"\\\\blacksquare{}\"},\"▫\":{\"math\":\"\\\\smwhtsquare{}\"},\"▬\":{\"math\":\"\\\\hrectangleblack{}\"},\"▭\":{\"math\":\"\\\\fbox{~~}\"},\"▮\":{\"math\":\"\\\\vrectangleblack{}\"},\"▯\":{\"math\":\"\\\\Elzvrecto{}\"},\"▰\":{\"math\":\"\\\\parallelogramblack{}\"},\"▱\":{\"math\":\"\\\\ElsevierGlyph{E381}\"},\"▲\":{\"math\":\"\\\\bigblacktriangleup{}\",\"text\":\"\\\\ding{115}\"},\"△\":{\"math\":\"\\\\bigtriangleup{}\"},\"▴\":{\"math\":\"\\\\blacktriangle{}\"},\"▵\":{\"math\":\"\\\\vartriangle{}\"},\"▶\":{\"math\":\"\\\\RHD{}\"},\"▷\":{\"math\":\"\\\\rhd{}\"},\"▸\":{\"math\":\"\\\\blacktriangleright{}\"},\"▹\":{\"math\":\"\\\\triangleright{}\"},\"►\":{\"math\":\"\\\\blackpointerright{}\"},\"▻\":{\"math\":\"\\\\whitepointerright{}\"},\"▼\":{\"math\":\"\\\\bigblacktriangledown{}\",\"text\":\"\\\\ding{116}\"},\"▽\":{\"math\":\"\\\\bigtriangledown{}\"},\"▾\":{\"math\":\"\\\\blacktriangledown{}\"},\"▿\":{\"math\":\"\\\\triangledown{}\"},\"◀\":{\"math\":\"\\\\LHD{}\"},\"◁\":{\"math\":\"\\\\lhd{}\"},\"◂\":{\"math\":\"\\\\blacktriangleleft{}\"},\"◃\":{\"math\":\"\\\\triangleleft{}\"},\"◄\":{\"math\":\"\\\\blackpointerleft{}\"},\"◅\":{\"math\":\"\\\\whitepointerleft{}\"},\"◆\":{\"math\":\"\\\\Diamondblack{}\",\"text\":\"\\\\ding{117}\"},\"◇\":{\"math\":\"\\\\Diamond{}\"},\"◈\":{\"math\":\"\\\\blackinwhitediamond{}\"},\"◉\":{\"math\":\"\\\\fisheye{}\"},\"◊\":{\"math\":\"\\\\lozenge{}\"},\"○\":{\"math\":\"\\\\bigcirc{}\"},\"◌\":{\"math\":\"\\\\dottedcircle{}\"},\"◍\":{\"math\":\"\\\\circlevertfill{}\"},\"◎\":{\"math\":\"\\\\bullseye{}\"},\"●\":{\"math\":\"\\\\CIRCLE{}\",\"text\":\"\\\\ding{108}\"},\"◐\":{\"math\":\"\\\\Elzcirfl{}\"},\"◑\":{\"math\":\"\\\\Elzcirfr{}\"},\"◒\":{\"math\":\"\\\\Elzcirfb{}\"},\"◓\":{\"math\":\"\\\\circletophalfblack{}\"},\"◔\":{\"math\":\"\\\\circleurquadblack{}\"},\"◕\":{\"math\":\"\\\\blackcircleulquadwhite{}\"},\"◖\":{\"math\":\"\\\\LEFTCIRCLE{}\"},\"◗\":{\"math\":\"\\\\RIGHTCIRCLE{}\",\"text\":\"\\\\ding{119}\"},\"◘\":{\"math\":\"\\\\Elzrvbull{}\"},\"◙\":{\"math\":\"\\\\inversewhitecircle{}\"},\"◚\":{\"math\":\"\\\\invwhiteupperhalfcircle{}\"},\"◛\":{\"math\":\"\\\\invwhitelowerhalfcircle{}\"},\"◜\":{\"math\":\"\\\\ularc{}\"},\"◝\":{\"math\":\"\\\\urarc{}\"},\"◞\":{\"math\":\"\\\\lrarc{}\"},\"◟\":{\"math\":\"\\\\llarc{}\"},\"◠\":{\"math\":\"\\\\topsemicircle{}\"},\"◡\":{\"math\":\"\\\\botsemicircle{}\"},\"◢\":{\"math\":\"\\\\lrblacktriangle{}\"},\"◣\":{\"math\":\"\\\\llblacktriangle{}\"},\"◤\":{\"math\":\"\\\\ulblacktriangle{}\"},\"◥\":{\"math\":\"\\\\urblacktriangle{}\"},\"◦\":{\"math\":\"\\\\smwhtcircle{}\"},\"◧\":{\"math\":\"\\\\Elzsqfl{}\"},\"◨\":{\"math\":\"\\\\Elzsqfr{}\"},\"◩\":{\"math\":\"\\\\squareulblack{}\"},\"◪\":{\"math\":\"\\\\Elzsqfse{}\"},\"◫\":{\"math\":\"\\\\boxbar{}\"},\"◬\":{\"math\":\"\\\\trianglecdot{}\"},\"◭\":{\"math\":\"\\\\triangleleftblack{}\"},\"◮\":{\"math\":\"\\\\trianglerightblack{}\"},\"◯\":{\"math\":\"\\\\bigcirc{}\"},\"◰\":{\"math\":\"\\\\squareulquad{}\"},\"◱\":{\"math\":\"\\\\squarellquad{}\"},\"◲\":{\"math\":\"\\\\squarelrquad{}\"},\"◳\":{\"math\":\"\\\\squareurquad{}\"},\"◴\":{\"math\":\"\\\\circleulquad{}\"},\"◵\":{\"math\":\"\\\\circlellquad{}\"},\"◶\":{\"math\":\"\\\\circlelrquad{}\"},\"◷\":{\"math\":\"\\\\circleurquad{}\"},\"◸\":{\"math\":\"\\\\ultriangle{}\"},\"◹\":{\"math\":\"\\\\urtriangle{}\"},\"◺\":{\"math\":\"\\\\lltriangle{}\"},\"◻\":{\"math\":\"\\\\square{}\"},\"◼\":{\"math\":\"\\\\blacksquare{}\"},\"◽\":{\"math\":\"\\\\mdsmwhtsquare{}\"},\"◾\":{\"math\":\"\\\\mdsmblksquare{}\"},\"◿\":{\"math\":\"\\\\lrtriangle{}\"},\"★\":{\"math\":\"\\\\bigstar{}\",\"text\":\"\\\\ding{72}\"},\"☆\":{\"math\":\"\\\\bigwhitestar{}\",\"text\":\"\\\\ding{73}\"},\"☉\":{\"math\":\"\\\\Sun{}\"},\"☎\":{\"text\":\"\\\\ding{37}\"},\"☐\":{\"math\":\"\\\\Square{}\"},\"☑\":{\"math\":\"\\\\CheckedBox{}\"},\"☒\":{\"math\":\"\\\\XBox{}\"},\"☓\":{\"text\":\"X\"},\"☕\":{\"math\":\"\\\\steaming{}\"},\"☛\":{\"text\":\"\\\\ding{42}\"},\"☞\":{\"math\":\"\\\\pointright{}\",\"text\":\"\\\\ding{43}\"},\"☠\":{\"math\":\"\\\\skull{}\"},\"☡\":{\"math\":\"\\\\danger{}\"},\"☢\":{\"math\":\"\\\\radiation{}\"},\"☣\":{\"math\":\"\\\\biohazard{}\"},\"☯\":{\"math\":\"\\\\yinyang{}\"},\"☹\":{\"math\":\"\\\\frownie{}\"},\"☺\":{\"math\":\"\\\\smiley{}\"},\"☻\":{\"math\":\"\\\\blacksmiley{}\"},\"☼\":{\"math\":\"\\\\sun{}\"},\"☽\":{\"math\":\"\\\\rightmoon{}\"},\"☾\":{\"math\":\"\\\\leftmoon{}\",\"text\":\"\\\\rightmoon{}\"},\"☿\":{\"math\":\"\\\\mercury{}\",\"text\":\"\\\\mercury{}\"},\"♀\":{\"math\":\"\\\\female{}\",\"text\":\"\\\\venus{}\"},\"♁\":{\"math\":\"\\\\earth{}\"},\"♂\":{\"math\":\"\\\\male{}\",\"text\":\"\\\\male{}\"},\"♃\":{\"math\":\"\\\\jupiter{}\",\"text\":\"\\\\jupiter{}\"},\"♄\":{\"math\":\"\\\\saturn{}\",\"text\":\"\\\\saturn{}\"},\"♅\":{\"math\":\"\\\\uranus{}\",\"text\":\"\\\\uranus{}\"},\"♆\":{\"math\":\"\\\\neptune{}\",\"text\":\"\\\\neptune{}\"},\"♇\":{\"math\":\"\\\\pluto{}\",\"text\":\"\\\\pluto{}\"},\"♈\":{\"math\":\"\\\\aries{}\",\"text\":\"\\\\aries{}\"},\"♉\":{\"math\":\"\\\\taurus{}\",\"text\":\"\\\\taurus{}\"},\"♊\":{\"math\":\"\\\\gemini{}\",\"text\":\"\\\\gemini{}\"},\"♋\":{\"math\":\"\\\\cancer{}\",\"text\":\"\\\\cancer{}\"},\"♌\":{\"math\":\"\\\\leo{}\",\"text\":\"\\\\leo{}\"},\"♍\":{\"math\":\"\\\\virgo{}\",\"text\":\"\\\\virgo{}\"},\"♎\":{\"math\":\"\\\\libra{}\",\"text\":\"\\\\libra{}\"},\"♏\":{\"math\":\"\\\\scorpio{}\",\"text\":\"\\\\scorpio{}\"},\"♐\":{\"math\":\"\\\\sagittarius{}\",\"text\":\"\\\\sagittarius{}\"},\"♑\":{\"math\":\"\\\\capricornus{}\",\"text\":\"\\\\capricornus{}\"},\"♒\":{\"math\":\"\\\\aquarius{}\",\"text\":\"\\\\aquarius{}\"},\"♓\":{\"math\":\"\\\\pisces{}\",\"text\":\"\\\\pisces{}\"},\"♠\":{\"math\":\"\\\\spadesuit{}\",\"text\":\"\\\\ding{171}\"},\"♡\":{\"math\":\"\\\\heartsuit{}\"},\"♢\":{\"math\":\"\\\\diamond{}\"},\"♣\":{\"math\":\"\\\\clubsuit{}\",\"text\":\"\\\\ding{168}\"},\"♤\":{\"math\":\"\\\\varspadesuit{}\"},\"♥\":{\"math\":\"\\\\varheartsuit{}\",\"text\":\"\\\\ding{170}\"},\"♦\":{\"math\":\"\\\\vardiamondsuit{}\",\"text\":\"\\\\ding{169}\"},\"♧\":{\"math\":\"\\\\varclubsuit{}\"},\"♩\":{\"math\":\"\\\\quarternote{}\",\"text\":\"\\\\quarternote{}\"},\"♪\":{\"math\":\"\\\\eighthnote{}\",\"text\":\"\\\\eighthnote{}\"},\"♫\":{\"math\":\"\\\\twonotes{}\"},\"♬\":{\"math\":\"\\\\sixteenthnote{}\"},\"♭\":{\"math\":\"\\\\flat{}\"},\"♮\":{\"math\":\"\\\\natural{}\"},\"♯\":{\"math\":\"\\\\sharp{}\"},\"♻\":{\"math\":\"\\\\recycle{}\"},\"♾\":{\"math\":\"\\\\acidfree{}\"},\"⚀\":{\"math\":\"\\\\dicei{}\"},\"⚁\":{\"math\":\"\\\\diceii{}\"},\"⚂\":{\"math\":\"\\\\diceiii{}\"},\"⚃\":{\"math\":\"\\\\diceiv{}\"},\"⚄\":{\"math\":\"\\\\dicev{}\"},\"⚅\":{\"math\":\"\\\\dicevi{}\"},\"⚆\":{\"math\":\"\\\\circledrightdot{}\"},\"⚇\":{\"math\":\"\\\\circledtwodots{}\"},\"⚈\":{\"math\":\"\\\\blackcircledrightdot{}\"},\"⚉\":{\"math\":\"\\\\blackcircledtwodots{}\"},\"⚓\":{\"math\":\"\\\\anchor{}\"},\"⚔\":{\"math\":\"\\\\swords{}\"},\"⚠\":{\"math\":\"\\\\warning{}\"},\"⚥\":{\"math\":\"\\\\Hermaphrodite{}\"},\"⚪\":{\"math\":\"\\\\medcirc{}\"},\"⚫\":{\"math\":\"\\\\medbullet{}\"},\"⚬\":{\"math\":\"\\\\mdsmwhtcircle{}\"},\"⚲\":{\"math\":\"\\\\neuter{}\"},\"✁\":{\"text\":\"\\\\ding{33}\"},\"✂\":{\"text\":\"\\\\ding{34}\"},\"✃\":{\"text\":\"\\\\ding{35}\"},\"✄\":{\"text\":\"\\\\ding{36}\"},\"✆\":{\"text\":\"\\\\ding{38}\"},\"✇\":{\"text\":\"\\\\ding{39}\"},\"✈\":{\"text\":\"\\\\ding{40}\"},\"✉\":{\"text\":\"\\\\ding{41}\"},\"✌\":{\"text\":\"\\\\ding{44}\"},\"✍\":{\"text\":\"\\\\ding{45}\"},\"✎\":{\"math\":\"\\\\pencil{}\",\"text\":\"\\\\ding{46}\"},\"✏\":{\"text\":\"\\\\ding{47}\"},\"✐\":{\"text\":\"\\\\ding{48}\"},\"✑\":{\"text\":\"\\\\ding{49}\"},\"✒\":{\"text\":\"\\\\ding{50}\"},\"✓\":{\"math\":\"\\\\checkmark{}\",\"text\":\"\\\\ding{51}\"},\"✔\":{\"text\":\"\\\\ding{52}\"},\"✕\":{\"text\":\"\\\\ding{53}\"},\"✖\":{\"text\":\"\\\\ding{54}\"},\"✗\":{\"math\":\"\\\\ballotx{}\",\"text\":\"\\\\ding{55}\"},\"✘\":{\"text\":\"\\\\ding{56}\"},\"✙\":{\"text\":\"\\\\ding{57}\"},\"✚\":{\"text\":\"\\\\ding{58}\"},\"✛\":{\"text\":\"\\\\ding{59}\"},\"✜\":{\"text\":\"\\\\ding{60}\"},\"✝\":{\"text\":\"\\\\ding{61}\"},\"✞\":{\"text\":\"\\\\ding{62}\"},\"✟\":{\"text\":\"\\\\ding{63}\"},\"✠\":{\"math\":\"\\\\maltese{}\",\"text\":\"\\\\ding{64}\"},\"✡\":{\"text\":\"\\\\ding{65}\"},\"✢\":{\"text\":\"\\\\ding{66}\"},\"✣\":{\"text\":\"\\\\ding{67}\"},\"✤\":{\"text\":\"\\\\ding{68}\"},\"✥\":{\"text\":\"\\\\ding{69}\"},\"✦\":{\"text\":\"\\\\ding{70}\"},\"✧\":{\"text\":\"\\\\ding{71}\"},\"✩\":{\"text\":\"\\\\ding{73}\"},\"✪\":{\"math\":\"\\\\circledstar{}\",\"text\":\"\\\\ding{74}\"},\"✫\":{\"text\":\"\\\\ding{75}\"},\"✬\":{\"text\":\"\\\\ding{76}\"},\"✭\":{\"text\":\"\\\\ding{77}\"},\"✮\":{\"text\":\"\\\\ding{78}\"},\"✯\":{\"text\":\"\\\\ding{79}\"},\"✰\":{\"text\":\"\\\\ding{80}\"},\"✱\":{\"text\":\"\\\\ding{81}\"},\"✲\":{\"text\":\"\\\\ding{82}\"},\"✳\":{\"text\":\"\\\\ding{83}\"},\"✴\":{\"text\":\"\\\\ding{84}\"},\"✵\":{\"text\":\"\\\\ding{85}\"},\"✶\":{\"math\":\"\\\\varstar{}\",\"text\":\"\\\\ding{86}\"},\"✷\":{\"text\":\"\\\\ding{87}\"},\"✸\":{\"text\":\"\\\\ding{88}\"},\"✹\":{\"text\":\"\\\\ding{89}\"},\"✺\":{\"text\":\"\\\\ding{90}\"},\"✻\":{\"text\":\"\\\\ding{91}\"},\"✼\":{\"text\":\"\\\\ding{92}\"},\"✽\":{\"math\":\"\\\\dingasterisk{}\",\"text\":\"\\\\ding{93}\"},\"✾\":{\"text\":\"\\\\ding{94}\"},\"✿\":{\"text\":\"\\\\ding{95}\"},\"❀\":{\"text\":\"\\\\ding{96}\"},\"❁\":{\"text\":\"\\\\ding{97}\"},\"❂\":{\"text\":\"\\\\ding{98}\"},\"❃\":{\"text\":\"\\\\ding{99}\"},\"❄\":{\"text\":\"\\\\ding{100}\"},\"❅\":{\"text\":\"\\\\ding{101}\"},\"❆\":{\"text\":\"\\\\ding{102}\"},\"❇\":{\"text\":\"\\\\ding{103}\"},\"❈\":{\"text\":\"\\\\ding{104}\"},\"❉\":{\"text\":\"\\\\ding{105}\"},\"❊\":{\"text\":\"\\\\ding{106}\"},\"❋\":{\"text\":\"\\\\ding{107}\"},\"❍\":{\"text\":\"\\\\ding{109}\"},\"❏\":{\"text\":\"\\\\ding{111}\"},\"❐\":{\"text\":\"\\\\ding{112}\"},\"❑\":{\"text\":\"\\\\ding{113}\"},\"❒\":{\"text\":\"\\\\ding{114}\"},\"❖\":{\"text\":\"\\\\ding{118}\"},\"❘\":{\"text\":\"\\\\ding{120}\"},\"❙\":{\"text\":\"\\\\ding{121}\"},\"❚\":{\"text\":\"\\\\ding{122}\"},\"❛\":{\"text\":\"\\\\ding{123}\"},\"❜\":{\"text\":\"\\\\ding{124}\"},\"❝\":{\"text\":\"\\\\ding{125}\"},\"❞\":{\"text\":\"\\\\ding{126}\"},\"❡\":{\"text\":\"\\\\ding{161}\"},\"❢\":{\"text\":\"\\\\ding{162}\"},\"❣\":{\"text\":\"\\\\ding{163}\"},\"❤\":{\"text\":\"\\\\ding{164}\"},\"❥\":{\"text\":\"\\\\ding{165}\"},\"❦\":{\"text\":\"\\\\ding{166}\"},\"❧\":{\"text\":\"\\\\ding{167}\"},\"❲\":{\"math\":\"\\\\lbrbrak{}\"},\"❳\":{\"math\":\"\\\\rbrbrak{}\"},\"❶\":{\"text\":\"\\\\ding{182}\"},\"❷\":{\"text\":\"\\\\ding{183}\"},\"❸\":{\"text\":\"\\\\ding{184}\"},\"❹\":{\"text\":\"\\\\ding{185}\"},\"❺\":{\"text\":\"\\\\ding{186}\"},\"❻\":{\"text\":\"\\\\ding{187}\"},\"❼\":{\"text\":\"\\\\ding{188}\"},\"❽\":{\"text\":\"\\\\ding{189}\"},\"❾\":{\"text\":\"\\\\ding{190}\"},\"❿\":{\"text\":\"\\\\ding{191}\"},\"➀\":{\"text\":\"\\\\ding{192}\"},\"➁\":{\"text\":\"\\\\ding{193}\"},\"➂\":{\"text\":\"\\\\ding{194}\"},\"➃\":{\"text\":\"\\\\ding{195}\"},\"➄\":{\"text\":\"\\\\ding{196}\"},\"➅\":{\"text\":\"\\\\ding{197}\"},\"➆\":{\"text\":\"\\\\ding{198}\"},\"➇\":{\"text\":\"\\\\ding{199}\"},\"➈\":{\"text\":\"\\\\ding{200}\"},\"➉\":{\"text\":\"\\\\ding{201}\"},\"➊\":{\"text\":\"\\\\ding{202}\"},\"➋\":{\"text\":\"\\\\ding{203}\"},\"➌\":{\"text\":\"\\\\ding{204}\"},\"➍\":{\"text\":\"\\\\ding{205}\"},\"➎\":{\"text\":\"\\\\ding{206}\"},\"➏\":{\"text\":\"\\\\ding{207}\"},\"➐\":{\"text\":\"\\\\ding{208}\"},\"➑\":{\"text\":\"\\\\ding{209}\"},\"➒\":{\"text\":\"\\\\ding{210}\"},\"➓\":{\"text\":\"\\\\ding{211}\"},\"➔\":{\"text\":\"\\\\ding{212}\"},\"➘\":{\"text\":\"\\\\ding{216}\"},\"➙\":{\"text\":\"\\\\ding{217}\"},\"➚\":{\"text\":\"\\\\ding{218}\"},\"➛\":{\"math\":\"\\\\draftingarrow{}\",\"text\":\"\\\\ding{219}\"},\"➜\":{\"text\":\"\\\\ding{220}\"},\"➝\":{\"text\":\"\\\\ding{221}\"},\"➞\":{\"text\":\"\\\\ding{222}\"},\"➟\":{\"text\":\"\\\\ding{223}\"},\"➠\":{\"text\":\"\\\\ding{224}\"},\"➡\":{\"text\":\"\\\\ding{225}\"},\"➢\":{\"math\":\"\\\\arrowbullet{}\",\"text\":\"\\\\ding{226}\"},\"➣\":{\"text\":\"\\\\ding{227}\"},\"➤\":{\"text\":\"\\\\ding{228}\"},\"➥\":{\"text\":\"\\\\ding{229}\"},\"➦\":{\"text\":\"\\\\ding{230}\"},\"➧\":{\"text\":\"\\\\ding{231}\"},\"➨\":{\"text\":\"\\\\ding{232}\"},\"➩\":{\"text\":\"\\\\ding{233}\"},\"➪\":{\"text\":\"\\\\ding{234}\"},\"➫\":{\"text\":\"\\\\ding{235}\"},\"➬\":{\"text\":\"\\\\ding{236}\"},\"➭\":{\"text\":\"\\\\ding{237}\"},\"➮\":{\"text\":\"\\\\ding{238}\"},\"➯\":{\"text\":\"\\\\ding{239}\"},\"➱\":{\"text\":\"\\\\ding{241}\"},\"➲\":{\"text\":\"\\\\ding{242}\"},\"➳\":{\"text\":\"\\\\ding{243}\"},\"➴\":{\"text\":\"\\\\ding{244}\"},\"➵\":{\"text\":\"\\\\ding{245}\"},\"➶\":{\"text\":\"\\\\ding{246}\"},\"➷\":{\"text\":\"\\\\ding{247}\"},\"➸\":{\"text\":\"\\\\ding{248}\"},\"➹\":{\"text\":\"\\\\ding{249}\"},\"➺\":{\"text\":\"\\\\ding{250}\"},\"➻\":{\"text\":\"\\\\ding{251}\"},\"➼\":{\"text\":\"\\\\ding{252}\"},\"➽\":{\"text\":\"\\\\ding{253}\"},\"➾\":{\"text\":\"\\\\ding{254}\"},\"⟀\":{\"math\":\"\\\\threedangle{}\"},\"⟁\":{\"math\":\"\\\\whiteinwhitetriangle{}\"},\"⟂\":{\"math\":\"\\\\perp{}\"},\"⟃\":{\"math\":\"\\\\subsetcirc{}\"},\"⟄\":{\"math\":\"\\\\supsetcirc{}\"},\"⟅\":{\"math\":\"\\\\Lbag{}\"},\"⟆\":{\"math\":\"\\\\Rbag{}\"},\"⟇\":{\"math\":\"\\\\veedot{}\"},\"⟈\":{\"math\":\"\\\\bsolhsub{}\"},\"⟉\":{\"math\":\"\\\\suphsol{}\"},\"⟌\":{\"math\":\"\\\\longdivision{}\"},\"⟐\":{\"math\":\"\\\\Diamonddot{}\"},\"⟑\":{\"math\":\"\\\\wedgedot{}\"},\"⟒\":{\"math\":\"\\\\upin{}\"},\"⟓\":{\"math\":\"\\\\pullback{}\"},\"⟔\":{\"math\":\"\\\\pushout{}\"},\"⟕\":{\"math\":\"\\\\leftouterjoin{}\"},\"⟖\":{\"math\":\"\\\\rightouterjoin{}\"},\"⟗\":{\"math\":\"\\\\fullouterjoin{}\"},\"⟘\":{\"math\":\"\\\\bigbot{}\"},\"⟙\":{\"math\":\"\\\\bigtop{}\"},\"⟚\":{\"math\":\"\\\\DashVDash{}\"},\"⟛\":{\"math\":\"\\\\dashVdash{}\"},\"⟜\":{\"math\":\"\\\\multimapinv{}\"},\"⟝\":{\"math\":\"\\\\vlongdash{}\"},\"⟞\":{\"math\":\"\\\\longdashv{}\"},\"⟟\":{\"math\":\"\\\\cirbot{}\"},\"⟠\":{\"math\":\"\\\\lozengeminus{}\"},\"⟡\":{\"math\":\"\\\\concavediamond{}\"},\"⟢\":{\"math\":\"\\\\concavediamondtickleft{}\"},\"⟣\":{\"math\":\"\\\\concavediamondtickright{}\"},\"⟤\":{\"math\":\"\\\\whitesquaretickleft{}\"},\"⟥\":{\"math\":\"\\\\whitesquaretickright{}\"},\"⟦\":{\"math\":\"\\\\llbracket{}\"},\"⟧\":{\"math\":\"\\\\rrbracket{}\"},\"⟨\":{\"math\":\"\\\\langle{}\",\"text\":\"\\\\langle{}\"},\"⟩\":{\"math\":\"\\\\rangle{}\",\"text\":\"\\\\rangle{}\"},\"⟪\":{\"math\":\"\\\\lang{}\"},\"⟫\":{\"math\":\"\\\\rang{}\"},\"⟬\":{\"math\":\"\\\\Lbrbrak{}\"},\"⟭\":{\"math\":\"\\\\Rbrbrak{}\"},\"⟮\":{\"math\":\"\\\\lgroup{}\"},\"⟯\":{\"math\":\"\\\\rgroup{}\"},\"⟰\":{\"math\":\"\\\\UUparrow{}\"},\"⟱\":{\"math\":\"\\\\DDownarrow{}\"},\"⟲\":{\"math\":\"\\\\acwgapcirclearrow{}\"},\"⟳\":{\"math\":\"\\\\cwgapcirclearrow{}\"},\"⟴\":{\"math\":\"\\\\rightarrowonoplus{}\"},\"⟵\":{\"math\":\"\\\\longleftarrow{}\"},\"⟶\":{\"math\":\"\\\\longrightarrow{}\"},\"⟷\":{\"math\":\"\\\\longleftrightarrow{}\"},\"⟸\":{\"math\":\"\\\\Longleftarrow{}\"},\"⟹\":{\"math\":\"\\\\Longrightarrow{}\"},\"⟺\":{\"math\":\"\\\\Longleftrightarrow{}\"},\"⟻\":{\"math\":\"\\\\longmapsfrom{}\"},\"⟼\":{\"math\":\"\\\\longmapsto{}\"},\"⟽\":{\"math\":\"\\\\Longmapsfrom{}\"},\"⟾\":{\"math\":\"\\\\Longmapsto{}\"},\"⟿\":{\"math\":\"\\\\sim\\\\joinrel\\\\leadsto{}\"},\"⤀\":{\"math\":\"\\\\psur{}\"},\"⤁\":{\"math\":\"\\\\nVtwoheadrightarrow{}\"},\"⤂\":{\"math\":\"\\\\nvLeftarrow{}\"},\"⤃\":{\"math\":\"\\\\nvRightarrow{}\"},\"⤄\":{\"math\":\"\\\\nvLeftrightarrow{}\"},\"⤅\":{\"math\":\"\\\\ElsevierGlyph{E212}\"},\"⤆\":{\"math\":\"\\\\Mapsfrom{}\"},\"⤇\":{\"math\":\"\\\\Mapsto{}\"},\"⤈\":{\"math\":\"\\\\downarrowbarred{}\"},\"⤉\":{\"math\":\"\\\\uparrowbarred{}\"},\"⤊\":{\"math\":\"\\\\Uuparrow{}\"},\"⤋\":{\"math\":\"\\\\Ddownarrow{}\"},\"⤌\":{\"math\":\"\\\\leftbkarrow{}\"},\"⤍\":{\"math\":\"\\\\rightbkarrow{}\"},\"⤎\":{\"math\":\"\\\\leftdbkarrow{}\"},\"⤏\":{\"math\":\"\\\\dbkarow{}\"},\"⤐\":{\"math\":\"\\\\drbkarow{}\"},\"⤑\":{\"math\":\"\\\\rightdotarrow{}\"},\"⤒\":{\"math\":\"\\\\UpArrowBar{}\"},\"⤓\":{\"math\":\"\\\\DownArrowBar{}\"},\"⤔\":{\"math\":\"\\\\pinj{}\"},\"⤕\":{\"math\":\"\\\\finj{}\"},\"⤖\":{\"math\":\"\\\\bij{}\"},\"⤗\":{\"math\":\"\\\\nvtwoheadrightarrowtail{}\"},\"⤘\":{\"math\":\"\\\\nVtwoheadrightarrowtail{}\"},\"⤙\":{\"math\":\"\\\\lefttail{}\"},\"⤚\":{\"math\":\"\\\\righttail{}\"},\"⤛\":{\"math\":\"\\\\leftdbltail{}\"},\"⤜\":{\"math\":\"\\\\rightdbltail{}\"},\"⤝\":{\"math\":\"\\\\diamondleftarrow{}\"},\"⤞\":{\"math\":\"\\\\rightarrowdiamond{}\"},\"⤟\":{\"math\":\"\\\\diamondleftarrowbar{}\"},\"⤠\":{\"math\":\"\\\\barrightarrowdiamond{}\"},\"⤡\":{\"math\":\"\\\\nwsearrow{}\"},\"⤢\":{\"math\":\"\\\\neswarrow{}\"},\"⤣\":{\"math\":\"\\\\ElsevierGlyph{E20C}\"},\"⤤\":{\"math\":\"\\\\ElsevierGlyph{E20D}\"},\"⤥\":{\"math\":\"\\\\ElsevierGlyph{E20B}\"},\"⤦\":{\"math\":\"\\\\ElsevierGlyph{E20A}\"},\"⤧\":{\"math\":\"\\\\ElsevierGlyph{E211}\"},\"⤨\":{\"math\":\"\\\\ElsevierGlyph{E20E}\"},\"⤩\":{\"math\":\"\\\\ElsevierGlyph{E20F}\"},\"⤪\":{\"math\":\"\\\\ElsevierGlyph{E210}\"},\"⤫\":{\"math\":\"\\\\rdiagovfdiag{}\"},\"⤬\":{\"math\":\"\\\\fdiagovrdiag{}\"},\"⤭\":{\"math\":\"\\\\seovnearrow{}\"},\"⤮\":{\"math\":\"\\\\neovsearrow{}\"},\"⤯\":{\"math\":\"\\\\fdiagovnearrow{}\"},\"⤰\":{\"math\":\"\\\\rdiagovsearrow{}\"},\"⤱\":{\"math\":\"\\\\neovnwarrow{}\"},\"⤲\":{\"math\":\"\\\\nwovnearrow{}\"},\"⤳\":{\"math\":\"\\\\ElsevierGlyph{E21C}\"},\"⤴\":{\"math\":\"\\\\uprightcurvearrow{}\"},\"⤵\":{\"math\":\"\\\\downrightcurvedarrow{}\"},\"⤶\":{\"math\":\"\\\\ElsevierGlyph{E21A}\"},\"⤷\":{\"math\":\"\\\\ElsevierGlyph{E219}\"},\"⤸\":{\"math\":\"\\\\cwrightarcarrow{}\"},\"⤹\":{\"math\":\"\\\\acwleftarcarrow{}\"},\"⤺\":{\"math\":\"\\\\acwoverarcarrow{}\"},\"⤻\":{\"math\":\"\\\\acwunderarcarrow{}\"},\"⤼\":{\"math\":\"\\\\curvearrowrightminus{}\"},\"⤽\":{\"math\":\"\\\\curvearrowleftplus{}\"},\"⤾\":{\"math\":\"\\\\cwundercurvearrow{}\"},\"⤿\":{\"math\":\"\\\\ccwundercurvearrow{}\"},\"⥀\":{\"math\":\"\\\\Elolarr{}\"},\"⥁\":{\"math\":\"\\\\Elorarr{}\"},\"⥂\":{\"math\":\"\\\\ElzRlarr{}\"},\"⥃\":{\"math\":\"\\\\leftarrowshortrightarrow{}\"},\"⥄\":{\"math\":\"\\\\ElzrLarr{}\"},\"⥅\":{\"math\":\"\\\\rightarrowplus{}\"},\"⥆\":{\"math\":\"\\\\leftarrowplus{}\"},\"⥇\":{\"math\":\"\\\\Elzrarrx{}\"},\"⥈\":{\"math\":\"\\\\leftrightarrowcircle{}\"},\"⥉\":{\"math\":\"\\\\twoheaduparrowcircle{}\"},\"⥊\":{\"math\":\"\\\\leftrightharpoon{}\"},\"⥋\":{\"math\":\"\\\\rightleftharpoon{}\"},\"⥌\":{\"math\":\"\\\\updownharpoonrightleft{}\"},\"⥍\":{\"math\":\"\\\\updownharpoonleftright{}\"},\"⥎\":{\"math\":\"\\\\LeftRightVector{}\"},\"⥏\":{\"math\":\"\\\\RightUpDownVector{}\"},\"⥐\":{\"math\":\"\\\\DownLeftRightVector{}\"},\"⥑\":{\"math\":\"\\\\LeftUpDownVector{}\"},\"⥒\":{\"math\":\"\\\\LeftVectorBar{}\"},\"⥓\":{\"math\":\"\\\\RightVectorBar{}\"},\"⥔\":{\"math\":\"\\\\RightUpVectorBar{}\"},\"⥕\":{\"math\":\"\\\\RightDownVectorBar{}\"},\"⥖\":{\"math\":\"\\\\DownLeftVectorBar{}\"},\"⥗\":{\"math\":\"\\\\DownRightVectorBar{}\"},\"⥘\":{\"math\":\"\\\\LeftUpVectorBar{}\"},\"⥙\":{\"math\":\"\\\\LeftDownVectorBar{}\"},\"⥚\":{\"math\":\"\\\\LeftTeeVector{}\"},\"⥛\":{\"math\":\"\\\\RightTeeVector{}\"},\"⥜\":{\"math\":\"\\\\RightUpTeeVector{}\"},\"⥝\":{\"math\":\"\\\\RightDownTeeVector{}\"},\"⥞\":{\"math\":\"\\\\DownLeftTeeVector{}\"},\"⥟\":{\"math\":\"\\\\DownRightTeeVector{}\"},\"⥠\":{\"math\":\"\\\\LeftUpTeeVector{}\"},\"⥡\":{\"math\":\"\\\\LeftDownTeeVector{}\"},\"⥢\":{\"math\":\"\\\\leftleftharpoons{}\"},\"⥣\":{\"math\":\"\\\\upupharpoons{}\"},\"⥤\":{\"math\":\"\\\\rightrightharpoons{}\"},\"⥥\":{\"math\":\"\\\\downdownharpoons{}\"},\"⥦\":{\"math\":\"\\\\leftrightharpoonsup{}\"},\"⥧\":{\"math\":\"\\\\leftrightharpoonsdown{}\"},\"⥨\":{\"math\":\"\\\\rightleftharpoonsup{}\"},\"⥩\":{\"math\":\"\\\\rightleftharpoonsdown{}\"},\"⥪\":{\"math\":\"\\\\leftbarharpoon{}\"},\"⥫\":{\"math\":\"\\\\barleftharpoon{}\"},\"⥬\":{\"math\":\"\\\\rightbarharpoon{}\"},\"⥭\":{\"math\":\"\\\\barrightharpoon{}\"},\"⥮\":{\"math\":\"\\\\UpEquilibrium{}\"},\"⥯\":{\"math\":\"\\\\ReverseUpEquilibrium{}\"},\"⥰\":{\"math\":\"\\\\RoundImplies{}\"},\"⥱\":{\"math\":\"\\\\equalrightarrow{}\"},\"⥲\":{\"math\":\"\\\\similarrightarrow{}\"},\"⥳\":{\"math\":\"\\\\leftarrowsimilar{}\"},\"⥴\":{\"math\":\"\\\\rightarrowsimilar{}\"},\"⥵\":{\"math\":\"\\\\rightarrowapprox{}\"},\"⥶\":{\"math\":\"\\\\ltlarr{}\"},\"⥷\":{\"math\":\"\\\\leftarrowless{}\"},\"⥸\":{\"math\":\"\\\\gtrarr{}\"},\"⥹\":{\"math\":\"\\\\subrarr{}\"},\"⥺\":{\"math\":\"\\\\leftarrowsubset{}\"},\"⥻\":{\"math\":\"\\\\suplarr{}\"},\"⥼\":{\"math\":\"\\\\ElsevierGlyph{E214}\"},\"⥽\":{\"math\":\"\\\\ElsevierGlyph{E215}\"},\"⥾\":{\"math\":\"\\\\upfishtail{}\"},\"⥿\":{\"math\":\"\\\\downfishtail{}\"},\"⦀\":{\"math\":\"\\\\Elztfnc{}\"},\"⦁\":{\"math\":\"\\\\spot{}\"},\"⦂\":{\"math\":\"\\\\typecolon{}\"},\"⦃\":{\"math\":\"\\\\lBrace{}\"},\"⦄\":{\"math\":\"\\\\rBrace{}\"},\"⦅\":{\"math\":\"\\\\ElsevierGlyph{3018}\"},\"⦆\":{\"math\":\"\\\\Elroang{}\"},\"⦇\":{\"math\":\"\\\\limg{}\"},\"⦈\":{\"math\":\"\\\\rimg{}\"},\"⦉\":{\"math\":\"\\\\lblot{}\"},\"⦊\":{\"math\":\"\\\\rblot{}\"},\"⦋\":{\"math\":\"\\\\lbrackubar{}\"},\"⦌\":{\"math\":\"\\\\rbrackubar{}\"},\"⦍\":{\"math\":\"\\\\lbrackultick{}\"},\"⦎\":{\"math\":\"\\\\rbracklrtick{}\"},\"⦏\":{\"math\":\"\\\\lbracklltick{}\"},\"⦐\":{\"math\":\"\\\\rbrackurtick{}\"},\"⦑\":{\"math\":\"\\\\langledot{}\"},\"⦒\":{\"math\":\"\\\\rangledot{}\"},\"⦓\":{\"math\":\"<\\\\kern-0.58em(\"},\"⦔\":{\"math\":\"\\\\ElsevierGlyph{E291}\"},\"⦕\":{\"math\":\"\\\\Lparengtr{}\"},\"⦖\":{\"math\":\"\\\\Rparenless{}\"},\"⦗\":{\"math\":\"\\\\lblkbrbrak{}\"},\"⦘\":{\"math\":\"\\\\rblkbrbrak{}\"},\"⦙\":{\"math\":\"\\\\Elzddfnc{}\"},\"⦚\":{\"math\":\"\\\\vzigzag{}\"},\"⦛\":{\"math\":\"\\\\measuredangleleft{}\"},\"⦜\":{\"math\":\"\\\\Angle{}\"},\"⦝\":{\"math\":\"\\\\rightanglemdot{}\"},\"⦞\":{\"math\":\"\\\\angles{}\"},\"⦟\":{\"math\":\"\\\\angdnr{}\"},\"⦠\":{\"math\":\"\\\\Elzlpargt{}\"},\"⦡\":{\"math\":\"\\\\sphericalangleup{}\"},\"⦢\":{\"math\":\"\\\\turnangle{}\"},\"⦣\":{\"math\":\"\\\\revangle{}\"},\"⦤\":{\"math\":\"\\\\angleubar{}\"},\"⦥\":{\"math\":\"\\\\revangleubar{}\"},\"⦦\":{\"math\":\"\\\\wideangledown{}\"},\"⦧\":{\"math\":\"\\\\wideangleup{}\"},\"⦨\":{\"math\":\"\\\\measanglerutone{}\"},\"⦩\":{\"math\":\"\\\\measanglelutonw{}\"},\"⦪\":{\"math\":\"\\\\measanglerdtose{}\"},\"⦫\":{\"math\":\"\\\\measangleldtosw{}\"},\"⦬\":{\"math\":\"\\\\measangleurtone{}\"},\"⦭\":{\"math\":\"\\\\measangleultonw{}\"},\"⦮\":{\"math\":\"\\\\measangledrtose{}\"},\"⦯\":{\"math\":\"\\\\measangledltosw{}\"},\"⦰\":{\"math\":\"\\\\revemptyset{}\"},\"⦱\":{\"math\":\"\\\\emptysetobar{}\"},\"⦲\":{\"math\":\"\\\\emptysetocirc{}\"},\"⦳\":{\"math\":\"\\\\emptysetoarr{}\"},\"⦴\":{\"math\":\"\\\\emptysetoarrl{}\"},\"⦵\":{\"math\":\"\\\\ElsevierGlyph{E260}\"},\"⦶\":{\"math\":\"\\\\ElsevierGlyph{E61B}\"},\"⦷\":{\"math\":\"\\\\circledparallel{}\"},\"⦸\":{\"math\":\"\\\\circledbslash{}\"},\"⦹\":{\"math\":\"\\\\operp{}\"},\"⦺\":{\"math\":\"\\\\obot{}\"},\"⦻\":{\"math\":\"\\\\olcross{}\"},\"⦼\":{\"math\":\"\\\\odotslashdot{}\"},\"⦽\":{\"math\":\"\\\\uparrowoncircle{}\"},\"⦾\":{\"math\":\"\\\\circledwhitebullet{}\"},\"⦿\":{\"math\":\"\\\\circledbullet{}\"},\"⧀\":{\"math\":\"\\\\circledless{}\"},\"⧁\":{\"math\":\"\\\\circledgtr{}\"},\"⧂\":{\"math\":\"\\\\cirscir{}\"},\"⧃\":{\"math\":\"\\\\cirE{}\"},\"⧄\":{\"math\":\"\\\\boxslash{}\"},\"⧅\":{\"math\":\"\\\\boxbslash{}\"},\"⧆\":{\"math\":\"\\\\boxast{}\"},\"⧇\":{\"math\":\"\\\\boxcircle{}\"},\"⧈\":{\"math\":\"\\\\boxbox{}\"},\"⧉\":{\"math\":\"\\\\boxonbox{}\"},\"⧊\":{\"math\":\"\\\\ElzLap{}\"},\"⧋\":{\"math\":\"\\\\Elzdefas{}\"},\"⧌\":{\"math\":\"\\\\triangles{}\"},\"⧍\":{\"math\":\"\\\\triangleserifs{}\"},\"⧎\":{\"math\":\"\\\\rtriltri{}\"},\"⧏\":{\"math\":\"\\\\LeftTriangleBar{}\"},\"⧐\":{\"math\":\"\\\\RightTriangleBar{}\"},\"⧑\":{\"math\":\"\\\\lfbowtie{}\"},\"⧒\":{\"math\":\"\\\\rfbowtie{}\"},\"⧓\":{\"math\":\"\\\\fbowtie{}\"},\"⧔\":{\"math\":\"\\\\lftimes{}\"},\"⧕\":{\"math\":\"\\\\rftimes{}\"},\"⧖\":{\"math\":\"\\\\hourglass{}\"},\"⧗\":{\"math\":\"\\\\blackhourglass{}\"},\"⧘\":{\"math\":\"\\\\lvzigzag{}\"},\"⧙\":{\"math\":\"\\\\rvzigzag{}\"},\"⧚\":{\"math\":\"\\\\Lvzigzag{}\"},\"⧛\":{\"math\":\"\\\\Rvzigzag{}\"},\"⧜\":{\"math\":\"\\\\ElsevierGlyph{E372}\"},\"⧝\":{\"math\":\"\\\\tieinfty{}\"},\"⧞\":{\"math\":\"\\\\nvinfty{}\"},\"⧟\":{\"math\":\"\\\\multimapboth{}\"},\"⧠\":{\"math\":\"\\\\laplac{}\"},\"⧡\":{\"math\":\"\\\\lrtriangleeq{}\"},\"⧢\":{\"math\":\"\\\\shuffle{}\"},\"⧣\":{\"math\":\"\\\\eparsl{}\"},\"⧤\":{\"math\":\"\\\\smeparsl{}\"},\"⧥\":{\"math\":\"\\\\eqvparsl{}\"},\"⧦\":{\"math\":\"\\\\gleichstark{}\"},\"⧧\":{\"math\":\"\\\\thermod{}\"},\"⧨\":{\"math\":\"\\\\downtriangleleftblack{}\"},\"⧩\":{\"math\":\"\\\\downtrianglerightblack{}\"},\"⧪\":{\"math\":\"\\\\blackdiamonddownarrow{}\"},\"⧫\":{\"math\":\"\\\\blacklozenge{}\"},\"⧬\":{\"math\":\"\\\\circledownarrow{}\"},\"⧭\":{\"math\":\"\\\\blackcircledownarrow{}\"},\"⧮\":{\"math\":\"\\\\errbarsquare{}\"},\"⧯\":{\"math\":\"\\\\errbarblacksquare{}\"},\"⧰\":{\"math\":\"\\\\errbardiamond{}\"},\"⧱\":{\"math\":\"\\\\errbarblackdiamond{}\"},\"⧲\":{\"math\":\"\\\\errbarcircle{}\"},\"⧳\":{\"math\":\"\\\\errbarblackcircle{}\"},\"⧴\":{\"math\":\"\\\\RuleDelayed{}\"},\"⧵\":{\"math\":\"\\\\setminus{}\"},\"⧶\":{\"math\":\"\\\\dsol{}\"},\"⧷\":{\"math\":\"\\\\rsolbar{}\"},\"⧸\":{\"math\":\"\\\\xsol{}\"},\"⧹\":{\"math\":\"\\\\zhide{}\"},\"⧺\":{\"math\":\"\\\\doubleplus{}\"},\"⧻\":{\"math\":\"\\\\tripleplus{}\"},\"⧼\":{\"math\":\"\\\\lcurvyangle{}\"},\"⧽\":{\"math\":\"\\\\rcurvyangle{}\"},\"⧾\":{\"math\":\"\\\\tplus{}\"},\"⧿\":{\"math\":\"\\\\tminus{}\"},\"⨀\":{\"math\":\"\\\\bigodot{}\"},\"⨁\":{\"math\":\"\\\\bigoplus{}\"},\"⨂\":{\"math\":\"\\\\bigotimes{}\"},\"⨃\":{\"math\":\"\\\\bigcupdot{}\"},\"⨄\":{\"math\":\"\\\\Elxuplus{}\"},\"⨅\":{\"math\":\"\\\\ElzThr{}\"},\"⨆\":{\"math\":\"\\\\Elxsqcup{}\"},\"⨇\":{\"math\":\"\\\\ElzInf{}\"},\"⨈\":{\"math\":\"\\\\ElzSup{}\"},\"⨉\":{\"math\":\"\\\\varprod{}\"},\"⨊\":{\"math\":\"\\\\modtwosum{}\"},\"⨋\":{\"math\":\"\\\\sumint{}\"},\"⨌\":{\"math\":\"\\\\iiiint{}\"},\"⨍\":{\"math\":\"\\\\ElzCint{}\"},\"⨎\":{\"math\":\"\\\\intBar{}\"},\"⨏\":{\"math\":\"\\\\clockoint{}\"},\"⨐\":{\"math\":\"\\\\ElsevierGlyph{E395}\"},\"⨑\":{\"math\":\"\\\\awint{}\"},\"⨒\":{\"math\":\"\\\\rppolint{}\"},\"⨓\":{\"math\":\"\\\\scpolint{}\"},\"⨔\":{\"math\":\"\\\\npolint{}\"},\"⨕\":{\"math\":\"\\\\pointint{}\"},\"⨖\":{\"math\":\"\\\\sqrint{}\"},\"⨗\":{\"math\":\"\\\\intlarhk{}\"},\"⨘\":{\"math\":\"\\\\intx{}\"},\"⨙\":{\"math\":\"\\\\intcap{}\"},\"⨚\":{\"math\":\"\\\\intcup{}\"},\"⨛\":{\"math\":\"\\\\upint{}\"},\"⨜\":{\"math\":\"\\\\lowint{}\"},\"⨝\":{\"math\":\"\\\\Join{}\"},\"⨞\":{\"math\":\"\\\\bigtriangleleft{}\"},\"⨟\":{\"math\":\"\\\\zcmp{}\"},\"⨠\":{\"math\":\"\\\\zpipe{}\"},\"⨡\":{\"math\":\"\\\\zproject{}\"},\"⨢\":{\"math\":\"\\\\ringplus{}\"},\"⨣\":{\"math\":\"\\\\plushat{}\"},\"⨤\":{\"math\":\"\\\\simplus{}\"},\"⨥\":{\"math\":\"\\\\ElsevierGlyph{E25A}\"},\"⨦\":{\"math\":\"\\\\plussim{}\"},\"⨧\":{\"math\":\"\\\\plussubtwo{}\"},\"⨨\":{\"math\":\"\\\\plustrif{}\"},\"⨩\":{\"math\":\"\\\\commaminus{}\"},\"⨪\":{\"math\":\"\\\\ElsevierGlyph{E25B}\"},\"⨫\":{\"math\":\"\\\\minusfdots{}\"},\"⨬\":{\"math\":\"\\\\minusrdots{}\"},\"⨭\":{\"math\":\"\\\\ElsevierGlyph{E25C}\"},\"⨮\":{\"math\":\"\\\\ElsevierGlyph{E25D}\"},\"⨯\":{\"math\":\"\\\\ElzTimes{}\"},\"⨰\":{\"math\":\"\\\\dottimes{}\"},\"⨱\":{\"math\":\"\\\\timesbar{}\"},\"⨲\":{\"math\":\"\\\\btimes{}\"},\"⨳\":{\"math\":\"\\\\smashtimes{}\"},\"⨴\":{\"math\":\"\\\\ElsevierGlyph{E25E}\"},\"⨵\":{\"math\":\"\\\\ElsevierGlyph{E25E}\"},\"⨶\":{\"math\":\"\\\\otimeshat{}\"},\"⨷\":{\"math\":\"\\\\Otimes{}\"},\"⨸\":{\"math\":\"\\\\odiv{}\"},\"⨹\":{\"math\":\"\\\\triangleplus{}\"},\"⨺\":{\"math\":\"\\\\triangleminus{}\"},\"⨻\":{\"math\":\"\\\\triangletimes{}\"},\"⨼\":{\"math\":\"\\\\ElsevierGlyph{E259}\"},\"⨽\":{\"math\":\"\\\\intprodr{}\"},\"⨾\":{\"math\":\"\\\\fcmp{}\"},\"⨿\":{\"math\":\"\\\\amalg{}\"},\"⩀\":{\"math\":\"\\\\capdot{}\"},\"⩁\":{\"math\":\"\\\\uminus{}\"},\"⩂\":{\"math\":\"\\\\barcup{}\"},\"⩃\":{\"math\":\"\\\\barcap{}\"},\"⩄\":{\"math\":\"\\\\capwedge{}\"},\"⩅\":{\"math\":\"\\\\cupvee{}\"},\"⩆\":{\"math\":\"\\\\cupovercap{}\"},\"⩇\":{\"math\":\"\\\\capovercup{}\"},\"⩈\":{\"math\":\"\\\\cupbarcap{}\"},\"⩉\":{\"math\":\"\\\\capbarcup{}\"},\"⩊\":{\"math\":\"\\\\twocups{}\"},\"⩋\":{\"math\":\"\\\\twocaps{}\"},\"⩌\":{\"math\":\"\\\\closedvarcup{}\"},\"⩍\":{\"math\":\"\\\\closedvarcap{}\"},\"⩎\":{\"math\":\"\\\\Sqcap{}\"},\"⩏\":{\"math\":\"\\\\Sqcup{}\"},\"⩐\":{\"math\":\"\\\\closedvarcupsmashprod{}\"},\"⩑\":{\"math\":\"\\\\wedgeodot{}\"},\"⩒\":{\"math\":\"\\\\veeodot{}\"},\"⩓\":{\"math\":\"\\\\ElzAnd{}\"},\"⩔\":{\"math\":\"\\\\ElzOr{}\"},\"⩕\":{\"math\":\"\\\\ElsevierGlyph{E36E}\"},\"⩖\":{\"math\":\"\\\\ElOr{}\"},\"⩗\":{\"math\":\"\\\\bigslopedvee{}\"},\"⩘\":{\"math\":\"\\\\bigslopedwedge{}\"},\"⩙\":{\"math\":\"\\\\veeonwedge{}\"},\"⩚\":{\"math\":\"\\\\wedgemidvert{}\"},\"⩛\":{\"math\":\"\\\\veemidvert{}\"},\"⩜\":{\"math\":\"\\\\midbarwedge{}\"},\"⩝\":{\"math\":\"\\\\midbarvee{}\"},\"⩞\":{\"math\":\"\\\\perspcorrespond{}\"},\"⩟\":{\"math\":\"\\\\Elzminhat{}\"},\"⩠\":{\"math\":\"\\\\wedgedoublebar{}\"},\"⩡\":{\"math\":\"\\\\varveebar{}\"},\"⩢\":{\"math\":\"\\\\doublebarvee{}\"},\"⩣\":{\"math\":\"\\\\ElsevierGlyph{225A}\"},\"⩤\":{\"math\":\"\\\\dsub{}\"},\"⩥\":{\"math\":\"\\\\rsub{}\"},\"⩦\":{\"math\":\"\\\\eqdot{}\"},\"⩧\":{\"math\":\"\\\\dotequiv{}\"},\"⩨\":{\"math\":\"\\\\equivVert{}\"},\"⩩\":{\"math\":\"\\\\equivVvert{}\"},\"⩪\":{\"math\":\"\\\\dotsim{}\"},\"⩫\":{\"math\":\"\\\\simrdots{}\"},\"⩬\":{\"math\":\"\\\\simminussim{}\"},\"⩭\":{\"math\":\"\\\\congdot{}\"},\"⩮\":{\"math\":\"\\\\stackrel{*}{=}\"},\"⩯\":{\"math\":\"\\\\hatapprox{}\"},\"⩰\":{\"math\":\"\\\\approxeqq{}\"},\"⩱\":{\"math\":\"\\\\eqqplus{}\"},\"⩲\":{\"math\":\"\\\\pluseqq{}\"},\"⩳\":{\"math\":\"\\\\eqqsim{}\"},\"⩴\":{\"math\":\"\\\\Coloneqq{}\"},\"⩵\":{\"math\":\"\\\\Equal{}\"},\"⩶\":{\"math\":\"\\\\Same{}\"},\"⩷\":{\"math\":\"\\\\ddotseq{}\"},\"⩸\":{\"math\":\"\\\\equivDD{}\"},\"⩹\":{\"math\":\"\\\\ltcir{}\"},\"⩺\":{\"math\":\"\\\\gtcir{}\"},\"⩻\":{\"math\":\"\\\\ltquest{}\"},\"⩼\":{\"math\":\"\\\\gtquest{}\"},\"⩽\":{\"math\":\"\\\\leqslant{}\"},\"⩾\":{\"math\":\"\\\\geqslant{}\"},\"⩿\":{\"math\":\"\\\\lesdot{}\"},\"⪀\":{\"math\":\"\\\\gesdot{}\"},\"⪁\":{\"math\":\"\\\\lesdoto{}\"},\"⪂\":{\"math\":\"\\\\gesdoto{}\"},\"⪃\":{\"math\":\"\\\\lesdotor{}\"},\"⪄\":{\"math\":\"\\\\gesdotol{}\"},\"⪅\":{\"math\":\"\\\\lessapprox{}\"},\"⪆\":{\"math\":\"\\\\gtrapprox{}\"},\"⪇\":{\"math\":\"\\\\lneq{}\"},\"⪈\":{\"math\":\"\\\\gneq{}\"},\"⪉\":{\"math\":\"\\\\lnapprox{}\"},\"⪊\":{\"math\":\"\\\\gnapprox{}\"},\"⪋\":{\"math\":\"\\\\lesseqqgtr{}\"},\"⪌\":{\"math\":\"\\\\gtreqqless{}\"},\"⪍\":{\"math\":\"\\\\lsime{}\"},\"⪎\":{\"math\":\"\\\\gsime{}\"},\"⪏\":{\"math\":\"\\\\lsimg{}\"},\"⪐\":{\"math\":\"\\\\gsiml{}\"},\"⪑\":{\"math\":\"\\\\lgE{}\"},\"⪒\":{\"math\":\"\\\\glE{}\"},\"⪓\":{\"math\":\"\\\\lesges{}\"},\"⪔\":{\"math\":\"\\\\gesles{}\"},\"⪕\":{\"math\":\"\\\\eqslantless{}\"},\"⪖\":{\"math\":\"\\\\eqslantgtr{}\"},\"⪗\":{\"math\":\"\\\\elsdot{}\"},\"⪘\":{\"math\":\"\\\\egsdot{}\"},\"⪙\":{\"math\":\"\\\\eqqless{}\"},\"⪚\":{\"math\":\"\\\\eqqgtr{}\"},\"⪛\":{\"math\":\"\\\\eqqslantless{}\"},\"⪜\":{\"math\":\"\\\\eqqslantgtr{}\"},\"⪝\":{\"math\":\"\\\\Pisymbol{ppi020}{117}\"},\"⪞\":{\"math\":\"\\\\Pisymbol{ppi020}{105}\"},\"⪟\":{\"math\":\"\\\\simlE{}\"},\"⪠\":{\"math\":\"\\\\simgE{}\"},\"⪡\":{\"math\":\"\\\\NestedLessLess{}\"},\"⪢\":{\"math\":\"\\\\NestedGreaterGreater{}\"},\"⪣\":{\"math\":\"\\\\partialmeetcontraction{}\"},\"⪤\":{\"math\":\"\\\\glj{}\"},\"⪥\":{\"math\":\"\\\\gla{}\"},\"⪦\":{\"math\":\"\\\\leftslice{}\"},\"⪧\":{\"math\":\"\\\\rightslice{}\"},\"⪨\":{\"math\":\"\\\\lescc{}\"},\"⪩\":{\"math\":\"\\\\gescc{}\"},\"⪪\":{\"math\":\"\\\\smt{}\"},\"⪫\":{\"math\":\"\\\\lat{}\"},\"⪬\":{\"math\":\"\\\\smte{}\"},\"⪭\":{\"math\":\"\\\\late{}\"},\"⪮\":{\"math\":\"\\\\bumpeqq{}\"},\"⪯\":{\"math\":\"\\\\preceq{}\"},\"⪰\":{\"math\":\"\\\\succeq{}\"},\"⪱\":{\"math\":\"\\\\precneq{}\"},\"⪲\":{\"math\":\"\\\\succneq{}\"},\"⪳\":{\"math\":\"\\\\preceqq{}\"},\"⪴\":{\"math\":\"\\\\succeqq{}\"},\"⪵\":{\"math\":\"\\\\precneqq{}\"},\"⪶\":{\"math\":\"\\\\succneqq{}\"},\"⪷\":{\"math\":\"\\\\precapprox{}\"},\"⪸\":{\"math\":\"\\\\succapprox{}\"},\"⪹\":{\"math\":\"\\\\precnapprox{}\"},\"⪺\":{\"math\":\"\\\\succnapprox{}\"},\"⪻\":{\"math\":\"\\\\llcurly{}\"},\"⪼\":{\"math\":\"\\\\ggcurly{}\"},\"⪽\":{\"math\":\"\\\\subsetdot{}\"},\"⪾\":{\"math\":\"\\\\supsetdot{}\"},\"⪿\":{\"math\":\"\\\\subsetplus{}\"},\"⫀\":{\"math\":\"\\\\supsetplus{}\"},\"⫁\":{\"math\":\"\\\\submult{}\"},\"⫂\":{\"math\":\"\\\\supmult{}\"},\"⫃\":{\"math\":\"\\\\subedot{}\"},\"⫄\":{\"math\":\"\\\\supedot{}\"},\"⫅\":{\"math\":\"\\\\subseteqq{}\"},\"⫆\":{\"math\":\"\\\\supseteqq{}\"},\"⫇\":{\"math\":\"\\\\subsim{}\"},\"⫈\":{\"math\":\"\\\\supsim{}\"},\"⫉\":{\"math\":\"\\\\subsetapprox{}\"},\"⫊\":{\"math\":\"\\\\supsetapprox{}\"},\"⫋\":{\"math\":\"\\\\subsetneqq{}\"},\"⫌\":{\"math\":\"\\\\supsetneqq{}\"},\"⫍\":{\"math\":\"\\\\lsqhook{}\"},\"⫎\":{\"math\":\"\\\\rsqhook{}\"},\"⫏\":{\"math\":\"\\\\csub{}\"},\"⫐\":{\"math\":\"\\\\csup{}\"},\"⫑\":{\"math\":\"\\\\csube{}\"},\"⫒\":{\"math\":\"\\\\csupe{}\"},\"⫓\":{\"math\":\"\\\\subsup{}\"},\"⫔\":{\"math\":\"\\\\supsub{}\"},\"⫕\":{\"math\":\"\\\\subsub{}\"},\"⫖\":{\"math\":\"\\\\supsup{}\"},\"⫗\":{\"math\":\"\\\\suphsub{}\"},\"⫘\":{\"math\":\"\\\\supdsub{}\"},\"⫙\":{\"math\":\"\\\\forkv{}\"},\"⫚\":{\"math\":\"\\\\topfork{}\"},\"⫛\":{\"math\":\"\\\\mlcp{}\"},\"⫝̸\":{\"math\":\"\\\\forks{}\"},\"⫝\":{\"math\":\"\\\\forksnot{}\"},\"⫞\":{\"math\":\"\\\\shortlefttack{}\"},\"⫟\":{\"math\":\"\\\\shortdowntack{}\"},\"⫠\":{\"math\":\"\\\\shortuptack{}\"},\"⫡\":{\"math\":\"\\\\perps{}\"},\"⫢\":{\"math\":\"\\\\vDdash{}\"},\"⫣\":{\"math\":\"\\\\dashV{}\"},\"⫤\":{\"math\":\"\\\\Dashv{}\"},\"⫥\":{\"math\":\"\\\\DashV{}\"},\"⫦\":{\"math\":\"\\\\varVdash{}\"},\"⫧\":{\"math\":\"\\\\Barv{}\"},\"⫨\":{\"math\":\"\\\\vBar{}\"},\"⫩\":{\"math\":\"\\\\vBarv{}\"},\"⫪\":{\"math\":\"\\\\Top{}\"},\"⫫\":{\"math\":\"\\\\ElsevierGlyph{E30D}\"},\"⫬\":{\"math\":\"\\\\Not{}\"},\"⫭\":{\"math\":\"\\\\bNot{}\"},\"⫮\":{\"math\":\"\\\\revnmid{}\"},\"⫯\":{\"math\":\"\\\\cirmid{}\"},\"⫰\":{\"math\":\"\\\\midcir{}\"},\"⫱\":{\"math\":\"\\\\topcir{}\"},\"⫲\":{\"math\":\"\\\\nhpar{}\"},\"⫳\":{\"math\":\"\\\\parsim{}\"},\"⫴\":{\"math\":\"\\\\interleave{}\"},\"⫵\":{\"math\":\"\\\\nhVvert{}\"},\"⫶\":{\"math\":\"\\\\Elztdcol{}\"},\"⫷\":{\"math\":\"\\\\lllnest{}\"},\"⫸\":{\"math\":\"\\\\gggnest{}\"},\"⫹\":{\"math\":\"\\\\leqqslant{}\"},\"⫺\":{\"math\":\"\\\\geqqslant{}\"},\"⫻\":{\"math\":\"\\\\trslash{}\"},\"⫼\":{\"math\":\"\\\\biginterleave{}\"},\"⫽\":{\"math\":\"{{/}\\\\!\\\\!{/}}\"},\"⫾\":{\"math\":\"\\\\talloblong{}\"},\"⫿\":{\"math\":\"\\\\bigtalloblong{}\"},\"⬒\":{\"math\":\"\\\\squaretopblack{}\"},\"⬓\":{\"math\":\"\\\\squarebotblack{}\"},\"⬔\":{\"math\":\"\\\\squareurblack{}\"},\"⬕\":{\"math\":\"\\\\squarellblack{}\"},\"⬖\":{\"math\":\"\\\\diamondleftblack{}\"},\"⬗\":{\"math\":\"\\\\diamondrightblack{}\"},\"⬘\":{\"math\":\"\\\\diamondtopblack{}\"},\"⬙\":{\"math\":\"\\\\diamondbotblack{}\"},\"⬚\":{\"math\":\"\\\\dottedsquare{}\"},\"⬛\":{\"math\":\"\\\\blacksquare{}\"},\"⬜\":{\"math\":\"\\\\square{}\"},\"⬝\":{\"math\":\"\\\\vysmblksquare{}\"},\"⬞\":{\"math\":\"\\\\vysmwhtsquare{}\"},\"⬟\":{\"math\":\"\\\\pentagonblack{}\"},\"⬠\":{\"math\":\"\\\\pentagon{}\"},\"⬡\":{\"math\":\"\\\\varhexagon{}\"},\"⬢\":{\"math\":\"\\\\varhexagonblack{}\"},\"⬣\":{\"math\":\"\\\\hexagonblack{}\"},\"⬤\":{\"math\":\"\\\\lgblkcircle{}\"},\"⬥\":{\"math\":\"\\\\mdblkdiamond{}\"},\"⬦\":{\"math\":\"\\\\mdwhtdiamond{}\"},\"⬧\":{\"math\":\"\\\\mdblklozenge{}\"},\"⬨\":{\"math\":\"\\\\mdwhtlozenge{}\"},\"⬩\":{\"math\":\"\\\\smblkdiamond{}\"},\"⬪\":{\"math\":\"\\\\smblklozenge{}\"},\"⬫\":{\"math\":\"\\\\smwhtlozenge{}\"},\"⬬\":{\"math\":\"\\\\blkhorzoval{}\"},\"⬭\":{\"math\":\"\\\\whthorzoval{}\"},\"⬮\":{\"math\":\"\\\\blkvertoval{}\"},\"⬯\":{\"math\":\"\\\\whtvertoval{}\"},\"⬰\":{\"math\":\"\\\\circleonleftarrow{}\"},\"⬱\":{\"math\":\"\\\\leftthreearrows{}\"},\"⬲\":{\"math\":\"\\\\leftarrowonoplus{}\"},\"⬳\":{\"math\":\"\\\\longleftsquigarrow{}\"},\"⬴\":{\"math\":\"\\\\nvtwoheadleftarrow{}\"},\"⬵\":{\"math\":\"\\\\nVtwoheadleftarrow{}\"},\"⬶\":{\"math\":\"\\\\twoheadmapsfrom{}\"},\"⬷\":{\"math\":\"\\\\twoheadleftdbkarrow{}\"},\"⬸\":{\"math\":\"\\\\leftdotarrow{}\"},\"⬹\":{\"math\":\"\\\\nvleftarrowtail{}\"},\"⬺\":{\"math\":\"\\\\nVleftarrowtail{}\"},\"⬻\":{\"math\":\"\\\\twoheadleftarrowtail{}\"},\"⬼\":{\"math\":\"\\\\nvtwoheadleftarrowtail{}\"},\"⬽\":{\"math\":\"\\\\nVtwoheadleftarrowtail{}\"},\"⬾\":{\"math\":\"\\\\leftarrowx{}\"},\"⬿\":{\"math\":\"\\\\leftcurvedarrow{}\"},\"⭀\":{\"math\":\"\\\\equalleftarrow{}\"},\"⭁\":{\"math\":\"\\\\bsimilarleftarrow{}\"},\"⭂\":{\"math\":\"\\\\leftarrowbackapprox{}\"},\"⭃\":{\"math\":\"\\\\rightarrowgtr{}\"},\"⭄\":{\"math\":\"\\\\rightarrowsupset{}\"},\"⭅\":{\"math\":\"\\\\LLeftarrow{}\"},\"⭆\":{\"math\":\"\\\\RRightarrow{}\"},\"⭇\":{\"math\":\"\\\\bsimilarrightarrow{}\"},\"⭈\":{\"math\":\"\\\\rightarrowbackapprox{}\"},\"⭉\":{\"math\":\"\\\\similarleftarrow{}\"},\"⭊\":{\"math\":\"\\\\leftarrowapprox{}\"},\"⭋\":{\"math\":\"\\\\leftarrowbsimilar{}\"},\"⭌\":{\"math\":\"\\\\rightarrowbsimilar{}\"},\"⭐\":{\"math\":\"\\\\medwhitestar{}\"},\"⭑\":{\"math\":\"\\\\medblackstar{}\"},\"⭒\":{\"math\":\"\\\\smwhitestar{}\"},\"⭓\":{\"math\":\"\\\\rightpentagonblack{}\"},\"⭔\":{\"math\":\"\\\\rightpentagon{}\"},\"〈\":{\"math\":\"\\\\langle{}\"},\"〉\":{\"math\":\"\\\\rangle{}\"},\"《\":{\"math\":\"\\\\ElsevierGlyph{300A}\"},\"》\":{\"math\":\"\\\\ElsevierGlyph{300B}\"},\"〒\":{\"math\":\"\\\\postalmark{}\"},\"〔\":{\"math\":\"\\\\lbrbrak{}\"},\"〕\":{\"math\":\"\\\\rbrbrak{}\"},\"〘\":{\"math\":\"\\\\ElsevierGlyph{3018}\"},\"〙\":{\"math\":\"\\\\ElsevierGlyph{3019}\"},\"〚\":{\"math\":\"\\\\openbracketleft{}\"},\"〛\":{\"math\":\"\\\\openbracketright{}\"},\"〰\":{\"math\":\"\\\\hzigzag{}\"},\"ﬀ\":{\"text\":\"ff\"},\"ﬁ\":{\"text\":\"fi\"},\"ﬂ\":{\"text\":\"fl\"},\"ﬃ\":{\"text\":\"ffi\"},\"ﬄ\":{\"text\":\"ffl\"},\"ﬅ\":{\"text\":\"st\"},\"ﬆ\":{\"text\":\"st\"},\"�\":{\"text\":\"\\\\dbend{}\"},\"≂̸\":{\"math\":\"\\\\NotEqualTilde{}\"},\"≋̸\":{\"math\":\"\\\\not\\\\apid{}\"},\"≎̸\":{\"math\":\"\\\\NotHumpDownHump{}\"},\"≏̸\":{\"math\":\"\\\\NotHumpEqual{}\"},\"≐̸\":{\"math\":\"\\\\not\\\\doteq{}\"},\"≨︀\":{\"math\":\"\\\\lvertneqq{}\"},\"≩︀\":{\"math\":\"\\\\gvertneqq{}\"},\"≪̸\":{\"math\":\"\\\\NotLessLess{}\"},\"≫̸\":{\"math\":\"\\\\NotGreaterGreater{}\"},\"≾̸\":{\"math\":\"\\\\NotPrecedesTilde{}\"},\"≿̸\":{\"math\":\"\\\\NotSucceedsTilde{}\"},\"⊊︀\":{\"math\":\"\\\\varsubsetneqq{}\"},\"⊋︀\":{\"math\":\"\\\\varsupsetneq{}\"},\"⊏̸\":{\"math\":\"\\\\NotSquareSubset{}\"},\"⊐̸\":{\"math\":\"\\\\NotSquareSuperset{}\"},\"⤳̸\":{\"math\":\"\\\\ElsevierGlyph{E21D}\"},\"⧏̸\":{\"math\":\"\\\\NotLeftTriangleBar{}\"},\"⧐̸\":{\"math\":\"\\\\NotRightTriangleBar{}\"},\"⩽̸\":{\"math\":\"\\\\nleqslant{}\"},\"⩾̸\":{\"math\":\"\\\\ngeqslant{}\"},\"⪡̸\":{\"math\":\"\\\\NotNestedLessLess{}\"},\"⪢̸\":{\"math\":\"\\\\NotNestedGreaterGreater{}\"},\"⪯̸\":{\"math\":\"\\\\not\\\\preceq{}\"},\"⪰̸\":{\"math\":\"\\\\not\\\\succeq{}\"},\"⫅̸\":{\"math\":\"\\\\nsubseteqq{}\"},\"⫆̸\":{\"math\":\"\\\\nsupseteqq{}\"},\"⫝̸\":{\"math\":\"\\\\forks{}\"},\"⫽⃥\":{\"math\":\"{\\\\rlap{\\\\textbackslash}{{/}\\\\!\\\\!{/}}}\"},\"𝐀\":{\"math\":\"\\\\mathbf{A}\"},\"𝐁\":{\"math\":\"\\\\mathbf{B}\"},\"𝐂\":{\"math\":\"\\\\mathbf{C}\"},\"𝐃\":{\"math\":\"\\\\mathbf{D}\"},\"𝐄\":{\"math\":\"\\\\mathbf{E}\"},\"𝐅\":{\"math\":\"\\\\mathbf{F}\"},\"𝐆\":{\"math\":\"\\\\mathbf{G}\"},\"𝐇\":{\"math\":\"\\\\mathbf{H}\"},\"𝐈\":{\"math\":\"\\\\mathbf{I}\"},\"𝐉\":{\"math\":\"\\\\mathbf{J}\"},\"𝐊\":{\"math\":\"\\\\mathbf{K}\"},\"𝐋\":{\"math\":\"\\\\mathbf{L}\"},\"𝐌\":{\"math\":\"\\\\mathbf{M}\"},\"𝐍\":{\"math\":\"\\\\mathbf{N}\"},\"𝐎\":{\"math\":\"\\\\mathbf{O}\"},\"𝐏\":{\"math\":\"\\\\mathbf{P}\"},\"𝐐\":{\"math\":\"\\\\mathbf{Q}\"},\"𝐑\":{\"math\":\"\\\\mathbf{R}\"},\"𝐒\":{\"math\":\"\\\\mathbf{S}\"},\"𝐓\":{\"math\":\"\\\\mathbf{T}\"},\"𝐔\":{\"math\":\"\\\\mathbf{U}\"},\"𝐕\":{\"math\":\"\\\\mathbf{V}\"},\"𝐖\":{\"math\":\"\\\\mathbf{W}\"},\"𝐗\":{\"math\":\"\\\\mathbf{X}\"},\"𝐘\":{\"math\":\"\\\\mathbf{Y}\"},\"𝐙\":{\"math\":\"\\\\mathbf{Z}\"},\"𝐚\":{\"math\":\"\\\\mathbf{a}\"},\"𝐛\":{\"math\":\"\\\\mathbf{b}\"},\"𝐜\":{\"math\":\"\\\\mathbf{c}\"},\"𝐝\":{\"math\":\"\\\\mathbf{d}\"},\"𝐞\":{\"math\":\"\\\\mathbf{e}\"},\"𝐟\":{\"math\":\"\\\\mathbf{f}\"},\"𝐠\":{\"math\":\"\\\\mathbf{g}\"},\"𝐡\":{\"math\":\"\\\\mathbf{h}\"},\"𝐢\":{\"math\":\"\\\\mathbf{i}\"},\"𝐣\":{\"math\":\"\\\\mathbf{j}\"},\"𝐤\":{\"math\":\"\\\\mathbf{k}\"},\"𝐥\":{\"math\":\"\\\\mathbf{l}\"},\"𝐦\":{\"math\":\"\\\\mathbf{m}\"},\"𝐧\":{\"math\":\"\\\\mathbf{n}\"},\"𝐨\":{\"math\":\"\\\\mathbf{o}\"},\"𝐩\":{\"math\":\"\\\\mathbf{p}\"},\"𝐪\":{\"math\":\"\\\\mathbf{q}\"},\"𝐫\":{\"math\":\"\\\\mathbf{r}\"},\"𝐬\":{\"math\":\"\\\\mathbf{s}\"},\"𝐭\":{\"math\":\"\\\\mathbf{t}\"},\"𝐮\":{\"math\":\"\\\\mathbf{u}\"},\"𝐯\":{\"math\":\"\\\\mathbf{v}\"},\"𝐰\":{\"math\":\"\\\\mathbf{w}\"},\"𝐱\":{\"math\":\"\\\\mathbf{x}\"},\"𝐲\":{\"math\":\"\\\\mathbf{y}\"},\"𝐳\":{\"math\":\"\\\\mathbf{z}\"},\"𝐴\":{\"math\":\"\\\\mathsl{A}\"},\"𝐵\":{\"math\":\"\\\\mathsl{B}\"},\"𝐶\":{\"math\":\"\\\\mathsl{C}\"},\"𝐷\":{\"math\":\"\\\\mathsl{D}\"},\"𝐸\":{\"math\":\"\\\\mathsl{E}\"},\"𝐹\":{\"math\":\"\\\\mathsl{F}\"},\"𝐺\":{\"math\":\"\\\\mathsl{G}\"},\"𝐻\":{\"math\":\"\\\\mathsl{H}\"},\"𝐼\":{\"math\":\"\\\\mathsl{I}\"},\"𝐽\":{\"math\":\"\\\\mathsl{J}\"},\"𝐾\":{\"math\":\"\\\\mathsl{K}\"},\"𝐿\":{\"math\":\"\\\\mathsl{L}\"},\"𝑀\":{\"math\":\"\\\\mathsl{M}\"},\"𝑁\":{\"math\":\"\\\\mathsl{N}\"},\"𝑂\":{\"math\":\"\\\\mathsl{O}\"},\"𝑃\":{\"math\":\"\\\\mathsl{P}\"},\"𝑄\":{\"math\":\"\\\\mathsl{Q}\"},\"𝑅\":{\"math\":\"\\\\mathsl{R}\"},\"𝑆\":{\"math\":\"\\\\mathsl{S}\"},\"𝑇\":{\"math\":\"\\\\mathsl{T}\"},\"𝑈\":{\"math\":\"\\\\mathsl{U}\"},\"𝑉\":{\"math\":\"\\\\mathsl{V}\"},\"𝑊\":{\"math\":\"\\\\mathsl{W}\"},\"𝑋\":{\"math\":\"\\\\mathsl{X}\"},\"𝑌\":{\"math\":\"\\\\mathsl{Y}\"},\"𝑍\":{\"math\":\"\\\\mathsl{Z}\"},\"𝑎\":{\"math\":\"\\\\mathsl{a}\"},\"𝑏\":{\"math\":\"\\\\mathsl{b}\"},\"𝑐\":{\"math\":\"\\\\mathsl{c}\"},\"𝑑\":{\"math\":\"\\\\mathsl{d}\"},\"𝑒\":{\"math\":\"\\\\mathsl{e}\"},\"𝑓\":{\"math\":\"\\\\mathsl{f}\"},\"𝑔\":{\"math\":\"\\\\mathsl{g}\"},\"𝑖\":{\"math\":\"\\\\mathsl{i}\"},\"𝑗\":{\"math\":\"\\\\mathsl{j}\"},\"𝑘\":{\"math\":\"\\\\mathsl{k}\"},\"𝑙\":{\"math\":\"\\\\mathsl{l}\"},\"𝑚\":{\"math\":\"\\\\mathsl{m}\"},\"𝑛\":{\"math\":\"\\\\mathsl{n}\"},\"𝑜\":{\"math\":\"\\\\mathsl{o}\"},\"𝑝\":{\"math\":\"\\\\mathsl{p}\"},\"𝑞\":{\"math\":\"\\\\mathsl{q}\"},\"𝑟\":{\"math\":\"\\\\mathsl{r}\"},\"𝑠\":{\"math\":\"\\\\mathsl{s}\"},\"𝑡\":{\"math\":\"\\\\mathsl{t}\"},\"𝑢\":{\"math\":\"\\\\mathsl{u}\"},\"𝑣\":{\"math\":\"\\\\mathsl{v}\"},\"𝑤\":{\"math\":\"\\\\mathsl{w}\"},\"𝑥\":{\"math\":\"\\\\mathsl{x}\"},\"𝑦\":{\"math\":\"\\\\mathsl{y}\"},\"𝑧\":{\"math\":\"\\\\mathsl{z}\"},\"𝑨\":{\"math\":\"\\\\mathbit{A}\"},\"𝑩\":{\"math\":\"\\\\mathbit{B}\"},\"𝑪\":{\"math\":\"\\\\mathbit{C}\"},\"𝑫\":{\"math\":\"\\\\mathbit{D}\"},\"𝑬\":{\"math\":\"\\\\mathbit{E}\"},\"𝑭\":{\"math\":\"\\\\mathbit{F}\"},\"𝑮\":{\"math\":\"\\\\mathbit{G}\"},\"𝑯\":{\"math\":\"\\\\mathbit{H}\"},\"𝑰\":{\"math\":\"\\\\mathbit{I}\"},\"𝑱\":{\"math\":\"\\\\mathbit{J}\"},\"𝑲\":{\"math\":\"\\\\mathbit{K}\"},\"𝑳\":{\"math\":\"\\\\mathbit{L}\"},\"𝑴\":{\"math\":\"\\\\mathbit{M}\"},\"𝑵\":{\"math\":\"\\\\mathbit{N}\"},\"𝑶\":{\"math\":\"\\\\mathbit{O}\"},\"𝑷\":{\"math\":\"\\\\mathbit{P}\"},\"𝑸\":{\"math\":\"\\\\mathbit{Q}\"},\"𝑹\":{\"math\":\"\\\\mathbit{R}\"},\"𝑺\":{\"math\":\"\\\\mathbit{S}\"},\"𝑻\":{\"math\":\"\\\\mathbit{T}\"},\"𝑼\":{\"math\":\"\\\\mathbit{U}\"},\"𝑽\":{\"math\":\"\\\\mathbit{V}\"},\"𝑾\":{\"math\":\"\\\\mathbit{W}\"},\"𝑿\":{\"math\":\"\\\\mathbit{X}\"},\"𝒀\":{\"math\":\"\\\\mathbit{Y}\"},\"𝒁\":{\"math\":\"\\\\mathbit{Z}\"},\"𝒂\":{\"math\":\"\\\\mathbit{a}\"},\"𝒃\":{\"math\":\"\\\\mathbit{b}\"},\"𝒄\":{\"math\":\"\\\\mathbit{c}\"},\"𝒅\":{\"math\":\"\\\\mathbit{d}\"},\"𝒆\":{\"math\":\"\\\\mathbit{e}\"},\"𝒇\":{\"math\":\"\\\\mathbit{f}\"},\"𝒈\":{\"math\":\"\\\\mathbit{g}\"},\"𝒉\":{\"math\":\"\\\\mathbit{h}\"},\"𝒊\":{\"math\":\"\\\\mathbit{i}\"},\"𝒋\":{\"math\":\"\\\\mathbit{j}\"},\"𝒌\":{\"math\":\"\\\\mathbit{k}\"},\"𝒍\":{\"math\":\"\\\\mathbit{l}\"},\"𝒎\":{\"math\":\"\\\\mathbit{m}\"},\"𝒏\":{\"math\":\"\\\\mathbit{n}\"},\"𝒐\":{\"math\":\"\\\\mathbit{o}\"},\"𝒑\":{\"math\":\"\\\\mathbit{p}\"},\"𝒒\":{\"math\":\"\\\\mathbit{q}\"},\"𝒓\":{\"math\":\"\\\\mathbit{r}\"},\"𝒔\":{\"math\":\"\\\\mathbit{s}\"},\"𝒕\":{\"math\":\"\\\\mathbit{t}\"},\"𝒖\":{\"math\":\"\\\\mathbit{u}\"},\"𝒗\":{\"math\":\"\\\\mathbit{v}\"},\"𝒘\":{\"math\":\"\\\\mathbit{w}\"},\"𝒙\":{\"math\":\"\\\\mathbit{x}\"},\"𝒚\":{\"math\":\"\\\\mathbit{y}\"},\"𝒛\":{\"math\":\"\\\\mathbit{z}\"},\"𝒜\":{\"math\":\"\\\\mathscr{A}\"},\"𝒞\":{\"math\":\"\\\\mathscr{C}\"},\"𝒟\":{\"math\":\"\\\\mathscr{D}\"},\"𝒢\":{\"math\":\"\\\\mathscr{G}\"},\"𝒥\":{\"math\":\"\\\\mathscr{J}\"},\"𝒦\":{\"math\":\"\\\\mathscr{K}\"},\"𝒩\":{\"math\":\"\\\\mathscr{N}\"},\"𝒪\":{\"math\":\"\\\\mathscr{O}\"},\"𝒫\":{\"math\":\"\\\\mathscr{P}\"},\"𝒬\":{\"math\":\"\\\\mathscr{Q}\"},\"𝒮\":{\"math\":\"\\\\mathscr{S}\"},\"𝒯\":{\"math\":\"\\\\mathscr{T}\"},\"𝒰\":{\"math\":\"\\\\mathscr{U}\"},\"𝒱\":{\"math\":\"\\\\mathscr{V}\"},\"𝒲\":{\"math\":\"\\\\mathscr{W}\"},\"𝒳\":{\"math\":\"\\\\mathscr{X}\"},\"𝒴\":{\"math\":\"\\\\mathscr{Y}\"},\"𝒵\":{\"math\":\"\\\\mathscr{Z}\"},\"𝒶\":{\"math\":\"\\\\mathscr{a}\"},\"𝒷\":{\"math\":\"\\\\mathscr{b}\"},\"𝒸\":{\"math\":\"\\\\mathscr{c}\"},\"𝒹\":{\"math\":\"\\\\mathscr{d}\"},\"𝒻\":{\"math\":\"\\\\mathscr{f}\"},\"𝒽\":{\"math\":\"\\\\mathscr{h}\"},\"𝒾\":{\"math\":\"\\\\mathscr{i}\"},\"𝒿\":{\"math\":\"\\\\mathscr{j}\"},\"𝓀\":{\"math\":\"\\\\mathscr{k}\"},\"𝓁\":{\"math\":\"\\\\mathscr{l}\"},\"𝓂\":{\"math\":\"\\\\mathscr{m}\"},\"𝓃\":{\"math\":\"\\\\mathscr{n}\"},\"𝓅\":{\"math\":\"\\\\mathscr{p}\"},\"𝓆\":{\"math\":\"\\\\mathscr{q}\"},\"𝓇\":{\"math\":\"\\\\mathscr{r}\"},\"𝓈\":{\"math\":\"\\\\mathscr{s}\"},\"𝓉\":{\"math\":\"\\\\mathscr{t}\"},\"𝓊\":{\"math\":\"\\\\mathscr{u}\"},\"𝓋\":{\"math\":\"\\\\mathscr{v}\"},\"𝓌\":{\"math\":\"\\\\mathscr{w}\"},\"𝓍\":{\"math\":\"\\\\mathscr{x}\"},\"𝓎\":{\"math\":\"\\\\mathscr{y}\"},\"𝓏\":{\"math\":\"\\\\mathscr{z}\"},\"𝓐\":{\"math\":\"\\\\mathmit{A}\"},\"𝓑\":{\"math\":\"\\\\mathmit{B}\"},\"𝓒\":{\"math\":\"\\\\mathmit{C}\"},\"𝓓\":{\"math\":\"\\\\mathmit{D}\"},\"𝓔\":{\"math\":\"\\\\mathmit{E}\"},\"𝓕\":{\"math\":\"\\\\mathmit{F}\"},\"𝓖\":{\"math\":\"\\\\mathmit{G}\"},\"𝓗\":{\"math\":\"\\\\mathmit{H}\"},\"𝓘\":{\"math\":\"\\\\mathmit{I}\"},\"𝓙\":{\"math\":\"\\\\mathmit{J}\"},\"𝓚\":{\"math\":\"\\\\mathmit{K}\"},\"𝓛\":{\"math\":\"\\\\mathmit{L}\"},\"𝓜\":{\"math\":\"\\\\mathmit{M}\"},\"𝓝\":{\"math\":\"\\\\mathmit{N}\"},\"𝓞\":{\"math\":\"\\\\mathmit{O}\"},\"𝓟\":{\"math\":\"\\\\mathmit{P}\"},\"𝓠\":{\"math\":\"\\\\mathmit{Q}\"},\"𝓡\":{\"math\":\"\\\\mathmit{R}\"},\"𝓢\":{\"math\":\"\\\\mathmit{S}\"},\"𝓣\":{\"math\":\"\\\\mathmit{T}\"},\"𝓤\":{\"math\":\"\\\\mathmit{U}\"},\"𝓥\":{\"math\":\"\\\\mathmit{V}\"},\"𝓦\":{\"math\":\"\\\\mathmit{W}\"},\"𝓧\":{\"math\":\"\\\\mathmit{X}\"},\"𝓨\":{\"math\":\"\\\\mathmit{Y}\"},\"𝓩\":{\"math\":\"\\\\mathmit{Z}\"},\"𝓪\":{\"math\":\"\\\\mathmit{a}\"},\"𝓫\":{\"math\":\"\\\\mathmit{b}\"},\"𝓬\":{\"math\":\"\\\\mathmit{c}\"},\"𝓭\":{\"math\":\"\\\\mathmit{d}\"},\"𝓮\":{\"math\":\"\\\\mathmit{e}\"},\"𝓯\":{\"math\":\"\\\\mathmit{f}\"},\"𝓰\":{\"math\":\"\\\\mathmit{g}\"},\"𝓱\":{\"math\":\"\\\\mathmit{h}\"},\"𝓲\":{\"math\":\"\\\\mathmit{i}\"},\"𝓳\":{\"math\":\"\\\\mathmit{j}\"},\"𝓴\":{\"math\":\"\\\\mathmit{k}\"},\"𝓵\":{\"math\":\"\\\\mathmit{l}\"},\"𝓶\":{\"math\":\"\\\\mathmit{m}\"},\"𝓷\":{\"math\":\"\\\\mathmit{n}\"},\"𝓸\":{\"math\":\"\\\\mathmit{o}\"},\"𝓹\":{\"math\":\"\\\\mathmit{p}\"},\"𝓺\":{\"math\":\"\\\\mathmit{q}\"},\"𝓻\":{\"math\":\"\\\\mathmit{r}\"},\"𝓼\":{\"math\":\"\\\\mathmit{s}\"},\"𝓽\":{\"math\":\"\\\\mathmit{t}\"},\"𝓾\":{\"math\":\"\\\\mathmit{u}\"},\"𝓿\":{\"math\":\"\\\\mathmit{v}\"},\"𝔀\":{\"math\":\"\\\\mathmit{w}\"},\"𝔁\":{\"math\":\"\\\\mathmit{x}\"},\"𝔂\":{\"math\":\"\\\\mathmit{y}\"},\"𝔃\":{\"math\":\"\\\\mathmit{z}\"},\"𝔄\":{\"math\":\"\\\\mathfrak{A}\"},\"𝔅\":{\"math\":\"\\\\mathfrak{B}\"},\"𝔇\":{\"math\":\"\\\\mathfrak{D}\"},\"𝔈\":{\"math\":\"\\\\mathfrak{E}\"},\"𝔉\":{\"math\":\"\\\\mathfrak{F}\"},\"𝔊\":{\"math\":\"\\\\mathfrak{G}\"},\"𝔍\":{\"math\":\"\\\\mathfrak{J}\"},\"𝔎\":{\"math\":\"\\\\mathfrak{K}\"},\"𝔏\":{\"math\":\"\\\\mathfrak{L}\"},\"𝔐\":{\"math\":\"\\\\mathfrak{M}\"},\"𝔑\":{\"math\":\"\\\\mathfrak{N}\"},\"𝔒\":{\"math\":\"\\\\mathfrak{O}\"},\"𝔓\":{\"math\":\"\\\\mathfrak{P}\"},\"𝔔\":{\"math\":\"\\\\mathfrak{Q}\"},\"𝔖\":{\"math\":\"\\\\mathfrak{S}\"},\"𝔗\":{\"math\":\"\\\\mathfrak{T}\"},\"𝔘\":{\"math\":\"\\\\mathfrak{U}\"},\"𝔙\":{\"math\":\"\\\\mathfrak{V}\"},\"𝔚\":{\"math\":\"\\\\mathfrak{W}\"},\"𝔛\":{\"math\":\"\\\\mathfrak{X}\"},\"𝔜\":{\"math\":\"\\\\mathfrak{Y}\"},\"𝔞\":{\"math\":\"\\\\mathfrak{a}\"},\"𝔟\":{\"math\":\"\\\\mathfrak{b}\"},\"𝔠\":{\"math\":\"\\\\mathfrak{c}\"},\"𝔡\":{\"math\":\"\\\\mathfrak{d}\"},\"𝔢\":{\"math\":\"\\\\mathfrak{e}\"},\"𝔣\":{\"math\":\"\\\\mathfrak{f}\"},\"𝔤\":{\"math\":\"\\\\mathfrak{g}\"},\"𝔥\":{\"math\":\"\\\\mathfrak{h}\"},\"𝔦\":{\"math\":\"\\\\mathfrak{i}\"},\"𝔧\":{\"math\":\"\\\\mathfrak{j}\"},\"𝔨\":{\"math\":\"\\\\mathfrak{k}\"},\"𝔩\":{\"math\":\"\\\\mathfrak{l}\"},\"𝔪\":{\"math\":\"\\\\mathfrak{m}\"},\"𝔫\":{\"math\":\"\\\\mathfrak{n}\"},\"𝔬\":{\"math\":\"\\\\mathfrak{o}\"},\"𝔭\":{\"math\":\"\\\\mathfrak{p}\"},\"𝔮\":{\"math\":\"\\\\mathfrak{q}\"},\"𝔯\":{\"math\":\"\\\\mathfrak{r}\"},\"𝔰\":{\"math\":\"\\\\mathfrak{s}\"},\"𝔱\":{\"math\":\"\\\\mathfrak{t}\"},\"𝔲\":{\"math\":\"\\\\mathfrak{u}\"},\"𝔳\":{\"math\":\"\\\\mathfrak{v}\"},\"𝔴\":{\"math\":\"\\\\mathfrak{w}\"},\"𝔵\":{\"math\":\"\\\\mathfrak{x}\"},\"𝔶\":{\"math\":\"\\\\mathfrak{y}\"},\"𝔷\":{\"math\":\"\\\\mathfrak{z}\"},\"𝔸\":{\"math\":\"\\\\mathbb{A}\"},\"𝔹\":{\"math\":\"\\\\mathbb{B}\"},\"𝔻\":{\"math\":\"\\\\mathbb{D}\"},\"𝔼\":{\"math\":\"\\\\mathbb{E}\"},\"𝔽\":{\"math\":\"\\\\mathbb{F}\"},\"𝔾\":{\"math\":\"\\\\mathbb{G}\"},\"𝕀\":{\"math\":\"\\\\mathbb{I}\"},\"𝕁\":{\"math\":\"\\\\mathbb{J}\"},\"𝕂\":{\"math\":\"\\\\mathbb{K}\"},\"𝕃\":{\"math\":\"\\\\mathbb{L}\"},\"𝕄\":{\"math\":\"\\\\mathbb{M}\"},\"𝕆\":{\"math\":\"\\\\mathbb{O}\"},\"𝕊\":{\"math\":\"\\\\mathbb{S}\"},\"𝕋\":{\"math\":\"\\\\mathbb{T}\"},\"𝕌\":{\"math\":\"\\\\mathbb{U}\"},\"𝕍\":{\"math\":\"\\\\mathbb{V}\"},\"𝕎\":{\"math\":\"\\\\mathbb{W}\"},\"𝕏\":{\"math\":\"\\\\mathbb{X}\"},\"𝕐\":{\"math\":\"\\\\mathbb{Y}\"},\"𝕒\":{\"math\":\"\\\\mathbb{a}\"},\"𝕓\":{\"math\":\"\\\\mathbb{b}\"},\"𝕔\":{\"math\":\"\\\\mathbb{c}\"},\"𝕕\":{\"math\":\"\\\\mathbb{d}\"},\"𝕖\":{\"math\":\"\\\\mathbb{e}\"},\"𝕗\":{\"math\":\"\\\\mathbb{f}\"},\"𝕘\":{\"math\":\"\\\\mathbb{g}\"},\"𝕙\":{\"math\":\"\\\\mathbb{h}\"},\"𝕚\":{\"math\":\"\\\\mathbb{i}\"},\"𝕛\":{\"math\":\"\\\\mathbb{j}\"},\"𝕜\":{\"math\":\"\\\\mathbb{k}\"},\"𝕝\":{\"math\":\"\\\\mathbb{l}\"},\"𝕞\":{\"math\":\"\\\\mathbb{m}\"},\"𝕟\":{\"math\":\"\\\\mathbb{n}\"},\"𝕠\":{\"math\":\"\\\\mathbb{o}\"},\"𝕡\":{\"math\":\"\\\\mathbb{p}\"},\"𝕢\":{\"math\":\"\\\\mathbb{q}\"},\"𝕣\":{\"math\":\"\\\\mathbb{r}\"},\"𝕤\":{\"math\":\"\\\\mathbb{s}\"},\"𝕥\":{\"math\":\"\\\\mathbb{t}\"},\"𝕦\":{\"math\":\"\\\\mathbb{u}\"},\"𝕧\":{\"math\":\"\\\\mathbb{v}\"},\"𝕨\":{\"math\":\"\\\\mathbb{w}\"},\"𝕩\":{\"math\":\"\\\\mathbb{x}\"},\"𝕪\":{\"math\":\"\\\\mathbb{y}\"},\"𝕫\":{\"math\":\"\\\\mathbb{z}\"},\"𝕬\":{\"math\":\"\\\\mathslbb{A}\"},\"𝕭\":{\"math\":\"\\\\mathslbb{B}\"},\"𝕮\":{\"math\":\"\\\\mathslbb{C}\"},\"𝕯\":{\"math\":\"\\\\mathslbb{D}\"},\"𝕰\":{\"math\":\"\\\\mathslbb{E}\"},\"𝕱\":{\"math\":\"\\\\mathslbb{F}\"},\"𝕲\":{\"math\":\"\\\\mathslbb{G}\"},\"𝕳\":{\"math\":\"\\\\mathslbb{H}\"},\"𝕴\":{\"math\":\"\\\\mathslbb{I}\"},\"𝕵\":{\"math\":\"\\\\mathslbb{J}\"},\"𝕶\":{\"math\":\"\\\\mathslbb{K}\"},\"𝕷\":{\"math\":\"\\\\mathslbb{L}\"},\"𝕸\":{\"math\":\"\\\\mathslbb{M}\"},\"𝕹\":{\"math\":\"\\\\mathslbb{N}\"},\"𝕺\":{\"math\":\"\\\\mathslbb{O}\"},\"𝕻\":{\"math\":\"\\\\mathslbb{P}\"},\"𝕼\":{\"math\":\"\\\\mathslbb{Q}\"},\"𝕽\":{\"math\":\"\\\\mathslbb{R}\"},\"𝕾\":{\"math\":\"\\\\mathslbb{S}\"},\"𝕿\":{\"math\":\"\\\\mathslbb{T}\"},\"𝖀\":{\"math\":\"\\\\mathslbb{U}\"},\"𝖁\":{\"math\":\"\\\\mathslbb{V}\"},\"𝖂\":{\"math\":\"\\\\mathslbb{W}\"},\"𝖃\":{\"math\":\"\\\\mathslbb{X}\"},\"𝖄\":{\"math\":\"\\\\mathslbb{Y}\"},\"𝖅\":{\"math\":\"\\\\mathslbb{Z}\"},\"𝖆\":{\"math\":\"\\\\mathslbb{a}\"},\"𝖇\":{\"math\":\"\\\\mathslbb{b}\"},\"𝖈\":{\"math\":\"\\\\mathslbb{c}\"},\"𝖉\":{\"math\":\"\\\\mathslbb{d}\"},\"𝖊\":{\"math\":\"\\\\mathslbb{e}\"},\"𝖋\":{\"math\":\"\\\\mathslbb{f}\"},\"𝖌\":{\"math\":\"\\\\mathslbb{g}\"},\"𝖍\":{\"math\":\"\\\\mathslbb{h}\"},\"𝖎\":{\"math\":\"\\\\mathslbb{i}\"},\"𝖏\":{\"math\":\"\\\\mathslbb{j}\"},\"𝖐\":{\"math\":\"\\\\mathslbb{k}\"},\"𝖑\":{\"math\":\"\\\\mathslbb{l}\"},\"𝖒\":{\"math\":\"\\\\mathslbb{m}\"},\"𝖓\":{\"math\":\"\\\\mathslbb{n}\"},\"𝖔\":{\"math\":\"\\\\mathslbb{o}\"},\"𝖕\":{\"math\":\"\\\\mathslbb{p}\"},\"𝖖\":{\"math\":\"\\\\mathslbb{q}\"},\"𝖗\":{\"math\":\"\\\\mathslbb{r}\"},\"𝖘\":{\"math\":\"\\\\mathslbb{s}\"},\"𝖙\":{\"math\":\"\\\\mathslbb{t}\"},\"𝖚\":{\"math\":\"\\\\mathslbb{u}\"},\"𝖛\":{\"math\":\"\\\\mathslbb{v}\"},\"𝖜\":{\"math\":\"\\\\mathslbb{w}\"},\"𝖝\":{\"math\":\"\\\\mathslbb{x}\"},\"𝖞\":{\"math\":\"\\\\mathslbb{y}\"},\"𝖟\":{\"math\":\"\\\\mathslbb{z}\"},\"𝖠\":{\"math\":\"\\\\mathsf{A}\"},\"𝖡\":{\"math\":\"\\\\mathsf{B}\"},\"𝖢\":{\"math\":\"\\\\mathsf{C}\"},\"𝖣\":{\"math\":\"\\\\mathsf{D}\"},\"𝖤\":{\"math\":\"\\\\mathsf{E}\"},\"𝖥\":{\"math\":\"\\\\mathsf{F}\"},\"𝖦\":{\"math\":\"\\\\mathsf{G}\"},\"𝖧\":{\"math\":\"\\\\mathsf{H}\"},\"𝖨\":{\"math\":\"\\\\mathsf{I}\"},\"𝖩\":{\"math\":\"\\\\mathsf{J}\"},\"𝖪\":{\"math\":\"\\\\mathsf{K}\"},\"𝖫\":{\"math\":\"\\\\mathsf{L}\"},\"𝖬\":{\"math\":\"\\\\mathsf{M}\"},\"𝖭\":{\"math\":\"\\\\mathsf{N}\"},\"𝖮\":{\"math\":\"\\\\mathsf{O}\"},\"𝖯\":{\"math\":\"\\\\mathsf{P}\"},\"𝖰\":{\"math\":\"\\\\mathsf{Q}\"},\"𝖱\":{\"math\":\"\\\\mathsf{R}\"},\"𝖲\":{\"math\":\"\\\\mathsf{S}\"},\"𝖳\":{\"math\":\"\\\\mathsf{T}\"},\"𝖴\":{\"math\":\"\\\\mathsf{U}\"},\"𝖵\":{\"math\":\"\\\\mathsf{V}\"},\"𝖶\":{\"math\":\"\\\\mathsf{W}\"},\"𝖷\":{\"math\":\"\\\\mathsf{X}\"},\"𝖸\":{\"math\":\"\\\\mathsf{Y}\"},\"𝖹\":{\"math\":\"\\\\mathsf{Z}\"},\"𝖺\":{\"math\":\"\\\\mathsf{a}\"},\"𝖻\":{\"math\":\"\\\\mathsf{b}\"},\"𝖼\":{\"math\":\"\\\\mathsf{c}\"},\"𝖽\":{\"math\":\"\\\\mathsf{d}\"},\"𝖾\":{\"math\":\"\\\\mathsf{e}\"},\"𝖿\":{\"math\":\"\\\\mathsf{f}\"},\"𝗀\":{\"math\":\"\\\\mathsf{g}\"},\"𝗁\":{\"math\":\"\\\\mathsf{h}\"},\"𝗂\":{\"math\":\"\\\\mathsf{i}\"},\"𝗃\":{\"math\":\"\\\\mathsf{j}\"},\"𝗄\":{\"math\":\"\\\\mathsf{k}\"},\"𝗅\":{\"math\":\"\\\\mathsf{l}\"},\"𝗆\":{\"math\":\"\\\\mathsf{m}\"},\"𝗇\":{\"math\":\"\\\\mathsf{n}\"},\"𝗈\":{\"math\":\"\\\\mathsf{o}\"},\"𝗉\":{\"math\":\"\\\\mathsf{p}\"},\"𝗊\":{\"math\":\"\\\\mathsf{q}\"},\"𝗋\":{\"math\":\"\\\\mathsf{r}\"},\"𝗌\":{\"math\":\"\\\\mathsf{s}\"},\"𝗍\":{\"math\":\"\\\\mathsf{t}\"},\"𝗎\":{\"math\":\"\\\\mathsf{u}\"},\"𝗏\":{\"math\":\"\\\\mathsf{v}\"},\"𝗐\":{\"math\":\"\\\\mathsf{w}\"},\"𝗑\":{\"math\":\"\\\\mathsf{x}\"},\"𝗒\":{\"math\":\"\\\\mathsf{y}\"},\"𝗓\":{\"math\":\"\\\\mathsf{z}\"},\"𝗔\":{\"math\":\"\\\\mathsfbf{A}\"},\"𝗕\":{\"math\":\"\\\\mathsfbf{B}\"},\"𝗖\":{\"math\":\"\\\\mathsfbf{C}\"},\"𝗗\":{\"math\":\"\\\\mathsfbf{D}\"},\"𝗘\":{\"math\":\"\\\\mathsfbf{E}\"},\"𝗙\":{\"math\":\"\\\\mathsfbf{F}\"},\"𝗚\":{\"math\":\"\\\\mathsfbf{G}\"},\"𝗛\":{\"math\":\"\\\\mathsfbf{H}\"},\"𝗜\":{\"math\":\"\\\\mathsfbf{I}\"},\"𝗝\":{\"math\":\"\\\\mathsfbf{J}\"},\"𝗞\":{\"math\":\"\\\\mathsfbf{K}\"},\"𝗟\":{\"math\":\"\\\\mathsfbf{L}\"},\"𝗠\":{\"math\":\"\\\\mathsfbf{M}\"},\"𝗡\":{\"math\":\"\\\\mathsfbf{N}\"},\"𝗢\":{\"math\":\"\\\\mathsfbf{O}\"},\"𝗣\":{\"math\":\"\\\\mathsfbf{P}\"},\"𝗤\":{\"math\":\"\\\\mathsfbf{Q}\"},\"𝗥\":{\"math\":\"\\\\mathsfbf{R}\"},\"𝗦\":{\"math\":\"\\\\mathsfbf{S}\"},\"𝗧\":{\"math\":\"\\\\mathsfbf{T}\"},\"𝗨\":{\"math\":\"\\\\mathsfbf{U}\"},\"𝗩\":{\"math\":\"\\\\mathsfbf{V}\"},\"𝗪\":{\"math\":\"\\\\mathsfbf{W}\"},\"𝗫\":{\"math\":\"\\\\mathsfbf{X}\"},\"𝗬\":{\"math\":\"\\\\mathsfbf{Y}\"},\"𝗭\":{\"math\":\"\\\\mathsfbf{Z}\"},\"𝗮\":{\"math\":\"\\\\mathsfbf{a}\"},\"𝗯\":{\"math\":\"\\\\mathsfbf{b}\"},\"𝗰\":{\"math\":\"\\\\mathsfbf{c}\"},\"𝗱\":{\"math\":\"\\\\mathsfbf{d}\"},\"𝗲\":{\"math\":\"\\\\mathsfbf{e}\"},\"𝗳\":{\"math\":\"\\\\mathsfbf{f}\"},\"𝗴\":{\"math\":\"\\\\mathsfbf{g}\"},\"𝗵\":{\"math\":\"\\\\mathsfbf{h}\"},\"𝗶\":{\"math\":\"\\\\mathsfbf{i}\"},\"𝗷\":{\"math\":\"\\\\mathsfbf{j}\"},\"𝗸\":{\"math\":\"\\\\mathsfbf{k}\"},\"𝗹\":{\"math\":\"\\\\mathsfbf{l}\"},\"𝗺\":{\"math\":\"\\\\mathsfbf{m}\"},\"𝗻\":{\"math\":\"\\\\mathsfbf{n}\"},\"𝗼\":{\"math\":\"\\\\mathsfbf{o}\"},\"𝗽\":{\"math\":\"\\\\mathsfbf{p}\"},\"𝗾\":{\"math\":\"\\\\mathsfbf{q}\"},\"𝗿\":{\"math\":\"\\\\mathsfbf{r}\"},\"𝘀\":{\"math\":\"\\\\mathsfbf{s}\"},\"𝘁\":{\"math\":\"\\\\mathsfbf{t}\"},\"𝘂\":{\"math\":\"\\\\mathsfbf{u}\"},\"𝘃\":{\"math\":\"\\\\mathsfbf{v}\"},\"𝘄\":{\"math\":\"\\\\mathsfbf{w}\"},\"𝘅\":{\"math\":\"\\\\mathsfbf{x}\"},\"𝘆\":{\"math\":\"\\\\mathsfbf{y}\"},\"𝘇\":{\"math\":\"\\\\mathsfbf{z}\"},\"𝘈\":{\"math\":\"\\\\mathsfsl{A}\"},\"𝘉\":{\"math\":\"\\\\mathsfsl{B}\"},\"𝘊\":{\"math\":\"\\\\mathsfsl{C}\"},\"𝘋\":{\"math\":\"\\\\mathsfsl{D}\"},\"𝘌\":{\"math\":\"\\\\mathsfsl{E}\"},\"𝘍\":{\"math\":\"\\\\mathsfsl{F}\"},\"𝘎\":{\"math\":\"\\\\mathsfsl{G}\"},\"𝘏\":{\"math\":\"\\\\mathsfsl{H}\"},\"𝘐\":{\"math\":\"\\\\mathsfsl{I}\"},\"𝘑\":{\"math\":\"\\\\mathsfsl{J}\"},\"𝘒\":{\"math\":\"\\\\mathsfsl{K}\"},\"𝘓\":{\"math\":\"\\\\mathsfsl{L}\"},\"𝘔\":{\"math\":\"\\\\mathsfsl{M}\"},\"𝘕\":{\"math\":\"\\\\mathsfsl{N}\"},\"𝘖\":{\"math\":\"\\\\mathsfsl{O}\"},\"𝘗\":{\"math\":\"\\\\mathsfsl{P}\"},\"𝘘\":{\"math\":\"\\\\mathsfsl{Q}\"},\"𝘙\":{\"math\":\"\\\\mathsfsl{R}\"},\"𝘚\":{\"math\":\"\\\\mathsfsl{S}\"},\"𝘛\":{\"math\":\"\\\\mathsfsl{T}\"},\"𝘜\":{\"math\":\"\\\\mathsfsl{U}\"},\"𝘝\":{\"math\":\"\\\\mathsfsl{V}\"},\"𝘞\":{\"math\":\"\\\\mathsfsl{W}\"},\"𝘟\":{\"math\":\"\\\\mathsfsl{X}\"},\"𝘠\":{\"math\":\"\\\\mathsfsl{Y}\"},\"𝘡\":{\"math\":\"\\\\mathsfsl{Z}\"},\"𝘢\":{\"math\":\"\\\\mathsfsl{a}\"},\"𝘣\":{\"math\":\"\\\\mathsfsl{b}\"},\"𝘤\":{\"math\":\"\\\\mathsfsl{c}\"},\"𝘥\":{\"math\":\"\\\\mathsfsl{d}\"},\"𝘦\":{\"math\":\"\\\\mathsfsl{e}\"},\"𝘧\":{\"math\":\"\\\\mathsfsl{f}\"},\"𝘨\":{\"math\":\"\\\\mathsfsl{g}\"},\"𝘩\":{\"math\":\"\\\\mathsfsl{h}\"},\"𝘪\":{\"math\":\"\\\\mathsfsl{i}\"},\"𝘫\":{\"math\":\"\\\\mathsfsl{j}\"},\"𝘬\":{\"math\":\"\\\\mathsfsl{k}\"},\"𝘭\":{\"math\":\"\\\\mathsfsl{l}\"},\"𝘮\":{\"math\":\"\\\\mathsfsl{m}\"},\"𝘯\":{\"math\":\"\\\\mathsfsl{n}\"},\"𝘰\":{\"math\":\"\\\\mathsfsl{o}\"},\"𝘱\":{\"math\":\"\\\\mathsfsl{p}\"},\"𝘲\":{\"math\":\"\\\\mathsfsl{q}\"},\"𝘳\":{\"math\":\"\\\\mathsfsl{r}\"},\"𝘴\":{\"math\":\"\\\\mathsfsl{s}\"},\"𝘵\":{\"math\":\"\\\\mathsfsl{t}\"},\"𝘶\":{\"math\":\"\\\\mathsfsl{u}\"},\"𝘷\":{\"math\":\"\\\\mathsfsl{v}\"},\"𝘸\":{\"math\":\"\\\\mathsfsl{w}\"},\"𝘹\":{\"math\":\"\\\\mathsfsl{x}\"},\"𝘺\":{\"math\":\"\\\\mathsfsl{y}\"},\"𝘻\":{\"math\":\"\\\\mathsfsl{z}\"},\"𝘼\":{\"math\":\"\\\\mathsfbfsl{A}\"},\"𝘽\":{\"math\":\"\\\\mathsfbfsl{B}\"},\"𝘾\":{\"math\":\"\\\\mathsfbfsl{C}\"},\"𝘿\":{\"math\":\"\\\\mathsfbfsl{D}\"},\"𝙀\":{\"math\":\"\\\\mathsfbfsl{E}\"},\"𝙁\":{\"math\":\"\\\\mathsfbfsl{F}\"},\"𝙂\":{\"math\":\"\\\\mathsfbfsl{G}\"},\"𝙃\":{\"math\":\"\\\\mathsfbfsl{H}\"},\"𝙄\":{\"math\":\"\\\\mathsfbfsl{I}\"},\"𝙅\":{\"math\":\"\\\\mathsfbfsl{J}\"},\"𝙆\":{\"math\":\"\\\\mathsfbfsl{K}\"},\"𝙇\":{\"math\":\"\\\\mathsfbfsl{L}\"},\"𝙈\":{\"math\":\"\\\\mathsfbfsl{M}\"},\"𝙉\":{\"math\":\"\\\\mathsfbfsl{N}\"},\"𝙊\":{\"math\":\"\\\\mathsfbfsl{O}\"},\"𝙋\":{\"math\":\"\\\\mathsfbfsl{P}\"},\"𝙌\":{\"math\":\"\\\\mathsfbfsl{Q}\"},\"𝙍\":{\"math\":\"\\\\mathsfbfsl{R}\"},\"𝙎\":{\"math\":\"\\\\mathsfbfsl{S}\"},\"𝙏\":{\"math\":\"\\\\mathsfbfsl{T}\"},\"𝙐\":{\"math\":\"\\\\mathsfbfsl{U}\"},\"𝙑\":{\"math\":\"\\\\mathsfbfsl{V}\"},\"𝙒\":{\"math\":\"\\\\mathsfbfsl{W}\"},\"𝙓\":{\"math\":\"\\\\mathsfbfsl{X}\"},\"𝙔\":{\"math\":\"\\\\mathsfbfsl{Y}\"},\"𝙕\":{\"math\":\"\\\\mathsfbfsl{Z}\"},\"𝙖\":{\"math\":\"\\\\mathsfbfsl{a}\"},\"𝙗\":{\"math\":\"\\\\mathsfbfsl{b}\"},\"𝙘\":{\"math\":\"\\\\mathsfbfsl{c}\"},\"𝙙\":{\"math\":\"\\\\mathsfbfsl{d}\"},\"𝙚\":{\"math\":\"\\\\mathsfbfsl{e}\"},\"𝙛\":{\"math\":\"\\\\mathsfbfsl{f}\"},\"𝙜\":{\"math\":\"\\\\mathsfbfsl{g}\"},\"𝙝\":{\"math\":\"\\\\mathsfbfsl{h}\"},\"𝙞\":{\"math\":\"\\\\mathsfbfsl{i}\"},\"𝙟\":{\"math\":\"\\\\mathsfbfsl{j}\"},\"𝙠\":{\"math\":\"\\\\mathsfbfsl{k}\"},\"𝙡\":{\"math\":\"\\\\mathsfbfsl{l}\"},\"𝙢\":{\"math\":\"\\\\mathsfbfsl{m}\"},\"𝙣\":{\"math\":\"\\\\mathsfbfsl{n}\"},\"𝙤\":{\"math\":\"\\\\mathsfbfsl{o}\"},\"𝙥\":{\"math\":\"\\\\mathsfbfsl{p}\"},\"𝙦\":{\"math\":\"\\\\mathsfbfsl{q}\"},\"𝙧\":{\"math\":\"\\\\mathsfbfsl{r}\"},\"𝙨\":{\"math\":\"\\\\mathsfbfsl{s}\"},\"𝙩\":{\"math\":\"\\\\mathsfbfsl{t}\"},\"𝙪\":{\"math\":\"\\\\mathsfbfsl{u}\"},\"𝙫\":{\"math\":\"\\\\mathsfbfsl{v}\"},\"𝙬\":{\"math\":\"\\\\mathsfbfsl{w}\"},\"𝙭\":{\"math\":\"\\\\mathsfbfsl{x}\"},\"𝙮\":{\"math\":\"\\\\mathsfbfsl{y}\"},\"𝙯\":{\"math\":\"\\\\mathsfbfsl{z}\"},\"𝙰\":{\"math\":\"\\\\mathtt{A}\"},\"𝙱\":{\"math\":\"\\\\mathtt{B}\"},\"𝙲\":{\"math\":\"\\\\mathtt{C}\"},\"𝙳\":{\"math\":\"\\\\mathtt{D}\"},\"𝙴\":{\"math\":\"\\\\mathtt{E}\"},\"𝙵\":{\"math\":\"\\\\mathtt{F}\"},\"𝙶\":{\"math\":\"\\\\mathtt{G}\"},\"𝙷\":{\"math\":\"\\\\mathtt{H}\"},\"𝙸\":{\"math\":\"\\\\mathtt{I}\"},\"𝙹\":{\"math\":\"\\\\mathtt{J}\"},\"𝙺\":{\"math\":\"\\\\mathtt{K}\"},\"𝙻\":{\"math\":\"\\\\mathtt{L}\"},\"𝙼\":{\"math\":\"\\\\mathtt{M}\"},\"𝙽\":{\"math\":\"\\\\mathtt{N}\"},\"𝙾\":{\"math\":\"\\\\mathtt{O}\"},\"𝙿\":{\"math\":\"\\\\mathtt{P}\"},\"𝚀\":{\"math\":\"\\\\mathtt{Q}\"},\"𝚁\":{\"math\":\"\\\\mathtt{R}\"},\"𝚂\":{\"math\":\"\\\\mathtt{S}\"},\"𝚃\":{\"math\":\"\\\\mathtt{T}\"},\"𝚄\":{\"math\":\"\\\\mathtt{U}\"},\"𝚅\":{\"math\":\"\\\\mathtt{V}\"},\"𝚆\":{\"math\":\"\\\\mathtt{W}\"},\"𝚇\":{\"math\":\"\\\\mathtt{X}\"},\"𝚈\":{\"math\":\"\\\\mathtt{Y}\"},\"𝚉\":{\"math\":\"\\\\mathtt{Z}\"},\"𝚊\":{\"math\":\"\\\\mathtt{a}\"},\"𝚋\":{\"math\":\"\\\\mathtt{b}\"},\"𝚌\":{\"math\":\"\\\\mathtt{c}\"},\"𝚍\":{\"math\":\"\\\\mathtt{d}\"},\"𝚎\":{\"math\":\"\\\\mathtt{e}\"},\"𝚏\":{\"math\":\"\\\\mathtt{f}\"},\"𝚐\":{\"math\":\"\\\\mathtt{g}\"},\"𝚑\":{\"math\":\"\\\\mathtt{h}\"},\"𝚒\":{\"math\":\"\\\\mathtt{i}\"},\"𝚓\":{\"math\":\"\\\\mathtt{j}\"},\"𝚔\":{\"math\":\"\\\\mathtt{k}\"},\"𝚕\":{\"math\":\"\\\\mathtt{l}\"},\"𝚖\":{\"math\":\"\\\\mathtt{m}\"},\"𝚗\":{\"math\":\"\\\\mathtt{n}\"},\"𝚘\":{\"math\":\"\\\\mathtt{o}\"},\"𝚙\":{\"math\":\"\\\\mathtt{p}\"},\"𝚚\":{\"math\":\"\\\\mathtt{q}\"},\"𝚛\":{\"math\":\"\\\\mathtt{r}\"},\"𝚜\":{\"math\":\"\\\\mathtt{s}\"},\"𝚝\":{\"math\":\"\\\\mathtt{t}\"},\"𝚞\":{\"math\":\"\\\\mathtt{u}\"},\"𝚟\":{\"math\":\"\\\\mathtt{v}\"},\"𝚠\":{\"math\":\"\\\\mathtt{w}\"},\"𝚡\":{\"math\":\"\\\\mathtt{x}\"},\"𝚢\":{\"math\":\"\\\\mathtt{y}\"},\"𝚣\":{\"math\":\"\\\\mathtt{z}\"},\"𝚤\":{\"math\":\"\\\\imath{}\"},\"𝚥\":{\"math\":\"\\\\jmath{}\"},\"𝚨\":{\"math\":\"\\\\mathbf{A}\"},\"𝚩\":{\"math\":\"\\\\mathbf{B}\"},\"𝚪\":{\"math\":\"\\\\mathbf{\\\\Gamma}\"},\"𝚫\":{\"math\":\"\\\\mathbf{\\\\Delta}\"},\"𝚬\":{\"math\":\"\\\\mathbf{E}\"},\"𝚭\":{\"math\":\"\\\\mathbf{Z}\"},\"𝚮\":{\"math\":\"\\\\mathbf{H}\"},\"𝚯\":{\"math\":\"\\\\mathbf{\\\\Theta}\"},\"𝚰\":{\"math\":\"\\\\mathbf{I}\"},\"𝚱\":{\"math\":\"\\\\mathbf{K}\"},\"𝚲\":{\"math\":\"\\\\mathbf{\\\\Lambda}\"},\"𝚳\":{\"math\":\"M\"},\"𝚴\":{\"math\":\"N\"},\"𝚵\":{\"math\":\"\\\\mathbf{\\\\Xi}\"},\"𝚶\":{\"math\":\"O\"},\"𝚷\":{\"math\":\"\\\\mathbf{\\\\Pi}\"},\"𝚸\":{\"math\":\"\\\\mathbf{P}\"},\"𝚹\":{\"math\":\"\\\\mathbf{\\\\vartheta}\"},\"𝚺\":{\"math\":\"\\\\mathbf{\\\\Sigma}\"},\"𝚻\":{\"math\":\"\\\\mathbf{T}\"},\"𝚼\":{\"math\":\"\\\\mathbf{\\\\Upsilon}\"},\"𝚽\":{\"math\":\"\\\\mathbf{\\\\Phi}\"},\"𝚾\":{\"math\":\"\\\\mathbf{X}\"},\"𝚿\":{\"math\":\"\\\\mathbf{\\\\Psi}\"},\"𝛀\":{\"math\":\"\\\\mathbf{\\\\Omega}\"},\"𝛁\":{\"math\":\"\\\\mathbf{\\\\nabla}\"},\"𝛂\":{\"math\":\"\\\\mathbf{A}\"},\"𝛃\":{\"math\":\"\\\\mathbf{B}\"},\"𝛄\":{\"math\":\"\\\\mathbf{\\\\Gamma}\"},\"𝛅\":{\"math\":\"\\\\mathbf{\\\\Delta}\"},\"𝛆\":{\"math\":\"\\\\mathbf{E}\"},\"𝛇\":{\"math\":\"\\\\mathbf{Z}\"},\"𝛈\":{\"math\":\"\\\\mathbf{H}\"},\"𝛉\":{\"math\":\"\\\\mathbf{\\\\theta}\"},\"𝛊\":{\"math\":\"\\\\mathbf{I}\"},\"𝛋\":{\"math\":\"\\\\mathbf{K}\"},\"𝛌\":{\"math\":\"\\\\mathbf{\\\\Lambda}\"},\"𝛍\":{\"math\":\"M\"},\"𝛎\":{\"math\":\"N\"},\"𝛏\":{\"math\":\"\\\\mathbf{\\\\Xi}\"},\"𝛐\":{\"math\":\"O\"},\"𝛑\":{\"math\":\"\\\\mathbf{\\\\Pi}\"},\"𝛒\":{\"math\":\"\\\\mathbf{P}\"},\"𝛓\":{\"math\":\"\\\\mathbf{\\\\varsigma}\"},\"𝛔\":{\"math\":\"\\\\mathbf{\\\\Sigma}\"},\"𝛕\":{\"math\":\"\\\\mathbf{T}\"},\"𝛖\":{\"math\":\"\\\\mathbf{\\\\Upsilon}\"},\"𝛗\":{\"math\":\"\\\\mathbf{\\\\Phi}\"},\"𝛘\":{\"math\":\"\\\\mathbf{X}\"},\"𝛙\":{\"math\":\"\\\\mathbf{\\\\Psi}\"},\"𝛚\":{\"math\":\"\\\\mathbf{\\\\Omega}\"},\"𝛛\":{\"math\":\"\\\\partial{}\"},\"𝛜\":{\"math\":\"\\\\in{}\"},\"𝛝\":{\"math\":\"\\\\mathbf{\\\\vartheta}\"},\"𝛞\":{\"math\":\"\\\\mathbf{\\\\varkappa}\"},\"𝛟\":{\"math\":\"\\\\mathbf{\\\\phi}\"},\"𝛠\":{\"math\":\"\\\\mathbf{\\\\varrho}\"},\"𝛡\":{\"math\":\"\\\\mathbf{\\\\varpi}\"},\"𝛢\":{\"math\":\"\\\\mathsl{A}\"},\"𝛣\":{\"math\":\"\\\\mathsl{B}\"},\"𝛤\":{\"math\":\"\\\\mathsl{\\\\Gamma}\"},\"𝛥\":{\"math\":\"\\\\mathsl{\\\\Delta}\"},\"𝛦\":{\"math\":\"\\\\mathsl{E}\"},\"𝛧\":{\"math\":\"\\\\mathsl{Z}\"},\"𝛨\":{\"math\":\"\\\\mathsl{H}\"},\"𝛩\":{\"math\":\"\\\\mathsl{\\\\Theta}\"},\"𝛪\":{\"math\":\"\\\\mathsl{I}\"},\"𝛫\":{\"math\":\"\\\\mathsl{K}\"},\"𝛬\":{\"math\":\"\\\\mathsl{\\\\Lambda}\"},\"𝛭\":{\"math\":\"M\"},\"𝛮\":{\"math\":\"N\"},\"𝛯\":{\"math\":\"\\\\mathsl{\\\\Xi}\"},\"𝛰\":{\"math\":\"O\"},\"𝛱\":{\"math\":\"\\\\mathsl{\\\\Pi}\"},\"𝛲\":{\"math\":\"\\\\mathsl{P}\"},\"𝛳\":{\"math\":\"\\\\mathsl{\\\\vartheta}\"},\"𝛴\":{\"math\":\"\\\\mathsl{\\\\Sigma}\"},\"𝛵\":{\"math\":\"\\\\mathsl{T}\"},\"𝛶\":{\"math\":\"\\\\mathsl{\\\\Upsilon}\"},\"𝛷\":{\"math\":\"\\\\mathsl{\\\\Phi}\"},\"𝛸\":{\"math\":\"\\\\mathsl{X}\"},\"𝛹\":{\"math\":\"\\\\mathsl{\\\\Psi}\"},\"𝛺\":{\"math\":\"\\\\mathsl{\\\\Omega}\"},\"𝛻\":{\"math\":\"\\\\mathsl{\\\\nabla}\"},\"𝛼\":{\"math\":\"\\\\mathsl{A}\"},\"𝛽\":{\"math\":\"\\\\mathsl{B}\"},\"𝛾\":{\"math\":\"\\\\mathsl{\\\\Gamma}\"},\"𝛿\":{\"math\":\"\\\\mathsl{\\\\Delta}\"},\"𝜀\":{\"math\":\"\\\\mathsl{E}\"},\"𝜁\":{\"math\":\"\\\\mathsl{Z}\"},\"𝜂\":{\"math\":\"\\\\mathsl{H}\"},\"𝜃\":{\"math\":\"\\\\mathsl{\\\\Theta}\"},\"𝜄\":{\"math\":\"\\\\mathsl{I}\"},\"𝜅\":{\"math\":\"\\\\mathsl{K}\"},\"𝜆\":{\"math\":\"\\\\mathsl{\\\\Lambda}\"},\"𝜇\":{\"math\":\"M\"},\"𝜈\":{\"math\":\"N\"},\"𝜉\":{\"math\":\"\\\\mathsl{\\\\Xi}\"},\"𝜊\":{\"math\":\"O\"},\"𝜋\":{\"math\":\"\\\\mathsl{\\\\Pi}\"},\"𝜌\":{\"math\":\"\\\\mathsl{P}\"},\"𝜍\":{\"math\":\"\\\\mathsl{\\\\varsigma}\"},\"𝜎\":{\"math\":\"\\\\mathsl{\\\\Sigma}\"},\"𝜏\":{\"math\":\"\\\\mathsl{T}\"},\"𝜐\":{\"math\":\"\\\\mathsl{\\\\Upsilon}\"},\"𝜑\":{\"math\":\"\\\\mathsl{\\\\Phi}\"},\"𝜒\":{\"math\":\"\\\\mathsl{X}\"},\"𝜓\":{\"math\":\"\\\\mathsl{\\\\Psi}\"},\"𝜔\":{\"math\":\"\\\\mathsl{\\\\Omega}\"},\"𝜕\":{\"math\":\"\\\\partial{}\"},\"𝜖\":{\"math\":\"\\\\in{}\"},\"𝜗\":{\"math\":\"\\\\mathsl{\\\\vartheta}\"},\"𝜘\":{\"math\":\"\\\\mathsl{\\\\varkappa}\"},\"𝜙\":{\"math\":\"\\\\mathsl{\\\\phi}\"},\"𝜚\":{\"math\":\"\\\\mathsl{\\\\varrho}\"},\"𝜛\":{\"math\":\"\\\\mathsl{\\\\varpi}\"},\"𝜜\":{\"math\":\"\\\\mathbit{A}\"},\"𝜝\":{\"math\":\"\\\\mathbit{B}\"},\"𝜞\":{\"math\":\"\\\\mathbit{\\\\Gamma}\"},\"𝜟\":{\"math\":\"\\\\mathbit{\\\\Delta}\"},\"𝜠\":{\"math\":\"\\\\mathbit{E}\"},\"𝜡\":{\"math\":\"\\\\mathbit{Z}\"},\"𝜢\":{\"math\":\"\\\\mathbit{H}\"},\"𝜣\":{\"math\":\"\\\\mathbit{\\\\Theta}\"},\"𝜤\":{\"math\":\"\\\\mathbit{I}\"},\"𝜥\":{\"math\":\"\\\\mathbit{K}\"},\"𝜦\":{\"math\":\"\\\\mathbit{\\\\Lambda}\"},\"𝜧\":{\"math\":\"M\"},\"𝜨\":{\"math\":\"N\"},\"𝜩\":{\"math\":\"\\\\mathbit{\\\\Xi}\"},\"𝜪\":{\"math\":\"O\"},\"𝜫\":{\"math\":\"\\\\mathbit{\\\\Pi}\"},\"𝜬\":{\"math\":\"\\\\mathbit{P}\"},\"𝜭\":{\"math\":\"\\\\mathbit{O}\"},\"𝜮\":{\"math\":\"\\\\mathbit{\\\\Sigma}\"},\"𝜯\":{\"math\":\"\\\\mathbit{T}\"},\"𝜰\":{\"math\":\"\\\\mathbit{\\\\Upsilon}\"},\"𝜱\":{\"math\":\"\\\\mathbit{\\\\Phi}\"},\"𝜲\":{\"math\":\"\\\\mathbit{X}\"},\"𝜳\":{\"math\":\"\\\\mathbit{\\\\Psi}\"},\"𝜴\":{\"math\":\"\\\\mathbit{\\\\Omega}\"},\"𝜵\":{\"math\":\"\\\\mathbit{\\\\nabla}\"},\"𝜶\":{\"math\":\"\\\\mathbit{A}\"},\"𝜷\":{\"math\":\"\\\\mathbit{B}\"},\"𝜸\":{\"math\":\"\\\\mathbit{\\\\Gamma}\"},\"𝜹\":{\"math\":\"\\\\mathbit{\\\\Delta}\"},\"𝜺\":{\"math\":\"\\\\mathbit{E}\"},\"𝜻\":{\"math\":\"\\\\mathbit{Z}\"},\"𝜼\":{\"math\":\"\\\\mathbit{H}\"},\"𝜽\":{\"math\":\"\\\\mathbit{\\\\Theta}\"},\"𝜾\":{\"math\":\"\\\\mathbit{I}\"},\"𝜿\":{\"math\":\"\\\\mathbit{K}\"},\"𝝀\":{\"math\":\"\\\\mathbit{\\\\Lambda}\"},\"𝝁\":{\"math\":\"M\"},\"𝝂\":{\"math\":\"N\"},\"𝝃\":{\"math\":\"\\\\mathbit{\\\\Xi}\"},\"𝝄\":{\"math\":\"O\"},\"𝝅\":{\"math\":\"\\\\mathbit{\\\\Pi}\"},\"𝝆\":{\"math\":\"\\\\mathbit{P}\"},\"𝝇\":{\"math\":\"\\\\mathbit{\\\\varsigma}\"},\"𝝈\":{\"math\":\"\\\\mathbit{\\\\Sigma}\"},\"𝝉\":{\"math\":\"\\\\mathbit{T}\"},\"𝝊\":{\"math\":\"\\\\mathbit{\\\\Upsilon}\"},\"𝝋\":{\"math\":\"\\\\mathbit{\\\\Phi}\"},\"𝝌\":{\"math\":\"\\\\mathbit{X}\"},\"𝝍\":{\"math\":\"\\\\mathbit{\\\\Psi}\"},\"𝝎\":{\"math\":\"\\\\mathbit{\\\\Omega}\"},\"𝝏\":{\"math\":\"\\\\partial{}\"},\"𝝐\":{\"math\":\"\\\\in{}\"},\"𝝑\":{\"math\":\"\\\\mathbit{\\\\vartheta}\"},\"𝝒\":{\"math\":\"\\\\mathbit{\\\\varkappa}\"},\"𝝓\":{\"math\":\"\\\\mathbit{\\\\phi}\"},\"𝝔\":{\"math\":\"\\\\mathbit{\\\\varrho}\"},\"𝝕\":{\"math\":\"\\\\mathbit{\\\\varpi}\"},\"𝝖\":{\"math\":\"\\\\mathsfbf{A}\"},\"𝝗\":{\"math\":\"\\\\mathsfbf{B}\"},\"𝝘\":{\"math\":\"\\\\mathsfbf{\\\\Gamma}\"},\"𝝙\":{\"math\":\"\\\\mathsfbf{\\\\Delta}\"},\"𝝚\":{\"math\":\"\\\\mathsfbf{E}\"},\"𝝛\":{\"math\":\"\\\\mathsfbf{Z}\"},\"𝝜\":{\"math\":\"\\\\mathsfbf{H}\"},\"𝝝\":{\"math\":\"\\\\mathsfbf{\\\\Theta}\"},\"𝝞\":{\"math\":\"\\\\mathsfbf{I}\"},\"𝝟\":{\"math\":\"\\\\mathsfbf{K}\"},\"𝝠\":{\"math\":\"\\\\mathsfbf{\\\\Lambda}\"},\"𝝡\":{\"math\":\"M\"},\"𝝢\":{\"math\":\"N\"},\"𝝣\":{\"math\":\"\\\\mathsfbf{\\\\Xi}\"},\"𝝤\":{\"math\":\"O\"},\"𝝥\":{\"math\":\"\\\\mathsfbf{\\\\Pi}\"},\"𝝦\":{\"math\":\"\\\\mathsfbf{P}\"},\"𝝧\":{\"math\":\"\\\\mathsfbf{\\\\vartheta}\"},\"𝝨\":{\"math\":\"\\\\mathsfbf{\\\\Sigma}\"},\"𝝩\":{\"math\":\"\\\\mathsfbf{T}\"},\"𝝪\":{\"math\":\"\\\\mathsfbf{\\\\Upsilon}\"},\"𝝫\":{\"math\":\"\\\\mathsfbf{\\\\Phi}\"},\"𝝬\":{\"math\":\"\\\\mathsfbf{X}\"},\"𝝭\":{\"math\":\"\\\\mathsfbf{\\\\Psi}\"},\"𝝮\":{\"math\":\"\\\\mathsfbf{\\\\Omega}\"},\"𝝯\":{\"math\":\"\\\\mathsfbf{\\\\nabla}\"},\"𝝰\":{\"math\":\"\\\\mathsfbf{A}\"},\"𝝱\":{\"math\":\"\\\\mathsfbf{B}\"},\"𝝲\":{\"math\":\"\\\\mathsfbf{\\\\Gamma}\"},\"𝝳\":{\"math\":\"\\\\mathsfbf{\\\\Delta}\"},\"𝝴\":{\"math\":\"\\\\mathsfbf{E}\"},\"𝝵\":{\"math\":\"\\\\mathsfbf{Z}\"},\"𝝶\":{\"math\":\"\\\\mathsfbf{H}\"},\"𝝷\":{\"math\":\"\\\\mathsfbf{\\\\Theta}\"},\"𝝸\":{\"math\":\"\\\\mathsfbf{I}\"},\"𝝹\":{\"math\":\"\\\\mathsfbf{K}\"},\"𝝺\":{\"math\":\"\\\\mathsfbf{\\\\Lambda}\"},\"𝝻\":{\"math\":\"M\"},\"𝝼\":{\"math\":\"N\"},\"𝝽\":{\"math\":\"\\\\mathsfbf{\\\\Xi}\"},\"𝝾\":{\"math\":\"O\"},\"𝝿\":{\"math\":\"\\\\mathsfbf{\\\\Pi}\"},\"𝞀\":{\"math\":\"\\\\mathsfbf{P}\"},\"𝞁\":{\"math\":\"\\\\mathsfbf{\\\\varsigma}\"},\"𝞂\":{\"math\":\"\\\\mathsfbf{\\\\Sigma}\"},\"𝞃\":{\"math\":\"\\\\mathsfbf{T}\"},\"𝞄\":{\"math\":\"\\\\mathsfbf{\\\\Upsilon}\"},\"𝞅\":{\"math\":\"\\\\mathsfbf{\\\\Phi}\"},\"𝞆\":{\"math\":\"\\\\mathsfbf{X}\"},\"𝞇\":{\"math\":\"\\\\mathsfbf{\\\\Psi}\"},\"𝞈\":{\"math\":\"\\\\mathsfbf{\\\\Omega}\"},\"𝞉\":{\"math\":\"\\\\partial{}\"},\"𝞊\":{\"math\":\"\\\\in{}\"},\"𝞋\":{\"math\":\"\\\\mathsfbf{\\\\vartheta}\"},\"𝞌\":{\"math\":\"\\\\mathsfbf{\\\\varkappa}\"},\"𝞍\":{\"math\":\"\\\\mathsfbf{\\\\phi}\"},\"𝞎\":{\"math\":\"\\\\mathsfbf{\\\\varrho}\"},\"𝞏\":{\"math\":\"\\\\mathsfbf{\\\\varpi}\"},\"𝞐\":{\"math\":\"\\\\mathsfbfsl{A}\"},\"𝞑\":{\"math\":\"\\\\mathsfbfsl{B}\"},\"𝞒\":{\"math\":\"\\\\mathsfbfsl{\\\\Gamma}\"},\"𝞓\":{\"math\":\"\\\\mathsfbfsl{\\\\Delta}\"},\"𝞔\":{\"math\":\"\\\\mathsfbfsl{E}\"},\"𝞕\":{\"math\":\"\\\\mathsfbfsl{Z}\"},\"𝞖\":{\"math\":\"\\\\mathsfbfsl{H}\"},\"𝞗\":{\"math\":\"\\\\mathsfbfsl{\\\\vartheta}\"},\"𝞘\":{\"math\":\"\\\\mathsfbfsl{I}\"},\"𝞙\":{\"math\":\"\\\\mathsfbfsl{K}\"},\"𝞚\":{\"math\":\"\\\\mathsfbfsl{\\\\Lambda}\"},\"𝞛\":{\"math\":\"M\"},\"𝞜\":{\"math\":\"N\"},\"𝞝\":{\"math\":\"\\\\mathsfbfsl{\\\\Xi}\"},\"𝞞\":{\"math\":\"O\"},\"𝞟\":{\"math\":\"\\\\mathsfbfsl{\\\\Pi}\"},\"𝞠\":{\"math\":\"\\\\mathsfbfsl{P}\"},\"𝞡\":{\"math\":\"\\\\mathsfbfsl{\\\\vartheta}\"},\"𝞢\":{\"math\":\"\\\\mathsfbfsl{\\\\Sigma}\"},\"𝞣\":{\"math\":\"\\\\mathsfbfsl{T}\"},\"𝞤\":{\"math\":\"\\\\mathsfbfsl{\\\\Upsilon}\"},\"𝞥\":{\"math\":\"\\\\mathsfbfsl{\\\\Phi}\"},\"𝞦\":{\"math\":\"\\\\mathsfbfsl{X}\"},\"𝞧\":{\"math\":\"\\\\mathsfbfsl{\\\\Psi}\"},\"𝞨\":{\"math\":\"\\\\mathsfbfsl{\\\\Omega}\"},\"𝞩\":{\"math\":\"\\\\mathsfbfsl{\\\\nabla}\"},\"𝞪\":{\"math\":\"\\\\mathsfbfsl{A}\"},\"𝞫\":{\"math\":\"\\\\mathsfbfsl{B}\"},\"𝞬\":{\"math\":\"\\\\mathsfbfsl{\\\\Gamma}\"},\"𝞭\":{\"math\":\"\\\\mathsfbfsl{\\\\Delta}\"},\"𝞮\":{\"math\":\"\\\\mathsfbfsl{E}\"},\"𝞯\":{\"math\":\"\\\\mathsfbfsl{Z}\"},\"𝞰\":{\"math\":\"\\\\mathsfbfsl{H}\"},\"𝞱\":{\"math\":\"\\\\mathsfbfsl{\\\\vartheta}\"},\"𝞲\":{\"math\":\"\\\\mathsfbfsl{I}\"},\"𝞳\":{\"math\":\"\\\\mathsfbfsl{K}\"},\"𝞴\":{\"math\":\"\\\\mathsfbfsl{\\\\Lambda}\"},\"𝞵\":{\"math\":\"M\"},\"𝞶\":{\"math\":\"N\"},\"𝞷\":{\"math\":\"\\\\mathsfbfsl{\\\\Xi}\"},\"𝞸\":{\"math\":\"O\"},\"𝞹\":{\"math\":\"\\\\mathsfbfsl{\\\\Pi}\"},\"𝞺\":{\"math\":\"\\\\mathsfbfsl{P}\"},\"𝞻\":{\"math\":\"\\\\mathsfbfsl{\\\\varsigma}\"},\"𝞼\":{\"math\":\"\\\\mathsfbfsl{\\\\Sigma}\"},\"𝞽\":{\"math\":\"\\\\mathsfbfsl{T}\"},\"𝞾\":{\"math\":\"\\\\mathsfbfsl{\\\\Upsilon}\"},\"𝞿\":{\"math\":\"\\\\mathsfbfsl{\\\\Phi}\"},\"𝟀\":{\"math\":\"\\\\mathsfbfsl{X}\"},\"𝟁\":{\"math\":\"\\\\mathsfbfsl{\\\\Psi}\"},\"𝟂\":{\"math\":\"\\\\mathsfbfsl{\\\\Omega}\"},\"𝟃\":{\"math\":\"\\\\partial{}\"},\"𝟄\":{\"math\":\"\\\\in{}\"},\"𝟅\":{\"math\":\"\\\\mathsfbfsl{\\\\vartheta}\"},\"𝟆\":{\"math\":\"\\\\mathsfbfsl{\\\\varkappa}\"},\"𝟇\":{\"math\":\"\\\\mathsfbfsl{\\\\phi}\"},\"𝟈\":{\"math\":\"\\\\mathsfbfsl{\\\\varrho}\"},\"𝟉\":{\"math\":\"\\\\mathsfbfsl{\\\\varpi}\"},\"𝟊\":{\"math\":\"\\\\mbfDigamma{}\"},\"𝟋\":{\"math\":\"\\\\mbfdigamma{}\"},\"𝟎\":{\"math\":\"\\\\mathbf{0}\"},\"𝟏\":{\"math\":\"\\\\mathbf{1}\"},\"𝟐\":{\"math\":\"\\\\mathbf{2}\"},\"𝟑\":{\"math\":\"\\\\mathbf{3}\"},\"𝟒\":{\"math\":\"\\\\mathbf{4}\"},\"𝟓\":{\"math\":\"\\\\mathbf{5}\"},\"𝟔\":{\"math\":\"\\\\mathbf{6}\"},\"𝟕\":{\"math\":\"\\\\mathbf{7}\"},\"𝟖\":{\"math\":\"\\\\mathbf{8}\"},\"𝟗\":{\"math\":\"\\\\mathbf{9}\"},\"𝟘\":{\"math\":\"\\\\mathbb{0}\"},\"𝟙\":{\"math\":\"\\\\mathbb{1}\"},\"𝟚\":{\"math\":\"\\\\mathbb{2}\"},\"𝟛\":{\"math\":\"\\\\mathbb{3}\"},\"𝟜\":{\"math\":\"\\\\mathbb{4}\"},\"𝟝\":{\"math\":\"\\\\mathbb{5}\"},\"𝟞\":{\"math\":\"\\\\mathbb{6}\"},\"𝟟\":{\"math\":\"\\\\mathbb{7}\"},\"𝟠\":{\"math\":\"\\\\mathbb{8}\"},\"𝟡\":{\"math\":\"\\\\mathbb{9}\"},\"𝟢\":{\"math\":\"\\\\mathsf{0}\"},\"𝟣\":{\"math\":\"\\\\mathsf{1}\"},\"𝟤\":{\"math\":\"\\\\mathsf{2}\"},\"𝟥\":{\"math\":\"\\\\mathsf{3}\"},\"𝟦\":{\"math\":\"\\\\mathsf{4}\"},\"𝟧\":{\"math\":\"\\\\mathsf{5}\"},\"𝟨\":{\"math\":\"\\\\mathsf{6}\"},\"𝟩\":{\"math\":\"\\\\mathsf{7}\"},\"𝟪\":{\"math\":\"\\\\mathsf{8}\"},\"𝟫\":{\"math\":\"\\\\mathsf{9}\"},\"𝟬\":{\"math\":\"\\\\mathsfbf{0}\"},\"𝟭\":{\"math\":\"\\\\mathsfbf{1}\"},\"𝟮\":{\"math\":\"\\\\mathsfbf{2}\"},\"𝟯\":{\"math\":\"\\\\mathsfbf{3}\"},\"𝟰\":{\"math\":\"\\\\mathsfbf{4}\"},\"𝟱\":{\"math\":\"\\\\mathsfbf{5}\"},\"𝟲\":{\"math\":\"\\\\mathsfbf{6}\"},\"𝟳\":{\"math\":\"\\\\mathsfbf{7}\"},\"𝟴\":{\"math\":\"\\\\mathsfbf{8}\"},\"𝟵\":{\"math\":\"\\\\mathsfbf{9}\"},\"𝟶\":{\"math\":\"\\\\mathtt{0}\"},\"𝟷\":{\"math\":\"\\\\mathtt{1}\"},\"𝟸\":{\"math\":\"\\\\mathtt{2}\"},\"𝟹\":{\"math\":\"\\\\mathtt{3}\"},\"𝟺\":{\"math\":\"\\\\mathtt{4}\"},\"𝟻\":{\"math\":\"\\\\mathtt{5}\"},\"𝟼\":{\"math\":\"\\\\mathtt{6}\"},\"𝟽\":{\"math\":\"\\\\mathtt{7}\"},\"𝟾\":{\"math\":\"\\\\mathtt{8}\"},\"𝟿\":{\"math\":\"\\\\mathtt{9}\"},\"i︠a︡\":{\"text\":\"\\\\t{ia}\"}}");

/***/ }),

/***/ "../node_modules/unicode2latex/tables/unicode.json":
/*!*********************************************************!*\
  !*** ../node_modules/unicode2latex/tables/unicode.json ***!
  \*********************************************************/
/*! exports provided: _, {, }, &, #, %, ^, <, >, ~, $, \,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  , ​,  ,  , default */
/*! all exports used */
/***/ (function(module) {

module.exports = JSON.parse("{\"_\":{\"math\":\"\\\\_\",\"text\":\"\\\\_\"},\"{\":{\"math\":\"\\\\lbrace{}\",\"text\":\"\\\\{\"},\"}\":{\"math\":\"\\\\rbrace{}\",\"text\":\"\\\\}\"},\"&\":{\"math\":\"\\\\&\",\"text\":\"\\\\&\"},\"#\":{\"math\":\"\\\\#\",\"text\":\"\\\\#\"},\"%\":{\"math\":\"\\\\%\",\"text\":\"\\\\%\"},\"^\":{\"math\":\"\\\\sphat{}\",\"text\":\"\\\\^\"},\"<\":{\"math\":\"<\"},\">\":{\"math\":\">\"},\"~\":{\"math\":\"\\\\sptilde{}\",\"text\":\"\\\\textasciitilde{}\"},\"$\":{\"math\":\"\\\\$\",\"text\":\"\\\\$\"},\"\\\\\":{\"math\":\"\\\\backslash{}\",\"text\":\"\\\\textbackslash{}\"},\" \":{\"math\":\"~\",\"text\":\"~\",\"space\":true},\" \":{\"text\":\" \",\"space\":true},\" \":{\"math\":\"\\\\quad{}\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.6em}\",\"space\":true},\" \":{\"math\":\"\\\\quad{}\",\"text\":\"\\\\hspace{1em}\",\"space\":true},\" \":{\"text\":\"\\\\;\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.25em}\",\"space\":true},\" \":{\"text\":\"\\\\hspace{0.166em}\",\"space\":true},\" \":{\"text\":\"\\\\hphantom{0}\",\"space\":true},\" \":{\"text\":\"\\\\hphantom{,}\",\"space\":true},\" \":{\"text\":\"\\\\,\",\"space\":true},\" \":{\"math\":\"\\\\mkern1mu{}\",\"space\":true},\"​\":{\"text\":\"\\\\mbox{}\",\"space\":true},\" \":{\"text\":\" \",\"space\":true},\" \":{\"math\":\"\\\\:\",\"text\":\"\\\\:\",\"space\":true}}");

/***/ }),

/***/ "../node_modules/webpack/buildin/global.js":
/*!*************************************************!*\
  !*** ../node_modules/webpack/buildin/global.js ***!
  \*************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "../node_modules/webpack/buildin/module.js":
/*!*************************************************!*\
  !*** ../node_modules/webpack/buildin/module.js ***!
  \*************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = function(module) {
	if (!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if (!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),

/***/ "./Better BibTeX.ts":
/*!**************************!*\
  !*** ./Better BibTeX.ts ***!
  \**************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const reference_1 = __webpack_require__(/*! ./bibtex/reference */ "./bibtex/reference.ts");
const exporter_1 = __webpack_require__(/*! ./lib/exporter */ "./lib/exporter.ts");
const debug_1 = __webpack_require__(/*! ./lib/debug */ "./lib/debug.ts");
const escape = __webpack_require__(/*! ../content/escape */ "../content/escape.ts");
const bibtexParser = __webpack_require__(/*! @retorquere/bibtex-parser */ "../node_modules/@retorquere/bibtex-parser/index.js");
const itemfields_1 = __webpack_require__(/*! ../gen/itemfields */ "../gen/itemfields.ts");
const arXiv_1 = __webpack_require__(/*! ../content/arXiv */ "../content/arXiv.ts");
reference_1.Reference.prototype.caseConversion = {
    title: false, //deni
    series: false, //deni
    shorttitle: false, //deni
    booktitle: false, //deni
    type: false, //deni
    // only for imports
    origtitle: false, //deni
    maintitle: false, //deni
    eventtitle: false, //deni
};
reference_1.Reference.prototype.fieldEncoding = {
    url: 'verbatim',
    doi: 'verbatim',
    // school: 'literal'
//deni    institution: 'literal',
//deni    publisher: 'literal',
//deni    organization: 'literal',
//deni    address: 'literal',
	institution: 'verbatim', //deni
    publisher: 'verbatim', //deni
    organization: 'verbatim', //deni
    address: 'verbatim', //deni
};
reference_1.Reference.prototype.lint = function (explanation) {
    const required = {
        inproceedings: ['author', 'booktitle', 'pages', 'publisher', 'title', 'year'],
        article: ['author', 'journal', 'number', 'pages', 'title', 'volume', 'year'],
        techreport: ['author', 'institution', 'title', 'year'],
        incollection: ['author', 'booktitle', 'pages', 'publisher', 'title', 'year'],
        book: ['author', 'publisher', 'title', 'year'],
        inbook: ['author', 'booktitle', 'pages', 'publisher', 'title', 'year'],
        proceedings: ['editor', 'publisher', 'title', 'year'],
        phdthesis: ['author', 'school', 'title', 'year'],
        mastersthesis: ['author', 'school', 'title', 'year'],
        electronic: ['author', 'title', 'url', 'year'],
        misc: ['author', 'howpublished', 'title', 'year'],
    };
    const fields = required[this.referencetype.toLowerCase()];
    if (!fields)
        return;
    return fields.map(field => this.has[field] ? '' : `Missing required field '${field}'`).filter(msg => msg);
};
reference_1.Reference.prototype.addCreators = function () {
    if (!this.item.creators || !this.item.creators.length)
        return;
    // split creators into subcategories
    const authors = [];
    const editors = [];
    const translators = [];
    const collaborators = [];
    const primaryCreatorType = Zotero.Utilities.getCreatorsForType(this.item.itemType)[0];
    for (const creator of this.item.creators) {
        switch (creator.creatorType) {
            case 'editor':
            case 'seriesEditor':
                editors.push(creator);
                break;
            case 'translator':
                translators.push(creator);
                break;
            case primaryCreatorType:
                authors.push(creator);
                break;
            default: collaborators.push(creator);
        }
    }
    this.remove('author');
    this.remove('editor');
    this.remove('translator');
    this.remove('collaborator');
    this.add({ name: 'author', value: authors, enc: 'creators' });
    this.add({ name: 'editor', value: editors, enc: 'creators' });
    this.add({ name: 'translator', value: translators, enc: 'creators' });
    this.add({ name: 'collaborator', value: collaborators, enc: 'creators' });
};
reference_1.Reference.prototype.typeMap = {
    csl: {
        article: 'article',
        'article-journal': 'article',
        'article-magazine': 'article',
        'article-newspaper': 'article',
        bill: 'misc',
        book: 'book',
        broadcast: 'misc',
        chapter: 'incollection',
        dataset: 'misc',
        entry: 'incollection',
        'entry-dictionary': 'incollection',
        'entry-encyclopedia': 'incollection',
        figure: 'misc',
        graphic: 'misc',
        interview: 'misc',
        legal_case: 'misc',
        legislation: 'misc',
        manuscript: 'unpublished',
        map: 'misc',
        motion_picture: 'misc',
        musical_score: 'misc',
        pamphlet: 'booklet',
        'paper-conference': 'inproceedings',
        patent: 'misc',
        personal_communication: 'misc',
        post: 'misc',
        'post-weblog': 'misc',
        report: 'techreport',
        review: 'article',
        'review-book': 'article',
        song: 'misc',
        speech: 'misc',
        thesis: 'phdthesis',
        treaty: 'misc',
        webpage: 'misc',
    },
    zotero: {
        artwork: 'misc',
        audioRecording: 'misc',
        bill: 'misc',
        blogPost: 'misc',
        book: 'book',
        bookSection: 'incollection',
        case: 'misc',
        computerProgram: 'misc',
        conferencePaper: 'inproceedings',
        dictionaryEntry: 'misc',
        document: 'misc',
        email: 'misc',
        encyclopediaArticle: 'article',
        film: 'misc',
        forumPost: 'misc',
        hearing: 'misc',
        instantMessage: 'misc',
        interview: 'misc',
        journalArticle: 'article',
        letter: 'misc',
        magazineArticle: 'article',
        manuscript: 'unpublished',
        map: 'misc',
        newspaperArticle: 'article',
        patent: 'patent',
        podcast: 'misc',
        presentation: 'misc',
        radioBroadcast: 'misc',
        report: 'techreport',
        statute: 'misc',
        thesis: 'phdthesis',
        tvBroadcast: 'misc',
        videoRecording: 'misc',
        webpage: 'misc',
    },
};
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
Translator.doExport = () => {
    exporter_1.Exporter.prepare_strings();
    // Zotero.write(`\n% ${Translator.header.label}\n`)
    Zotero.write('\n');
    let item;
    while (item = exporter_1.Exporter.nextItem()) {
        const ref = new reference_1.Reference(item);
        ref.add({ name: 'address', value: item.place });
        ref.add({ name: 'chapter', value: item.section });
        ref.add({ name: 'edition', value: item.edition });
        ref.add({ name: 'type', value: item.type });
        ref.add({ name: 'series', value: item.series, bibtexStrings: true });
        ref.add({ name: 'title', value: item.title });
        ref.add({ name: 'volume', value: item.volume });
        ref.add({ name: 'copyright', value: item.rights });
        ref.add({ name: 'isbn', value: item.ISBN });
        ref.add({ name: 'issn', value: item.ISSN });
        ref.add({ name: 'lccn', value: item.callNumber });
        ref.add({ name: 'shorttitle', value: item.shortTitle });
        ref.add({ name: 'abstract', value: item.abstractNote });
        ref.add({ name: 'nationality', value: item.country });
        ref.add({ name: 'language', value: item.language });
        ref.add({ name: 'assignee', value: item.assignee });
        ref.add({ name: 'number', value: item.number || item.issue || item.seriesNumber });
        ref.add({ name: 'urldate', value: item.accessDate && item.accessDate.replace(/\s*T?\d+:\d+:\d+.*/, '') });
        if (['bookSection', 'conferencePaper', 'chapter'].includes(item.referenceType)) {
            ref.add({ name: 'booktitle', value: item.publicationTitle || item.conferenceName, bibtexStrings: true });
        }
        else if (ref.isBibString(item.publicationTitle)) {
            ref.add({ name: 'journal', value: item.publicationTitle, bibtexStrings: true });
        }
        else {
            ref.add({ name: 'journal', value: (Translator.options.useJournalAbbreviation && item.journalAbbreviation) || item.publicationTitle, bibtexStrings: true });
        }
        switch (item.referenceType) {
            case 'thesis':
                ref.add({ name: 'school', value: item.publisher, bibtexStrings: true });
                break;
            case 'report':
                ref.add({ name: 'institution', value: item.publisher, bibtexStrings: true });
                break;
            case 'computerProgram':
                ref.add({ name: 'howpublished', value: item.publisher, bibtexStrings: true });
                break;
            default:
                ref.add({ name: 'publisher', value: item.publisher, bibtexStrings: true });
                break;
        }
        const doi = item.extraFields.csl.DOI || item.DOI;
        let url = null;
        if (Translator.preferences.DOIandURL === 'both' || !doi) {
            switch (Translator.preferences.bibtexURL) {
                case 'url':
                    url = ref.add({ name: 'url', value: item.extraFields.csl.URL || item.url });
                    break;
                case 'note':
                    url = ref.add({ name: (['misc', 'booklet'].includes(ref.referencetype) && !ref.has.howpublished ? 'howpublished' : 'note'), value: item.extraFields.csl.URL || item.url, enc: 'url' });
                    break;
                default:
                    if (['webpage', 'post', 'post-weblog'].includes(item.referenceType))
                        url = ref.add({ name: 'howpublished', value: item.extraFields.csl.URL || item.url });
                    break;
            }
        }
        if (Translator.preferences.DOIandURL === 'both' || !url)
            ref.add({ name: 'doi', value: doi });
        if (item.referenceType === 'thesis' && ['mastersthesis', 'phdthesis'].includes(item.type)) {
            ref.referencetype = item.type;
            ref.remove('type');
        }
        ref.addCreators();
        if (item.date) {
            const date = Zotero.BetterBibTeX.parseDate(item.date);
            switch ((date || {}).type || 'verbatim') {
                case 'verbatim':
                    ref.add({ name: 'year', value: item.date });
                    break;
                case 'interval':
                    if (date.from.month)
                        ref.add({ name: 'month', value: months[date.from.month - 1], bare: true });
                    ref.add({ name: 'year', value: `${date.from.year}` });
                    break;
                case 'date':
                    if (date.month)
                        ref.add({ name: 'month', value: months[date.month - 1], bare: true });
                    if ((date.orig || {}).type === 'date') {
                        ref.add({ name: 'year', value: `[${date.orig.year}] ${date.year}` });
                    }
                    else {
                        ref.add({ name: 'year', value: `${date.year}` });
                    }
                    break;
            }
        }
        ref.add({ name: 'keywords', value: item.tags, enc: 'tags' });
        ref.add({ name: 'pages', value: ref.normalizeDashes(item.pages) });
        ref.add({ name: 'file', value: item.attachments, enc: 'attachments' });
        ref.complete();
    }
    exporter_1.Exporter.complete();
    Zotero.write('\n');
};
Translator.detectImport = async () => {
    const input = Zotero.read(102400); // tslint:disable-line:no-magic-numbers
    const bib = await bibtexParser.chunker(input, { max_entries: 1, async: true });
    return bib.find(chunk => chunk.entry);
};
function importGroup(group, itemIDs, root = null) {
    const collection = new Zotero.Collection();
    collection.type = 'collection';
    collection.name = group.name;
    collection.children = group.entries.filter(citekey => itemIDs[citekey]).map(citekey => ({ type: 'item', id: itemIDs[citekey] }));
    for (const subgroup of group.groups || []) {
        collection.children.push(importGroup(subgroup, itemIDs));
    }
    if (root)
        collection.complete();
    return collection;
}
class ZoteroItem {
    constructor(id, bibtex, jabref, errors) {
        this.id = id;
        this.bibtex = bibtex;
        this.jabref = jabref;
        this.errors = errors;
        this.typeMap = {
            book: 'book',
            booklet: 'book',
            manual: 'book',
            proceedings: 'book',
            collection: 'book',
            incollection: 'bookSection',
            inbook: 'bookSection',
            inreference: 'encyclopediaArticle',
            article: 'journalArticle',
            misc: 'journalArticle',
            phdthesis: 'thesis',
            mastersthesis: 'thesis',
            thesis: 'thesis',
            unpublished: 'manuscript',
            patent: 'patent',
            inproceedings: 'conferencePaper',
            conference: 'conferencePaper',
            techreport: 'report',
            report: 'report',
        };
        this.english = 'English';
        this.bibtex.type = this.bibtex.type.toLowerCase();
        this.type = this.typeMap[this.bibtex.type];
        if (!this.type) {
            this.errors.push({ message: `Unexpected reference type '${this.bibtex.type}' for ${this.bibtex.key ? '@' + this.bibtex.key : 'unnamed item'}, importing as ${this.type = 'journalArticle'}` });
        }
        if (this.type === 'book' && (this.bibtex.fields.title || []).length && (this.bibtex.fields.booktitle || []).length)
            this.type = 'bookSection';
        if (this.type === 'journalArticle' && (this.bibtex.fields.booktitle || []).length && this.bibtex.fields.booktitle[0].match(/proceeding/i))
            this.type = 'conferencePaper';
        this.validFields = itemfields_1.valid.get(this.type);
        if (!this.validFields)
            this.error(`import error: unexpected item ${this.bibtex.key} of type ${this.type}`);
        if (!Object.keys(this.bibtex.fields).length) {
            this.errors.push({ message: `No fields in ${this.bibtex.key ? '@' + this.bibtex.key : 'unnamed item'}` });
            this.item = null;
        }
        else {
            this.item = new Zotero.Item(this.type);
            this.item.itemID = this.id;
            this.import();
            if (Translator.preferences.testing) {
                const err = Object.keys(this.item).filter(name => !this.validFields.get(name)).join(', ');
                if (err)
                    this.error(`import error: unexpected fields on ${this.type} ${this.bibtex.key}: ${err}`);
            }
        }
    }
    async complete() {
        if (this.item)
            await this.item.complete();
    }
    $title(value) {
        let title = this.bibtex.fields.title;
        if (this.bibtex.fields.titleaddon)
            title = title.concat(this.bibtex.fields.titleaddon);
        if (this.bibtex.fields.subtitle)
            title = title.concat(this.bibtex.fields.subtitle);
        if (this.type === 'encyclopediaArticle') {
            this.item.publicationTitle = title.join(' - ');
        }
        else {
            this.item.title = title.join(' - ');
        }
        return true;
    }
    $titleaddon(value) { return true; } // handled by $title
    $subtitle(value) { return true; } // handled by $title
    $holder(value, field) {
        if (this.item.itemType === 'patent') {
            this.item.assignee = this.bibtex.fields.holder.map(name => name.replace(/"/g, '')).join('; ');
        }
        return true;
    }
    $publisher(value) {
        const field = ['publisher', 'institution'].find(f => this.validFields.get(f)); // difference between jurism and zotero
        if (!field)
            return false;
        this.item[field] = [
            (this.bibtex.fields.publisher || []).join(' and '),
            (this.bibtex.fields.institution || []).join(' and '),
            (this.bibtex.fields.school || []).join(' and '),
        ].filter(v => v.replace(/[ \t\r\n]+/g, ' ').trim()).join(' / ');
        return true;
    }
    $institution(value) { return this.$publisher(value); }
    $school(value) { return this.$publisher(value); }
    $address(value) { return this.set('place', value); }
    $location(value) {
        if (this.type === 'conferencePaper') {
            this.hackyFields.push(`event-place: ${value.replace(/\n+/g, '')}`);
            return true;
        }
        return this.$address(value);
    }
    $edition(value) { return this.set('edition', value); }
    $isbn(value) { return this.set('ISBN', value); }
    $booktitle(value) {
        switch (this.type) {
            case 'conferencePaper':
            case 'bookSection':
                return this.set('publicationTitle', value);
            case 'book':
                if ((this.bibtex.fields.title || []).includes(value))
                    return true;
                if (!this.item.title)
                    return this.set('title', value);
                break;
        }
        return false;
    }
    $journaltitle(value) {
        switch (this.type) {
            case 'conferencePaper':
                this.set('series', value);
                break;
            default:
                this.set('publicationTitle', value);
                break;
        }
        return true;
    }
    $journal(value) { return this.$journaltitle(value); }
    $pages(value) {
        for (const field of ['pages', 'numPages']) {
            if (!this.validFields.get(field))
                continue;
            this.set(field, value.replace(/\u2013/g, '-'));
            return true;
        }
        return false;
    }
    $pagetotal(value) { return this.$pages(value); }
    $volume(value) { return this.set('volume', value); }
    $doi(value) { return this.set('DOI', value); }
    $abstract(value) { return this.set('abstractNote', value); }
    $keywords(value) {
        this.item.tags = (this.bibtex.fields.keywords || []).concat(this.bibtex.fields.keyword || []).sort().filter((item, pos, ary) => !pos || (item !== ary[pos - 1]));
        return true;
    }
    $keyword(value) { return this.$keywords(value); }
    $date(value) {
        if (this.item.date)
            return true;
        const dates = (this.bibtex.fields.date || []).slice();
        const year = (this.bibtex.fields.year && this.bibtex.fields.year[0]) || '';
        let month = (this.bibtex.fields.month && this.bibtex.fields.month[0]) || '';
        const monthno = months.indexOf(month.toLowerCase());
        if (monthno >= 0)
            month = `0${monthno + 1}`.slice(-2); // tslint:disable-line no-magic-numbers
        const day = (this.bibtex.fields.day && this.bibtex.fields.day[0]) || '';
        if (year && month.match(/^[0-9]+$/) && day.match(/^[0-9]+$/)) {
            dates.push(`${year}-${month}-${day}`);
        }
        else if (year && month.match(/^[0-9]+$/)) {
            dates.push(`${year}-${month}`);
        }
        else if (year && month && day) {
            dates.push(`${day} ${month} ${year}`);
        }
        else if (year && month) {
            dates.push(`${month} ${year}`);
        }
        else if (year) {
            dates.push(year);
        }
        this.item.date = Array.from(new Set(dates)).join(', ');
        return true;
    }
    $year(value) { return this.$date(value); }
    $month(value) { return this.$date(value); }
    $day(value) { return this.$date(value); }
    // "files" will import the same as "file" but won't be treated as verbatim by the bibtex parser. Needed because the people at Mendeley can't be bothered
    // to read the manual apparently.
    $files(value) { return this.$file(value); }
    $file(value) {
        const replace = {
            '\\;': '\u0011',
            '\u0011': ';',
            '\\:': '\u0012',
            '\u0012': ':',
            '\\\\': '\u0013',
            '\u0013': '\\',
        };
        for (const record of value.replace(/\\[\\;:]/g, escaped => replace[escaped]).split(';')) {
            const att = {
                mimeType: '',
                path: '',
                title: '',
            };
            const parts = record.split(':').map(str => str.replace(/[\u0011\u0012\u0013]/g, escaped => replace[escaped]));
            switch (parts.length) {
                case 1:
                    att.path = parts[0];
                    break;
                case 3: // tslint:disable-line:no-magic-numbers
                    att.title = parts[0];
                    att.path = parts[1];
                    att.mimeType = parts[2]; // tslint:disable-line:no-magic-numbers
                    break;
                default:
                    debug_1.debug(`Unexpected number of parts in file record '${record}': ${parts.length}`);
                    break;
            }
            if (!att.path) {
                debug_1.debug(`file record '${record}' has no file path`);
                continue;
            }
            if (this.jabref.fileDirectory)
                att.path = `${this.jabref.fileDirectory}${Translator.paths.sep}${att.path}`;
            if (att.mimeType.toLowerCase() === 'pdf' || (!att.mimeType && att.path.toLowerCase().endsWith('.pdf'))) {
                att.mimeType = 'application/pdf';
            }
            if (!att.mimeType)
                delete att.mimeType;
            att.title = att.title || att.path.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
            if (!att.title)
                delete att.title;
            this.item.attachments.push(att);
        }
        return true;
    }
    /* TODO: Zotero ignores these on import
    protected '$date-modified'(value) { return this.item.dateAdded = this.unparse(value) }
    protected '$date-added'(value) { return this.item.dateAdded = this.unparse(value) }
    protected '$added-at'(value) { return this.item.dateAdded = this.unparse(value) }
    protected $timestamp(value) { return this.item.dateAdded = this.unparse(value) }
    */
    $urldate(value) { return this.set('accessDate', value); }
    $lastchecked(value) { return this.$urldate(value); }
    $number(value) {
        for (const field of ['seriesNumber', 'number', 'issue']) {
            if (!this.validFields.get(field))
                continue;
            this.set(field, value);
            return true;
        }
        return false;
    }
    $issue(value) { return this.$number(value); }
    $issn(value) {
        if (!this.validFields.get('ISSN'))
            return false;
        return this.set('ISSN', value);
    }
    $url(value, field) {
        let m, url;
        // no escapes needed in an verbatim field but people do it anyway
        value = value.replace(/\\/g, '');
        if (m = value.match(/^(\\url{)(https?:\/\/|mailto:)}$/i)) {
            url = m[2];
        }
        else if (field === 'url' || /^(https?:\/\/|mailto:)/i.test(value)) {
            url = value;
        }
        else {
            url = null;
        }
        if (!url)
            return false;
        if (this.item.url)
            return (this.item.url === url);
        this.item.url = url;
        return true;
    }
    $howpublished(value, field) { return this.$url(value, field); }
    $type(value) {
        if (this.type === 'patent') {
            this.numberPrefix = { patent: '', patentus: 'US', patenteu: 'EP', patentuk: 'GB', patentdede: 'DE', patentfr: 'FR' }[value.toLowerCase()];
            return typeof this.numberPrefix !== 'undefined';
        }
        if (this.validFields.get('type')) {
            this.set('type', value);
            return true;
        }
        return false;
    }
    $lista(value) {
        if (this.type !== 'encyclopediaArticle' || !!this.item.title)
            return false;
        this.set('title', value);
        return true;
    }
    $annotation(value) {
        this.item.notes.push(Zotero.Utilities.text2html(value, false));
        return true;
    }
    $comment(value) { return this.$annotation(value); }
    $annote(value) { return this.$annotation(value); }
    $review(value) { return this.$annotation(value); }
    $notes(value) { return this.$annotation(value); }
    $note(value) {
        this.item.notes.push(Zotero.Utilities.text2html(value, false));
        return true;
    }
    $series(value) { return this.set('series', value); }
    // horrid jabref 3.8+ groups format
    $groups(value) {
        if (this.jabref.groups[value] && !this.jabref.groups[value].entries.includes(this.bibtex.key))
            this.jabref.groups[value].entries.push(this.bibtex.key);
        return true;
    }
    $language(value, field) {
        const language = (this.bibtex.fields.language || []).concat(this.bibtex.fields.langid || [])
            .map(lang => ['en', 'eng', 'usenglish', 'english'].includes(lang.toLowerCase()) ? this.english : lang)
            .join(' and ');
        return this.set('language', language);
    }
    $langid(value, field) { return this.$language(value, field); }
    $shorttitle(value) { return this.set('shortTitle', value); }
    $eprinttype(value, field) {
        this.eprint[field] = value.trim();
        this.eprint.eprintType = {
            arxiv: 'arXiv',
            jstor: 'JSTOR',
            pubmed: 'PMID',
            hdl: 'HDL',
            googlebooks: 'GoogleBooksID',
        }[this.eprint[field].toLowerCase()] || '';
        return true;
    }
    $archiveprefix(value, field) { return this.$eprinttype(value, field); }
    $eprint(value, field) {
        this.eprint[field] = value;
        return true;
    }
    $eprintclass(value, field) { return this.$eprint(value, field); }
    $primaryclass(value, field) { return this.$eprint(value, 'eprintclass'); }
    $slaccitation(value, field) { return this.$eprint(value, field); }
    $nationality(value) { return this.set('country', value); }
    $chapter(value) { return this.set('section', value); }
    error(err) {
        debug_1.debug(err);
        throw new Error(err);
    }
    import() {
        this.hackyFields = [];
        this.eprint = {};
        for (const subtitle of ['titleaddon', 'subtitle']) {
            if (!this.bibtex.fields.title && this.bibtex.fields[subtitle]) {
                this.bibtex.fields.title = this.bibtex.fields[subtitle];
                delete this.bibtex.fields[subtitle];
            }
        }
        // import order
        const creatorTypes = [
            'author',
            'editor',
            'translator',
        ];
        for (const type of creatorTypes.concat(Object.keys(this.bibtex.creators).filter(other => !creatorTypes.includes(other)).filter(t => t !== 'holder' || this.type !== 'patent'))) {
            if (!this.bibtex.fields[type])
                continue;
            const creators = this.bibtex.fields[type].length ? this.bibtex.creators[type] : [];
            delete this.bibtex.fields[type];
            for (const creator of creators) {
                const name = { creatorType: type };
                if (creator.literal) {
                    name.lastName = creator.literal.replace(/\u00A0/g, ' ');
                    name.fieldMode = 1;
                }
                else {
                    name.firstName = creator.firstName || '';
                    name.lastName = creator.lastName || '';
                    if (creator.prefix)
                        name.lastName = `${creator.prefix} ${name.lastName}`.trim();
                    if (creator.suffix)
                        name.lastName = name.lastName ? `${name.lastName}, ${creator.suffix}` : creator.suffix;
                    name.firstName = name.firstName.replace(/\u00A0/g, ' ').trim();
                    name.lastName = name.lastName.replace(/\u00A0/g, ' ').trim();
                    if (name.lastName && !name.firstName)
                        name.fieldMode = 1;
                }
                this.item.creators.push(name);
            }
        }
        // do this before because some handlers directly access this.bibtex.fields
        for (const [field, values] of Object.entries(this.bibtex.fields)) {
            this.bibtex.fields[field] = values.map(value => value.replace(/\u00A0/g, ' ').trim());
        }
        for (const [field, values] of Object.entries(this.bibtex.fields)) {
            for (let value of values) {
                value = value.replace(/\u00A0/g, ' ');
                if (field.match(/^local-zo-url-[0-9]+$/)) {
                    if (this.$file(value))
                        continue;
                }
                else if (field.match(/^bdsk-url-[0-9]+$/)) {
                    if (this.$url(value, field))
                        continue;
                }
                if (this[`$${field}`] && this[`$${field}`](value, field))
                    continue;
                switch (field) {
                    case 'doi':
                        this.hackyFields.push(`DOI: ${value}`);
                        break;
                    case 'issn':
                        this.hackyFields.push(`ISSN: ${value}`);
                        break;
                    default:
                        if (value.indexOf('\n') >= 0) {
                            this.item.notes.push(`<p><b>${Zotero.Utilities.text2html(field, false)}</b></p>${Zotero.Utilities.text2html(value, false)}`);
                        }
                        else {
                            this.hackyFields.push(`tex.${field.toLowerCase()}: ${value}`);
                        }
                        break;
                }
            }
        }
        if (this.numberPrefix && this.item.number && !this.item.number.toLowerCase().startsWith(this.numberPrefix.toLowerCase()))
            this.item.number = `${this.numberPrefix}${this.item.number}`;
        if (this.bibtex.key)
            this.hackyFields.push(`Citation Key: ${this.bibtex.key}`); // Endnote has no citation keys in their bibtex
        if (this.eprint.slaccitation && !this.eprint.eprint) {
            const m = this.eprint.slaccitation.match(/^%%CITATION = (.+);%%$/);
            const arxiv = arXiv_1.arXiv.parse(m && m[1].trim());
            if (arxiv.id) {
                this.eprint.eprintType = this.eprint.eprinttype = 'arXiv';
                if (!this.eprint.archiveprefix)
                    this.eprint.archiveprefix = 'arXiv';
                this.eprint.eprint = arxiv.id;
                if (!this.eprint.eprintclass && arxiv.category)
                    this.eprint.eprintclass = arxiv.category;
            }
        }
        delete this.eprint.slaccitation;
        if (this.eprint.eprintType && this.eprint.eprint) {
            const eprintclass = this.eprint.eprintType === 'arXiv' && this.eprint.eprintclass ? ` [${this.eprint.eprintclass}]` : '';
            this.hackyFields.push(`${this.eprint.eprintType}: ${this.eprint.eprint}${eprintclass}`);
        }
        else {
            delete this.eprint.eprintType;
            for (const [k, v] of Object.entries(this.eprint)) {
                this.hackyFields.push(`tex.${k.toLowerCase()}: ${v}`);
            }
        }
        if (this.hackyFields.length > 0) {
            this.hackyFields.sort();
            this.item.extra = this.hackyFields.map(line => line.replace(/\n+/g, ' ')).concat(this.item.extra || '').join('\n').trim();
        }
        if (!this.item.publisher && this.item.backupPublisher) {
            this.item.publisher = this.item.backupPublisher;
            delete this.item.backupPublisher;
        }
    }
    /*
    private addToExtra(str) {
      if (this.item.extra && this.item.extra !== '') {
        this.item.extra += `\n${str}`
      } else {
        this.item.extra = str
      }
    }
    */
    set(field, value) {
        if (!this.validFields.get(field))
            return false;
        if (Translator.preferences.testing && (this.item[field] || typeof this.item[field] === 'number') && (value || typeof value === 'number') && this.item[field] !== value) {
            this.error(`import error: duplicate ${field} on ${this.type} ${this.bibtex.key} (old: ${this.item[field]}, new: ${value})`);
        }
        this.item[field] = value;
        return true;
    }
}
// ZoteroItem::$__note__ = ZoteroItem::$__key__ = -> true
//
// ZoteroItem::$referenceType = (value) ->
//   @item.thesisType = value if value in [ 'phdthesis', 'mastersthesis' ]
//   return true
//
// ### these return the value which will be interpreted as 'true' ###
//
// ZoteroItem::$copyright    = (value) -> @item.rights = value
// ZoteroItem::$assignee     = (value) -> @item.assignee = value
// ZoteroItem::$issue        = (value) -> @item.issue = value
//
// ### ZoteroItem::$lccn = (value) -> @item.callNumber = value ###
// ZoteroItem::$lccn = (value) -> @hackyFields.push("LCCB: #{value}")
// ZoteroItem::$pmid = ZoteroItem::$pmcid = (value, field) -> @hackyFields.push("#{field.toUpperCase()}: #{value}")
// ZoteroItem::$mrnumber = (value) -> @hackyFields.push("MR: #{value}")
// ZoteroItem::$zmnumber = (value) -> @hackyFields.push("Zbl: #{value}")
//
// ZoteroItem::$subtitle = (value) ->
//   @item.title = '' unless @item.title
//   @item.title = @item.title.trim()
//   value = value.trim()
//   if not /[-–—:!?.;]$/.test(@item.title) and not /^[-–—:.;¡¿]/.test(value)
//     @item.title += ': '
//   else
//   @item.title += ' ' if @item.title.length
//   @item.title += value
//   return true
//
// ZoteroItem::$fjournal = (value) ->
//   @item.journalAbbreviation = @item.publicationTitle if @item.publicationTitle
//   @item.publicationTitle = value
//   return true
Translator.initialize = () => {
    reference_1.Reference.installPostscript();
    Translator.unicode = !Translator.preferences.asciiBibTeX;
};
Translator.doImport = async () => {
    let read;
    let input = '';
    while ((read = Zotero.read(0x100000)) !== false) { // tslint:disable-line:no-magic-numbers
        input += read;
    }
    if (Translator.preferences.strings && Translator.preferences.importBibTeXStrings)
        input = `${Translator.preferences.strings}\n${input}`;
    const bib = await bibtexParser.parse(input, {
        async: true,
        errorHandler: (Translator.preferences.testing ? undefined : debug_1.debug),
        markup: (Translator.csquotes ? { enquote: Translator.csquotes } : {}),
        sentenceCase: !Translator.preferences.suppressSentenceCase,
        caseProtect: !Translator.preferences.suppressNoCase,
        verbatimFields: Translator.verbatimFields,
    });
    const errors = bib.errors;
    const whitelist = bib.comments
        .filter(comment => comment.startsWith('zotero-better-bibtex:whitelist:'))
        .map(comment => comment.toLowerCase().replace(/\s/g, '').split(':').pop().split(',').filter(key => key))[0];
    const jabref = bibtexParser.jabref(bib.comments);
    const itemIDS = {};
    let imported = 0;
    let id = 0;
    for (const bibtex of bib.entries) {
        if (bibtex.key && whitelist && !whitelist.includes(bibtex.key.toLowerCase()))
            continue;
        id++;
        if (bibtex.key)
            itemIDS[bibtex.key] = id; // Endnote has no citation keys
        try {
            await (new ZoteroItem(id, bibtex, jabref, errors)).complete();
        }
        catch (err) {
            debug_1.debug('bbt import error:', err);
            errors.push({ message: '' + err.message });
        }
        imported += 1;
        Zotero.setProgress(imported / bib.entries.length * 100); // tslint:disable-line:no-magic-numbers
    }
    for (const group of jabref.root || []) {
        importGroup(group, itemIDS, true);
    }
    if (errors.length) {
        const item = new Zotero.Item('note');
        item.note = 'Import errors found: <ul>';
        for (const err of errors) {
            item.note += '<li>';
            if (err.line) {
                item.note += `line ${err.line}`;
                if (err.column)
                    item.note += `, column ${err.column}`;
                item.note += ': ';
            }
            item.note += escape.html(err.message);
            if (err.source)
                item.note += `<pre>${escape.html(err.source)}</pre>`;
            item.note += '</li>';
        }
        item.note += '</ul>';
        item.tags = [{ tag: '#Better BibTeX import error', type: 1 }];
        await item.complete();
    }
    Zotero.setProgress(100); // tslint:disable-line:no-magic-numbers
};


/***/ }),

/***/ "./bibtex/datefield.ts":
/*!*****************************!*\
  !*** ./bibtex/datefield.ts ***!
  \*****************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function pad(v, padding) {
    if (v.length >= padding.length)
        return v;
    return (padding + v).slice(-padding.length);
}
function year(y) {
    // tslint:disable-next-line:no-magic-numbers
    if (Math.abs(y) > 999) {
        return `${y}`;
    }
    else {
        // tslint:disable-next-line:no-magic-numbers
        return (y < 0 ? '-' : '') + (`000${Math.abs(y)}`).slice(-4);
    }
}
function format(date) {
    let formatted;
    if (typeof date.year === 'number' && date.month && date.day) {
        formatted = `${year(date.year)}-${pad(date.month, '00')}-${pad(date.day, '00')}`;
    }
    else if (typeof date.year === 'number' && (date.month || date.season)) {
        // tslint:disable-next-line:no-magic-numbers
        formatted = `${year(date.year)}-${pad((date.month || (date.season + 20)), '00')}`;
    }
    else if (typeof date.year === 'number') {
        formatted = year(date.year);
    }
    else {
        formatted = '';
    }
    if (formatted && Translator.BetterBibLaTeX && Translator.preferences.biblatexExtendedDateFormat) {
        if (date.uncertain)
            formatted += '?';
        if (date.approximate)
            formatted += '~';
    }
    return formatted;
}
function datefield(date, field) {
    if (!date)
        return {};
    if (date && !date.type && date.orig)
        return {};
    if (!date.type)
        throw new Error(`Failed to parse ${JSON.stringify(date)}`);
    field = Object.assign(Object.assign({}, field), { enc: 'latex', value: '' });
    if (date.type === 'verbatim') {
        field.name = field.verbatim;
        if (date.verbatim === 'n.d.') {
            field.value = '<pre>\\bibstring{nodate}</pre>';
        }
        else {
            field.value = date.verbatim;
        }
    }
    else if (date.type === 'date' || date.type === 'season') {
        field.value = format(date);
    }
    else if (date.type === 'interval') {
        field.value = `${format(date.from)}/${format(date.to)}`;
    }
    else if (date.year) {
        field.value = format(date);
    }
    if (!field.value || !field.name)
        return {};
    // well this is fairly dense... the date field is not an verbatim field, so the 'circa' symbol ('~') ought to mean a
    // NBSP... but some magic happens in that field (always with the magic, BibLaTeX...). But hey, if I insert an NBSP,
    // guess what that gets translated to!
    if (date.type !== 'verbatim')
        field.value = field.value.replace(/~/g, '\u00A0');
    return field;
}
exports.datefield = datefield;


/***/ }),

/***/ "./bibtex/jabref.ts":
/*!**************************!*\
  !*** ./bibtex/jabref.ts ***!
  \**************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class JabRef {
    constructor() {
        this.citekeys = new Map;
    }
    exportGroups() {
        if ((Object.keys(Translator.collections).length === 0) || !Translator.preferences.jabrefFormat)
            return;
        let meta;
        if (Translator.preferences.jabrefFormat === 3) { // tslint:disable-line:no-magic-numbers
            meta = 'groupsversion:3';
        }
        else if (Translator.BetterBibLaTeX) {
            meta = 'databaseType:biblatex';
        }
        else {
            meta = 'databaseType:bibtex';
        }
        Zotero.write(`@comment{jabref-meta: ${meta};}\n`);
        Zotero.write('@comment{jabref-meta: groupstree:\n');
        this.groups = ['0 AllEntriesGroup:'];
        const collections = Object.values(Translator.collections).filter(coll => !coll.parent);
        if (Translator.preferences.testing)
            collections.sort((a, b) => Translator.stringCompare(a.name, b.name));
        for (const collection of collections) {
            this.exportGroup(collection, 1);
        }
        Zotero.write(this.groups.map(group => this.quote(group, true)).concat('').join(';\n'));
        Zotero.write('}\n');
    }
    exportGroup(collection, level) {
        let group = [`${level} ExplicitGroup:${this.quote(collection.name)}`, '0'];
        if (Translator.preferences.jabrefFormat === 3) { // tslint:disable-line:no-magic-numbers
            const references = ((collection.items || []).filter(id => this.citekeys.has(id)).map(id => this.quote(this.citekeys.get(id))));
            if (Translator.preferences.testing)
                references.sort();
            group = group.concat(references);
        }
        // what is the meaning of the empty cell at the end, JabRef?
        group.push('');
        this.groups.push(group.join(';'));
        const children = (collection.collections || []).map(key => Translator.collections[key]).filter(coll => coll);
        if (Translator.preferences.testing)
            children.sort((a, b) => Translator.stringCompare(a.name, b.name));
        for (const child of children) {
            this.exportGroup(child, level + 1);
        }
    }
    quote(s, wrap = false) {
        s = s.replace(/([\\;])/g, '\\$1');
        if (wrap)
            s = s.match(/.{1,70}/g).join('\n');
        return s;
    }
}
exports.JabRef = JabRef;


/***/ }),

/***/ "./bibtex/postfix.ts":
/*!***************************!*\
  !*** ./bibtex/postfix.ts ***!
  \***************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Postfix {
    constructor(qualityReport) {
        this.qr = qualityReport;
        this.packages = {};
        this.noopsort = false;
        this.declarePrefChars = '';
    }
    add(item) {
        if (!item.metadata)
            return;
        if (item.metadata.DeclarePrefChars)
            this.declarePrefChars += item.metadata.DeclarePrefChars;
        if (item.metadata.noopsort)
            this.noopsort = true;
        if (item.metadata.packages) {
            for (const pkg of item.metadata.packages) {
                this.packages[pkg] = true;
            }
        }
    }
    toString() {
        let postfix = '';
        let preamble = [];
        if (this.declarePrefChars)
            preamble.push("\\ifdefined\\DeclarePrefChars\\DeclarePrefChars{'’-}\\else\\fi");
        if (this.noopsort)
            preamble.push('\\newcommand{\\noopsort}[1]{}');
        if (preamble.length > 0) {
            preamble = preamble.map(cmd => `"${cmd} "`);
            postfix += `@preamble{ ${preamble.join(' \n # ')} }\n`;
        }
        if (this.qr) {
            const packages = Object.keys(this.packages).sort();
            if (packages.length) {
                postfix += '\n% Required packages:\n';
                for (const pkg of packages) {
                    postfix += `% * ${pkg}\n`;
                }
            }
        }
        return postfix;
    }
}
exports.Postfix = Postfix;


/***/ }),

/***/ "./bibtex/reference.ts":
/*!*****************************!*\
  !*** ./bibtex/reference.ts ***!
  \*****************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const exporter_1 = __webpack_require__(/*! ../lib/exporter */ "./lib/exporter.ts");
const unicode_translator_1 = __webpack_require__(/*! ./unicode_translator */ "./bibtex/unicode_translator.ts");
const debug_1 = __webpack_require__(/*! ../lib/debug */ "./lib/debug.ts");
const datefield_1 = __webpack_require__(/*! ./datefield */ "./bibtex/datefield.ts");
const Extra = __webpack_require__(/*! ../../content/extra */ "../content/extra.ts");
const cslVariables = __webpack_require__(/*! ../../content/csl-vars.json */ "../content/csl-vars.json");
const CSL = __webpack_require__(/*! ../../gen/citeproc */ "../gen/citeproc.js");
const arXiv_1 = __webpack_require__(/*! ../../content/arXiv */ "../content/arXiv.ts");
const Path = {
    normalize(path) {
        return Translator.paths.caseSensitive ? path : path.toLowerCase();
    },
    drive(path) {
        if (Translator.platform !== 'win')
            return '';
        return path.match(/^[a-z]:\//) ? path.substring(0, 2) : '';
    },
    relative(path) {
        if (this.drive(Translator.options.exportPath) !== this.drive(path))
            return path;
        const from = Translator.options.exportPath.split(Translator.paths.sep);
        const to = path.split(Translator.paths.sep);
        while (from.length && to.length && this.normalize(from[0]) === this.normalize(to[0])) {
            from.shift();
            to.shift();
        }
        return `..${Translator.paths.sep}`.repeat(from.length) + to.join(Translator.paths.sep);
    },
};
const Language = new class {
    constructor() {
        this.babelMap = {
            af: 'afrikaans',
            am: 'amharic',
            ar: 'arabic',
            ast: 'asturian',
            bg: 'bulgarian',
            bn: 'bengali',
            bo: 'tibetan',
            br: 'breton',
            ca: 'catalan',
            cop: 'coptic',
            cy: 'welsh',
            cz: 'czech',
            da: 'danish',
            de_1996: 'ngerman',
            de_at_1996: 'naustrian',
            de_at: 'austrian',
            de_de_1996: 'ngerman',
            de: ['german', 'germanb'],
            dsb: ['lsorbian', 'lowersorbian'],
            dv: 'divehi',
            el: 'greek',
            el_polyton: 'polutonikogreek',
            en_au: 'australian',
            en_ca: 'canadian',
            en: 'english',
            en_gb: ['british', 'ukenglish'],
            en_nz: 'newzealand',
            en_us: ['american', 'usenglish'],
            eo: 'esperanto',
            es: 'spanish',
            et: 'estonian',
            eu: 'basque',
            fa: 'farsi',
            fi: 'finnish',
            fr_ca: ['acadian', 'canadian', 'canadien'],
            fr: ['french', 'francais', 'français'],
            fur: 'friulan',
            ga: 'irish',
            gd: ['scottish', 'gaelic'],
            gl: 'galician',
            he: 'hebrew',
            hi: 'hindi',
            hr: 'croatian',
            hsb: ['usorbian', 'uppersorbian'],
            hu: 'magyar',
            hy: 'armenian',
            ia: 'interlingua',
            id: ['indonesian', 'bahasa', 'bahasai', 'indon', 'meyalu'],
            is: 'icelandic',
            it: 'italian',
            ja: 'japanese',
            kn: 'kannada',
            la: 'latin',
            lo: 'lao',
            lt: 'lithuanian',
            lv: 'latvian',
            ml: 'malayalam',
            mn: 'mongolian',
            mr: 'marathi',
            nb: ['norsk', 'bokmal', 'nob'],
            nl: 'dutch',
            nn: 'nynorsk',
            no: ['norwegian', 'norsk'],
            oc: 'occitan',
            pl: 'polish',
            pms: 'piedmontese',
            pt_br: ['brazil', 'brazilian'],
            pt: ['portuguese', 'portuges'],
            pt_pt: 'portuguese',
            rm: 'romansh',
            ro: 'romanian',
            ru: 'russian',
            sa: 'sanskrit',
            se: 'samin',
            sk: 'slovak',
            sl: ['slovenian', 'slovene'],
            sq_al: 'albanian',
            sr_cyrl: 'serbianc',
            sr_latn: 'serbian',
            sr: 'serbian',
            sv: 'swedish',
            syr: 'syriac',
            ta: 'tamil',
            te: 'telugu',
            th: ['thai', 'thaicjk'],
            tk: 'turkmen',
            tr: 'turkish',
            uk: 'ukrainian',
            ur: 'urdu',
            vi: 'vietnamese',
            zh_latn: 'pinyin',
            zh: 'pinyin',
            zlm: ['malay', 'bahasam', 'melayu'],
        };
        for (const [key, value] of Object.entries(this.babelMap)) {
            if (typeof value === 'string')
                this.babelMap[key] = [value];
        }
        // list of unique languages
        this.babelList = [];
        for (const v of Object.values(this.babelMap)) {
            for (const lang of v) {
                if (this.babelList.indexOf(lang) < 0)
                    this.babelList.push(lang);
            }
        }
        this.cache = {};
        this.prefix = {};
    }
    lookup(langcode) {
        if (!this.cache[langcode]) {
            this.cache[langcode] = [];
            for (const lc of Language.babelList) {
                this.cache[langcode].push({ lang: lc, sim: this.string_similarity(langcode, lc) });
            }
            this.cache[langcode].sort((a, b) => b.sim - a.sim);
        }
        return this.cache[langcode];
    }
    fromPrefix(langcode) {
        if (!langcode || (langcode.length < 2))
            return false;
        if (this.prefix[langcode] == null) {
            // consider a langcode matched if it is the prefix of exactly one language in the map
            const lc = langcode.toLowerCase();
            const matches = [];
            for (const languages of Object.values(Language.babelMap)) {
                for (const lang of languages) {
                    if (lang.toLowerCase().indexOf(lc) !== 0)
                        continue;
                    matches.push(languages);
                    break;
                }
            }
            if (matches.length === 1) {
                this.prefix[langcode] = matches[0];
            }
            else {
                this.prefix[langcode] = false;
            }
        }
        return this.prefix[langcode];
    }
    get_bigrams(str) {
        const s = str.toLowerCase();
        const bigrams = [...Array(s.length).keys()].map(i => s.slice(i, i + 2));
        bigrams.sort();
        return bigrams;
    }
    string_similarity(str1, str2) {
        const pairs1 = this.get_bigrams(str1);
        const pairs2 = this.get_bigrams(str2);
        const union = pairs1.length + pairs2.length;
        let hit_count = 0;
        while ((pairs1.length > 0) && (pairs2.length > 0)) {
            if (pairs1[0] === pairs2[0]) {
                hit_count++;
                pairs1.shift();
                pairs2.shift();
                continue;
            }
            if (pairs1[0] < pairs2[0]) {
                pairs1.shift();
            }
            else {
                pairs2.shift();
            }
        }
        return (hit_count * 2) / union;
    }
};
/*
 * h1 Global object: Translator
 *
 * The global Translator object allows access to the current configuration of the translator
 *
 * @param {enum} caseConversion whether titles should be title-cased and case-preserved
 * @param {boolean} bibtexURL set to true when BBT will generate \url{..} around the urls for BibTeX
 */
/*
 * h1 class: Reference
 *
 * The Bib(La)TeX references are generated by the `Reference` class. Before being comitted to the cache, you can add
 * postscript code that can manipulated the `has` or the `referencetype`
 *
 * @param {String} @referencetype referencetype
 * @param {Object} @item the current Zotero item being converted
 */
/*
 * The fields are objects with the following keys:
 *   * name: name of the Bib(La)TeX field
 *   * value: the value of the field
 *   * bibtex: the LaTeX-encoded value of the field
 *   * enc: the encoding to use for the field
 */
class Reference {
    constructor(item) {
        this.has = {};
        this.cachable = true;
        // private nonLetters = new Zotero.Utilities.XRegExp('[^\\p{Letter}]', 'g')
        this.punctuationAtEnd = new Zotero.Utilities.XRegExp('[\\p{Punctuation}]$');
        this.startsWithLowercase = new Zotero.Utilities.XRegExp('^[\\p{Ll}]');
        this.hasLowercaseWord = new Zotero.Utilities.XRegExp('\\s[\\p{Ll}]');
        this.whitespace = new Zotero.Utilities.XRegExp('\\p{Zs}');
        this.inPostscript = false;
        this._enc_creators_initials_marker = '\u0097'; // end of guarded area
        this._enc_creators_relax_marker = '\u200C'; // zero-width non-joiner
        this.isBibStringRE = /^[a-z][-a-z0-9_]*$/i;
        this.metadata = { DeclarePrefChars: '', noopsort: false, packages: [] };
        this.item = item;
        this.packages = {};
        if (!this.item.language) {
            this.english = true;
        }
        else {
            const langlc = this.item.language.toLowerCase();
            let language = Language.babelMap[langlc.replace(/[^a-z0-9]/, '_')];
            if (!language)
                language = Language.babelMap[langlc.replace(/-[a-z]+$/i, '').replace(/[^a-z0-9]/, '_')];
            if (!language)
                language = Language.fromPrefix(langlc);
            if (language) {
                this.language = language[0];
            }
            else {
                const match = Language.lookup(langlc);
                if (match[0].sim >= 0.9) { // tslint:disable-line:no-magic-numbers
                    this.language = match[0].lang;
                }
                else {
                    this.language = this.item.language;
                }
            }
            this.english = ['american', 'british', 'canadian', 'english', 'australian', 'newzealand', 'usenglish', 'ukenglish', 'anglais'].includes(this.language.toLowerCase());
        }
        if (this.item.extraFields.csl.type) {
            this.item.cslType = this.item.extraFields.csl.type.toLowerCase();
            delete item.extraFields.csl.type;
        }
        if (this.item.extraFields.csl['volume-title']) { // should just have been mapped by Zotero
            this.item.cslVolumeTitle = this.item.extraFields.csl['volume-title'];
            delete this.item.extraFields.csl['volume-title'];
        }
        this.item.referenceType = this.item.cslType || this.item.itemType;
        // should be const referencetype: string | { type: string, subtype?: string }
        // https://github.com/Microsoft/TypeScript/issues/10422
        const referencetype = this.typeMap.csl[this.item.cslType] || this.typeMap.zotero[this.item.itemType] || 'misc';
        if (typeof referencetype === 'string') {
            this.referencetype = referencetype;
        }
        else {
            this.add({ name: 'entrysubtype', value: referencetype.subtype });
            this.referencetype = referencetype.type;
        }
        if (Translator.preferences.jabrefFormat) {
            if (Translator.preferences.testing) {
                this.add({ name: 'timestamp', value: '2015-02-24 12:14:36 +0100' });
            }
            else {
                this.add({ name: 'timestamp', value: this.item.dateModified || this.item.dateAdded });
            }
        }
        if ((this.item.libraryCatalog || '').match(/^arxiv(\.org)?$/i) && (this.item.arXiv = arXiv_1.arXiv.parse(this.item.publicationTitle)) && this.item.arXiv.id) {
            this.item.arXiv.source = 'publicationTitle';
            if (Translator.BetterBibLaTeX)
                delete this.item.publicationTitle;
        }
        else if (this.item.extraFields.tex.arxiv && (this.item.arXiv = arXiv_1.arXiv.parse(this.item.extraFields.tex.arxiv.value)) && this.item.arXiv.id) {
            this.item.arXiv.source = 'extra';
        }
        else {
            this.item.arXiv = null;
        }
        if (this.item.arXiv) {
            delete this.item.extraFields.tex.arxiv;
            this.add({ name: 'archivePrefix', value: 'arXiv' });
            this.add({ name: 'eprinttype', value: 'arxiv' });
            this.add({ name: 'eprint', value: this.item.arXiv.id });
            this.add({ name: 'primaryClass', value: this.item.arXiv.category });
        }
    }
    static installPostscript() {
        let postscript = Translator.preferences.postscript;
        if (typeof postscript !== 'string' || postscript.trim() === '')
            return;
        try {
            postscript = `this.inPostscript = true; ${postscript}; this.inPostscript = false;`;
            // workaround for https://github.com/Juris-M/zotero/issues/65
            Reference.prototype.postscript = new Function('reference', 'item', 'Translator', 'Zotero', postscript);
            debug_1.debug(`Installed postscript: ${JSON.stringify(postscript)}`);
        }
        catch (err) {
            if (Translator.preferences.testing)
                throw err;
            debug_1.debug(`Failed to compile postscript: ${err}\n\n${JSON.stringify(postscript)}`);
        }
    }
    /** normalize dashes, mainly for use in `pages` */
    normalizeDashes(str) {
        str = (str || '').trim();
        if (this.item.raw)
            return str;
        return str
            .replace(/\u2053/g, '~')
            .replace(/[\u2014\u2015]/g, '---') // em-dash
            .replace(/[\u2012\u2013]/g, '--'); // en-dash
        // .replace(/([0-9])\s-\s([0-9])/g, '$1--$2') // treat space-hyphen-space like an en-dash when it's between numbers
    }
    /*
     * Add a field to the reference field set
     *
     * @param {field} field to add. 'name' must be set, and either 'value' or 'bibtex'. If you set 'bibtex', BBT will trust
     *   you and just use that as-is. If you set 'value', BBT will escape the value according the encoder passed in 'enc'; no
     *   'enc' means 'enc_latex'. If you pass both 'bibtex' and 'latex', 'bibtex' takes precedence (and 'value' will be
     *   ignored)
     */
    add(field) {
        if (Translator.skipField[field.name])
            return null;
        if (field.enc === 'date') {
            if (!field.value)
                return null;
            if (Translator.BetterBibLaTeX && Translator.preferences.biblatexExtendedDateFormat && Zotero.BetterBibTeX.isEDTF(field.value, true)) {
                return this.add(Object.assign(Object.assign({}, field), { enc: 'verbatim' }));
            }
            if (field.value === 'today') {
                return this.add(Object.assign(Object.assign({}, field), { value: '<pre>\\today</pre>', enc: 'verbatim' }));
            }
            const date = Zotero.BetterBibTeX.parseDate(field.value);
            this.add(datefield_1.datefield(date, field));
            this.add(datefield_1.datefield(date.orig, Object.assign(Object.assign({}, field), { name: (field.orig && field.orig.inherit) ? `orig${field.name}` : (field.orig && field.orig.name), verbatim: (field.orig && field.orig.inherit && field.verbatim) ? `orig${field.verbatim}` : (field.orig && field.orig.verbatim) })));
            return field.name;
        }
        if (field.fallback && field.replace)
            throw new Error('pick fallback or replace, buddy');
        if (field.fallback && this.has[field.name])
            return null;
        // legacy field addition, leave in place for postscripts
        if (!field.name) {
            const keys = Object.keys(field);
            switch (keys.length) {
                case 0: // name -> undefined/null
                    return null;
                case 1:
                    field = { name: keys[0], value: field[keys[0]] };
                    break;
                default:
                    throw new Error(`Quick-add mode expects exactly one name -> value mapping, found ${JSON.stringify(field)} (${(new Error()).stack})`);
            }
        }
        if (!field.bibtex) {
            if ((typeof field.value !== 'number') && !field.value)
                return null;
            if ((typeof field.value === 'string') && (field.value.trim() === ''))
                return null;
            if (Array.isArray(field.value) && (field.value.length === 0))
                return null;
        }
        if (this.has[field.name]) {
            if (!this.inPostscript && !field.replace)
                throw new Error(`duplicate field '${field.name}' for ${this.item.citekey}`);
            this.remove(field.name);
        }
        if (!field.bibtex) {
            if ((typeof field.value === 'number') || (field.bibtexStrings && this.isBibString(field.value))) {
                field.bibtex = `${field.value}`;
            }
            else {
                const enc = field.enc || this.fieldEncoding[field.name] || 'latex';
                let value = this[`enc_${enc}`](field, this.item.raw);
                if (!value)
                    return null;
                value = value.trim();
                // scrub fields of unwanted {}, but not if it's a raw field or a bare field without spaces
                if (!field.bare || field.value.match(/\s/)) {
                    // clean up unnecesary {} when followed by a char that safely terminates the command before
                    // value = value.replace(/({})+($|[{}$\/\\.;,])/g, '$2') // don't remove trailing {} https://github.com/retorquere/zotero-better-bibtex/issues/1091
                    if (!(this.item.raw || field.raw))
                        value = value.replace(/({})+([{}\$\/\\\.;,])/g, '$2');
                    value = `{${value}}`;
                }
                field.bibtex = value;
            }
        }
        this.has[field.name] = field;
        return field.name;
    }
    /*
     * Remove a field from the reference field set
     *
     * @param {name} field to remove.
     * @return {Object} the removed field, if present
     */
    remove(name) {
        if (!this.has[name])
            return;
        const removed = this.has[name];
        delete this.has[name];
        return removed;
    }
    isBibString(value) {
        if (!value || typeof value !== 'string')
            return false;
        switch (Translator.preferences.exportBibTeXStrings) {
            case 'off':
                return false;
            case 'detect':
                return this.isBibStringRE.test(value);
            case 'match':
                return !!exporter_1.Exporter.strings[value.toUpperCase()]; // the importer uppercases string declarations
            default:
                return false;
        }
    }
    hasCreator(type) { return (this.item.creators || []).some(creator => creator.creatorType === type); }
    override(field) {
        const itemtype_name = field.name.split('.');
        let name;
        if (itemtype_name.length === 2) {
            if (this.referencetype !== itemtype_name[0])
                return;
            name = itemtype_name[1];
        }
        else {
            name = field.name;
        }
        if ((typeof field.value === 'string') && (field.value.trim() === '')) {
            this.remove(name);
            return;
        }
        this.add(Object.assign(Object.assign({}, field), { name, replace: (typeof field.replace !== 'boolean' && typeof field.fallback !== 'boolean') || field.replace }));
    }
    complete() {
        if ((this.item.collections || []).length && Translator.preferences.jabrefFormat === 4) { // tslint:disable-line:no-magic-numbers
            let groups = this.item.collections.filter(key => Translator.collections[key]).map(key => Translator.collections[key].name);
            groups = groups.sort().filter((item, pos, ary) => !pos || (item !== ary[pos - 1]));
            this.add({ name: 'groups', value: groups.join(',') });
        }
        if (this.item.extraFields.aliases.length) {
            this.add({ name: 'ids', value: this.item.extraFields.aliases.join(',') });
        }
        for (let [cslName, value] of Object.entries(this.item.extraFields.csl)) {
            // these are handled just like 'arxiv' and 'lccn', respectively
            if (['PMID', 'PMCID'].includes(cslName) && typeof value === 'string') {
                this.item.extraFields.tex[cslName.toLowerCase()] = { value };
                delete this.item.extraFields.csl[cslName];
                continue;
            }
            const type = cslVariables[cslName];
            let name = null;
            let replace = false;
            let enc;
            switch (type) {
                case 'string':
                    enc = null;
                    break;
                case 'creator':
                    enc = 'creators';
                    if (Array.isArray(value))
                        value = value.map(Extra.zoteroCreator); // yeah yeah, shut up TS
                    break;
                case 'date':
                    enc = 'date';
                    replace = true;
                default:
                    enc = type;
            }
            // CSL names are not in BibTeX format, so only add it if there's a mapping
            if (Translator.BetterBibLaTeX) {
                switch (cslName) {
                    case 'authority':
                        name = 'institution';
                        break;
                    case 'status':
                        name = 'pubstate';
                        break;
                    case 'title':
                        name = this.referencetype === 'book' ? 'maintitle' : null;
                        break;
                    case 'container-title':
                        switch (this.item.referenceType) {
                            case 'film':
                            case 'tvBroadcast':
                            case 'videoRecording':
                            case 'motion_picture':
                                name = 'booktitle';
                                break;
                            case 'bookSection':
                            case 'chapter':
                                name = 'maintitle';
                                break;
                            default:
                                name = 'journaltitle';
                                break;
                        }
                        break;
                    case 'original-publisher':
                        name = 'origpublisher';
                        enc = 'literal';
                        break;
                    case 'original-publisher-place':
                        name = 'origlocation';
                        enc = 'literal';
                        break;
                    case 'original-title':
                        name = 'origtitle';
                        break;
                    case 'original-date':
                        name = 'origdate';
                        break;
                    case 'publisher-place':
                        name = 'location';
                        enc = 'literal';
                        break;
                    case 'issued':
                        name = 'date';
                        break;
                    // https://github.com/retorquere/zotero-better-bibtex/issues/644
                    case 'event-place':
                        name = 'venue';
                        break;
                    case 'event-date':
                        name = 'eventdate';
                        break;
                    case 'accessed':
                        name = 'urldate';
                        break;
                    case 'number':
                    case 'volume':
                    case 'author':
                    case 'director':
                    case 'editor':
                    case 'DOI':
                    case 'ISBN':
                    case 'ISSN':
                        name = cslName.toLowerCase();
                        break;
                }
            }
            if (Translator.BetterBibTeX) {
                switch (cslName) {
                    case 'call-number':
                        name = 'lccn';
                        break;
                    case 'DOI':
                    case 'ISSN':
                        name = cslName.toLowerCase();
                        break;
                }
            }
            if (name) {
                this.override({ name, verbatim: name, orig: { inherit: true }, value, enc, replace, fallback: !replace });
            }
            else {
                debug_1.debug('Unmapped CSL field', cslName, '=', value);
            }
        }
        const bibtexStrings = Translator.preferences.exportBibTeXStrings === 'match';
        for (const [name, field] of Object.entries(this.item.extraFields.tex)) {
            // psuedo-var, sets the reference type
            if (name === 'referencetype') {
                this.referencetype = field.value;
                continue;
            }
            switch (name) {
                case 'mr':
                    this.override({ name: 'mrnumber', value: field.value, raw: field.raw });
                    break;
                case 'zbl':
                    this.override({ name: 'zmnumber', value: field.value, raw: field.raw });
                    break;
                case 'lccn':
                case 'pmcid':
                    this.override({ name, value: field.value, raw: field.raw });
                    break;
                case 'pmid':
                case 'arxiv':
                case 'jstor':
                case 'hdl':
                    if (Translator.BetterBibLaTeX) {
                        this.override({ name: 'eprinttype', value: name });
                        this.override({ name: 'eprint', value: field.value, raw: field.raw });
                    }
                    else {
                        this.override({ name, value: field.value, raw: field.raw });
                    }
                    break;
                case 'googlebooksid':
                    if (Translator.BetterBibLaTeX) {
                        this.override({ name: 'eprinttype', value: 'googlebooks' });
                        this.override({ name: 'eprint', value: field.value, raw: field.raw });
                    }
                    else {
                        this.override({ name: 'googlebooks', value: field.value, raw: field.raw });
                    }
                    break;
                case 'xref':
                    this.override({ name, value: field.value, raw: field.raw });
                    break;
                default:
                    this.override(Object.assign(Object.assign({}, field), { name, bibtexStrings }));
                    break;
            }
        }
        let notes = '';
        if (Translator.options.exportNotes && this.item.notes && this.item.notes.length) {
            notes = this.item.notes.join('<p>');
        }
        const annotation = Translator.BetterBibTeX ? 'annote' : 'annotation';
        if (this.has.note && this.item.extra) {
            this.add({ name: annotation, value: notes ? `${this.item.extra.replace(/\n/g, '<br/>')}<p>${notes}` : this.item.extra, html: !!notes });
        }
        else {
            this.add({ name: 'note', value: this.item.extra });
            this.add({ name: annotation, value: notes, html: true });
        }
        let cache;
        try {
            cache = this.postscript(this, this.item, Translator, Zotero);
        }
        catch (err) {
            if (Translator.preferences.testing && !Zotero.getHiddenPref('better-bibtex.postscriptProductionMode'))
                throw err;
            debug_1.debug('Reference.postscript failed:', err);
            cache = false;
        }
        this.cachable = this.cachable && (typeof cache !== 'boolean' || cache);
        for (const name of Translator.skipFields) {
            this.remove(name);
        }
        if (this.has.url && this.has.doi) {
            switch (Translator.preferences.DOIandURL) {
                case 'url':
                    delete this.has.doi;
                    break;
                case 'doi':
                    delete this.has.url;
                    break;
            }
        }
        if (!this.has.url)
            this.remove('urldate');
        if (!Object.keys(this.has).length)
            this.add({ name: 'type', value: this.referencetype });
        const fields = Object.values(this.has).map(field => `  ${field.name} = ${field.bibtex}`);
        // sort fields for stable tests
        if (Translator.preferences.testing || Translator.preferences.sorted)
            fields.sort();
        let ref = `@${this.referencetype}{${this.item.citekey},\n`;
        ref = '{{#scite:\n|bibtex=' + ref; //deni
        ref += fields.join(',\n');
                //deni stąd
			var library_id = this.item.libraryID ? this.item.libraryID : 0;
            var ZoteroLocal = ('zotero://select/items/' + library_id + "_" + this.item.key);
            var ZoteroLink = this.item.uri;
            var linkstext = [
        //        // Zotero.Utilities.htmlSpecialChars(citation),
                "[" + Zotero.Utilities.htmlSpecialChars(ZoteroLocal) + " Zotero local]",
                "[" + Zotero.Utilities.htmlSpecialChars(ZoteroLink) + " Zotero link]",
                "BibTeX key: " + this.item.citekey,
                ]. join( " {{bullet}} " );
            ref += ',\n  zoterolinks = {' + linkstext + '}';
        //deni dotąd
//deni        ref += '\n}\n';
        ref += '\n}\n}}\n'; //deni
        ref += this.qualityReport();
        ref += '\n';
        if (Translator.preferences.sorted) {
            Translator.references.push({ citekey: this.item.citekey, reference: ref });
        }
        else {
            Zotero.write(ref);
        }
        this.metadata.DeclarePrefChars = exporter_1.Exporter.unique_chars(this.metadata.DeclarePrefChars);
        this.metadata.packages = Object.keys(this.packages);
        if (Translator.caching && this.cachable)
            Zotero.BetterBibTeX.cacheStore(this.item.itemID, Translator.options, Translator.preferences, ref, this.metadata);
        exporter_1.Exporter.postfix.add(this);
    }
    /*
     * 'Encode' to raw LaTeX value
     *
     * @param {field} field to encode
     * @return {String} unmodified `field.value`
     */
    enc_raw(f) {
        return f.value;
    }
    /*
     * Encode to LaTeX url
     *
     * @param {field} field to encode
     * @return {String} field.value encoded as verbatim LaTeX string (minimal escaping). If in Better BibTeX, wraps return value in `\url{string}`
     */
    enc_url(f) {
        const value = this.enc_verbatim(f);
        if (Translator.BetterBibTeX) {
            return `\\url{${value}}`;
        }
        else {
            return value;
        }
    }
    /*
     * Encode to verbatim LaTeX
     *
     * @param {field} field to encode
     * @return {String} field.value encoded as verbatim LaTeX string (minimal escaping).
     */
    enc_verbatim(f) {
        return this.toVerbatim(f.value);
    }
    _enc_creators_scrub_name(name) {
        return Zotero.Utilities.XRegExp.replace(name, this.whitespace, ' ', 'all');
    }
    /*
     * Encode creators to author-style field
     *
     * @param {field} field to encode. The 'value' must be an array of Zotero-serialized `creator` objects.
     * @return {String} field.value encoded as author-style value
     */
    enc_creators(f, raw) {
        if (f.value.length === 0)
            return null;
        const encoded = [];
        for (const creator of f.value) {
            let name;
            if (creator.name || (creator.lastName && (creator.fieldMode === 1))) {
                name = creator.name || creator.lastName;
                if (name !== 'others')
                    name = raw ? `{${name}}` : this.enc_latex({ value: new String(this._enc_creators_scrub_name(name)) }); // tslint:disable-line:no-construct
            }
            else if (raw) {
                name = [creator.lastName || '', creator.firstName || ''].join(', ');
            }
            else if (creator.lastName || creator.firstName) {
                name = {
                    family: this._enc_creators_scrub_name(creator.lastName || ''),
                    given: this._enc_creators_scrub_name(creator.firstName || ''),
                };
                if (Translator.preferences.parseParticles)
                    CSL.parseParticles(name);
                if (!Translator.BetterBibLaTeX || !Translator.preferences.biblatexExtendedNameFormat) {
                    // side effects to set use-prefix/uniorcomma -- make sure addCreators is called *before* adding 'options'
                    if (!this.useprefix)
                        this.useprefix = !!name['non-dropping-particle'];
                    if (!this.juniorcomma)
                        this.juniorcomma = (f.juniorcomma && name['comma-suffix']);
                }
                if (Translator.BetterBibTeX) {
                    name = this._enc_creators_bibtex(name);
                }
                else {
                    name = this._enc_creators_biblatex(name);
                }
                name = name.replace(/ and /g, ' {and} ');
            }
            else {
                continue;
            }
            encoded.push(name.trim());
        }
        return encoded.join(' and ');
    }
    /*
     * Encode text to LaTeX literal list (double-braced)
     *
     * This encoding supports simple HTML markup.
     *
     * @param {field} field to encode.
     * @return {String} field.value encoded as author-style value
     */
    enc_literal(f, raw = false) {
        if (!f.value)
            return null;
        return this.enc_latex(Object.assign(Object.assign({}, f), { value: Translator.preferences.suppressBraceProtection ? f.value : new String(f.value) }), raw); // tslint:disable-line:no-construct
    }
    /*
     * Encode text to LaTeX
     *
     * This encoding supports simple HTML markup.
     *
     * @param {field} field to encode.
     * @return {String} field.value encoded as author-style value
     */
    enc_latex(f, raw = false) {
        if (typeof f.value === 'number')
            return f.value;
        if (!f.value)
            return null;
        if (Array.isArray(f.value)) {
            if (f.value.length === 0)
                return null;
            return f.value.map(elt => this.enc_latex(Object.assign(Object.assign({}, f), { bibtex: undefined, value: elt }), raw)).join(f.sep || '');
        }
        if (f.raw || raw)
            return f.value;
        const caseConversion = this.caseConversion[f.name] || f.caseConversion;
        const latex = unicode_translator_1.text2latex(f.value, { html: f.html, caseConversion: caseConversion && this.english });
        for (const pkg of latex.packages) {
            this.packages[pkg] = true;
        }
        let value = latex.latex;
        /*
          biblatex has a langid field it can use to exclude non-English
          titles from any lowercasing a style might request, so no
          additional protection by BBT is necessary. bibtex lacks a
          comparable mechanism, so the only thing BBT can do to tell
          bibtex to back off from non-English titles is to wrap the whole
          thing in braces.
        */
        if (caseConversion && Translator.BetterBibTeX && !this.english && !Translator.preferences.suppressBraceProtection)
            value = `{${value}}`;
        if (f.value instanceof String && !latex.raw)
            value = new String(`{${value}}`); // tslint:disable-line:no-construct
        return value;
    }
    enc_tags(f) {
        const tags = f.value
            .map(tag => (typeof tag === 'string' ? { tag } : tag))
            .filter(tag => Translator.preferences.automaticTags || (tag.type !== 1));
        if (tags.length === 0)
            return null;
        // sort tags for stable tests
        if (Translator.preferences.testing || Translator.preferences.sorted)
            tags.sort((a, b) => Translator.stringCompare(a.tag, b.tag));
        for (const tag of tags) {
            if (Translator.BetterBibTeX) {
                tag.tag = tag.tag.replace(/([#\\%&])/g, '\\$1');
            }
            else {
                tag.tag = tag.tag.replace(/([#%\\])/g, '\\$1');
            }
            // the , -> ; is unfortunate, but I see no other way
            tag.tag = tag.tag.replace(/,/g, ';');
            // verbatim fields require balanced braces -- please just don't use braces in your tags
            let balanced = 0;
            for (const ch of tag.tag) {
                switch (ch) {
                    case '{':
                        balanced += 1;
                        break;
                    case '}':
                        balanced -= 1;
                        break;
                }
                if (balanced < 0)
                    break;
            }
            if (balanced !== 0)
                tag.tag = tag.tag.replace(/{/g, '(').replace(/}/g, ')');
        }
        return tags.map(tag => tag.tag).join(',');
    }
    enc_attachments(f) {
        if (!f.value || (f.value.length === 0))
            return null;
        const attachments = [];
        const errors = [];
        for (const attachment of f.value) {
            const att = {
                title: attachment.title,
                mimetype: attachment.contentType || '',
                path: '',
            };
            if (Translator.options.exportFileData) {
                att.path = attachment.saveFile ? attachment.defaultPath : '';
            }
            else if (attachment.localPath) {
                att.path = attachment.localPath;
            }
            if (!att.path)
                continue; // amazon/googlebooks etc links show up as atachments without a path
            // att.path = att.path.replace(/^storage:/, '')
            att.path = att.path.replace(/(?:\s*[{}]+)+\s*/g, ' ');
            if (Translator.options.exportFileData) {
                attachment.saveFile(att.path, true);
            }
            if (!att.title)
                att.title = att.path.replace(/.*[\\\/]/, '') || 'attachment';
            if (!att.mimetype && (att.path.slice(-4).toLowerCase() === '.pdf'))
                att.mimetype = 'application/pdf'; // tslint:disable-line:no-magic-numbers
            if (Translator.preferences.testing) {
                att.path = `files/${this.item.citekey}/${att.path.replace(/.*[\/\\]/, '')}`;
            }
            else if (Translator.preferences.relativeFilePaths && Translator.options.exportPath) {
                const relative = Path.relative(att.path);
                if (relative !== att.path) {
                    this.cachable = false;
                    att.path = relative;
                }
            }
            attachments.push(att);
        }
        if (errors.length !== 0)
            f.errors = errors;
        if (attachments.length === 0)
            return null;
        // sort attachments for stable tests, and to make non-snapshots the default for JabRef to open (#355)
        attachments.sort((a, b) => {
            if ((a.mimetype === 'text/html') && (b.mimetype !== 'text/html'))
                return 1;
            if ((b.mimetype === 'text/html') && (a.mimetype !== 'text/html'))
                return -1;
            return Translator.stringCompare(a.path, b.path);
        });
        if (Translator.preferences.jabrefFormat)
            return attachments.map(att => [att.title, att.path, att.mimetype].map(part => part.replace(/([\\{}:;])/g, '\\$1')).join(':')).join(';');
        return attachments.map(att => att.path.replace(/([\\{}:;])/g, '\\$1')).join(';');
    }
    _enc_creators_pad_particle(particle, relax = false) {
        // space at end is always OK
        if (particle[particle.length - 1] === ' ')
            return particle;
        if (Translator.BetterBibLaTeX) {
            if (Zotero.Utilities.XRegExp.test(particle, this.punctuationAtEnd))
                this.metadata.DeclarePrefChars += particle[particle.length - 1];
            // if BBLT, always add a space if it isn't there
            return particle + ' ';
        }
        // otherwise, we're in BBT.
        // If the particle ends in a period, add a space
        if (particle[particle.length - 1] === '.')
            return particle + ' ';
        // if it ends in any other punctuation, it's probably something like d'Medici -- no space
        if (Zotero.Utilities.XRegExp.test(particle, this.punctuationAtEnd)) {
            if (relax)
                return `${particle}${this._enc_creators_relax_marker} `;
            return particle;
        }
        // otherwise, add a space
        return particle + ' ';
    }
    _enc_creators_biblatex(name) {
        let family, latex;
        if ((name.family.length > 1) && (name.family[0] === '"') && (name.family[name.family.length - 1] === '"')) {
            family = new String(name.family.slice(1, -1)); // tslint:disable-line:no-construct
        }
        else {
            ({ family } = name);
        }
        let initials = (name.given || '').indexOf(this._enc_creators_initials_marker); // end of guarded area
        if (Translator.preferences.biblatexExtendedNameFormat && (name['dropping-particle'] || name['non-dropping-particle'] || name['comma-suffix'])) {
            if (initials >= 0) {
                initials = name.given.substring(0, initials);
                if (initials.length > 1)
                    initials = new String(initials); // tslint:disable-line:no-construct
                name.given = name.given.replace(this._enc_creators_initials_marker, '');
            }
            else {
                initials = '';
            }
            latex = [];
            if (family)
                latex.push(`family=${this.enc_latex({ value: family })}`);
            if (name.given)
                latex.push(`given=${this.enc_latex({ value: name.given })}`);
            if (initials)
                latex.push(`given-i=${this.enc_latex({ value: initials })}`);
            if (name.suffix)
                latex.push(`suffix=${this.enc_latex({ value: name.suffix })}`);
            if (name['dropping-particle'] || name['non-dropping-particle']) {
                latex.push(`prefix=${this.enc_latex({ value: name['dropping-particle'] || name['non-dropping-particle'] })}`);
                latex.push(`useprefix=${!!name['non-dropping-particle']}`);
            }
            if (name['comma-suffix'])
                latex.push('juniorcomma=true');
            return latex.join(', ');
        }
        if (family && Zotero.Utilities.XRegExp.test(family, this.startsWithLowercase))
            family = new String(family); // tslint:disable-line:no-construct
        if (family)
            family = this.enc_latex({ value: family });
        if (initials >= 0)
            name.given = `<span relax="true">${name.given.replace(this._enc_creators_initials_marker, '</span>')}`;
        latex = '';
        if (name['dropping-particle'])
            latex += this.enc_latex({ value: this._enc_creators_pad_particle(name['dropping-particle']) });
        if (name['non-dropping-particle'])
            latex += this.enc_latex({ value: this._enc_creators_pad_particle(name['non-dropping-particle']) });
        if (family)
            latex += family;
        if (name.suffix)
            latex += `, ${this.enc_latex({ value: name.suffix })}`;
        if (name.given)
            latex += `, ${this.enc_latex({ value: name.given })}`;
        return latex;
    }
    _enc_creators_bibtex(name) {
        let family;
        if ((name.family.length > 1) && (name.family[0] === '"') && (name.family[name.family.length - 1] === '"')) { // quoted
            family = new String(name.family.slice(1, -1)); // tslint:disable-line:no-construct
        }
        else {
            family = name.family;
        }
        if (name.given && (name.given.indexOf(this._enc_creators_initials_marker) >= 0)) {
            name.given = `<span relax="true">${name.given.replace(this._enc_creators_initials_marker, '</span>')}`;
        }
        /*
          TODO: http://chat.stackexchange.com/rooms/34705/discussion-between-retorquere-and-egreg
    
          My advice is never using the alpha style; it's a relic of the past, when numbering citations was very difficult
          because one didn't know the full citation list when writing a paper. In order to have the bibliography in
          alphabetical order, such tricks were devised. The alternative was listing the citation in order of appearance.
          Your document gains nothing with something like XYZ88 as citation key.
    
          The “van” problem should be left to the bibliographic style. Some styles consider “van” as part of the name, some
          don't. In any case, you'll have a kludge, mostly unportable. However, if you want van Gogh to be realized as vGo
          in the label, use {\relax van} Gogh or something like this.
        */
//deni        if (name['non-dropping-particle'])
//deni            family = new String(this._enc_creators_pad_particle(name['non-dropping-particle']) + family); // tslint:disable-line:no-construct
//deni        if (Zotero.Utilities.XRegExp.test(family, this.startsWithLowercase) || Zotero.Utilities.XRegExp.test(family, this.hasLowercaseWord))
//deni            family = new String(family); // tslint:disable-line:no-construct
        // https://github.com/retorquere/zotero-better-bibtex/issues/978 -- enc_latex can return null
//deni        family = this.enc_latex({ value: family }) || '';
        // https://github.com/retorquere/zotero-better-bibtex/issues/976#issuecomment-393442419
//deni        if (family[0] !== '{' && name.family.match(/[-\u2014\u2015\u2012\u2013]/))
//deni            family = `{${family}}`;
//deni        if (name['dropping-particle'])
//deni            family = this.enc_latex({ value: this._enc_creators_pad_particle(name['dropping-particle'], true) }) + family;
//deni        if (Translator.BetterBibTeX && Translator.preferences.bibtexParticleNoOp && (name['non-dropping-particle'] || name['dropping-particle'])) {
//deni            family = `{\\noopsort{${this.enc_latex({ value: name.family.toLowerCase() })}}}${family}`;
//deni            this.metadata.noopsort = true;
//deni        }
        if (name.given)
            name.given = this.enc_latex({ value: name.given });
        if (name.suffix)
            name.suffix = this.enc_latex({ value: name.suffix });
        let latex = family;
        if (name.suffix)
            latex += `, ${name.suffix}`;
        if (name.given)
            latex += `, ${name.given}`;
        return latex;
    }
    postscript(_reference, _item, _translator, _zotero) { } // tslint:disable-line:no-empty
    toVerbatim(text) {
        text = text || '';
        let value;
        if (Translator.BetterBibTeX) {
            value = text.replace(/([#\\%&{}])/g, '\\$1');
        }
        else {
            value = text.replace(/([\\{}])/g, '\\$1');
        }
        if (!Translator.unicode)
            value = value.replace(/[^\x20-\x7E]/g, (chr => `\\%${`00${chr.charCodeAt(0).toString(16).slice(-2)}`}`)); // tslint:disable-line:no-magic-numbers
        return value;
    }
    qualityReport() {
        if (!Translator.preferences.qualityReport)
            return '';
        let report = this.lint({
            timestamp: `added because JabRef format is set to ${Translator.preferences.jabrefFormat || '?'}`,
        });
        if (report) {
            if (this.has.pages) {
                const dashes = this.has.pages.bibtex.match(/-+/g);
                // if (dashes && dashes.includes('-')) report.push('? hyphen found in pages field, did you mean to use an en-dash?')
                if (dashes && dashes.includes('---'))
                    report.push('? em-dash found in pages field, did you mean to use an en-dash?');
            }
            if (this.has.journal && this.has.journal.value.indexOf('.') >= 0)
                report.push(`? Possibly abbreviated journal title ${this.has.journal.value}`);
            if (this.has.journaltitle && this.has.journaltitle.value.indexOf('.') >= 0)
                report.push(`? Possibly abbreviated journal title ${this.has.journaltitle.value}`);
            if (this.referencetype === 'inproceedings' && this.has.booktitle) {
                if (!this.has.booktitle.value.match(/:|Proceedings|Companion| '/) || this.has.booktitle.value.match(/\.|workshop|conference|symposium/)) {
                    report.push('? Unsure about the formatting of the booktitle');
                }
            }
            if (this.has.title && !Translator.preferences.suppressTitleCase) {
                const titleCased = Zotero.BetterBibTeX.titleCase(this.has.title.value) === this.has.title.value;
                if (this.has.title.value.match(/\s/)) {
                    if (titleCased)
                        report.push('? Title looks like it was stored in title-case in Zotero');
                }
                else {
                    if (!titleCased)
                        report.push('? Title looks like it was stored in lower-case in Zotero');
                }
            }
        }
        else {
            report = [`I don't know how to quality-check ${this.referencetype} references`];
        }
        if (!report.length)
            return '';
        report.unshift(`== ${Translator.BetterBibTeX ? 'BibTeX' : 'BibLateX'} quality report for ${this.item.citekey}:`);
        return report.map(line => `% ${line}\n`).join('');
    }
}
exports.Reference = Reference;
//  @polyglossia = [
//    'albanian'
//    'amharic'
//    'arabic'
//    'armenian'
//    'asturian'
//    'bahasai'
//    'bahasam'
//    'basque'
//    'bengali'
//    'brazilian'
//    'brazil'
//    'breton'
//    'bulgarian'
//    'catalan'
//    'coptic'
//    'croatian'
//    'czech'
//    'danish'
//    'divehi'
//    'dutch'
//    'english'
//    'british'
//    'ukenglish'
//    'esperanto'
//    'estonian'
//    'farsi'
//    'finnish'
//    'french'
//    'friulan'
//    'galician'
//    'german'
//    'austrian'
//    'naustrian'
//    'greek'
//    'hebrew'
//    'hindi'
//    'icelandic'
//    'interlingua'
//    'irish'
//    'italian'
//    'kannada'
//    'lao'
//    'latin'
//    'latvian'
//    'lithuanian'
//    'lsorbian'
//    'magyar'
//    'malayalam'
//    'marathi'
//    'nko'
//    'norsk'
//    'nynorsk'
//    'occitan'
//    'piedmontese'
//    'polish'
//    'portuges'
//    'romanian'
//    'romansh'
//    'russian'
//    'samin'
//    'sanskrit'
//    'scottish'
//    'serbian'
//    'slovak'
//    'slovenian'
//    'spanish'
//    'swedish'
//    'syriac'
//    'tamil'
//    'telugu'
//    'thai'
//    'tibetan'
//    'turkish'
//    'turkmen'
//    'ukrainian'
//    'urdu'
//    'usorbian'
//    'vietnamese'
//    'welsh'
//  ]


/***/ }),

/***/ "./bibtex/unicode_translator.ts":
/*!**************************************!*\
  !*** ./bibtex/unicode_translator.ts ***!
  \**************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __webpack_require__(/*! ../lib/debug */ "./lib/debug.ts");
const HE = __webpack_require__(/*! he */ "../node_modules/he/he.js");
const unicodeMapping = __webpack_require__(/*! unicode2latex */ "../node_modules/unicode2latex/index.js");
/* https://github.com/retorquere/zotero-better-bibtex/issues/1189
  Needed so that composite characters are counted as single characters
  for in-text citation generation. This messes with the {} cleanup
  so the resulting TeX will be more verbose; doing this only for
  bibtex because biblatex doesn't appear to need it.

  Only testing ascii.text because that's the only place (so far)
  that these have turned up.
*/
if (Translator.BetterBibTeX) {
    let m;
    for (const tex of Object.values(unicodeMapping.ascii)) {
        if (!tex.text)
            continue;
        if (tex.text.match(/^\\[`'^~"=.][A-Za-z]$/)) {
            tex.text = `{${tex.text}}`;
        }
        else if (tex.text.match(/^\\[^]\\[ij]$/)) {
            tex.text = `{${tex.text}}`;
        }
        else if (tex.text.match(/^\\[kr]\{[a-zA-Z]\}$/)) {
            tex.text = `{${tex.text}}`;
        }
        else if (m = tex.text.match(/^\\(L|O|AE|AA|DH|DJ|OE|SS|TH|NG)\{\}$/i)) {
            tex.text = `{\\${m[1]}}`;
        }
    }
}
const switchMode = {
    math: 'text',
    text: 'math',
};
const htmlConverter = new class HTMLConverter {
    convert(html, options) {
        this.embraced = false;
        this.options = options;
        this.latex = '';
        this.packages = {};
        this.mapping = (Translator.unicode ? unicodeMapping.unicode : unicodeMapping.ascii);
        if (!this.mapping.initialized) {
            // translator is re-ran every time it's used, not cached ready-to-run, so safe to modify the mapping
            for (const c of Translator.preferences.ascii) {
                this.mapping[c] = unicodeMapping.ascii[c];
            }
            if (Translator.preferences.mapUnicode === 'conservative') {
                for (const keep of Object.keys(switchMode).sort()) {
                    const remove = switchMode[keep];
                    const unicode = Translator.preferences[`map${keep[0].toUpperCase()}${keep.slice(1)}`];
                    for (const c of unicode) {
                        if (this.mapping[c] && this.mapping[c].text && this.mapping[c].math) {
                            delete this.mapping[c][remove];
                        }
                    }
                }
            }
            else {
                const remove = switchMode[Translator.preferences.mapUnicode];
                if (remove) {
                    for (const tex of Object.values(this.mapping)) {
                        if (tex.text && tex.math)
                            delete tex[remove];
                    }
                }
            }
            this.mapping.initialized = true;
        }
        this.stack = [];
        const ast = Zotero.BetterBibTeX.parseHTML(html, this.options);
        this.walk(ast);
        this.latex = this.latex
            // .replace(/(\\\\)+[^\S\n]*\n\n/g, '\n\n') // I don't recall why I had the middle match, replaced by match below until I figure it out
            .replace(/(\\\\)+\n\n/g, '\n\n') // paragraph breaks followed by line breaks == line breaks
            .replace(/\n\n\n+/g, '\n\n'); // line breaks > 3 is the same as two line breaks.
        // .replace(/{}([}])/g, '$1') // seems to have become obsolete
        return { latex: this.latex, raw: ast.nodeName === 'pre', packages: Object.keys(this.packages) };
    }
    walk(tag, nocased = false) {
        if (!tag)
            return;
        switch (tag.nodeName) {
            case '#text':
                this.chars(tag.value, nocased);
                return;
            case 'pre':
            case 'script':
                this.latex += tag.value;
                return;
        }
        this.stack.unshift(tag);
        let latex = '...'; // default to no-op
        switch (tag.nodeName) {
            case 'i':
            case 'em':
            case 'italic':
                latex = '\\emph{...}';
                break;
            case 'b':
            case 'strong':
                latex = '\\textbf{...}';
                break;
            case 'a':
                /* zotero://open-pdf/0_5P2KA4XM/7 is actually a reference. */
                if (tag.attr.href && tag.attr.href.length)
                    latex = `\\href{${tag.attr.href}}{...}`;
                break;
            case 'sup':
                latex = '\\textsuperscript{...}';
                break;
            case 'sub':
                latex = '\\textsubscript{...}';
                break;
            case 'br':
                latex = '';
                /* line-breaks on empty line makes LaTeX sad */
                if (this.latex !== '' && this.latex[this.latex.length - 1] !== '\n')
                    latex = '\\\\';
                latex += '\n...';
                break;
            case 'p':
            case 'div':
            case 'table':
            case 'tr':
                latex = '\n\n...\n\n';
                break;
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
                latex = `\n\n\\${'sub'.repeat(parseInt(tag.nodeName[1]) - 1)}section{...}\n\n`;
                break;
            case 'ol':
                latex = '\n\n\\begin{enumerate}\n...\n\n\\end{enumerate}\n';
                break;
            case 'ul':
                latex = '\n\n\\begin{itemize}\n...\n\n\\end{itemize}\n';
                break;
            case 'li':
                latex = '\n\\item ...';
                break;
            case 'span':
            case 'sc':
            case 'nc':
                break; // ignore, handled by the relax/nocase/smallcaps handler below
            case 'td':
            case 'th':
                latex = ' ... ';
                break;
            case '#document':
            case '#document-fragment':
            case 'tbody':
            case 'html':
            case 'head':
            case 'body':
                break; // ignore
            default:
                debug_1.debug(`unexpected tag '${tag.nodeName}' (${Object.keys(tag)})`);
        }
        if (latex !== '...')
            latex = this.embrace(latex, latex.match(/^\\[a-z]+{\.\.\.}$/));
        if (tag.smallcaps)
            latex = this.embrace(`\\textsc{${latex}}`, true);
//deni        if (tag.nocase)
//deni            latex = `{{${latex}}}`;
        if (tag.relax)
            latex = `{\\relax ${latex}}`;
        if (tag.enquote) {
            if (Translator.BetterBibTeX) {
                latex = `\\enquote{${latex}}`;
            }
            else {
                latex = `\\mkbibquote{${latex}}`;
            }
        }
        const [prefix, postfix] = latex.split('...');
        this.latex += prefix;
        for (const child of tag.childNodes) {
            this.walk(child, nocased || tag.nocase);
        }
        this.latex += postfix;
        this.stack.shift();
    }
    embrace(latex, condition) {
        /* holy mother of %^$#^%$@ the bib(la)tex case conversion rules are insane */
        /* https://github.com/retorquere/zotero-better-bibtex/issues/541 */
        /* https://github.com/plk/biblatex/issues/459 ... oy! */
        if (!this.embraced)
            this.embraced = this.options.caseConversion && (((this.latex || latex)[0] !== '\\') || Translator.BetterBibTeX);
        if (!this.embraced || !condition)
            return latex;
        return `{${latex}}`;
    }
    chars(text, nocased) {
        if (this.options.html)
            text = HE.decode(text, { isAttributeValue: true });
        let latex = '';
        let mode = 'text';
        let braced = 0;
        const switchTo = {
            math: (nocased ? '$' : '{$'),
            text: (nocased ? '$' : '$}'),
        };
        text = text.normalize('NFC');
        let mapped, switched, m, i;
        const l = text.length;
        for (i = 0; i < l; i++) {
            // tie "i","︠","a","︡"
            if (text[i + 1] === '\ufe20' && text[i + 3] === '\ufe21') { // tslint:disable-line no-magic-numbers
                mapped = this.mapping[text.substr(i, 4)] || { text: text[i] + text[i + 2] }; // tslint:disable-line no-magic-numbers
                i += 3; // tslint:disable-line no-magic-numbers
            }
            else if (text[i + 1] && (mapped = this.mapping[text.substr(i, 2)])) {
                i += 1;
            }
            else {
                mapped = this.mapping[text[i]] || { text: text[i] };
            }
            // in and out of math mode
            if (!mapped[mode]) {
                mode = switchMode[mode];
                latex += switchTo[mode];
                switched = true;
            }
            else {
                switched = false;
            }
            // balance out braces with invisible braces until http://tex.stackexchange.com/questions/230750/open-brace-in-bibtex-fields/230754#comment545453_230754 is widely deployed
            switch (mapped[mode]) {
                case '\\{':
                    braced += 1;
                    break;
                case '\\}':
                    braced -= 1;
                    break;
            }
            if (braced < 0) {
                latex += '\\vphantom\\{';
                braced = 0;
            }
            // if we just switched out of math mode, and there's a lone sup/sub at the end, unpack it. The extra option brace is for when we're in nocased mode (see switchTo)
            if (switched && mode === 'text' && (m = latex.match(/([\^_])\{(.)\}(\$\}?)$/))) {
                latex = latex.slice(0, latex.length - m[0].length) + m[1] + m[2] + m[3]; // tslint:disable-line no-magic-numbers
            }
            latex += mapped[mode];
            // only try to merge sup/sub if we were already in math mode, because if we were previously in text mode, testing for _^ is tricky.
            if (!switched && mode === 'math' && (m = latex.match(/(([\^_])\{[^{}]+)\}\2{(.\})$/))) {
                latex = latex.slice(0, latex.length - m[0].length) + m[1] + m[3]; // tslint:disable-line no-magic-numbers
            }
            const pkg = mapped[mode + 'package'];
            if (pkg)
                this.packages[pkg] = true;
        }
        // add any missing closing phantom braces
        switch (braced) {
            case 0:
                break;
            case 1:
                latex += '\\vphantom\\}';
                break;
            default:
                latex += `\\vphantom{${'\\}'.repeat(braced)}}`;
                break;
        }
        // might still be in math mode at the end
        if (mode === 'math')
            latex += switchTo.text;
        this.latex += latex;
    }
};
function html2latex(html, options) {
    if (typeof options.html === 'undefined')
        options.html = true;
    const latex = htmlConverter.convert(html, options);
    latex.latex = latex.latex;
    return latex;
}
exports.html2latex = html2latex;
function text2latex(text, options = {}) {
    if (typeof options.html === 'undefined')
        options.html = false;
    return html2latex(text, options);
}
exports.text2latex = text2latex;


/***/ }),

/***/ "./lib/debug.ts":
/*!**********************!*\
  !*** ./lib/debug.ts ***!
  \**********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// import { format } from '../../content/debug-formatter'
function debug(...msg) {
    // if (!Translator.debugEnabled && !Translator.preferences.testing) return
    // Zotero.debug(format(`better-bibtex:${Translator.header.label}`, msg))
    Zotero.BetterBibTeX.debug(Translator.header.label, ...msg);
}
exports.debug = debug;


/***/ }),

/***/ "./lib/exporter.ts":
/*!*************************!*\
  !*** ./lib/exporter.ts ***!
  \*************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const jabref_1 = __webpack_require__(/*! ../bibtex/jabref */ "./bibtex/jabref.ts"); // not so nice... BibTeX-specific code
const itemfields = __webpack_require__(/*! ../../gen/itemfields */ "../gen/itemfields.ts");
const bibtexParser = __webpack_require__(/*! @retorquere/bibtex-parser */ "../node_modules/@retorquere/bibtex-parser/index.js");
const postfix_ts_1 = __webpack_require__(/*! ../bibtex/postfix.ts */ "./bibtex/postfix.ts");
const Extra = __webpack_require__(/*! ../../content/extra */ "../content/extra.ts");
// export singleton: https://k94n.com/es6-modules-single-instance-pattern
exports.Exporter = new class {
    constructor() {
        this.jabref = new jabref_1.JabRef();
        this.strings = {};
    }
    prepare_strings() {
        if (!Translator.BetterTeX || !Translator.preferences.strings)
            return;
        if (Translator.preferences.exportBibTeXStrings === 'match') {
            this.strings = bibtexParser.parse(Translator.preferences.strings, { markup: (Translator.csquotes ? { enquote: Translator.csquotes } : {}) }).strings;
        }
        /*
        if (Translator.preferences.exportBibTeXStrings !== 'off') {
          Zotero.write(`${Translator.preferences.strings}\n\n`)
        }
        */
    }
    unique_chars(str) {
        let uniq = '';
        for (const c of str) {
            if (uniq.indexOf(c) < 0)
                uniq += c;
        }
        return uniq;
    }
    nextItem() {
        this.postfix = this.postfix || (new postfix_ts_1.Postfix(Translator.preferences.qualityReport));
        let item;
        while (item = Zotero.nextItem()) {
            if (['note', 'attachment'].includes(item.itemType))
                continue;
            if (!item.citekey) {
                throw new Error(`No citation key in ${JSON.stringify(item)}`);
            }
            this.jabref.citekeys.set(item.itemID, item.citekey);
            // this is not automatically lazy-evaluated?!?!
            const cached = Translator.caching ? Zotero.BetterBibTeX.cacheFetch(item.itemID, Translator.options, Translator.preferences) : null;
            Translator.cache[cached ? 'hits' : 'misses'] += 1;
            if (cached) {
                if (Translator.preferences.sorted && (Translator.BetterBibTeX || Translator.BetterBibLaTeX)) {
                    Translator.references.push({ citekey: item.citekey, reference: cached.reference });
                }
                else {
                    Zotero.write(cached.reference);
                }
                this.postfix.add(cached);
                continue;
            }
            itemfields.simplifyForExport(item);
            Object.assign(item, Extra.get(item.extra));
            item.raw = Translator.preferences.rawLaTag === '*';
            item.tags = item.tags.filter(tag => {
                if (tag.tag === Translator.preferences.rawLaTag) {
                    item.raw = true;
                    return false;
                }
                return true;
            });
            return item;
        }
        return null;
    }
    // TODO: move to bibtex-exporters
    complete() {
        if (Translator.preferences.sorted && (Translator.BetterBibTeX || Translator.BetterBibLaTeX)) {
            Translator.references.sort((a, b) => Translator.stringCompare(a.citekey, b.citekey));
            Zotero.write(Translator.references.map(ref => ref.reference).join(''));
        }
        this.jabref.exportGroups();
        Zotero.write(this.postfix.toString());
    }
};


/***/ })

/******/ });
