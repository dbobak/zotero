{
	"translatorID": "ca65189f-8815-4afe-8a83-827c15f0edca",
	"label": "__deni_wiki_BetterBibTeX",
	"creator": "Simon Kornblith, Richard Karnesky and Emiliano heyns",
	"target": "bib",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportNotes": true,
		"exportFileData": false,
		"useJournalAbbreviation": false
	},
	"configOptions": {
		"getCollections": true,
		"citeKeyFormat": "[auth.auth.ea][year]"
	},
	"inRepository": false,
	"translatorType": 2,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-01-17 23:09:43"
}



var fieldMap = {
  address:"place",
  chapter:"section",
  edition:"edition",
  type:"type",
  series:"series",
  title:"title",
  volume:"volume",
  copyright:"rights",
  isbn:"ISBN",
  issn:"ISSN",
  lccn:"callNumber",
  shorttitle:"shortTitle",
  url:"url",
  doi:"DOI",
  abstract:"abstractNote",
  nationality: "country",
  language:"language",
  assignee:"assignee"
};

var zotero2tex = {
  book:             ['book', 'booklet', 'manual', 'proceedings'],
  bookSection:      ['incollection', 'inbook'],
  journalArticle:   [':article', ':misc'],
  magazineArticle:  'article',
  newspaperArticle: 'article',
  thesis:           ['phdthesis', 'mastersthesis'],
  manuscript:       'unpublished',
  patent:           'patent',
  conferencePaper:  ['inproceedings', 'conference'],
  report:           'techreport',
  letter:           'misc',
  interview:        'misc',
  film:             'misc',
  artwork:          'misc',
  webpage:          'misc'
};

// select = filter
Array.prototype.collect = function(transform)
{
  "use strict";
  var result = [];

  if (this === void 0 || this === null) throw new TypeError();

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof transform !== "function") throw new TypeError();
  var thisArg = void 0;

  for (var i = 0; i < len; i++) {
    if (i in t) result.push(transform.call(thisArg, t[i]));
  }

  return result;
}

function safeGetOption(option)
{
  try {
    return Zotero.getOption(option);
  } catch (err) {
    Zotero.debug('Error fetching option ' + option + ': ' + err);
    return;
  }
}

var config = {
  citeCommand:      safeGetOption('citeCommand'),
  citeKeyFormat:    "[auth.auth.ea][year]",
  exportCharset:    safeGetOption('exportCharset'),
  translator: {
    id: 'ca65189f-8815-4afe-8c8b-8c7c15f0edca',
    label:  'BetterBibTeX'
  }
};

function trLog(msg) { Zotero.debug('[better bibtex] ' + msg); }

trLog('config = ' + JSON.stringify(config));

function detectImport() {
  var maxChars = 1048576; // 1MB

  var inComment = false;
  var block = "";
  var buffer = "";
  var chr = "";
  var charsRead = 0;

  var re = /^\s*@[a-zA-Z]+[\(\{]/;
  while((buffer = Zotero.read(4096)) && charsRead < maxChars) {
    trLog("Scanning " + buffer.length + " characters for BibTeX");
    charsRead += buffer.length;
    for (var i=0; i<buffer.length; i++) {
      chr = buffer[i];

      if (inComment && chr != "\r" && chr != "\n") {
        continue;
      }
      inComment = false;

      if(chr == "%") {
        // read until next newline
        block = "";
        inComment = true;
      } else if((chr == "\n" || chr == "\r"
        // allow one-line entries
            || i == (buffer.length - 1))
            && block) {
        // check if this is a BibTeX entry
        if(re.test(block)) {
          return true;
        }

        block = "";
      } else if(" \n\r\t".indexOf(chr) == -1) {
        block += chr;
      }
    }
  }
}

var inputFieldMap = {
  booktitle :"publicationTitle",
  school:"publisher",
  institution:"publisher",
  publisher:"publisher",
  issue:"issue",
  location:"place"
};

if (!zotero2tex) { var zotero2tex = {}; }
var tex2zotero = {};
for (zotero in zotero2tex) {
  if (!(zotero2tex[zotero] instanceof Array)) { zotero2tex[zotero] = [zotero2tex[zotero]]; }

  zotero2tex[zotero] = zotero2tex[zotero].map(function(tex){
    if (!tex2zotero[tex] || tex.match(/^:/)) {
      tex2zotero[tex.replace(/^:/, '')] = zotero;
    }
    return tex.replace(/^:/, '');
  });

  zotero2tex[zotero] = zotero2tex[zotero][0];
}

/*
 * three-letter month abbreviations. i assume these are the same ones that the
 * docs say are defined in some appendix of the LaTeX book. (i don't have the
 * LaTeX book.)
 */
var months = ["jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"];

var jabref = {
  format: null,
  root: {}
};


    var convert = {
      unicode2latex: {
  "#": {
    "latex": "\\#",
    "force": true
  },

},
      unicode2latex_maxpattern: 3,

      latex2unicode: {
  "\\#": "#",
  "\\$": "$",
  "\\%": "%",
  "\\&": "&",
  "\\ast": "*",
  "\\textbackslash": "\\",
  "\\^{}": "^",
  "\\_": "_",
  "\\lbrace": "{",
  "\\vert": "|",
  "\\rbrace": "}",
  "\\textasciitilde": "~",
  " ": " ",
  "\\textexclamdown": "¡",
  "\\textcent": "¢",
  "\\textsterling": "£",
  "\\textcurrency": "¤",
  "\\textyen": "¥",
  "\\textbrokenbar": "¦",
  "\\textsection": "§",
  "\\textasciidieresis": "¨",
  "\\textcopyright": "©",
  "\\textordfeminine": "ª",
  "\\guillemotleft": "«",
  "\\lnot": "¬",
  "\\-": "­",
  "\\textregistered": "®",
  "\\textasciimacron": "¯",
  "\\textdegree": "°",
  "\\pm": "±",
  "{^2}": "²",
  "{^3}": "³",
  "\\textasciiacute": "´",
  "\\mathrm{\\mu}": "µ",
  "\\textparagraph": "¶",
  "\\cdot": "⋅",
  "\\c{}": "¸",
  "{^1}": "¹",
  "\\textordmasculine": "º",
  "\\guillemotright": "»",
  "\\textonequarter": "¼",
  "\\textonehalf": "½",
  "\\textthreequarters": "¾",
  "\\textquestiondown": "¿",
  "\\`{A}": "À",
  "\\'{A}": "Ά",
  "\\^{A}": "Â",
  "\\~{A}": "Ã",
  "\\\"{A}": "Ä",
  "\\AA": "Å",
  "\\AE": "Æ",
  "\\c{C}": "Ç",
  "\\`{E}": "È",
  "\\'{E}": "Έ",
  "\\^{E}": "Ê",
  "\\\"{E}": "Ë",
  "\\`{I}": "Ì",
  "\\'{I}": "Í",
  "\\^{I}": "Î",
  "\\\"{I}": "Ï",
  "\\DH": "Ð",
  "\\~{N}": "Ñ",
  "\\`{O}": "Ò",
  "\\'{O}": "Ó",
  "\\^{O}": "Ô",
  "\\~{O}": "Õ",
  "\\\"{O}": "Ö",
  "\\texttimes": "×",
  "\\O": "Ø",
  "\\`{U}": "Ù",
  "\\'{U}": "Ú",
  "\\^{U}": "Û",
  "\\\"{U}": "Ü",
  "\\'{Y}": "Ý",
  "\\TH": "Þ",
  "\\ss": "ß",
  "\\`{a}": "à",
  "\\'{a}": "á",
  "\\^{a}": "â",
  "\\~{a}": "ã",
  "\\\"{a}": "ä",
  "\\aa": "å",
  "\\ae": "æ",
  "\\c{c}": "ç",
  "\\`{e}": "è",
  "\\'{e}": "é",
  "\\^{e}": "ê",
  "\\\"{e}": "ë",
  "\\`{\\i}": "ì",
  "\\'{\\i}": "í",
  "\\^{\\i}": "î",
  "\\\"{\\i}": "ï",
  "\\dh": "ð",
  "\\~{n}": "ñ",
  "\\`{o}": "ò",
  "\\'{o}": "ό",
  "\\^{o}": "ô",
  "\\~{o}": "õ",
  "\\\"{o}": "ö",
  "\\div": "÷",
  "\\o": "ø",
  "\\`{u}": "ù",
  "\\'{u}": "ú",
  "\\^{u}": "û",
  "\\\"{u}": "ü",
  "\\'{y}": "ý",
  "\\th": "þ",
  "\\\"{y}": "ÿ",
  "\\={A}": "Ā",
  "\\={a}": "ā",
  "\\u{A}": "Ă",
  "\\u{a}": "ă",
  "\\k{A}": "Ą",
  "\\k{a}": "ą",
  "\\'{C}": "Ć",
  "\\'{c}": "ć",
  "\\^{C}": "Ĉ",
  "\\^{c}": "ĉ",
  "\\.{C}": "Ċ",
  "\\.{c}": "ċ",
  "\\v{C}": "Č",
  "\\v{c}": "č",
  "\\v{D}": "Ď",
  "\\v{d}": "ď",
  "\\DJ": "Đ",
  "\\dj": "đ",
  "\\={E}": "Ē",
  "\\={e}": "ē",
  "\\u{E}": "Ĕ",
  "\\u{e}": "ĕ",
  "\\.{E}": "Ė",
  "\\.{e}": "ė",
  "\\k{E}": "Ę",
  "\\k{e}": "ę",
  "\\v{E}": "Ě",
  "\\v{e}": "ě",
  "\\^{G}": "Ĝ",
  "\\^{g}": "ĝ",
  "\\u{G}": "Ğ",
  "\\u{g}": "ğ",
  "\\.{G}": "Ġ",
  "\\.{g}": "ġ",
  "\\c{G}": "Ģ",
  "\\c{g}": "ģ",
  "\\^{H}": "Ĥ",
  "\\^{h}": "ĥ",
  "{\\fontencoding{LELA}\\selectfont\\char40}": "Ħ",
  "\\Elzxh": "ħ",
  "\\~{I}": "Ĩ",
  "\\~{\\i}": "ĩ",
  "\\={I}": "Ī",
  "\\={\\i}": "ī",
  "\\u{I}": "Ĭ",
  "\\u{\\i}": "ĭ",
  "\\k{I}": "Į",
  "\\k{i}": "į",
  "\\.{I}": "İ",
  "\\i": "ı",
  "IJ": "Ĳ",
  "ij": "ĳ",
  "\\^{J}": "Ĵ",
  "\\^{\\j}": "ĵ",
  "\\c{K}": "Ķ",
  "\\c{k}": "ķ",
  "{\\fontencoding{LELA}\\selectfont\\char91}": "ĸ",
  "\\'{L}": "Ĺ",
  "\\'{l}": "ĺ",
  "\\c{L}": "Ļ",
  "\\c{l}": "ļ",
  "\\v{L}": "Ľ",
  "\\v{l}": "ľ",
  "{\\fontencoding{LELA}\\selectfont\\char201}": "Ŀ",
  "{\\fontencoding{LELA}\\selectfont\\char202}": "ŀ",
  "\\L": "Ł",
  "\\l": "ł",
  "\\'{N}": "Ń",
  "\\'{n}": "ń",
  "\\c{N}": "Ņ",
  "\\c{n}": "ņ",
  "\\v{N}": "Ň",
  "\\v{n}": "ň",
  "'n": "ŉ",
  "\\NG": "Ŋ",
  "\\ng": "ŋ",
  "\\={O}": "Ō",
  "\\={o}": "ō",
  "\\u{O}": "Ŏ",
  "\\u{o}": "ŏ",
  "\\H{O}": "Ő",
  "\\H{o}": "ő",
  "\\OE": "Œ",
  "\\oe": "œ",
  "\\'{R}": "Ŕ",
  "\\'{r}": "ŕ",
  "\\c{R}": "Ŗ",
  "\\c{r}": "ŗ",
  "\\v{R}": "Ř",
  "\\v{r}": "ř",
  "\\'{S}": "Ś",
  "\\'{s}": "ś",
  "\\^{S}": "Ŝ",
  "\\^{s}": "ŝ",
  "\\c{S}": "Ş",
  "\\c{s}": "ş",
  "\\v{S}": "Š",
  "\\v{s}": "š",
  "\\c{T}": "Ţ",
  "\\c{t}": "ţ",
  "\\v{T}": "Ť",
  "\\v{t}": "ť",
  "{\\fontencoding{LELA}\\selectfont\\char47}": "Ŧ",
  "{\\fontencoding{LELA}\\selectfont\\char63}": "ŧ",
  "\\~{U}": "Ũ",
  "\\~{u}": "ũ",
  "\\={U}": "Ū",
  "\\={u}": "ū",
  "\\u{U}": "Ŭ",
  "\\u{u}": "ŭ",
  "\\r{U}": "Ů",
  "\\r{u}": "ů",
  "\\H{U}": "Ű",
  "\\H{u}": "ű",
  "\\k{U}": "Ų",
  "\\k{u}": "ų",
  "\\^{W}": "Ŵ",
  "\\^{w}": "ŵ",
  "\\^{Y}": "Ŷ",
  "\\^{y}": "ŷ",
  "\\\"{Y}": "Ÿ",
  "\\'{Z}": "Ź",
  "\\'{z}": "ź",
  "\\.{Z}": "Ż",
  "\\.{z}": "ż",
  "\\v{Z}": "Ž",
  "\\v{z}": "ž",
  "f": "ƒ",
  "\\texthvlig": "ƕ",
  "\\textnrleg": "ƞ",
  "\\eth": "ƪ",
  "{\\fontencoding{LELA}\\selectfont\\char195}": "ƺ",
  "\\textdoublepipe": "ǂ",
  "\\'{g}": "ǵ",
  "\\Elztrna": "ɐ",
  "\\Elztrnsa": "ɒ",
  "\\Elzopeno": "ɔ",
  "\\Elzrtld": "ɖ",
  "{\\fontencoding{LEIP}\\selectfont\\char61}": "ɘ",
  "\\Elzschwa": "ə",
  "\\varepsilon": "ɛ",
  "g": "ɡ",
  "\\Elzpgamma": "ɣ",
  "\\Elzpbgam": "ɤ",
  "\\Elztrnh": "ɥ",
  "\\Elzbtdl": "ɬ",
  "\\Elzrtll": "ɭ",
  "\\Elztrnm": "ɯ",
  "\\Elztrnmlr": "ɰ",
  "\\Elzltlmr": "ɱ",
  "\\Elzltln": "ɲ",
  "\\Elzrtln": "ɳ",
  "\\Elzclomeg": "ɷ",
  "\\textphi": "ɸ",
  "\\Elztrnr": "ɹ",
  "\\Elztrnrl": "ɺ",
  "\\Elzrttrnr": "ɻ",
  "\\Elzrl": "ɼ",
  "\\Elzrtlr": "ɽ",
  "\\Elzfhr": "ɾ",
  "{\\fontencoding{LEIP}\\selectfont\\char202}": "ɿ",
  "\\Elzrtls": "ʂ",
  "\\Elzesh": "ʃ",
  "\\Elztrnt": "ʇ",
  "\\Elzrtlt": "ʈ",
  "\\Elzpupsil": "ʊ",
  "\\Elzpscrv": "ʋ",
  "\\Elzinvv": "ʌ",
  "\\Elzinvw": "ʍ",
  "\\Elztrny": "ʎ",
  "\\Elzrtlz": "ʐ",
  "\\Elzyogh": "ʒ",
  "\\Elzglst": "ʔ",
  "\\Elzreglst": "ʕ",
  "\\Elzinglst": "ʖ",
  "\\textturnk": "ʞ",
  "\\Elzdyogh": "ʤ",
  "\\Elztesh": "ʧ",
  "'": "’",
  "\\textasciicaron": "ˇ",
  "\\Elzverts": "ˈ",
  "\\Elzverti": "ˌ",
  "\\Elzlmrk": "ː",
  "\\Elzhlmrk": "ˑ",
  "\\Elzsbrhr": "˒",
  "\\Elzsblhr": "˓",
  "\\Elzrais": "˔",
  "\\Elzlow": "˕",
  "\\textasciibreve": "˘",
  "\\textperiodcentered": "˙",
  "\\r{}": "˚",
  "\\k{}": "˛",
  "\\texttildelow": "˜",
  "\\H{}": "˝",
  "\\tone{55}": "˥",
  "\\tone{44}": "˦",
  "\\tone{33}": "˧",
  "\\tone{22}": "˨",
  "\\tone{11}": "˩",
  "\\`": "̀",
  "\\'": "́",
  "\\^": "̂",
  "\\~": "̃",
  "\\=": "̄",
  "\\u": "̆",
  "\\.": "̇",
  "\\\"": "̈",
  "\\r": "̊",
  "\\H": "̋",
  "\\v": "̌",
  "\\cyrchar\\C": "̏",
  "{\\fontencoding{LECO}\\selectfont\\char177}": "̑",
  "{\\fontencoding{LECO}\\selectfont\\char184}": "̘",
  "{\\fontencoding{LECO}\\selectfont\\char185}": "̙",
  "\\Elzpalh": "̡",
  "\\Elzrh": "̢",
  "\\c": "̧",
  "\\k": "̨",
  "\\Elzsbbrg": "̪",
  "{\\fontencoding{LECO}\\selectfont\\char203}": "̫",
  "{\\fontencoding{LECO}\\selectfont\\char207}": "̯",
  "\\Elzxl": "̵",
  "\\Elzbar": "̶",
  "{\\fontencoding{LECO}\\selectfont\\char215}": "̷",
  "{\\fontencoding{LECO}\\selectfont\\char216}": "̸",
  "{\\fontencoding{LECO}\\selectfont\\char218}": "̺",
  "{\\fontencoding{LECO}\\selectfont\\char219}": "̻",
  "{\\fontencoding{LECO}\\selectfont\\char220}": "̼",
  "{\\fontencoding{LECO}\\selectfont\\char221}": "̽",
  "{\\fontencoding{LECO}\\selectfont\\char225}": "͡",
  "\\'{H}": "Ή",
  "\\'{}{I}": "Ί",
  "\\'{}O": "Ό",
  "\\mathrm{'Y}": "Ύ",
  "\\mathrm{'\\Omega}": "Ώ",
  "\\acute{\\ddot{\\iota}}": "ΐ",
  "\\Alpha": "Α",
  "\\Beta": "Β",
  "\\Gamma": "Γ",
  "\\Delta": "Δ",
  "\\Epsilon": "Ε",
  "\\Zeta": "Ζ",
  "\\Eta": "Η",
  "\\Theta": "Θ",
  "\\Iota": "Ι",
  "\\Kappa": "Κ",
  "\\Lambda": "Λ",
  "M": "𝞵",
  "N": "𝞶",
  "\\Xi": "Ξ",
  "O": "𝞸",
  "\\Pi": "Π",
  "\\Rho": "Ρ",
  "\\Sigma": "Σ",
  "\\Tau": "Τ",
  "\\Upsilon": "ϒ",
  "\\Phi": "Φ",
  "\\Chi": "Χ",
  "\\Psi": "Ψ",
  "\\Omega": "Ω",
  "\\mathrm{\\ddot{I}}": "Ϊ",
  "\\mathrm{\\ddot{Y}}": "Ϋ",
  "\\'{$\\alpha$}": "ά",
  "\\acute{\\epsilon}": "έ",
  "\\acute{\\eta}": "ή",
  "\\acute{\\iota}": "ί",
  "\\acute{\\ddot{\\upsilon}}": "ΰ",
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\zeta": "ζ",
  "\\eta": "η",
  "\\texttheta": "θ",
  "\\iota": "ι",
  "\\kappa": "κ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\nu": "ν",
  "\\xi": "ξ",
  "o": "ο",
  "\\pi": "π",
  "\\rho": "ρ",
  "\\varsigma": "ς",
  "\\sigma": "σ",
  "\\tau": "τ",
  "\\upsilon": "υ",
  "\\varphi": "φ",
  "\\chi": "χ",
  "\\psi": "ψ",
  "\\omega": "ω",
  "\\ddot{\\iota}": "ϊ",
  "\\ddot{\\upsilon}": "ϋ",
  "\\acute{\\upsilon}": "ύ",
  "\\acute{\\omega}": "ώ",
  "\\Pisymbol{ppi022}{87}": "ϐ",
  "\\textvartheta": "ϑ",
  "\\phi": "ϕ",
  "\\varpi": "ϖ",
  "\\Stigma": "Ϛ",
  "\\Digamma": "Ϝ",
  "\\digamma": "ϝ",
  "\\Koppa": "Ϟ",
  "\\Sampi": "Ϡ",
  "\\varkappa": "ϰ",
  "\\varrho": "ϱ",
  "\\textTheta": "ϴ",
  "\\backepsilon": "϶",
  "\\cyrchar\\CYRYO": "Ё",
  "\\cyrchar\\CYRDJE": "Ђ",
  "\\cyrchar{\\'\\CYRG}": "Ѓ",
  "\\cyrchar\\CYRIE": "Є",
  "\\cyrchar\\CYRDZE": "Ѕ",
  "\\cyrchar\\CYRII": "І",
  "\\cyrchar\\CYRYI": "Ї",
  "\\cyrchar\\CYRJE": "Ј",
  "\\cyrchar\\CYRLJE": "Љ",
  "\\cyrchar\\CYRNJE": "Њ",
  "\\cyrchar\\CYRTSHE": "Ћ",
  "\\cyrchar{\\'\\CYRK}": "Ќ",
  "\\cyrchar\\CYRUSHRT": "Ў",
  "\\cyrchar\\CYRDZHE": "Џ",
  "\\cyrchar\\CYRA": "А",
  "\\cyrchar\\CYRB": "Б",
  "\\cyrchar\\CYRV": "В",
  "\\cyrchar\\CYRG": "Г",
  "\\cyrchar\\CYRD": "Д",
  "\\cyrchar\\CYRE": "Е",
  "\\cyrchar\\CYRZH": "Ж",
  "\\cyrchar\\CYRZ": "З",
  "\\cyrchar\\CYRI": "И",
  "\\cyrchar\\CYRISHRT": "Й",
  "\\cyrchar\\CYRK": "К",
  "\\cyrchar\\CYRL": "Л",
  "\\cyrchar\\CYRM": "М",
  "\\cyrchar\\CYRN": "Н",
  "\\cyrchar\\CYRO": "О",
  "\\cyrchar\\CYRP": "П",
  "\\cyrchar\\CYRR": "Р",
  "\\cyrchar\\CYRS": "С",
  "\\cyrchar\\CYRT": "Т",
  "\\cyrchar\\CYRU": "У",
  "\\cyrchar\\CYRF": "Ф",
  "\\cyrchar\\CYRH": "Х",
  "\\cyrchar\\CYRC": "Ц",
  "\\cyrchar\\CYRCH": "Ч",
  "\\cyrchar\\CYRSH": "Ш",
  "\\cyrchar\\CYRSHCH": "Щ",
  "\\cyrchar\\CYRHRDSN": "Ъ",
  "\\cyrchar\\CYRERY": "Ы",
  "\\cyrchar\\CYRSFTSN": "Ь",
  "\\cyrchar\\CYREREV": "Э",
  "\\cyrchar\\CYRYU": "Ю",
  "\\cyrchar\\CYRYA": "Я",
  "\\cyrchar\\cyra": "а",
  "\\cyrchar\\cyrb": "б",
  "\\cyrchar\\cyrv": "в",
  "\\cyrchar\\cyrg": "г",
  "\\cyrchar\\cyrd": "д",
  "\\cyrchar\\cyre": "е",
  "\\cyrchar\\cyrzh": "ж",
  "\\cyrchar\\cyrz": "з",
  "\\cyrchar\\cyri": "и",
  "\\cyrchar\\cyrishrt": "й",
  "\\cyrchar\\cyrk": "к",
  "\\cyrchar\\cyrl": "л",
  "\\cyrchar\\cyrm": "м",
  "\\cyrchar\\cyrn": "н",
  "\\cyrchar\\cyro": "о",
  "\\cyrchar\\cyrp": "п",
  "\\cyrchar\\cyrr": "р",
  "\\cyrchar\\cyrs": "с",
  "\\cyrchar\\cyrt": "т",
  "\\cyrchar\\cyru": "у",
  "\\cyrchar\\cyrf": "ф",
  "\\cyrchar\\cyrh": "х",
  "\\cyrchar\\cyrc": "ц",
  "\\cyrchar\\cyrch": "ч",
  "\\cyrchar\\cyrsh": "ш",
  "\\cyrchar\\cyrshch": "щ",
  "\\cyrchar\\cyrhrdsn": "ъ",
  "\\cyrchar\\cyrery": "ы",
  "\\cyrchar\\cyrsftsn": "ь",
  "\\cyrchar\\cyrerev": "э",
  "\\cyrchar\\cyryu": "ю",
  "\\cyrchar\\cyrya": "я",
  "\\cyrchar\\cyryo": "ё",
  "\\cyrchar\\cyrdje": "ђ",
  "\\cyrchar{\\'\\cyrg}": "ѓ",
  "\\cyrchar\\cyrie": "є",
  "\\cyrchar\\cyrdze": "ѕ",
  "\\cyrchar\\cyrii": "і",
  "\\cyrchar\\cyryi": "ї",
  "\\cyrchar\\cyrje": "ј",
  "\\cyrchar\\cyrlje": "љ",
  "\\cyrchar\\cyrnje": "њ",
  "\\cyrchar\\cyrtshe": "ћ",
  "\\cyrchar{\\'\\cyrk}": "ќ",
  "\\cyrchar\\cyrushrt": "ў",
  "\\cyrchar\\cyrdzhe": "џ",
  "\\cyrchar\\CYROMEGA": "Ѡ",
  "\\cyrchar\\cyromega": "ѡ",
  "\\cyrchar\\CYRYAT": "Ѣ",
  "\\cyrchar\\CYRIOTE": "Ѥ",
  "\\cyrchar\\cyriote": "ѥ",
  "\\cyrchar\\CYRLYUS": "Ѧ",
  "\\cyrchar\\cyrlyus": "ѧ",
  "\\cyrchar\\CYRIOTLYUS": "Ѩ",
  "\\cyrchar\\cyriotlyus": "ѩ",
  "\\cyrchar\\CYRBYUS": "Ѫ",
  "\\cyrchar\\CYRIOTBYUS": "Ѭ",
  "\\cyrchar\\cyriotbyus": "ѭ",
  "\\cyrchar\\CYRKSI": "Ѯ",
  "\\cyrchar\\cyrksi": "ѯ",
  "\\cyrchar\\CYRPSI": "Ѱ",
  "\\cyrchar\\cyrpsi": "ѱ",
  "\\cyrchar\\CYRFITA": "Ѳ",
  "\\cyrchar\\CYRIZH": "Ѵ",
  "\\cyrchar\\CYRUK": "Ѹ",
  "\\cyrchar\\cyruk": "ѹ",
  "\\cyrchar\\CYROMEGARND": "Ѻ",
  "\\cyrchar\\cyromegarnd": "ѻ",
  "\\cyrchar\\CYROMEGATITLO": "Ѽ",
  "\\cyrchar\\cyromegatitlo": "ѽ",
  "\\cyrchar\\CYROT": "Ѿ",
  "\\cyrchar\\cyrot": "ѿ",
  "\\cyrchar\\CYRKOPPA": "Ҁ",
  "\\cyrchar\\cyrkoppa": "ҁ",
  "\\cyrchar\\cyrthousands": "҂",
  "\\cyrchar\\cyrhundredthousands": "҈",
  "\\cyrchar\\cyrmillions": "҉",
  "\\cyrchar\\CYRSEMISFTSN": "Ҍ",
  "\\cyrchar\\cyrsemisftsn": "ҍ",
  "\\cyrchar\\CYRRTICK": "Ҏ",
  "\\cyrchar\\cyrrtick": "ҏ",
  "\\cyrchar\\CYRGUP": "Ґ",
  "\\cyrchar\\cyrgup": "ґ",
  "\\cyrchar\\CYRGHCRS": "Ғ",
  "\\cyrchar\\cyrghcrs": "ғ",
  "\\cyrchar\\CYRGHK": "Ҕ",
  "\\cyrchar\\cyrghk": "ҕ",
  "\\cyrchar\\CYRZHDSC": "Җ",
  "\\cyrchar\\cyrzhdsc": "җ",
  "\\cyrchar\\CYRZDSC": "Ҙ",
  "\\cyrchar\\cyrzdsc": "ҙ",
  "\\cyrchar\\CYRKDSC": "Қ",
  "\\cyrchar\\cyrkdsc": "қ",
  "\\cyrchar\\CYRKVCRS": "Ҝ",
  "\\cyrchar\\cyrkvcrs": "ҝ",
  "\\cyrchar\\CYRKHCRS": "Ҟ",
  "\\cyrchar\\cyrkhcrs": "ҟ",
  "\\cyrchar\\CYRKBEAK": "Ҡ",
  "\\cyrchar\\cyrkbeak": "ҡ",
  "\\cyrchar\\CYRNDSC": "Ң",
  "\\cyrchar\\cyrndsc": "ң",
  "\\cyrchar\\CYRNG": "Ҥ",
  "\\cyrchar\\cyrng": "ҥ",
  "\\cyrchar\\CYRPHK": "Ҧ",
  "\\cyrchar\\cyrphk": "ҧ",
  "\\cyrchar\\CYRABHHA": "Ҩ",
  "\\cyrchar\\cyrabhha": "ҩ",
  "\\cyrchar\\CYRSDSC": "Ҫ",
  "\\cyrchar\\cyrsdsc": "ҫ",
  "\\cyrchar\\CYRTDSC": "Ҭ",
  "\\cyrchar\\cyrtdsc": "ҭ",
  "\\cyrchar\\CYRY": "Ү",
  "\\cyrchar\\cyry": "ү",
  "\\cyrchar\\CYRYHCRS": "Ұ",
  "\\cyrchar\\cyryhcrs": "ұ",
  "\\cyrchar\\CYRHDSC": "Ҳ",
  "\\cyrchar\\cyrhdsc": "ҳ",
  "\\cyrchar\\CYRTETSE": "Ҵ",
  "\\cyrchar\\cyrtetse": "ҵ",
  "\\cyrchar\\CYRCHRDSC": "Ҷ",
  "\\cyrchar\\cyrchrdsc": "ҷ",
  "\\cyrchar\\CYRCHVCRS": "Ҹ",
  "\\cyrchar\\cyrchvcrs": "ҹ",
  "\\cyrchar\\CYRSHHA": "Һ",
  "\\cyrchar\\cyrshha": "һ",
  "\\cyrchar\\CYRABHCH": "Ҽ",
  "\\cyrchar\\cyrabhch": "ҽ",
  "\\cyrchar\\CYRABHCHDSC": "Ҿ",
  "\\cyrchar\\cyrabhchdsc": "ҿ",
  "\\cyrchar\\CYRpalochka": "Ӏ",
  "\\cyrchar\\CYRKHK": "Ӄ",
  "\\cyrchar\\cyrkhk": "ӄ",
  "\\cyrchar\\CYRNHK": "Ӈ",
  "\\cyrchar\\cyrnhk": "ӈ",
  "\\cyrchar\\CYRCHLDSC": "Ӌ",
  "\\cyrchar\\cyrchldsc": "ӌ",
  "\\cyrchar\\CYRAE": "Ӕ",
  "\\cyrchar\\cyrae": "ӕ",
  "\\cyrchar\\CYRSCHWA": "Ә",
  "\\cyrchar\\cyrschwa": "ә",
  "\\cyrchar\\CYRABHDZE": "Ӡ",
  "\\cyrchar\\cyrabhdze": "ӡ",
  "\\cyrchar\\CYROTLD": "Ө",
  "\\cyrchar\\cyrotld": "ө",
  "\\hspace{0.6em}": " ",
  "\\hspace{1em}": " ",
  "\\hspace{0.33em}": " ",
  "\\hspace{0.25em}": " ",
  "\\hspace{0.166em}": " ",
  "\\hphantom{0}": " ",
  "\\hphantom{,}": " ",
  "\\hspace{0.167em}": " ",
  "\\;": "   ",
  "\\mkern1mu": " ",
  "-": "−",
  "\\textendash": "–",
  "\\textemdash": "—",
  "\\rule{1em}{1pt}": "―",
  "\\Vert": "‖",
  "`": "‘",
  ",": "‚",
  "\\Elzreapos": "‛",
  "``": "“",
  "''": "”",
  ",,": "„",
  "\\textdagger": "†",
  "\\textdaggerdbl": "‡",
  "\\textbullet": "•",
  ".": "․",
  "..": "‥",
  "\\ldots": "…",
  "\\textperthousand": "‰",
  "\\textpertenthousand": "‱",
  "{'}": "′",
  "{''}": "″",
  "{'''}": "‴",
  "\\backprime": "‵",
  "\\guilsinglleft": "‹",
  "\\guilsinglright": "›",
  "''''": "⁗",
  "\\mkern4mu": " ",
  "\\nolinebreak": "⁠",
  "\\ensuremath{\\Elzpes}": "₧",
  "\\mbox{\\texteuro}": "€",
  "\\dddot": "⃛",
  "\\ddddot": "⃜",
  "\\mathbb{C}": "ℂ",
  "\\mathscr{g}": "ℊ",
  "\\mathscr{H}": "ℋ",
  "\\mathfrak{H}": "ℌ",
  "\\mathbb{H}": "ℍ",
  "\\hslash": "ℏ",
  "\\mathscr{I}": "ℐ",
  "\\mathfrak{I}": "ℑ",
  "\\mathscr{L}": "ℒ",
  "\\mathscr{l}": "𝓁",
  "\\mathbb{N}": "ℕ",
  "\\cyrchar\\textnumero": "№",
  "\\wp": "℘",
  "\\mathbb{P}": "ℙ",
  "\\mathbb{Q}": "ℚ",
  "\\mathscr{R}": "ℛ",
  "\\mathfrak{R}": "ℜ",
  "\\mathbb{R}": "ℝ",
  "\\Elzxrat": "℞",
  "\\texttrademark": "™",
  "\\mathbb{Z}": "ℤ",
  "\\mho": "℧",
  "\\mathfrak{Z}": "ℨ",
  "\\ElsevierGlyph{2129}": "℩",
  "\\mathscr{B}": "ℬ",
  "\\mathfrak{C}": "ℭ",
  "\\mathscr{e}": "ℯ",
  "\\mathscr{E}": "ℰ",
  "\\mathscr{F}": "ℱ",
  "\\mathscr{M}": "ℳ",
  "\\mathscr{o}": "ℴ",
  "\\aleph": "ℵ",
  "\\beth": "ℶ",
  "\\gimel": "ℷ",
  "\\daleth": "ℸ",
  "\\textfrac{1}{3}": "⅓",
  "\\textfrac{2}{3}": "⅔",
  "\\textfrac{1}{5}": "⅕",
  "\\textfrac{2}{5}": "⅖",
  "\\textfrac{3}{5}": "⅗",
  "\\textfrac{4}{5}": "⅘",
  "\\textfrac{1}{6}": "⅙",
  "\\textfrac{5}{6}": "⅚",
  "\\textfrac{1}{8}": "⅛",
  "\\textfrac{3}{8}": "⅜",
  "\\textfrac{5}{8}": "⅝",
  "\\textfrac{7}{8}": "⅞",
  "\\leftarrow": "←",
  "\\uparrow": "↑",
  "\\rightarrow": "→",
  "\\downarrow": "↓",
  "\\leftrightarrow": "↔",
  "\\updownarrow": "↕",
  "\\nwarrow": "↖",
  "\\nearrow": "↗",
  "\\searrow": "↘",
  "\\swarrow": "↙",
  "\\nleftarrow": "↚",
  "\\nrightarrow": "↛",
  "\\arrowwaveright": "↝",
  "\\twoheadleftarrow": "↞",
  "\\twoheadrightarrow": "↠",
  "\\leftarrowtail": "↢",
  "\\rightarrowtail": "↣",
  "\\mapsto": "↦",
  "\\hookleftarrow": "↩",
  "\\hookrightarrow": "↪",
  "\\looparrowleft": "↫",
  "\\looparrowright": "↬",
  "\\leftrightsquigarrow": "↭",
  "\\nleftrightarrow": "↮",
  "\\Lsh": "↰",
  "\\Rsh": "↱",
  "\\ElsevierGlyph{21B3}": "↳",
  "\\curvearrowleft": "↶",
  "\\curvearrowright": "↷",
  "\\circlearrowleft": "↺",
  "\\circlearrowright": "↻",
  "\\leftharpoonup": "↼",
  "\\leftharpoondown": "↽",
  "\\upharpoonright": "↾",
  "\\upharpoonleft": "↿",
  "\\rightharpoonup": "⇀",
  "\\rightharpoondown": "⇁",
  "\\downharpoonright": "⇂",
  "\\downharpoonleft": "⇃",
  "\\rightleftarrows": "⇄",
  "\\dblarrowupdown": "⇅",
  "\\leftrightarrows": "⇆",
  "\\leftleftarrows": "⇇",
  "\\upuparrows": "⇈",
  "\\rightrightarrows": "⇉",
  "\\downdownarrows": "⇊",
  "\\leftrightharpoons": "⇋",
  "\\rightleftharpoons": "⇌",
  "\\nLeftarrow": "⇍",
  "\\nLeftrightarrow": "⇎",
  "\\nRightarrow": "⇏",
  "\\Leftarrow": "⇐",
  "\\Uparrow": "⇑",
  "\\Rightarrow": "⇒",
  "\\Downarrow": "⇓",
  "\\Leftrightarrow": "⇔",
  "\\Updownarrow": "⇕",
  "\\Lleftarrow": "⇚",
  "\\Rrightarrow": "⇛",
  "\\rightsquigarrow": "⇝",
  "\\DownArrowUpArrow": "⇵",
  "\\forall": "∀",
  "\\complement": "∁",
  "\\partial": "𝟃",
  "\\exists": "∃",
  "\\nexists": "∄",
  "\\varnothing": "∅",
  "\\nabla": "∇",
  "\\in": "𝟄",
  "\\not\\in": "∉",
  "\\ni": "∋",
  "\\not\\ni": "∌",
  "\\prod": "∏",
  "\\coprod": "∐",
  "\\sum": "∑",
  "\\mp": "∓",
  "\\dotplus": "∔",
  "\\setminus": "∖",
  "{_\\ast}": "∗",
  "\\circ": "∘",
  "\\bullet": "∙",
  "\\surd": "√",
  "\\propto": "∝",
  "\\infty": "∞",
  "\\rightangle": "∟",
  "\\angle": "∠",
  "\\measuredangle": "∡",
  "\\sphericalangle": "∢",
  "\\mid": "∣",
  "\\nmid": "∤",
  "\\parallel": "∥",
  "\\nparallel": "∦",
  "\\wedge": "∧",
  "\\vee": "∨",
  "\\cap": "∩",
  "\\cup": "∪",
  "\\int": "∫",
  "\\int\\!\\int": "∬",
  "\\int\\!\\int\\!\\int": "∭",
  "\\oint": "∮",
  "\\surfintegral": "∯",
  "\\volintegral": "∰",
  "\\clwintegral": "∱",
  "\\ElsevierGlyph{2232}": "∲",
  "\\ElsevierGlyph{2233}": "∳",
  "\\therefore": "∴",
  "\\because": "∵",
  "\\Colon": "∷",
  "\\ElsevierGlyph{2238}": "∸",
  "\\mathbin{{:}\\!\\!{-}\\!\\!{:}}": "∺",
  "\\homothetic": "∻",
  "\\sim": "∼",
  "\\backsim": "∽",
  "\\lazysinv": "∾",
  "\\wr": "≀",
  "\\not\\sim": "≁",
  "\\ElsevierGlyph{2242}": "≂",
  "\\NotEqualTilde": "≂̸",
  "\\simeq": "≃",
  "\\not\\simeq": "≄",
  "\\cong": "≅",
  "\\approxnotequal": "≆",
  "\\not\\cong": "≇",
  "\\approx": "≈",
  "\\not\\approx": "≉",
  "\\approxeq": "≊",
  "\\tildetrpl": "≋",
  "\\not\\apid": "≋̸",
  "\\allequal": "≌",
  "\\asymp": "≍",
  "\\Bumpeq": "≎",
  "\\NotHumpDownHump": "≎̸",
  "\\bumpeq": "≏",
  "\\NotHumpEqual": "≏̸",
  "\\doteq": "≐",
  "\\not\\doteq": "≐̸",
  "\\doteqdot": "≑",
  "\\fallingdotseq": "≒",
  "\\risingdotseq": "≓",
  ":=": "≔",
  "=:": "≕",
  "\\eqcirc": "≖",
  "\\circeq": "≗",
  "\\estimates": "≙",
  "\\ElsevierGlyph{225A}": "⩣",
  "\\starequal": "≛",
  "\\triangleq": "≜",
  "\\ElsevierGlyph{225F}": "≟",
  "\\not =": "≠",
  "\\equiv": "≡",
  "\\not\\equiv": "≢",
  "\\leq": "≤",
  "\\geq": "≥",
  "\\leqq": "≦",
  "\\geqq": "≧",
  "\\lneqq": "≨",
  "\\lvertneqq": "≨︀",
  "\\gneqq": "≩",
  "\\gvertneqq": "≩︀",
  "\\ll": "≪",
  "\\NotLessLess": "≪̸",
  "\\gg": "≫",
  "\\NotGreaterGreater": "≫̸",
  "\\between": "≬",
  "\\not\\kern-0.3em\\times": "≭",
  "\\not<": "≮",
  "\\not>": "≯",
  "\\not\\leq": "≰",
  "\\not\\geq": "≱",
  "\\lessequivlnt": "≲",
  "\\greaterequivlnt": "≳",
  "\\ElsevierGlyph{2274}": "≴",
  "\\ElsevierGlyph{2275}": "≵",
  "\\lessgtr": "≶",
  "\\gtrless": "≷",
  "\\notlessgreater": "≸",
  "\\notgreaterless": "≹",
  "\\prec": "≺",
  "\\succ": "≻",
  "\\preccurlyeq": "≼",
  "\\succcurlyeq": "≽",
  "\\precapprox": "⪷",
  "\\NotPrecedesTilde": "≾̸",
  "\\succapprox": "⪸",
  "\\NotSucceedsTilde": "≿̸",
  "\\not\\prec": "⊀",
  "\\not\\succ": "⊁",
  "\\subset": "⊂",
  "\\supset": "⊃",
  "\\not\\subset": "⊄",
  "\\not\\supset": "⊅",
  "\\subseteq": "⊆",
  "\\supseteq": "⊇",
  "\\not\\subseteq": "⊈",
  "\\not\\supseteq": "⊉",
  "\\subsetneq": "⊊",
  "\\varsubsetneqq": "⊊︀",
  "\\supsetneq": "⊋",
  "\\varsupsetneq": "⊋︀",
  "\\uplus": "⊎",
  "\\sqsubset": "⊏",
  "\\NotSquareSubset": "⊏̸",
  "\\sqsupset": "⊐",
  "\\NotSquareSuperset": "⊐̸",
  "\\sqsubseteq": "⊑",
  "\\sqsupseteq": "⊒",
  "\\sqcap": "⊓",
  "\\sqcup": "⊔",
  "\\oplus": "⊕",
  "\\ominus": "⊖",
  "\\otimes": "⊗",
  "\\oslash": "⊘",
  "\\odot": "⊙",
  "\\circledcirc": "⊚",
  "\\circledast": "⊛",
  "\\circleddash": "⊝",
  "\\boxplus": "⊞",
  "\\boxminus": "⊟",
  "\\boxtimes": "⊠",
  "\\boxdot": "⊡",
  "\\vdash": "⊢",
  "\\dashv": "⊣",
  "\\top": "⊤",
  "\\perp": "⊥",
  "\\truestate": "⊧",
  "\\forcesextra": "⊨",
  "\\Vdash": "⊩",
  "\\Vvdash": "⊪",
  "\\VDash": "⊫",
  "\\nvdash": "⊬",
  "\\nvDash": "⊭",
  "\\nVdash": "⊮",
  "\\nVDash": "⊯",
  "\\vartriangleleft": "⊲",
  "\\vartriangleright": "⊳",
  "\\trianglelefteq": "⊴",
  "\\trianglerighteq": "⊵",
  "\\original": "⊶",
  "\\image": "⊷",
  "\\multimap": "⊸",
  "\\hermitconjmatrix": "⊹",
  "\\intercal": "⊺",
  "\\veebar": "⊻",
  "\\rightanglearc": "⊾",
  "\\ElsevierGlyph{22C0}": "⋀",
  "\\ElsevierGlyph{22C1}": "⋁",
  "\\bigcap": "⋂",
  "\\bigcup": "⋃",
  "\\diamond": "♢",
  "\\star": "⋆",
  "\\divideontimes": "⋇",
  "\\bowtie": "⋈",
  "\\ltimes": "⋉",
  "\\rtimes": "⋊",
  "\\leftthreetimes": "⋋",
  "\\rightthreetimes": "⋌",
  "\\backsimeq": "⋍",
  "\\curlyvee": "⋎",
  "\\curlywedge": "⋏",
  "\\Subset": "⋐",
  "\\Supset": "⋑",
  "\\Cap": "⋒",
  "\\Cup": "⋓",
  "\\pitchfork": "⋔",
  "\\lessdot": "⋖",
  "\\gtrdot": "⋗",
  "\\verymuchless": "⋘",
  "\\verymuchgreater": "⋙",
  "\\lesseqgtr": "⋚",
  "\\gtreqless": "⋛",
  "\\curlyeqprec": "⋞",
  "\\curlyeqsucc": "⋟",
  "\\not\\sqsubseteq": "⋢",
  "\\not\\sqsupseteq": "⋣",
  "\\Elzsqspne": "⋥",
  "\\lnsim": "⋦",
  "\\gnsim": "⋧",
  "\\precedesnotsimilar": "⋨",
  "\\succnsim": "⋩",
  "\\ntriangleleft": "⋪",
  "\\ntriangleright": "⋫",
  "\\ntrianglelefteq": "⋬",
  "\\ntrianglerighteq": "⋭",
  "\\vdots": "⋮",
  "\\cdots": "⋯",
  "\\upslopeellipsis": "⋰",
  "\\downslopeellipsis": "⋱",
  "\\barwedge": "⌅",
  "\\perspcorrespond": "⩞",
  "\\lceil": "⌈",
  "\\rceil": "⌉",
  "\\lfloor": "⌊",
  "\\rfloor": "⌋",
  "\\recorder": "⌕",
  "\\mathchar\"2208": "⌖",
  "\\ulcorner": "⌜",
  "\\urcorner": "⌝",
  "\\llcorner": "⌞",
  "\\lrcorner": "⌟",
  "\\frown": "⌢",
  "\\smile": "⌣",
  "\\langle": "〈",
  "\\rangle": "〉",
  "\\ElsevierGlyph{E838}": "⌽",
  "\\Elzdlcorn": "⎣",
  "\\lmoustache": "⎰",
  "\\rmoustache": "⎱",
  "\\textvisiblespace": "␣",
  "\\ding{172}": "①",
  "\\ding{173}": "②",
  "\\ding{174}": "③",
  "\\ding{175}": "④",
  "\\ding{176}": "⑤",
  "\\ding{177}": "⑥",
  "\\ding{178}": "⑦",
  "\\ding{179}": "⑧",
  "\\ding{180}": "⑨",
  "\\ding{181}": "⑩",
  "\\circledS": "Ⓢ",
  "\\Elzdshfnc": "┆",
  "\\Elzsqfnw": "┙",
  "\\diagup": "╱",
  "\\ding{110}": "■",
  "\\square": "□",
  "\\blacksquare": "▪",
  "\\fbox{~~}": "▭",
  "\\Elzvrecto": "▯",
  "\\ElsevierGlyph{E381}": "▱",
  "\\ding{115}": "▲",
  "\\bigtriangleup": "△",
  "\\blacktriangle": "▴",
  "\\vartriangle": "▵",
  "\\blacktriangleright": "▸",
  "\\triangleright": "▹",
  "\\ding{116}": "▼",
  "\\bigtriangledown": "▽",
  "\\blacktriangledown": "▾",
  "\\triangledown": "▿",
  "\\blacktriangleleft": "◂",
  "\\triangleleft": "◃",
  "\\ding{117}": "◆",
  "\\lozenge": "◊",
  "\\bigcirc": "◯",
  "\\ding{108}": "●",
  "\\Elzcirfl": "◐",
  "\\Elzcirfr": "◑",
  "\\Elzcirfb": "◒",
  "\\ding{119}": "◗",
  "\\Elzrvbull": "◘",
  "\\Elzsqfl": "◧",
  "\\Elzsqfr": "◨",
  "\\Elzsqfse": "◪",
  "\\ding{72}": "★",
  "\\ding{73}": "✩",
  "\\ding{37}": "☎",
  "\\ding{42}": "☛",
  "\\ding{43}": "☞",
  "\\rightmoon": "☾",
  "\\mercury": "☿",
  "\\venus": "♀",
  "\\male": "♂",
  "\\jupiter": "♃",
  "\\saturn": "♄",
  "\\uranus": "♅",
  "\\neptune": "♆",
  "\\pluto": "♇",
  "\\aries": "♈",
  "\\taurus": "♉",
  "\\gemini": "♊",
  "\\cancer": "♋",
  "\\leo": "♌",
  "\\virgo": "♍",
  "\\libra": "♎",
  "\\scorpio": "♏",
  "\\sagittarius": "♐",
  "\\capricornus": "♑",
  "\\aquarius": "♒",
  "\\pisces": "♓",
  "\\ding{171}": "♠",
  "\\ding{168}": "♣",
  "\\ding{170}": "♥",
  "\\ding{169}": "♦",
  "\\quarternote": "♩",
  "\\eighthnote": "♪",
  "\\flat": "♭",
  "\\natural": "♮",
  "\\sharp": "♯",
  "\\ding{33}": "✁",
  "\\ding{34}": "✂",
  "\\ding{35}": "✃",
  "\\ding{36}": "✄",
  "\\ding{38}": "✆",
  "\\ding{39}": "✇",
  "\\ding{40}": "✈",
  "\\ding{41}": "✉",
  "\\ding{44}": "✌",
  "\\ding{45}": "✍",
  "\\ding{46}": "✎",
  "\\ding{47}": "✏",
  "\\ding{48}": "✐",
  "\\ding{49}": "✑",
  "\\ding{50}": "✒",
  "\\ding{51}": "✓",
  "\\ding{52}": "✔",
  "\\ding{53}": "✕",
  "\\ding{54}": "✖",
  "\\ding{55}": "✗",
  "\\ding{56}": "✘",
  "\\ding{57}": "✙",
  "\\ding{58}": "✚",
  "\\ding{59}": "✛",
  "\\ding{60}": "✜",
  "\\ding{61}": "✝",
  "\\ding{62}": "✞",
  "\\ding{63}": "✟",
  "\\ding{64}": "✠",
  "\\ding{65}": "✡",
  "\\ding{66}": "✢",
  "\\ding{67}": "✣",
  "\\ding{68}": "✤",
  "\\ding{69}": "✥",
  "\\ding{70}": "✦",
  "\\ding{71}": "✧",
  "\\ding{74}": "✪",
  "\\ding{75}": "✫",
  "\\ding{76}": "✬",
  "\\ding{77}": "✭",
  "\\ding{78}": "✮",
  "\\ding{79}": "✯",
  "\\ding{80}": "✰",
  "\\ding{81}": "✱",
  "\\ding{82}": "✲",
  "\\ding{83}": "✳",
  "\\ding{84}": "✴",
  "\\ding{85}": "✵",
  "\\ding{86}": "✶",
  "\\ding{87}": "✷",
  "\\ding{88}": "✸",
  "\\ding{89}": "✹",
  "\\ding{90}": "✺",
  "\\ding{91}": "✻",
  "\\ding{92}": "✼",
  "\\ding{93}": "✽",
  "\\ding{94}": "✾",
  "\\ding{95}": "✿",
  "\\ding{96}": "❀",
  "\\ding{97}": "❁",
  "\\ding{98}": "❂",
  "\\ding{99}": "❃",
  "\\ding{100}": "❄",
  "\\ding{101}": "❅",
  "\\ding{102}": "❆",
  "\\ding{103}": "❇",
  "\\ding{104}": "❈",
  "\\ding{105}": "❉",
  "\\ding{106}": "❊",
  "\\ding{107}": "❋",
  "\\ding{109}": "❍",
  "\\ding{111}": "❏",
  "\\ding{112}": "❐",
  "\\ding{113}": "❑",
  "\\ding{114}": "❒",
  "\\ding{118}": "❖",
  "\\ding{120}": "❘",
  "\\ding{121}": "❙",
  "\\ding{122}": "❚",
  "\\ding{123}": "❛",
  "\\ding{124}": "❜",
  "\\ding{125}": "❝",
  "\\ding{126}": "❞",
  "\\ding{161}": "❡",
  "\\ding{162}": "❢",
  "\\ding{163}": "❣",
  "\\ding{164}": "❤",
  "\\ding{165}": "❥",
  "\\ding{166}": "❦",
  "\\ding{167}": "❧",
  "\\ding{182}": "❶",
  "\\ding{183}": "❷",
  "\\ding{184}": "❸",
  "\\ding{185}": "❹",
  "\\ding{186}": "❺",
  "\\ding{187}": "❻",
  "\\ding{188}": "❼",
  "\\ding{189}": "❽",
  "\\ding{190}": "❾",
  "\\ding{191}": "❿",
  "\\ding{192}": "➀",
  "\\ding{193}": "➁",
  "\\ding{194}": "➂",
  "\\ding{195}": "➃",
  "\\ding{196}": "➄",
  "\\ding{197}": "➅",
  "\\ding{198}": "➆",
  "\\ding{199}": "➇",
  "\\ding{200}": "➈",
  "\\ding{201}": "➉",
  "\\ding{202}": "➊",
  "\\ding{203}": "➋",
  "\\ding{204}": "➌",
  "\\ding{205}": "➍",
  "\\ding{206}": "➎",
  "\\ding{207}": "➏",
  "\\ding{208}": "➐",
  "\\ding{209}": "➑",
  "\\ding{210}": "➒",
  "\\ding{211}": "➓",
  "\\ding{212}": "➔",
  "\\ding{216}": "➘",
  "\\ding{217}": "➙",
  "\\ding{218}": "➚",
  "\\ding{219}": "➛",
  "\\ding{220}": "➜",
  "\\ding{221}": "➝",
  "\\ding{222}": "➞",
  "\\ding{223}": "➟",
  "\\ding{224}": "➠",
  "\\ding{225}": "➡",
  "\\ding{226}": "➢",
  "\\ding{227}": "➣",
  "\\ding{228}": "➤",
  "\\ding{229}": "➥",
  "\\ding{230}": "➦",
  "\\ding{231}": "➧",
  "\\ding{232}": "➨",
  "\\ding{233}": "➩",
  "\\ding{234}": "➪",
  "\\ding{235}": "➫",
  "\\ding{236}": "➬",
  "\\ding{237}": "➭",
  "\\ding{238}": "➮",
  "\\ding{239}": "➯",
  "\\ding{241}": "➱",
  "\\ding{242}": "➲",
  "\\ding{243}": "➳",
  "\\ding{244}": "➴",
  "\\ding{245}": "➵",
  "\\ding{246}": "➶",
  "\\ding{247}": "➷",
  "\\ding{248}": "➸",
  "\\ding{249}": "➹",
  "\\ding{250}": "➺",
  "\\ding{251}": "➻",
  "\\ding{252}": "➼",
  "\\ding{253}": "➽",
  "\\ding{254}": "➾",
  "\\longleftarrow": "⟵",
  "\\longrightarrow": "⟶",
  "\\longleftrightarrow": "⟷",
  "\\Longleftarrow": "⟸",
  "\\Longrightarrow": "⟹",
  "\\Longleftrightarrow": "⟺",
  "\\longmapsto": "⟼",
  "\\sim\\joinrel\\leadsto": "⟿",
  "\\ElsevierGlyph{E212}": "⤅",
  "\\UpArrowBar": "⤒",
  "\\DownArrowBar": "⤓",
  "\\ElsevierGlyph{E20C}": "⤣",
  "\\ElsevierGlyph{E20D}": "⤤",
  "\\ElsevierGlyph{E20B}": "⤥",
  "\\ElsevierGlyph{E20A}": "⤦",
  "\\ElsevierGlyph{E211}": "⤧",
  "\\ElsevierGlyph{E20E}": "⤨",
  "\\ElsevierGlyph{E20F}": "⤩",
  "\\ElsevierGlyph{E210}": "⤪",
  "\\ElsevierGlyph{E21C}": "⤳",
  "\\ElsevierGlyph{E21D}": "⤳̸",
  "\\ElsevierGlyph{E21A}": "⤶",
  "\\ElsevierGlyph{E219}": "⤷",
  "\\Elolarr": "⥀",
  "\\Elorarr": "⥁",
  "\\ElzRlarr": "⥂",
  "\\ElzrLarr": "⥄",
  "\\Elzrarrx": "⥇",
  "\\LeftRightVector": "⥎",
  "\\RightUpDownVector": "⥏",
  "\\DownLeftRightVector": "⥐",
  "\\LeftUpDownVector": "⥑",
  "\\LeftVectorBar": "⥒",
  "\\RightVectorBar": "⥓",
  "\\RightUpVectorBar": "⥔",
  "\\RightDownVectorBar": "⥕",
  "\\DownLeftVectorBar": "⥖",
  "\\DownRightVectorBar": "⥗",
  "\\LeftUpVectorBar": "⥘",
  "\\LeftDownVectorBar": "⥙",
  "\\LeftTeeVector": "⥚",
  "\\RightTeeVector": "⥛",
  "\\RightUpTeeVector": "⥜",
  "\\RightDownTeeVector": "⥝",
  "\\DownLeftTeeVector": "⥞",
  "\\DownRightTeeVector": "⥟",
  "\\LeftUpTeeVector": "⥠",
  "\\LeftDownTeeVector": "⥡",
  "\\UpEquilibrium": "⥮",
  "\\ReverseUpEquilibrium": "⥯",
  "\\RoundImplies": "⥰",
  "\\ElsevierGlyph{E214}": "⥼",
  "\\ElsevierGlyph{E215}": "⥽",
  "\\Elztfnc": "⦀",
  "\\ElsevierGlyph{3018}": "〘",
  "\\Elroang": "⦆",
  "<\\kern-0.58em(": "⦓",
  "\\ElsevierGlyph{E291}": "⦔",
  "\\Elzddfnc": "⦙",
  "\\Angle": "⦜",
  "\\Elzlpargt": "⦠",
  "\\ElsevierGlyph{E260}": "⦵",
  "\\ElsevierGlyph{E61B}": "⦶",
  "\\ElzLap": "⧊",
  "\\Elzdefas": "⧋",
  "\\LeftTriangleBar": "⧏",
  "\\NotLeftTriangleBar": "⧏̸",
  "\\RightTriangleBar": "⧐",
  "\\NotRightTriangleBar": "⧐̸",
  "\\ElsevierGlyph{E372}": "⧜",
  "\\blacklozenge": "⧫",
  "\\RuleDelayed": "⧴",
  "\\Elxuplus": "⨄",
  "\\ElzThr": "⨅",
  "\\Elxsqcup": "⨆",
  "\\ElzInf": "⨇",
  "\\ElzSup": "⨈",
  "\\ElzCint": "⨍",
  "\\clockoint": "⨏",
  "\\ElsevierGlyph{E395}": "⨐",
  "\\sqrint": "⨖",
  "\\ElsevierGlyph{E25A}": "⨥",
  "\\ElsevierGlyph{E25B}": "⨪",
  "\\ElsevierGlyph{E25C}": "⨭",
  "\\ElsevierGlyph{E25D}": "⨮",
  "\\ElzTimes": "⨯",
  "\\ElsevierGlyph{E25E}": "⨵",
  "\\ElsevierGlyph{E259}": "⨼",
  "\\amalg": "⨿",
  "\\ElzAnd": "⩓",
  "\\ElzOr": "⩔",
  "\\ElsevierGlyph{E36E}": "⩕",
  "\\ElOr": "⩖",
  "\\Elzminhat": "⩟",
  "\\stackrel{*}{=}": "⩮",
  "\\Equal": "⩵",
  "\\leqslant": "⩽",
  "\\nleqslant": "⩽̸",
  "\\geqslant": "⩾",
  "\\ngeqslant": "⩾̸",
  "\\lessapprox": "⪅",
  "\\gtrapprox": "⪆",
  "\\lneq": "⪇",
  "\\gneq": "⪈",
  "\\lnapprox": "⪉",
  "\\gnapprox": "⪊",
  "\\lesseqqgtr": "⪋",
  "\\gtreqqless": "⪌",
  "\\eqslantless": "⪕",
  "\\eqslantgtr": "⪖",
  "\\Pisymbol{ppi020}{117}": "⪝",
  "\\Pisymbol{ppi020}{105}": "⪞",
  "\\NestedLessLess": "⪡",
  "\\NotNestedLessLess": "⪡̸",
  "\\NestedGreaterGreater": "⪢",
  "\\NotNestedGreaterGreater": "⪢̸",
  "\\preceq": "⪯",
  "\\not\\preceq": "⪯̸",
  "\\succeq": "⪰",
  "\\not\\succeq": "⪰̸",
  "\\precneqq": "⪵",
  "\\succneqq": "⪶",
  "\\precnapprox": "⪹",
  "\\succnapprox": "⪺",
  "\\subseteqq": "⫅",
  "\\nsubseteqq": "⫅̸",
  "\\supseteqq": "⫆",
  "\\nsupseteqq": "⫆̸",
  "\\subsetneqq": "⫋",
  "\\supsetneqq": "⫌",
  "\\ElsevierGlyph{E30D}": "⫫",
  "\\Elztdcol": "⫶",
  "{{/}\\!\\!{/}}": "⫽",
  "{\\rlap{\\textbackslash}{{/}\\!\\!{/}}}": "⫽⃥",
  "\\ElsevierGlyph{300A}": "《",
  "\\ElsevierGlyph{300B}": "》",
  "\\ElsevierGlyph{3019}": "〙",
  "\\openbracketleft": "〚",
  "\\openbracketright": "〛",
  "ff": "ﬀ",
  "fi": "ﬁ",
  "fl": "ﬂ",
  "ffi": "ﬃ",
  "ffl": "ﬄ",
  "\\mathbf{A}": "𝐀",
  "\\mathbf{B}": "𝐁",
  "\\mathbf{C}": "𝐂",
  "\\mathbf{D}": "𝐃",
  "\\mathbf{E}": "𝐄",
  "\\mathbf{F}": "𝐅",
  "\\mathbf{G}": "𝐆",
  "\\mathbf{H}": "𝐇",
  "\\mathbf{I}": "𝐈",
  "\\mathbf{J}": "𝐉",
  "\\mathbf{K}": "𝐊",
  "\\mathbf{L}": "𝐋",
  "\\mathbf{M}": "𝐌",
  "\\mathbf{N}": "𝐍",
  "\\mathbf{O}": "𝐎",
  "\\mathbf{P}": "𝐏",
  "\\mathbf{Q}": "𝐐",
  "\\mathbf{R}": "𝐑",
  "\\mathbf{S}": "𝐒",
  "\\mathbf{T}": "𝐓",
  "\\mathbf{U}": "𝐔",
  "\\mathbf{V}": "𝐕",
  "\\mathbf{W}": "𝐖",
  "\\mathbf{X}": "𝐗",
  "\\mathbf{Y}": "𝐘",
  "\\mathbf{Z}": "𝐙",
  "\\mathbf{a}": "𝐚",
  "\\mathbf{b}": "𝐛",
  "\\mathbf{c}": "𝐜",
  "\\mathbf{d}": "𝐝",
  "\\mathbf{e}": "𝐞",
  "\\mathbf{f}": "𝐟",
  "\\mathbf{g}": "𝐠",
  "\\mathbf{h}": "𝐡",
  "\\mathbf{i}": "𝐢",
  "\\mathbf{j}": "𝐣",
  "\\mathbf{k}": "𝐤",
  "\\mathbf{l}": "𝐥",
  "\\mathbf{m}": "𝐦",
  "\\mathbf{n}": "𝐧",
  "\\mathbf{o}": "𝐨",
  "\\mathbf{p}": "𝐩",
  "\\mathbf{q}": "𝐪",
  "\\mathbf{r}": "𝐫",
  "\\mathbf{s}": "𝐬",
  "\\mathbf{t}": "𝐭",
  "\\mathbf{u}": "𝐮",
  "\\mathbf{v}": "𝐯",
  "\\mathbf{w}": "𝐰",
  "\\mathbf{x}": "𝐱",
  "\\mathbf{y}": "𝐲",
  "\\mathbf{z}": "𝐳",
  "\\mathsl{A}": "𝐴",
  "\\mathsl{B}": "𝐵",
  "\\mathsl{C}": "𝐶",
  "\\mathsl{D}": "𝐷",
  "\\mathsl{E}": "𝐸",
  "\\mathsl{F}": "𝐹",
  "\\mathsl{G}": "𝐺",
  "\\mathsl{H}": "𝐻",
  "\\mathsl{I}": "𝐼",
  "\\mathsl{J}": "𝐽",
  "\\mathsl{K}": "𝐾",
  "\\mathsl{L}": "𝐿",
  "\\mathsl{M}": "𝑀",
  "\\mathsl{N}": "𝑁",
  "\\mathsl{O}": "𝑂",
  "\\mathsl{P}": "𝑃",
  "\\mathsl{Q}": "𝑄",
  "\\mathsl{R}": "𝑅",
  "\\mathsl{S}": "𝑆",
  "\\mathsl{T}": "𝑇",
  "\\mathsl{U}": "𝑈",
  "\\mathsl{V}": "𝑉",
  "\\mathsl{W}": "𝑊",
  "\\mathsl{X}": "𝑋",
  "\\mathsl{Y}": "𝑌",
  "\\mathsl{Z}": "𝑍",
  "\\mathsl{a}": "𝑎",
  "\\mathsl{b}": "𝑏",
  "\\mathsl{c}": "𝑐",
  "\\mathsl{d}": "𝑑",
  "\\mathsl{e}": "𝑒",
  "\\mathsl{f}": "𝑓",
  "\\mathsl{g}": "𝑔",
  "\\mathsl{i}": "𝑖",
  "\\mathsl{j}": "𝑗",
  "\\mathsl{k}": "𝑘",
  "\\mathsl{l}": "𝑙",
  "\\mathsl{m}": "𝑚",
  "\\mathsl{n}": "𝑛",
  "\\mathsl{o}": "𝑜",
  "\\mathsl{p}": "𝑝",
  "\\mathsl{q}": "𝑞",
  "\\mathsl{r}": "𝑟",
  "\\mathsl{s}": "𝑠",
  "\\mathsl{t}": "𝑡",
  "\\mathsl{u}": "𝑢",
  "\\mathsl{v}": "𝑣",
  "\\mathsl{w}": "𝑤",
  "\\mathsl{x}": "𝑥",
  "\\mathsl{y}": "𝑦",
  "\\mathsl{z}": "𝑧",
  "\\mathbit{A}": "𝑨",
  "\\mathbit{B}": "𝑩",
  "\\mathbit{C}": "𝑪",
  "\\mathbit{D}": "𝑫",
  "\\mathbit{E}": "𝑬",
  "\\mathbit{F}": "𝑭",
  "\\mathbit{G}": "𝑮",
  "\\mathbit{H}": "𝑯",
  "\\mathbit{I}": "𝑰",
  "\\mathbit{J}": "𝑱",
  "\\mathbit{K}": "𝑲",
  "\\mathbit{L}": "𝑳",
  "\\mathbit{M}": "𝑴",
  "\\mathbit{N}": "𝑵",
  "\\mathbit{O}": "𝜭",
  "\\mathbit{P}": "𝑷",
  "\\mathbit{Q}": "𝑸",
  "\\mathbit{R}": "𝑹",
  "\\mathbit{S}": "𝑺",
  "\\mathbit{T}": "𝑻",
  "\\mathbit{U}": "𝑼",
  "\\mathbit{V}": "𝑽",
  "\\mathbit{W}": "𝑾",
  "\\mathbit{X}": "𝑿",
  "\\mathbit{Y}": "𝒀",
  "\\mathbit{Z}": "𝒁",
  "\\mathbit{a}": "𝒂",
  "\\mathbit{b}": "𝒃",
  "\\mathbit{c}": "𝒄",
  "\\mathbit{d}": "𝒅",
  "\\mathbit{e}": "𝒆",
  "\\mathbit{f}": "𝒇",
  "\\mathbit{g}": "𝒈",
  "\\mathbit{h}": "𝒉",
  "\\mathbit{i}": "𝒊",
  "\\mathbit{j}": "𝒋",
  "\\mathbit{k}": "𝒌",
  "\\mathbit{l}": "𝒍",
  "\\mathbit{m}": "𝒎",
  "\\mathbit{n}": "𝒏",
  "\\mathbit{o}": "𝒐",
  "\\mathbit{p}": "𝒑",
  "\\mathbit{q}": "𝒒",
  "\\mathbit{r}": "𝒓",
  "\\mathbit{s}": "𝒔",
  "\\mathbit{t}": "𝒕",
  "\\mathbit{u}": "𝒖",
  "\\mathbit{v}": "𝒗",
  "\\mathbit{w}": "𝒘",
  "\\mathbit{x}": "𝒙",
  "\\mathbit{y}": "𝒚",
  "\\mathbit{z}": "𝒛",
  "\\mathscr{A}": "𝒜",
  "\\mathscr{C}": "𝒞",
  "\\mathscr{D}": "𝒟",
  "\\mathscr{G}": "𝒢",
  "\\mathscr{J}": "𝒥",
  "\\mathscr{K}": "𝒦",
  "\\mathscr{N}": "𝒩",
  "\\mathscr{O}": "𝒪",
  "\\mathscr{P}": "𝒫",
  "\\mathscr{Q}": "𝒬",
  "\\mathscr{S}": "𝒮",
  "\\mathscr{T}": "𝒯",
  "\\mathscr{U}": "𝒰",
  "\\mathscr{V}": "𝒱",
  "\\mathscr{W}": "𝒲",
  "\\mathscr{X}": "𝒳",
  "\\mathscr{Y}": "𝒴",
  "\\mathscr{Z}": "𝒵",
  "\\mathscr{a}": "𝒶",
  "\\mathscr{b}": "𝒷",
  "\\mathscr{c}": "𝒸",
  "\\mathscr{d}": "𝒹",
  "\\mathscr{f}": "𝒻",
  "\\mathscr{h}": "𝒽",
  "\\mathscr{i}": "𝒾",
  "\\mathscr{j}": "𝒿",
  "\\mathscr{k}": "𝓀",
  "\\mathscr{m}": "𝓂",
  "\\mathscr{n}": "𝓃",
  "\\mathscr{p}": "𝓅",
  "\\mathscr{q}": "𝓆",
  "\\mathscr{r}": "𝓇",
  "\\mathscr{s}": "𝓈",
  "\\mathscr{t}": "𝓉",
  "\\mathscr{u}": "𝓊",
  "\\mathscr{v}": "𝓋",
  "\\mathscr{w}": "𝓌",
  "\\mathscr{x}": "𝓍",
  "\\mathscr{y}": "𝓎",
  "\\mathscr{z}": "𝓏",
  "\\mathmit{A}": "𝓐",
  "\\mathmit{B}": "𝓑",
  "\\mathmit{C}": "𝓒",
  "\\mathmit{D}": "𝓓",
  "\\mathmit{E}": "𝓔",
  "\\mathmit{F}": "𝓕",
  "\\mathmit{G}": "𝓖",
  "\\mathmit{H}": "𝓗",
  "\\mathmit{I}": "𝓘",
  "\\mathmit{J}": "𝓙",
  "\\mathmit{K}": "𝓚",
  "\\mathmit{L}": "𝓛",
  "\\mathmit{M}": "𝓜",
  "\\mathmit{N}": "𝓝",
  "\\mathmit{O}": "𝓞",
  "\\mathmit{P}": "𝓟",
  "\\mathmit{Q}": "𝓠",
  "\\mathmit{R}": "𝓡",
  "\\mathmit{S}": "𝓢",
  "\\mathmit{T}": "𝓣",
  "\\mathmit{U}": "𝓤",
  "\\mathmit{V}": "𝓥",
  "\\mathmit{W}": "𝓦",
  "\\mathmit{X}": "𝓧",
  "\\mathmit{Y}": "𝓨",
  "\\mathmit{Z}": "𝓩",
  "\\mathmit{a}": "𝓪",
  "\\mathmit{b}": "𝓫",
  "\\mathmit{c}": "𝓬",
  "\\mathmit{d}": "𝓭",
  "\\mathmit{e}": "𝓮",
  "\\mathmit{f}": "𝓯",
  "\\mathmit{g}": "𝓰",
  "\\mathmit{h}": "𝓱",
  "\\mathmit{i}": "𝓲",
  "\\mathmit{j}": "𝓳",
  "\\mathmit{k}": "𝓴",
  "\\mathmit{l}": "𝓵",
  "\\mathmit{m}": "𝓶",
  "\\mathmit{n}": "𝓷",
  "\\mathmit{o}": "𝓸",
  "\\mathmit{p}": "𝓹",
  "\\mathmit{q}": "𝓺",
  "\\mathmit{r}": "𝓻",
  "\\mathmit{s}": "𝓼",
  "\\mathmit{t}": "𝓽",
  "\\mathmit{u}": "𝓾",
  "\\mathmit{v}": "𝓿",
  "\\mathmit{w}": "𝔀",
  "\\mathmit{x}": "𝔁",
  "\\mathmit{y}": "𝔂",
  "\\mathmit{z}": "𝔃",
  "\\mathfrak{A}": "𝔄",
  "\\mathfrak{B}": "𝔅",
  "\\mathfrak{D}": "𝔇",
  "\\mathfrak{E}": "𝔈",
  "\\mathfrak{F}": "𝔉",
  "\\mathfrak{G}": "𝔊",
  "\\mathfrak{J}": "𝔍",
  "\\mathfrak{K}": "𝔎",
  "\\mathfrak{L}": "𝔏",
  "\\mathfrak{M}": "𝔐",
  "\\mathfrak{N}": "𝔑",
  "\\mathfrak{O}": "𝔒",
  "\\mathfrak{P}": "𝔓",
  "\\mathfrak{Q}": "𝔔",
  "\\mathfrak{S}": "𝔖",
  "\\mathfrak{T}": "𝔗",
  "\\mathfrak{U}": "𝔘",
  "\\mathfrak{V}": "𝔙",
  "\\mathfrak{W}": "𝔚",
  "\\mathfrak{X}": "𝔛",
  "\\mathfrak{Y}": "𝔜",
  "\\mathfrak{a}": "𝔞",
  "\\mathfrak{b}": "𝔟",
  "\\mathfrak{c}": "𝔠",
  "\\mathfrak{d}": "𝔡",
  "\\mathfrak{e}": "𝔢",
  "\\mathfrak{f}": "𝔣",
  "\\mathfrak{g}": "𝔤",
  "\\mathfrak{h}": "𝔥",
  "\\mathfrak{i}": "𝔦",
  "\\mathfrak{j}": "𝔧",
  "\\mathfrak{k}": "𝔨",
  "\\mathfrak{l}": "𝔩",
  "\\mathfrak{m}": "𝔪",
  "\\mathfrak{n}": "𝔫",
  "\\mathfrak{o}": "𝔬",
  "\\mathfrak{p}": "𝔭",
  "\\mathfrak{q}": "𝔮",
  "\\mathfrak{r}": "𝔯",
  "\\mathfrak{s}": "𝔰",
  "\\mathfrak{t}": "𝔱",
  "\\mathfrak{u}": "𝔲",
  "\\mathfrak{v}": "𝔳",
  "\\mathfrak{w}": "𝔴",
  "\\mathfrak{x}": "𝔵",
  "\\mathfrak{y}": "𝔶",
  "\\mathfrak{z}": "𝔷",
  "\\mathbb{A}": "𝔸",
  "\\mathbb{B}": "𝔹",
  "\\mathbb{D}": "𝔻",
  "\\mathbb{E}": "𝔼",
  "\\mathbb{F}": "𝔽",
  "\\mathbb{G}": "𝔾",
  "\\mathbb{I}": "𝕀",
  "\\mathbb{J}": "𝕁",
  "\\mathbb{K}": "𝕂",
  "\\mathbb{L}": "𝕃",
  "\\mathbb{M}": "𝕄",
  "\\mathbb{O}": "𝕆",
  "\\mathbb{S}": "𝕊",
  "\\mathbb{T}": "𝕋",
  "\\mathbb{U}": "𝕌",
  "\\mathbb{V}": "𝕍",
  "\\mathbb{W}": "𝕎",
  "\\mathbb{X}": "𝕏",
  "\\mathbb{Y}": "𝕐",
  "\\mathbb{a}": "𝕒",
  "\\mathbb{b}": "𝕓",
  "\\mathbb{c}": "𝕔",
  "\\mathbb{d}": "𝕕",
  "\\mathbb{e}": "𝕖",
  "\\mathbb{f}": "𝕗",
  "\\mathbb{g}": "𝕘",
  "\\mathbb{h}": "𝕙",
  "\\mathbb{i}": "𝕚",
  "\\mathbb{j}": "𝕛",
  "\\mathbb{k}": "𝕜",
  "\\mathbb{l}": "𝕝",
  "\\mathbb{m}": "𝕞",
  "\\mathbb{n}": "𝕟",
  "\\mathbb{o}": "𝕠",
  "\\mathbb{p}": "𝕡",
  "\\mathbb{q}": "𝕢",
  "\\mathbb{r}": "𝕣",
  "\\mathbb{s}": "𝕤",
  "\\mathbb{t}": "𝕥",
  "\\mathbb{u}": "𝕦",
  "\\mathbb{v}": "𝕧",
  "\\mathbb{w}": "𝕨",
  "\\mathbb{x}": "𝕩",
  "\\mathbb{y}": "𝕪",
  "\\mathbb{z}": "𝕫",
  "\\mathslbb{A}": "𝕬",
  "\\mathslbb{B}": "𝕭",
  "\\mathslbb{C}": "𝕮",
  "\\mathslbb{D}": "𝕯",
  "\\mathslbb{E}": "𝕰",
  "\\mathslbb{F}": "𝕱",
  "\\mathslbb{G}": "𝕲",
  "\\mathslbb{H}": "𝕳",
  "\\mathslbb{I}": "𝕴",
  "\\mathslbb{J}": "𝕵",
  "\\mathslbb{K}": "𝕶",
  "\\mathslbb{L}": "𝕷",
  "\\mathslbb{M}": "𝕸",
  "\\mathslbb{N}": "𝕹",
  "\\mathslbb{O}": "𝕺",
  "\\mathslbb{P}": "𝕻",
  "\\mathslbb{Q}": "𝕼",
  "\\mathslbb{R}": "𝕽",
  "\\mathslbb{S}": "𝕾",
  "\\mathslbb{T}": "𝕿",
  "\\mathslbb{U}": "𝖀",
  "\\mathslbb{V}": "𝖁",
  "\\mathslbb{W}": "𝖂",
  "\\mathslbb{X}": "𝖃",
  "\\mathslbb{Y}": "𝖄",
  "\\mathslbb{Z}": "𝖅",
  "\\mathslbb{a}": "𝖆",
  "\\mathslbb{b}": "𝖇",
  "\\mathslbb{c}": "𝖈",
  "\\mathslbb{d}": "𝖉",
  "\\mathslbb{e}": "𝖊",
  "\\mathslbb{f}": "𝖋",
  "\\mathslbb{g}": "𝖌",
  "\\mathslbb{h}": "𝖍",
  "\\mathslbb{i}": "𝖎",
  "\\mathslbb{j}": "𝖏",
  "\\mathslbb{k}": "𝖐",
  "\\mathslbb{l}": "𝖑",
  "\\mathslbb{m}": "𝖒",
  "\\mathslbb{n}": "𝖓",
  "\\mathslbb{o}": "𝖔",
  "\\mathslbb{p}": "𝖕",
  "\\mathslbb{q}": "𝖖",
  "\\mathslbb{r}": "𝖗",
  "\\mathslbb{s}": "𝖘",
  "\\mathslbb{t}": "𝖙",
  "\\mathslbb{u}": "𝖚",
  "\\mathslbb{v}": "𝖛",
  "\\mathslbb{w}": "𝖜",
  "\\mathslbb{x}": "𝖝",
  "\\mathslbb{y}": "𝖞",
  "\\mathslbb{z}": "𝖟",
  "\\mathsf{A}": "𝖠",
  "\\mathsf{B}": "𝖡",
  "\\mathsf{C}": "𝖢",
  "\\mathsf{D}": "𝖣",
  "\\mathsf{E}": "𝖤",
  "\\mathsf{F}": "𝖥",
  "\\mathsf{G}": "𝖦",
  "\\mathsf{H}": "𝖧",
  "\\mathsf{I}": "𝖨",
  "\\mathsf{J}": "𝖩",
  "\\mathsf{K}": "𝖪",
  "\\mathsf{L}": "𝖫",
  "\\mathsf{M}": "𝖬",
  "\\mathsf{N}": "𝖭",
  "\\mathsf{O}": "𝖮",
  "\\mathsf{P}": "𝖯",
  "\\mathsf{Q}": "𝖰",
  "\\mathsf{R}": "𝖱",
  "\\mathsf{S}": "𝖲",
  "\\mathsf{T}": "𝖳",
  "\\mathsf{U}": "𝖴",
  "\\mathsf{V}": "𝖵",
  "\\mathsf{W}": "𝖶",
  "\\mathsf{X}": "𝖷",
  "\\mathsf{Y}": "𝖸",
  "\\mathsf{Z}": "𝖹",
  "\\mathsf{a}": "𝖺",
  "\\mathsf{b}": "𝖻",
  "\\mathsf{c}": "𝖼",
  "\\mathsf{d}": "𝖽",
  "\\mathsf{e}": "𝖾",
  "\\mathsf{f}": "𝖿",
  "\\mathsf{g}": "𝗀",
  "\\mathsf{h}": "𝗁",
  "\\mathsf{i}": "𝗂",
  "\\mathsf{j}": "𝗃",
  "\\mathsf{k}": "𝗄",
  "\\mathsf{l}": "𝗅",
  "\\mathsf{m}": "𝗆",
  "\\mathsf{n}": "𝗇",
  "\\mathsf{o}": "𝗈",
  "\\mathsf{p}": "𝗉",
  "\\mathsf{q}": "𝗊",
  "\\mathsf{r}": "𝗋",
  "\\mathsf{s}": "𝗌",
  "\\mathsf{t}": "𝗍",
  "\\mathsf{u}": "𝗎",
  "\\mathsf{v}": "𝗏",
  "\\mathsf{w}": "𝗐",
  "\\mathsf{x}": "𝗑",
  "\\mathsf{y}": "𝗒",
  "\\mathsf{z}": "𝗓",
  "\\mathsfbf{A}": "𝗔",
  "\\mathsfbf{B}": "𝗕",
  "\\mathsfbf{C}": "𝗖",
  "\\mathsfbf{D}": "𝗗",
  "\\mathsfbf{E}": "𝗘",
  "\\mathsfbf{F}": "𝗙",
  "\\mathsfbf{G}": "𝗚",
  "\\mathsfbf{H}": "𝗛",
  "\\mathsfbf{I}": "𝗜",
  "\\mathsfbf{J}": "𝗝",
  "\\mathsfbf{K}": "𝗞",
  "\\mathsfbf{L}": "𝗟",
  "\\mathsfbf{M}": "𝗠",
  "\\mathsfbf{N}": "𝗡",
  "\\mathsfbf{O}": "𝗢",
  "\\mathsfbf{P}": "𝗣",
  "\\mathsfbf{Q}": "𝗤",
  "\\mathsfbf{R}": "𝗥",
  "\\mathsfbf{S}": "𝗦",
  "\\mathsfbf{T}": "𝗧",
  "\\mathsfbf{U}": "𝗨",
  "\\mathsfbf{V}": "𝗩",
  "\\mathsfbf{W}": "𝗪",
  "\\mathsfbf{X}": "𝗫",
  "\\mathsfbf{Y}": "𝗬",
  "\\mathsfbf{Z}": "𝗭",
  "\\mathsfbf{a}": "𝗮",
  "\\mathsfbf{b}": "𝗯",
  "\\mathsfbf{c}": "𝗰",
  "\\mathsfbf{d}": "𝗱",
  "\\mathsfbf{e}": "𝗲",
  "\\mathsfbf{f}": "𝗳",
  "\\mathsfbf{g}": "𝗴",
  "\\mathsfbf{h}": "𝗵",
  "\\mathsfbf{i}": "𝗶",
  "\\mathsfbf{j}": "𝗷",
  "\\mathsfbf{k}": "𝗸",
  "\\mathsfbf{l}": "𝗹",
  "\\mathsfbf{m}": "𝗺",
  "\\mathsfbf{n}": "𝗻",
  "\\mathsfbf{o}": "𝗼",
  "\\mathsfbf{p}": "𝗽",
  "\\mathsfbf{q}": "𝗾",
  "\\mathsfbf{r}": "𝗿",
  "\\mathsfbf{s}": "𝘀",
  "\\mathsfbf{t}": "𝘁",
  "\\mathsfbf{u}": "𝘂",
  "\\mathsfbf{v}": "𝘃",
  "\\mathsfbf{w}": "𝘄",
  "\\mathsfbf{x}": "𝘅",
  "\\mathsfbf{y}": "𝘆",
  "\\mathsfbf{z}": "𝘇",
  "\\mathsfsl{A}": "𝘈",
  "\\mathsfsl{B}": "𝘉",
  "\\mathsfsl{C}": "𝘊",
  "\\mathsfsl{D}": "𝘋",
  "\\mathsfsl{E}": "𝘌",
  "\\mathsfsl{F}": "𝘍",
  "\\mathsfsl{G}": "𝘎",
  "\\mathsfsl{H}": "𝘏",
  "\\mathsfsl{I}": "𝘐",
  "\\mathsfsl{J}": "𝘑",
  "\\mathsfsl{K}": "𝘒",
  "\\mathsfsl{L}": "𝘓",
  "\\mathsfsl{M}": "𝘔",
  "\\mathsfsl{N}": "𝘕",
  "\\mathsfsl{O}": "𝘖",
  "\\mathsfsl{P}": "𝘗",
  "\\mathsfsl{Q}": "𝘘",
  "\\mathsfsl{R}": "𝘙",
  "\\mathsfsl{S}": "𝘚",
  "\\mathsfsl{T}": "𝘛",
  "\\mathsfsl{U}": "𝘜",
  "\\mathsfsl{V}": "𝘝",
  "\\mathsfsl{W}": "𝘞",
  "\\mathsfsl{X}": "𝘟",
  "\\mathsfsl{Y}": "𝘠",
  "\\mathsfsl{Z}": "𝘡",
  "\\mathsfsl{a}": "𝘢",
  "\\mathsfsl{b}": "𝘣",
  "\\mathsfsl{c}": "𝘤",
  "\\mathsfsl{d}": "𝘥",
  "\\mathsfsl{e}": "𝘦",
  "\\mathsfsl{f}": "𝘧",
  "\\mathsfsl{g}": "𝘨",
  "\\mathsfsl{h}": "𝘩",
  "\\mathsfsl{i}": "𝘪",
  "\\mathsfsl{j}": "𝘫",
  "\\mathsfsl{k}": "𝘬",
  "\\mathsfsl{l}": "𝘭",
  "\\mathsfsl{m}": "𝘮",
  "\\mathsfsl{n}": "𝘯",
  "\\mathsfsl{o}": "𝘰",
  "\\mathsfsl{p}": "𝘱",
  "\\mathsfsl{q}": "𝘲",
  "\\mathsfsl{r}": "𝘳",
  "\\mathsfsl{s}": "𝘴",
  "\\mathsfsl{t}": "𝘵",
  "\\mathsfsl{u}": "𝘶",
  "\\mathsfsl{v}": "𝘷",
  "\\mathsfsl{w}": "𝘸",
  "\\mathsfsl{x}": "𝘹",
  "\\mathsfsl{y}": "𝘺",
  "\\mathsfsl{z}": "𝘻",
  "\\mathsfbfsl{A}": "𝘼",
  "\\mathsfbfsl{B}": "𝘽",
  "\\mathsfbfsl{C}": "𝘾",
  "\\mathsfbfsl{D}": "𝘿",
  "\\mathsfbfsl{E}": "𝙀",
  "\\mathsfbfsl{F}": "𝙁",
  "\\mathsfbfsl{G}": "𝙂",
  "\\mathsfbfsl{H}": "𝙃",
  "\\mathsfbfsl{I}": "𝙄",
  "\\mathsfbfsl{J}": "𝙅",
  "\\mathsfbfsl{K}": "𝙆",
  "\\mathsfbfsl{L}": "𝙇",
  "\\mathsfbfsl{M}": "𝙈",
  "\\mathsfbfsl{N}": "𝙉",
  "\\mathsfbfsl{O}": "𝙊",
  "\\mathsfbfsl{P}": "𝙋",
  "\\mathsfbfsl{Q}": "𝙌",
  "\\mathsfbfsl{R}": "𝙍",
  "\\mathsfbfsl{S}": "𝙎",
  "\\mathsfbfsl{T}": "𝙏",
  "\\mathsfbfsl{U}": "𝙐",
  "\\mathsfbfsl{V}": "𝙑",
  "\\mathsfbfsl{W}": "𝙒",
  "\\mathsfbfsl{X}": "𝙓",
  "\\mathsfbfsl{Y}": "𝙔",
  "\\mathsfbfsl{Z}": "𝙕",
  "\\mathsfbfsl{a}": "𝙖",
  "\\mathsfbfsl{b}": "𝙗",
  "\\mathsfbfsl{c}": "𝙘",
  "\\mathsfbfsl{d}": "𝙙",
  "\\mathsfbfsl{e}": "𝙚",
  "\\mathsfbfsl{f}": "𝙛",
  "\\mathsfbfsl{g}": "𝙜",
  "\\mathsfbfsl{h}": "𝙝",
  "\\mathsfbfsl{i}": "𝙞",
  "\\mathsfbfsl{j}": "𝙟",
  "\\mathsfbfsl{k}": "𝙠",
  "\\mathsfbfsl{l}": "𝙡",
  "\\mathsfbfsl{m}": "𝙢",
  "\\mathsfbfsl{n}": "𝙣",
  "\\mathsfbfsl{o}": "𝙤",
  "\\mathsfbfsl{p}": "𝙥",
  "\\mathsfbfsl{q}": "𝙦",
  "\\mathsfbfsl{r}": "𝙧",
  "\\mathsfbfsl{s}": "𝙨",
  "\\mathsfbfsl{t}": "𝙩",
  "\\mathsfbfsl{u}": "𝙪",
  "\\mathsfbfsl{v}": "𝙫",
  "\\mathsfbfsl{w}": "𝙬",
  "\\mathsfbfsl{x}": "𝙭",
  "\\mathsfbfsl{y}": "𝙮",
  "\\mathsfbfsl{z}": "𝙯",
  "\\mathtt{A}": "𝙰",
  "\\mathtt{B}": "𝙱",
  "\\mathtt{C}": "𝙲",
  "\\mathtt{D}": "𝙳",
  "\\mathtt{E}": "𝙴",
  "\\mathtt{F}": "𝙵",
  "\\mathtt{G}": "𝙶",
  "\\mathtt{H}": "𝙷",
  "\\mathtt{I}": "𝙸",
  "\\mathtt{J}": "𝙹",
  "\\mathtt{K}": "𝙺",
  "\\mathtt{L}": "𝙻",
  "\\mathtt{M}": "𝙼",
  "\\mathtt{N}": "𝙽",
  "\\mathtt{O}": "𝙾",
  "\\mathtt{P}": "𝙿",
  "\\mathtt{Q}": "𝚀",
  "\\mathtt{R}": "𝚁",
  "\\mathtt{S}": "𝚂",
  "\\mathtt{T}": "𝚃",
  "\\mathtt{U}": "𝚄",
  "\\mathtt{V}": "𝚅",
  "\\mathtt{W}": "𝚆",
  "\\mathtt{X}": "𝚇",
  "\\mathtt{Y}": "𝚈",
  "\\mathtt{Z}": "𝚉",
  "\\mathtt{a}": "𝚊",
  "\\mathtt{b}": "𝚋",
  "\\mathtt{c}": "𝚌",
  "\\mathtt{d}": "𝚍",
  "\\mathtt{e}": "𝚎",
  "\\mathtt{f}": "𝚏",
  "\\mathtt{g}": "𝚐",
  "\\mathtt{h}": "𝚑",
  "\\mathtt{i}": "𝚒",
  "\\mathtt{j}": "𝚓",
  "\\mathtt{k}": "𝚔",
  "\\mathtt{l}": "𝚕",
  "\\mathtt{m}": "𝚖",
  "\\mathtt{n}": "𝚗",
  "\\mathtt{o}": "𝚘",
  "\\mathtt{p}": "𝚙",
  "\\mathtt{q}": "𝚚",
  "\\mathtt{r}": "𝚛",
  "\\mathtt{s}": "𝚜",
  "\\mathtt{t}": "𝚝",
  "\\mathtt{u}": "𝚞",
  "\\mathtt{v}": "𝚟",
  "\\mathtt{w}": "𝚠",
  "\\mathtt{x}": "𝚡",
  "\\mathtt{y}": "𝚢",
  "\\mathtt{z}": "𝚣",
  "\\mathbf{\\Alpha}": "𝛂",
  "\\mathbf{\\Beta}": "𝛃",
  "\\mathbf{\\Gamma}": "𝛄",
  "\\mathbf{\\Delta}": "𝛅",
  "\\mathbf{\\Epsilon}": "𝛆",
  "\\mathbf{\\Zeta}": "𝛇",
  "\\mathbf{\\Eta}": "𝛈",
  "\\mathbf{\\Theta}": "𝚯",
  "\\mathbf{\\Iota}": "𝛊",
  "\\mathbf{\\Kappa}": "𝛋",
  "\\mathbf{\\Lambda}": "𝛌",
  "\\mathbf{\\Xi}": "𝛏",
  "\\mathbf{\\Pi}": "𝛑",
  "\\mathbf{\\Rho}": "𝛒",
  "\\mathbf{\\vartheta}": "𝛝",
  "\\mathbf{\\Sigma}": "𝛔",
  "\\mathbf{\\Tau}": "𝛕",
  "\\mathbf{\\Upsilon}": "𝛖",
  "\\mathbf{\\Phi}": "𝛗",
  "\\mathbf{\\Chi}": "𝛘",
  "\\mathbf{\\Psi}": "𝛙",
  "\\mathbf{\\Omega}": "𝛚",
  "\\mathbf{\\nabla}": "𝛁",
  "\\mathbf{\\theta}": "𝛉",
  "\\mathbf{\\varsigma}": "𝛓",
  "\\mathbf{\\varkappa}": "𝛞",
  "\\mathbf{\\phi}": "𝛟",
  "\\mathbf{\\varrho}": "𝛠",
  "\\mathbf{\\varpi}": "𝛡",
  "\\mathsl{\\Alpha}": "𝛼",
  "\\mathsl{\\Beta}": "𝛽",
  "\\mathsl{\\Gamma}": "𝛾",
  "\\mathsl{\\Delta}": "𝛿",
  "\\mathsl{\\Epsilon}": "𝜀",
  "\\mathsl{\\Zeta}": "𝜁",
  "\\mathsl{\\Eta}": "𝜂",
  "\\mathsl{\\Theta}": "𝜃",
  "\\mathsl{\\Iota}": "𝜄",
  "\\mathsl{\\Kappa}": "𝜅",
  "\\mathsl{\\Lambda}": "𝜆",
  "\\mathsl{\\Xi}": "𝜉",
  "\\mathsl{\\Pi}": "𝜋",
  "\\mathsl{\\Rho}": "𝜌",
  "\\mathsl{\\vartheta}": "𝜗",
  "\\mathsl{\\Sigma}": "𝜎",
  "\\mathsl{\\Tau}": "𝜏",
  "\\mathsl{\\Upsilon}": "𝜐",
  "\\mathsl{\\Phi}": "𝜑",
  "\\mathsl{\\Chi}": "𝜒",
  "\\mathsl{\\Psi}": "𝜓",
  "\\mathsl{\\Omega}": "𝜔",
  "\\mathsl{\\nabla}": "𝛻",
  "\\mathsl{\\varsigma}": "𝜍",
  "\\mathsl{\\varkappa}": "𝜘",
  "\\mathsl{\\phi}": "𝜙",
  "\\mathsl{\\varrho}": "𝜚",
  "\\mathsl{\\varpi}": "𝜛",
  "\\mathbit{\\Alpha}": "𝜶",
  "\\mathbit{\\Beta}": "𝜷",
  "\\mathbit{\\Gamma}": "𝜸",
  "\\mathbit{\\Delta}": "𝜹",
  "\\mathbit{\\Epsilon}": "𝜺",
  "\\mathbit{\\Zeta}": "𝜻",
  "\\mathbit{\\Eta}": "𝜼",
  "\\mathbit{\\Theta}": "𝜽",
  "\\mathbit{\\Iota}": "𝜾",
  "\\mathbit{\\Kappa}": "𝜿",
  "\\mathbit{\\Lambda}": "𝝀",
  "\\mathbit{\\Xi}": "𝝃",
  "\\mathbit{\\Pi}": "𝝅",
  "\\mathbit{\\Rho}": "𝝆",
  "\\mathbit{\\Sigma}": "𝝈",
  "\\mathbit{\\Tau}": "𝝉",
  "\\mathbit{\\Upsilon}": "𝝊",
  "\\mathbit{\\Phi}": "𝝋",
  "\\mathbit{\\Chi}": "𝝌",
  "\\mathbit{\\Psi}": "𝝍",
  "\\mathbit{\\Omega}": "𝝎",
  "\\mathbit{\\nabla}": "𝜵",
  "\\mathbit{\\varsigma}": "𝝇",
  "\\mathbit{\\vartheta}": "𝝑",
  "\\mathbit{\\varkappa}": "𝝒",
  "\\mathbit{\\phi}": "𝝓",
  "\\mathbit{\\varrho}": "𝝔",
  "\\mathbit{\\varpi}": "𝝕",
  "\\mathsfbf{\\Alpha}": "𝝰",
  "\\mathsfbf{\\Beta}": "𝝱",
  "\\mathsfbf{\\Gamma}": "𝝲",
  "\\mathsfbf{\\Delta}": "𝝳",
  "\\mathsfbf{\\Epsilon}": "𝝴",
  "\\mathsfbf{\\Zeta}": "𝝵",
  "\\mathsfbf{\\Eta}": "𝝶",
  "\\mathsfbf{\\Theta}": "𝝷",
  "\\mathsfbf{\\Iota}": "𝝸",
  "\\mathsfbf{\\Kappa}": "𝝹",
  "\\mathsfbf{\\Lambda}": "𝝺",
  "\\mathsfbf{\\Xi}": "𝝽",
  "\\mathsfbf{\\Pi}": "𝝿",
  "\\mathsfbf{\\Rho}": "𝞀",
  "\\mathsfbf{\\vartheta}": "𝞋",
  "\\mathsfbf{\\Sigma}": "𝞂",
  "\\mathsfbf{\\Tau}": "𝞃",
  "\\mathsfbf{\\Upsilon}": "𝞄",
  "\\mathsfbf{\\Phi}": "𝞅",
  "\\mathsfbf{\\Chi}": "𝞆",
  "\\mathsfbf{\\Psi}": "𝞇",
  "\\mathsfbf{\\Omega}": "𝞈",
  "\\mathsfbf{\\nabla}": "𝝯",
  "\\mathsfbf{\\varsigma}": "𝞁",
  "\\mathsfbf{\\varkappa}": "𝞌",
  "\\mathsfbf{\\phi}": "𝞍",
  "\\mathsfbf{\\varrho}": "𝞎",
  "\\mathsfbf{\\varpi}": "𝞏",
  "\\mathsfbfsl{\\Alpha}": "𝞪",
  "\\mathsfbfsl{\\Beta}": "𝞫",
  "\\mathsfbfsl{\\Gamma}": "𝞬",
  "\\mathsfbfsl{\\Delta}": "𝞭",
  "\\mathsfbfsl{\\Epsilon}": "𝞮",
  "\\mathsfbfsl{\\Zeta}": "𝞯",
  "\\mathsfbfsl{\\Eta}": "𝞰",
  "\\mathsfbfsl{\\vartheta}": "𝟅",
  "\\mathsfbfsl{\\Iota}": "𝞲",
  "\\mathsfbfsl{\\Kappa}": "𝞳",
  "\\mathsfbfsl{\\Lambda}": "𝞴",
  "\\mathsfbfsl{\\Xi}": "𝞷",
  "\\mathsfbfsl{\\Pi}": "𝞹",
  "\\mathsfbfsl{\\Rho}": "𝞺",
  "\\mathsfbfsl{\\Sigma}": "𝞼",
  "\\mathsfbfsl{\\Tau}": "𝞽",
  "\\mathsfbfsl{\\Upsilon}": "𝞾",
  "\\mathsfbfsl{\\Phi}": "𝞿",
  "\\mathsfbfsl{\\Chi}": "𝟀",
  "\\mathsfbfsl{\\Psi}": "𝟁",
  "\\mathsfbfsl{\\Omega}": "𝟂",
  "\\mathsfbfsl{\\nabla}": "𝞩",
  "\\mathsfbfsl{\\varsigma}": "𝞻",
  "\\mathsfbfsl{\\varkappa}": "𝟆",
  "\\mathsfbfsl{\\phi}": "𝟇",
  "\\mathsfbfsl{\\varrho}": "𝟈",
  "\\mathsfbfsl{\\varpi}": "𝟉",
  "\\mathbf{0}": "𝟎",
  "\\mathbf{1}": "𝟏",
  "\\mathbf{2}": "𝟐",
  "\\mathbf{3}": "𝟑",
  "\\mathbf{4}": "𝟒",
  "\\mathbf{5}": "𝟓",
  "\\mathbf{6}": "𝟔",
  "\\mathbf{7}": "𝟕",
  "\\mathbf{8}": "𝟖",
  "\\mathbf{9}": "𝟗",
  "\\mathbb{0}": "𝟘",
  "\\mathbb{1}": "𝟙",
  "\\mathbb{2}": "𝟚",
  "\\mathbb{3}": "𝟛",
  "\\mathbb{4}": "𝟜",
  "\\mathbb{5}": "𝟝",
  "\\mathbb{6}": "𝟞",
  "\\mathbb{7}": "𝟟",
  "\\mathbb{8}": "𝟠",
  "\\mathbb{9}": "𝟡",
  "\\mathsf{0}": "𝟢",
  "\\mathsf{1}": "𝟣",
  "\\mathsf{2}": "𝟤",
  "\\mathsf{3}": "𝟥",
  "\\mathsf{4}": "𝟦",
  "\\mathsf{5}": "𝟧",
  "\\mathsf{6}": "𝟨",
  "\\mathsf{7}": "𝟩",
  "\\mathsf{8}": "𝟪",
  "\\mathsf{9}": "𝟫",
  "\\mathsfbf{0}": "𝟬",
  "\\mathsfbf{1}": "𝟭",
  "\\mathsfbf{2}": "𝟮",
  "\\mathsfbf{3}": "𝟯",
  "\\mathsfbf{4}": "𝟰",
  "\\mathsfbf{5}": "𝟱",
  "\\mathsfbf{6}": "𝟲",
  "\\mathsfbf{7}": "𝟳",
  "\\mathsfbf{8}": "𝟴",
  "\\mathsfbf{9}": "𝟵",
  "\\mathtt{0}": "𝟶",
  "\\mathtt{1}": "𝟷",
  "\\mathtt{2}": "𝟸",
  "\\mathtt{3}": "𝟹",
  "\\mathtt{4}": "𝟺",
  "\\mathtt{5}": "𝟻",
  "\\mathtt{6}": "𝟼",
  "\\mathtt{7}": "𝟽",
  "\\mathtt{8}": "𝟾",
  "\\mathtt{9}": "𝟿"
}
    };


convert.latex2unicode["\\url"] = '';
convert.latex2unicode["\\href"] = '';

convert.to_latex = function(str) {

  chunk_to_latex = function(arr) {
    var chr;
    var res = ''
    var textMode=true;

    arr.forEach(function(chr) {
      if (chr.match(/^[\\{]/)) {
        textMode = chr.match(/[^a-z]$/i);
      } else {
        if (!textMode) {
          res += '{}';
          textMode = true;
        }
      }

      res += chr;
    });

    return res;
  }

  str = '' + str;
  var strlen = str.length;
  var c, ca;
  var l;
  var unicode = (config.exportCharset && config.exportCharset.toLowerCase() == 'utf-8');

  var res = [];

  for (var i=0; i < strlen; i++) {
    c = str.charAt(i);
    if (!convert.unicode2latex[c]) {
      convert.unicode2latex[c] = {latex: c, math:false};
    }
    convert.unicode2latex[c].math = !!convert.unicode2latex[c].math;

    if (unicode && !convert.unicode2latex[c].force) {
      convert.unicode2latex[c].latex = c;
      convert.unicode2latex[c].math = false;
    }

    ca = convert.unicode2latex[c];

    var last = res.length - 1;
    if (res.length == 0 || ca.math != res[last].math) {
      res.push({chars: [ca.latex], math: ca.math});
    } else {
      res[last].chars.push(ca.latex);
    }
  }

  res = res.map(function(chunk) {
    if (chunk.math) {
      return '\\ensuremath{' + chunk_to_latex(chunk.chars) + '}';
    } else {
      return chunk_to_latex(chunk.chars);
    }
  });

  res = chunk_to_latex(res);

  return res.replace(/{}\s+/g, ' ');
}

convert.from_latex = function(str) {
  var chunks = str.split('\\');
  var res = chunks.shift();
  var m, i, c, l;

  chunks.forEach(function(chunk) {
    chunk = '\\' + chunk;
    l = chunk.length;
    m = null;
    for (i=2; i<=l; i++) {
      if (convert.latex2unicode[chunk.substring(0, i)]) {
        m = i;
      } else {
        break;
      }
    }

    if (m) {
      res += convert.latex2unicode[chunk.substring(0, m)] + chunk.substring(m, chunk.length);
    } else {
      res += chunk;
    }
  });
  return res;
}

var strings = {};
var keyRe = /[a-zA-Z0-9\-]/;
var keywordSplitOnSpace = true;
var keywordDelimRe = '\\s*[,;]\\s*';
var keywordDelimReFlags = '';

function setKeywordSplitOnSpace( val ) {
  keywordSplitOnSpace = val;
}

function setKeywordDelimRe( val, flags ) {
  //expect string, but it could be RegExp
  if(typeof(val) != 'string') {
    keywordDelimRe = val.toString().slice(1, val.toString().lastIndexOf('/'));
    keywordDelimReFlags = val.toString().slice(val.toString().lastIndexOf('/')+1);
  } else {
    keywordDelimRe = val;
    keywordDelimReFlags = flags;
  }
}

function processField(item, field, value) {
  if(Zotero.Utilities.trim(value) == '') return null;
  if(fieldMap[field]) {
    item[fieldMap[field]] = value;
  } else if(inputFieldMap[field]) {
    item[inputFieldMap[field]] = value;
  } else if(field == "journal") {
    if(item.publicationTitle) {
      item.journalAbbreviation = value;
    } else {
      item.publicationTitle = value;
    }
  } else if(field == "fjournal") {
    if(item.publicationTitle) {
      // move publicationTitle to abbreviation
      item.journalAbbreviation = value;
    }
    item.publicationTitle = value;
  } else if(field == "author" || field == "editor" || field == "translator") {
    // parse authors/editors/translators
    value.split(/ and /i).forEach(function(name) {
      trLog('name = ' + name);
      if (name.trim() != '') {
        // Names in BibTeX can have three commas
        pieces = name.split(',');
        var creator = {};
        if (pieces.length > 1) {
          creator.firstName = pieces.pop().trim();
          creator.lastName = pieces.join(',').trim();
          creator.creatorType = field;
        } else {
          creator = Zotero.Utilities.cleanAuthor(name, field, false);
        }
        item.creators.push(creator);
      }
    });
  } else if(field == "institution" || field == "organization") {
    item.backupPublisher = value;
  } else if(field == "number"){ // fix for techreport
    if (item.itemType == "report") {
      item.reportNumber = value;
    } else if (item.itemType == "book" || item.itemType == "bookSection") {
      item.seriesNumber = value;
    } else if (item.itemType == "patent"){
      item.patentNumber = value;
    } else {
      item.issue = value;
    }
  } else if(field == "month") {
    var monthIndex = months.indexOf(value.toLowerCase());
    if(monthIndex != -1) {
      value = Zotero.Utilities.formatDate({month:monthIndex});
    } else {
      value += " ";
    }

    if(item.date) {
      if(value.indexOf(item.date) != -1) {
        // value contains year and more
        item.date = value;
      } else {
        item.date = value+item.date;
      }
    } else {
      item.date = value;
    }
  } else if(field == "year") {
    if(item.date) {
      if(item.date.indexOf(value) == -1) {
        // date does not already contain year
        item.date += value;
      }
    } else {
      item.date = value;
    }
  } else if(field == "pages") {
    if (item.itemType == "book" || item.itemType == "thesis" || item.itemType == "manuscript") {
      item.numPages = value;
    }
    else {
      item.pages = value.replace(/--/g, "-");
    }
  } else if(field == "note") {
    item.extra += "\n"+value;
  } else if(field == "howpublished") {
    if(value.length >= 7) {
      var str = value.substr(0, 7);
      if(str == "http://" || str == "https:/" || str == "mailto:") {
        item.url = value;
      } else {
        item.extra += "\nPublished: "+value;
      }
    }

  }
  //accept lastchecked or urldate for access date. These should never both occur.
  //If they do we don't know which is better so we might as well just take the second one
  else if (field == "lastchecked"|| field == "urldate"){
    item.accessDate = value;
  }
  else if(field == "keywords" || field == "keyword") {
    var re = new RegExp(keywordDelimRe, keywordDelimReFlags);
    if(!value.match(re) && keywordSplitOnSpace) {
      // keywords/tags
      item.tags = value.split(/\s+/);
    } else {
      item.tags = value.split(re);
    }
  } else if (field == "comment" || field == "annote" || field == "review") {
    item.notes.push({note:Zotero.Utilities.text2html(value)});
  } else if (field == "pdf" || field == "path" /*Papers2 compatibility*/) {
    item.attachments = [{path:value, mimeType:"application/pdf"}];
  } else if (field == "sentelink") { // the reference manager 'Sente' has a unique file scheme in exported BibTeX
    item.attachments = [{path:value.split(",")[0], mimeType:"application/pdf"}];
  } else if (field == "file") {
    var attachments = value.split(";");
    for(var i in attachments){
      var attachment = attachments[i];
      var parts = attachment.split(":");
      var filetitle = parts[0];
      var filepath = parts[1];
      if (filepath.trim() === '') continue; // skip empty entries
      var filetype = parts[2];

      if (!filetype) { throw value; }

      if (filetitle.length == 0) {
        filetitle = "Attachment";
      }
      if (filetype.match(/pdf/i)) {
        item.attachments.push({path:filepath, mimeType:"application/pdf", title:filetitle});
      } else {
        item.attachments.push({path:filepath, title:filetitle});
      }
    }
  }
}

function getFieldValue(read) {
  var value = "";
  // now, we have the first character of the field
  if(read == "{") {
    // character is a brace
    var openBraces = 1;
    while(read = Zotero.read(1)) {
      if(read == "{" && value[value.length-1] != "\\") {
        openBraces++;
        value += "{";
      } else if(read == "}" && value[value.length-1] != "\\") {
        openBraces--;
        if(openBraces == 0) {
          break;
        } else {
          value += "}";
        }
      } else {
        value += read;
      }
    }

  } else if(read == '"') {
    var openBraces = 0;
    while(read = Zotero.read(1)) {
      if(read == "{" && value[value.length-1] != "\\") {
        openBraces++;
        value += "{";
      } else if(read == "}" && value[value.length-1] != "\\") {
        openBraces--;
        value += "}";
      } else if(read == '"' && openBraces == 0) {
        break;
      } else {
        value += read;
      }
    }
  }

  if(value.length > 1) {
    value = convert.from_latex(value);

    //convert tex markup into permitted HTML
    value = mapTeXmarkup(value);

    // kill braces
    value = value.replace(/([^\\])[{}]+/g, "$1");
    if(value[0] == "{") {
      value = value.substr(1);
    }

    // chop off backslashes
    value = value.replace(/([^\\])\\([#$%&~_^\\{}])/g, "$1$2");
    value = value.replace(/([^\\])\\([#$%&~_^\\{}])/g, "$1$2");
    if(value[0] == "\\" && "#$%&~_^\\{}".indexOf(value[1]) != -1) {
      value = value.substr(1);
    }
    if(value[value.length-1] == "\\" && "#$%&~_^\\{}".indexOf(value[value.length-2]) != -1) {
      value = value.substr(0, value.length-1);
    }
    value = value.replace(/\\\\/g, "\\");
    value = value.replace(/\s+/g, " ");
  }

  return value;
}

function jabrefSplit(str, sep) {
  var quoted = false;
  var result = [];

  str = str.split('');
  while (str.length > 0) {
    if (result.length == 0) { result = ['']; }

    if (str[0] == sep) {
      str.shift();
      result.push('');
    } else {
      if (str[0] == '\\') { str.shift(); }
      result[result.length - 1] += str.shift();
    }
  }
  return result;
}

function jabrefCollect(arr, func) {
  if (arr == null) { return []; }

  var result = [];

  for (var i = 0; i < arr.length; i++) {
    if (func(arr[i])) {
      result.push(arr[i]);
    }
  }
  return result;
}

function processComment() {
  var comment = "";
  var read;
  var collectionPath = [];
  var parentCollection, collection;

  while(read = Zotero.read(1)) {
    if (read == "}") { break; } // JabRef ought to escape '}' but doesn't; embedded '}' chars will break the import just as it will on JabRef itself
    comment += read;
  }

  if (comment == 'jabref-meta: groupsversion:3;') {
    jabref.format = 3;
    return;
  }

  if (comment.indexOf('jabref-meta: groupstree:') == 0) {
    if (jabref.format != 3) {
      trLog("jabref: fatal: unsupported group format: " + jabref.format);
      return;
    }
    comment = comment.replace(/^jabref-meta: groupstree:/, '').replace(/[\r\n]/gm, '')

    var records = jabrefSplit(comment, ';');
    while (records.length > 0) {
      var record = records.shift();
      var keys = jabrefSplit(record, ';');
      if (keys.length < 2) { continue; }

      var record = {id: keys.shift()};
      record.data = record.id.match(/^([0-9]) ([^:]*):(.*)/);
      if (record.data == null) {
        trLog("jabref: fatal: unexpected non-match for group " + record.id);
        return;
      }
      record.level = parseInt(record.data[1]);
      record.type = record.data[2]
      record.name = record.data[3]
      record.intersection = keys.shift(); // 0 = independent, 1 = intersection, 2 = union

      if (isNaN(record.level)) {
        trLog("jabref: fatal: unexpected record level in " + record.id);
        return;
      }

      if (record.level == 0) { continue; }
      if (record.type != 'ExplicitGroup') {
        trLog("jabref: fatal: group type " + record.type + " is not supported");
        return;
      }

      collectionPath = collectionPath.slice(0, record.level - 1).concat([record.name]);
      trLog("jabref: locating level " + record.level + ": " + collectionPath.join('/'));

      if (jabref.root.hasOwnProperty(collectionPath[0])) {
        collection = jabref.root[collectionPath[0]];
        trLog("jabref: root " + collection.name + " found");
      } else {
        collection = new Zotero.Collection();
        collection.name = collectionPath[0];
        collection.type = 'collection';
        collection.children = [];
        jabref.root[collectionPath[0]] = collection;
        trLog("jabref: root " + collection.name + " created");
      }
      parentCollection = null;

      for (var i = 1; i < collectionPath.length; i++) {
        var path = collectionPath[i];
        trLog("jabref: looking for child " + path + " under " + collection.name);

        var child = jabrefCollect(collection.children, function(n) { return (n.name == path)})
        if (child.length != 0) {
          child = child[0]
          trLog("jabref: child " + child.name + " found under " + collection.name);
        } else {
          child = new Zotero.Collection();
          child.name = path;
          child.type = 'collection';
          child.children = [];

          collection.children.push(child);
          trLog("jabref: child " + child.name + " created under " + collection.name);
        }

        parentCollection = collection;
        collection = child;
      }

      if (parentCollection) {
        parentCollection = jabrefCollect(parentCollection.children, function(n) { return (n.type == 'item') });
      }

      if (record.intersection == '2' && parentCollection) { // union with parent
        collection.children = parentCollection;
      }

      while(keys.length > 0) {
        key = keys.shift();
        if (key != '') {
          trLog('jabref: adding ' + key + ' to ' + collection.name);
          collection.children.push({type: 'item', id: key});
        }
      }

      if (parentCollection && record.intersection == '1') { // intersection with parent
        collection.children = jabrefMap(collection.children, function(n) { parentCollection.indexOf(n) !== -1; });
      }
    }
  }
}

function beginRecord(type, closeChar) {
  type = Zotero.Utilities.trimInternal(type.toLowerCase());
  if(type != "string") {
    var zoteroType = tex2zotero[type];
    if (!zoteroType) {
      trLog("discarded item from BibTeX; type was "+type);
      return;
    }
    var item = new Zotero.Item(zoteroType);

    item.extra = "";
  }

  var field = "";

  // by setting dontRead to true, we can skip a read on the next iteration
  // of this loop. this is useful after we read past the end of a string.
  var dontRead = false;

  while(dontRead || (read = Zotero.read(1))) {
    dontRead = false;

    if(read == "=") {                // equals begin a field
    // read whitespace
      var read = Zotero.read(1);
      while(" \n\r\t".indexOf(read) != -1) {
        read = Zotero.read(1);
      }

      if(keyRe.test(read)) {
        // read numeric data here, since we might get an end bracket
        // that we should care about
        value = "";
        value += read;

        // character is a number
        while((read = Zotero.read(1)) && keyRe.test(read)) {
          value += read;
        }

        // don't read the next char; instead, process the character
        // we already read past the end of the string
        dontRead = true;

        // see if there's a defined string
        if(strings[value]) value = strings[value];
      } else {
        var value = getFieldValue(read);
      }

      if(item) {
        processField(item, field.toLowerCase(), value);
      } else if(type == "string") {
        strings[field] = value;
      }
      field = "";
    } else if(read == ",") {            // commas reset
      if (item.itemID == null) {
        item.itemID = field; // itemID = citekey
      }
      field = "";
    } else if(read == closeChar) {
      if(item) {
        if(item.extra) {
          item.extra += "\n";
        } else {
          item.extra = '';
        }
        item.extra += 'bibtex: ' + item.itemID;

        item.complete();
      }
      return;
    } else if(" \n\r\t".indexOf(read) == -1) {    // skip whitespace
      field += read;
    }
  }
}

function doImport() {
  var read = "", text = "", recordCloseElement = false;
  var type = false;

  while(read = Zotero.read(1)) {
    if(read == "@") {
      type = "";
    } else if(type !== false) {
      if(type == "comment") {
        processComment();
        type = false;
      } else if(read == "{") {    // possible open character
        beginRecord(type, "}");
        type = false;
      } else if(read == "(") {    // possible open character
        beginRecord(type, ")");
        type = false;
      } else if(/[a-zA-Z0-9-_]/.test(read)) {
        type += read;
      }
    }
  }

  for (var key in jabref.root) {
    if (jabref.root.hasOwnProperty(key)) { jabref.root[key].complete(); }
  }
}

function escape_url(str) {
  return str.replace(/[\{\}\\_]/g, function(chr){return '%' + ('00' + chr.charCodeAt(0).toString(16)).slice(-2)});
}
function escape(value, sep) {
  if (typeof value == 'number') { return value; }
  if (!value) { return; }

  if (value instanceof Array) {
    if (value.length == 0) { return; }
    return value.collect(function(word) { return escape(word); }).join(sep);
  }

  var doublequote = value.literal;
  value = value.literal || value;
  value = convert.to_latex(value);
  if (doublequote) { value = '{' + value + '}'; }
  return value;
}

function writeField(field, value, bare) {
  if (typeof value == 'number') {
  } else {
    if (!value) { return; }
  }

  if (!bare) { value = '{' + value + '}'; }

  Zotero.write(",\n\t" + field + " = " + value);
}

function mapHTMLmarkup(characters){
  //converts the HTML markup allowed in Zotero for rich text to TeX
  //since  < and > have already been escaped, we need this rather hideous code - I couldn't see a way around it though.
  //italics and bold
  characters = characters.replace(/\{\\textless\}i\{\\textgreater\}(.+?)\{\\textless\}\/i{\\textgreater\}/g, "\\textit{$1}")
    .replace(/\{\\textless\}b\{\\textgreater\}(.+?)\{\\textless\}\/b{\\textgreater\}/g, "\\textbf{$1}");
  //sub and superscript
  characters = characters.replace(/\{\\textless\}sup\{\\textgreater\}(.+?)\{\\textless\}\/sup{\\textgreater\}/g, "\$^{\\textrm{$1}}\$")
    .replace(/\{\\textless\}sub\{\\textgreater\}(.+?)\{\\textless\}\/sub\{\\textgreater\}/g, "\$_{\\textrm{$1}}\$");
  //two variants of small caps
  characters = characters.replace(/\{\\textless\}span\sstyle=\"small\-caps\"\{\\textgreater\}(.+?)\{\\textless\}\/span{\\textgreater\}/g, "\\textsc{$1}")
    .replace(/\{\\textless\}sc\{\\textgreater\}(.+?)\{\\textless\}\/sc\{\\textgreater\}/g, "\\textsc{$1}");
  return characters;
}


function mapTeXmarkup(tex){
  //reverse of the above - converts tex mark-up into html mark-up permitted by Zotero
  //italics and bold
  tex = tex.replace(/\\textit\{([^\}]+\})/g, "<i>$1</i>").replace(/\\textbf\{([^\}]+\})/g, "<b>$1</b>");
  //two versions of subscript the .* after $ is necessary because people m
  tex = tex.replace(/\$[^\{\$]*_\{([^\}]+\})\$/g, "<sub>$1</sub>").replace(/\$[^\{]*_\{\\textrm\{([^\}]+\}\})/g, "<sub>$1</sub>");
  //two version of superscript
  tex = tex.replace(/\$[^\{]*\^\{([^\}]+\}\$)/g, "<sup>$1</sup>").replace(/\$[^\{]*\^\{\\textrm\{([^\}]+\}\})/g, "<sup>$1</sup>");
  //small caps
  tex = tex.replace(/\\textsc\{([^\}]+)/g, "<span style=\"small-caps\">$1</span>");
  return tex;
}
//Disable the isTitleCase function until we decide what to do with it.
/* const skipWords = ["but", "or", "yet", "so", "for", "and", "nor",
  "a", "an", "the", "at", "by", "from", "in", "into", "of", "on",
  "to", "with", "up", "down", "as", "while", "aboard", "about",
  "above", "across", "after", "against", "along", "amid", "among",
  "anti", "around", "as", "before", "behind", "below", "beneath",
  "beside", "besides", "between", "beyond", "but", "despite",
  "down", "during", "except", "for", "inside", "like", "near",
  "off", "onto", "over", "past", "per", "plus", "round", "save",
  "since", "than", "through", "toward", "towards", "under",
  "underneath", "unlike", "until", "upon", "versus", "via",
  "within", "without"];

function isTitleCase(string) {
  const wordRE = /[\s[(]([^\s,\.:?!\])]+)/g;

  var word;
  while (word = wordRE.exec(string)) {
    word = word[1];
    if(word.search(/\d/) != -1  //ignore words with numbers (including just numbers)
      || skipWords.indexOf(word.toLowerCase()) != -1) {
      continue;
    }

    if(word.toLowerCase() == word) return false;
  }
  return true;
}
*/


var CiteKeys = {
  keys: [],
  embeddedKeyRE: /bibtex:\s*([^\s\r\n]+)/,
  unsafechars: /[^-a-z0-9!\$\*\+\.\/:;\?\[\]]/ig,

  extract: function(item) {
    if (!item.extra) { return null; }

    var m = CiteKeys.embeddedKeyRE.exec(item.extra);
    if (!m) { return null; }

    item.extra = item.extra.replace(m[0], '');
    var key = m[1];
    if (CiteKeys.keys[key]) { trLog('BibTex export: duplicate key ' + key); }
    CiteKeys.keys[key] = true;
    return key;
  },

  getCreators: function(item, onlyEditors) {
    if(!item.creators || !item.creators.length) { return {}; }

    var creators = {
      authors:        [],
      editors:        [],
      translators:    [],
      collaborators:  []
    };
    var primaryCreatorType = Zotero.Utilities.getCreatorsForType(item.itemType)[0];
    var creator;
    item.creators.forEach(function(creator) {
      var name = ('' + creator.lastName).trim();
      if (name != '') {
        switch (creator.creatorType) {
          case 'editor':
          case 'seriesEditor':
            creators.editors.push(name);
            break;
          case 'translator':
            creators.translators.push(name);
            break;
          case primaryCreatorType:
            creators.authors.push(name);
            break;
          default:
            creators.collaborators.push(name);
        }
      }
    });

    for (type in creators) {
      if (creators[type].length == 0) { creators[type] = null; }
    }

    if (onlyEditors) { return creators.editors; }
    return creators.authors || creators.editors || creators.collaborators || creators.translators || null;
  },

  clean: function(str) {
    str = ZU.removeDiacritics(str).replace(CiteKeys.unsafechars, '').trim();
    return str;
  },

  _auth: function(item, onlyEditors, n, m) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    var author = authors[m || 0];
    if (author && n) { author = author.substring(0, n); }
    return author;
  },

  _authorLast: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    return authors[authors.length - 1];
  },

  _authors: function(item, onlyEditors, n) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    if (n) {
      var etal = (authors.length > n);
      authors = authors.slice(0, n);
      if (etal) { authors.push('EtAl'); }
    }
    authors = authors.join('');
    return authors;
  },

  _authorsAlpha: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    switch (authors.length) {
      case 1:
        return authors[0].substring(0, 3);
      case 2:
      case 3:
      case 4:
        return authors.collect(function(author) { return author.substring(0, 1); }).join('');
      default:
        return authors.slice(0, 3).collect(function(author) { return author.substring(0, 1); }).join('') + '+';
    }
  },

  _authIni: function(item, onlyEditors, n) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    return authors.collect(function(author) { return author.substring(0, n); }).join('');
  },

  _authorIni: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    var firstAuthor = authors.shift();

    return firstAuthor.substring(0, 5) + authors.collect(function(author) {
      return auth.split(/\s+/).collect(function(name) { return name.substring(0, 1); }).join('');
    }).join('');
  },

  _auth_auth_ea: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    var postfix = (authors.length > 2 ? '.ea' : '');
    return authors.slice(0,2).join('') + postfix;
  },

  _auth_etal: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    var postfix = (authors.length > 2 ? '.etal' : '');
    return authors.slice(0,2).join('') + postfix;
  },

  _authshort: function(item, onlyEditors) {
    var authors = CiteKeys.getCreators(item, onlyEditors);
    if (!authors) { return null; }

    switch (authors.length) {
      case 1:         return authors[0];
      case 2: case 3: return authors.collect(function(author) { return author.substring(0, 1); }).join('');
      default:        return authors.collect(function(author) { return author.substring(0, 1); }).join('') + '+';
    }
  },

  _firstpage: function(item) {
    if (!item.pages) { return null;}
    var firstpage = null;
    item.pages.replace(/^([0-9]+)/, function(match, fp) { firstpage = fp; });
    return firstpage;
  },

  _keyword: function(item, dummy, n) {
    if (!item.tags || !item.tags[n]) { return null; }
    return items.tags[n].tag;
  },

  _lastpage: function(item) {
    if (!item.pages) { return null;}
    var lastpage = null;
    item.pages.replace(/([0-9]+)[^0-9]*$/, function(match, lp) { lastpage = lp; });
    return lastpage;
  },

  words: function(str) {
    return str.split(/\s+/).filter(function(word) { return (word != '');}).collect(function (word) { return CiteKeys.clean(word) });
  },

  _shorttitle: function(item) {
    if (!item.title) { return null; }
    var words = CiteKeys.words(item.title);
    return words.slice(0,3).join('');
  },

  skipWords: ['a','an','the','some','from','on','in','to','of','do','with','der','die','das','ein',
              'eine','einer','eines','einem','einen','un','une','la','le',
              'l','el','las','los','al','uno','una','unos','unas','de','des','del','d'],

  _veryshorttitle: function(item) {
    if (!item.title) { return null; }
    return CiteKeys.words(item.title).collect(function (word) {
        return word.replace(/[^a-zA-Z]/, '');
      }).filter(function(word) {
        return (word != '' && CiteKeys.skipWords.indexOf(word.toLowerCase()) == -1);
      }).slice(0,3).join('');
  },

  _shortyear: function(item) {
    if (!item.date) { return null; }
    var date = Zotero.Utilities.strToDate(item.date);
    if (typeof date.year === 'undefined') { return null; }
    var year = date.year % 100;
    if (year < 10) { return '0' + year; }
    return year + '';
  },

  _year: function(item) {
    if (!item.date) { return null; }
    var date = Zotero.Utilities.strToDate(item.date);
    if (typeof date.year === 'undefined') { return item.date; }
    return date.year;
  },

  _title: function(item) {
    return item.title;
  },

  to_abbr: function(value) {
    if (!value) { return null; }
    return value.split(/\s+/).collect(function(word) { return word.substring(0, 1); }).join('');
  },

  to_lower: function(value) {
    if (!value) { return null; }
    return value.toLowerCase();
  },

  to_upper: function(value) {
    if (!value) { return null; }
    return value.toUpperCase();
  },

  transform: function(key, prefix) {
    var k = prefix + key.replace(/\./g, '_');
    var f = CiteKeys[k];
    if (typeof f === 'function') { return f; }
    throw("CiteKey formatter knows no function '" + key + "' (" + k + ")");
  },

  build: function(item) {
    var citekey = CiteKeys.extract(item);
    if (citekey) { return citekey; }

    var basekey = config.citeKeyFormat.replace(/\[([^\]]+)\]/g, function(match, command) {
      var cmds = command.split(':');
      var field = cmds.shift();
      var value = null;

      var N = null;
      var M = null;
      field.replace(/([0-9]+)_([0-9]+)$/, function(match, n, m) { N = n; M = m; return ''; });
      field.replace(/([0-9]+)$/, function(match, n) { N = n; return ''; });

      var onlyEditors = (field.match(/^edtr/) || field.match(/^editors/));
      field = field.replace(/^edtr/, 'auth').replace(/^editors/, 'authors');

      var value = CiteKeys.transform(field, '_')(item, onlyEditors, N, M);
      if (value) { value = CiteKeys.clean(value); }

      var cmd;
      cmds.forEach(function(cmd) {
        if (cmd.match(/^[(].*[)]$/)) {
          if (!value) { value = cmd.substring(1, cmd.length - 2); }
        } else {
          value = CiteKeys.transform(cmd, 'to_')(value);
        }
        if (value) { value = CiteKeys.clean(value); }
      });

      return value ? value : '';
    });

    basekey = CiteKeys.clean(basekey);

    citekey = basekey;
    var i = 0;
    while(CiteKeys.keys[citekey]) {
      i++;
      citekey = basekey + "-" + i;
    }
    CiteKeys.keys[citekey] = true;
    return citekey;
  }
};


function doExport() {
  //Zotero.write("% BibTeX export generated by Zotero "+Zotero.Utilities.getVersion());
  // to make sure the BOM gets ignored
  trLog('doBibTexExport');
  Zotero.write("\n");

  var first = true;
  var item;
  while(item = Zotero.nextItem()) {
    //don't export standalone notes and attachments
    if(item.itemType == "note" || item.itemType == "attachment") continue;

    // determine type
    var type = zotero2tex[item.itemType];
    if (typeof(type) == "function") { type = type(item); }
    if(!type) type = "misc";

    // create a unique citation key
    var citekey = CiteKeys.build(item);

    // write citation key
    Zotero.write((first ? "" : ",\n\n") + "@"+type+"{"+citekey);
    first = false;
    var value;

    for(var field in fieldMap) {
      if(item[fieldMap[field]]) {
        value = item[fieldMap[field]];
        if (field == 'url') {
          writeField(field, escape_url(value));
        } else {
          writeField(field, escape(value));
        }
      }
    }

    if(item.reportNumber || item.issue || item.seriesNumber || item.patentNumber) {
      writeField("number", escape(item.reportNumber || item.issue || item.seriesNumber|| item.patentNumber));
    }

    if (item.accessDate){
      var accessYMD = item.accessDate.replace(/\s*\d+:\d+:\d+/, "");
      writeField("urldate", escape(accessYMD));
    }

    if(item.publicationTitle) {
      if(item.itemType == "bookSection" || item.itemType == "conferencePaper") {
        writeField("booktitle", escape({literal: item.publicationTitle}));
      } else if(Zotero.getOption("useJournalAbbreviation") && item.journalAbbreviation){
        writeField('journal', escape({literal:item.journalAbbreviation}));
      } else {
        writeField("journal", escape({literal:item.publicationTitle}));
      }
    }

    if(item.publisher) {
      if(item.itemType == "thesis") {
        writeField("school", escape({literal:item.publisher}));
      } else if(item.itemType =="report") {
        writeField("institution", escape({literal:item.publisher}));
      } else {
        writeField("publisher", escape({literal:item.publisher}));
      }
    }

    if(item.creators && item.creators.length) {
      // split creators into subcategories
      var authors = [];
      var editors = [];
      var translators = [];
      var collaborators = [];
      var primaryCreatorType = Zotero.Utilities.getCreatorsForType(item.itemType)[0];
      var creator;

      item.creators.forEach(function(creator) {
        var creatorString = [creator.lastName, creator.firstName].filter(function(name) { return (('' + name).trim() != ''); }).join(', ');

        switch (creator.creatorType) {
          case 'editor':
          case 'seriesEditor':
            editors.push(creatorString);
            break;
          case 'translator':
            translators.push(creatorString);
          case primaryCreatorType:
            authors.push(creatorString);
            break;
          default:
            collaborators.push(creatorString);
        }
      });

      writeField('author', escape(authors, ' and '));
      writeField('editor', escape(editors, ' and '));
      writeField('translator', escape(translators, ' and '));
      writeField('collaborator', escape(collaborators, ' and '));
    }

    if(item.date) {
      var date = Zotero.Utilities.strToDate(item.date);
      if (typeof date.year === 'undefined') {
        writeField("year", escape({literal:item.date}));
      } else {
        // need to use non-localized abbreviation
        if(typeof date.month == "number") {
          writeField("month", escape(months[date.month]), true);
        }
        writeField("year", escape(date.year));
      }
    }

    writeField("note", escape(item.extra));

    writeField("keywords", escape(item.tags.collect(function(tag) { return tag.tag; }) , ', '));

    writeField("pages", escape(item.pages));

    // Commented out, because we don't want a books number of pages in the BibTeX "pages" field for books.
    //if(item.numPages) {
    //  writeField("pages", escape(item.numPages));
    //}

    /* We'll prefer url over howpublished see
    https://forums.zotero.org/discussion/24554/bibtex-doubled-url/#Comment_157802

    if(item.itemType == "webpage") {
      writeField("howpublished", item.url);
    }*/
    if (item.notes && Zotero.getOption("exportNotes")) {
      for(var i in item.notes) {
        var note = item.notes[i];
        writeField("annote", escape(Zotero.Utilities.unescapeHTML(note["note"])));
      }
    }

    if(item.attachments) {
      var attachments = [];
      item.attachments.forEach(function(att) {
        if (Zotero.getOption("exportFileData") && att.defaultPath && att.saveFile && att.saveFile(att.defaultPath, true)) {
          attachments.push({title: att.title, path: att.defaultPath, mimetype: att.mimeType});
        } else { if (att.localPath) {
          attachments.push({title: att.title, path: att.localPath, mimetype: att.mimeType});
        } }
      });
      attachments = attachments.collect(function(att) { return [att.title, att.path.replace(/([\\{}:;])/g, "\\$1"), att.mimetype].join(':'); }).join(';');
      writeField("file", attachments);
    }

    Zotero.write("\n}");
  }
}

var exports = {
	"doExport": doExport,
	"setKeywordDelimRe": setKeywordDelimRe,
	"setKeywordSplitOnSpace": setKeywordSplitOnSpace
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "@article{Adams2001,\nauthor = {Adams, Nancy K and DeSilva, Shanaka L and Self, Steven and Salas, Guido and Schubring, Steven and Permenter, Jason L and Arbesman, Kendra},\nfile = {:Users/heatherwright/Documents/Scientific Papers/Adams\\_Huaynaputina.pdf:pdf;::},\njournal = {Bulletin of Volcanology},\nkeywords = {Vulcanian eruptions,breadcrust,plinian},\npages = {493--518},\ntitle = {{The physical volcanology of the 1600 eruption of Huaynaputina, southern Peru}},\nvolume = {62},\nyear = {2001}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Nancy K",
						"lastName": "Adams",
						"creatorType": "author"
					},
					{
						"firstName": "Shanaka L",
						"lastName": "DeSilva",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Self",
						"creatorType": "author"
					},
					{
						"firstName": "Guido",
						"lastName": "Salas",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Schubring",
						"creatorType": "author"
					},
					{
						"firstName": "Jason L",
						"lastName": "Permenter",
						"creatorType": "author"
					},
					{
						"firstName": "Kendra",
						"lastName": "Arbesman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Vulcanian eruptions",
					"breadcrust",
					"plinian"
				],
				"seeAlso": [],
				"attachments": [
					{
						"path": "Users/heatherwright/Documents/Scientific Papers/Adams_Huaynaputina.pdf",
						"mimeType": "application/pdf",
						"title": "Attachment"
					}
				],
				"publicationTitle": "Bulletin of Volcanology",
				"pages": "493–518",
				"title": "The physical volcanology of the 1600 eruption of Huaynaputina, southern Peru",
				"volume": "62",
				"date": "2001"
			}
		]
	},
	{
		"type": "import",
		"input": "@Book{abramowitz+stegun,\n author    = \"Milton {Abramowitz} and Irene A. {Stegun}\",\n title     = \"Handbook of Mathematical Functions with\n              Formulas, Graphs, and Mathematical Tables\",\n publisher = \"Dover\",\n year      =  1964,\n address   = \"New York\",\n edition   = \"ninth Dover printing, tenth GPO printing\"\n}\n\n@Book{Torre2008,\n author    = \"Joe Torre and Tom Verducci\",\n publisher = \"Doubleday\",\n title     = \"The Yankee Years\",\n year      =  2008,\n isbn      = \"0385527403\"\n}\n",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Milton",
						"lastName": "Abramowitz",
						"creatorType": "author"
					},
					{
						"firstName": "Irene A.",
						"lastName": "Stegun",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Handbook of Mathematical Functions with Formulas, Graphs, and Mathematical Tables",
				"publisher": "Dover",
				"date": "1964",
				"place": "New York",
				"edition": "ninth Dover printing, tenth GPO printing"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Torre",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Verducci",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"publisher": "Doubleday",
				"title": "The Yankee Years",
				"date": "2008",
				"ISBN": "0385527403"
			}
		]
	},
	{
		"type": "import",
		"input": "@INPROCEEDINGS {author:06,\n title    = {Some publication title},\n author   = {First Author and Second Author},\n crossref = {conference:06},\n pages    = {330—331},\n}\n@PROCEEDINGS {conference:06,\n editor    = {First Editor and Second Editor},\n title     = {Proceedings of the Xth Conference on XYZ},\n booktitle = {Proceedings of the Xth Conference on XYZ},\n year      = {2006},\n month     = oct,\n}",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "First",
						"lastName": "Author",
						"creatorType": "author"
					},
					{
						"firstName": "Second",
						"lastName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Some publication title",
				"pages": "330—331"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "First",
						"lastName": "Editor",
						"creatorType": "editor"
					},
					{
						"firstName": "Second",
						"lastName": "Editor",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Proceedings of the Xth Conference on XYZ",
				"publicationTitle": "Proceedings of the Xth Conference on XYZ",
				"date": "October 2006"
			}
		]
	},
	{
		"type": "import",
		"input": "@Book{hicks2001,\n author    = \"von Hicks, III, Michael\",\n title     = \"Design of a Carbon Fiber Composite Grid Structure for the GLAST\n              Spacecraft Using a Novel Manufacturing Technique\",\n publisher = \"Stanford Press\",\n year      =  2001,\n address   = \"Palo Alto\",\n edition   = \"1st,\",\n isbn      = \"0-69-697269-4\"\n}",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "von Hicks, III",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Design of a Carbon Fiber Composite Grid Structure for the GLAST Spacecraft Using a Novel Manufacturing Technique",
				"publisher": "Stanford Press",
				"date": "2001",
				"place": "Palo Alto",
				"edition": "1st,",
				"ISBN": "0-69-697269-4"
			}
		]
	},
	{
		"type": "import",
		"input": "@article{Oliveira_2009, title={USGS monitoring ecological impacts}, volume={107}, number={29}, journal={Oil & Gas Journal}, author={Oliveira, A}, year={2009}, pages={29}}",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "A",
						"lastName": "Oliveira",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "USGS monitoring ecological impacts",
				"volume": "107",
				"issue": "29",
				"publicationTitle": "Oil & Gas Journal",
				"date": "2009",
				"pages": "29"
			}
		]
	},
	{
		"type": "import",
		"input": "@article{test-ticket1661,\ntitle={non-braking space: ~; accented characters: {\\~n} and \\~{n}; tilde operator: \\~},\n} ",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "non-braking space: ; accented characters: ñ and ñ; tilde operator: ∼"
			}
		]
	},
	{
		"type": "import",
		"input": "@ARTICLE{Frit2,\n  author = {Fritz, U. and Corti, C. and P\\\"{a}ckert, M.},\n  title = {Test of markupconversion: Italics, bold, superscript, subscript, and small caps: Mitochondrial DNA$_{\\textrm{2}}$ sequences suggest unexpected phylogenetic position\n        of Corso-Sardinian grass snakes (\\textit{Natrix cetti}) and \\textbf{do not}\n        support their \\textsc{species status}, with notes on phylogeography and subspecies\n        delineation of grass snakes.},\n  journal = {Actes du $4^{\\textrm{ème}}$ Congrès Français d'Acoustique},\n  year = {2012},\n  volume = {12},\n  pages = {71-80},\n  doi = {10.1007/s13127-011-0069-8}\n}\n",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "U.",
						"lastName": "Fritz",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Corti",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Päckert",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Test of markupconversion: Italics, bold, superscript, subscript, and small caps: Mitochondrial DNA<sub>2</sub>$ sequences suggest unexpected phylogenetic position of Corso-Sardinian grass snakes (<i>Natrix cetti</i>) and <b>do not</b> support their <span style=\"small-caps\">species status</span>, with notes on phylogeography and subspecies delineation of grass snakes.",
				"publicationTitle": "Actes du <sup>ème</sup>$ Congrès Français d'Acoustique",
				"date": "2012",
				"volume": "12",
				"pages": "71-80",
				"DOI": "10.1007/s13127-011-0069-8"
			}
		]
	},
	{
		"type": "import",
		"input": "@misc{american_rights_at_work_public_2012,\n    title = {Public Service Research Foundation},\n\turl = {http://www.americanrightsatwork.org/blogcategory-275/},\n\turldate = {2012-07-27},\n\tauthor = {American Rights at Work},\n\tyear = {2012},\n\thowpublished = {http://www.americanrightsatwork.org/blogcategory-275/},\n}",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "American Rights at",
						"lastName": "Work",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Public Service Research Foundation",
				"url": "http://www.americanrightsatwork.org/blogcategory-275/",
				"accessDate": "2012-07-27",
				"date": "2012"
			}
		]
	}
]
/** END TEST CASES **/

