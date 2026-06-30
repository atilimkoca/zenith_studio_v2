/**
 * Bilingual message templating for automatic notifications.
 *
 * Templates contain `{degisken}` placeholders that are filled at send time.
 * Supported variables: {isim} {ders} {saat} {tarih} {kredi}.
 * Unknown placeholders are replaced with an empty string (never left raw).
 *
 * The same render logic is mirrored on the client (`notificationRulesService`)
 * so the admin "Test gönder" preview matches what users actually receive.
 */

const { TEMPLATE_VARIABLES } = require('./ruleDefs');

const PLACEHOLDER_RE = /\{(\w+)\}/g;

/** Pick the localized variant for a user's language, defaulting to TR. */
function pickLang(localized, lang) {
  if (!localized) return { title: '', body: '' };
  const normalized = (lang || 'tr').toString().toLowerCase().slice(0, 2);
  return localized[normalized] || localized.tr || localized.en || { title: '', body: '' };
}

/** Replace {vars} in a single string. Unknown vars -> ''. */
function fillString(str, vars) {
  if (!str) return '';
  return str.replace(PLACEHOLDER_RE, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * Render a bilingual template ({ tr:{title,body}, en:{...} }) for a given
 * language and variable bag. Returns { title, body }.
 */
function renderTemplate(template, lang, vars = {}) {
  const variant = pickLang(template, lang);
  return {
    title: fillString(variant.title, vars),
    body: fillString(variant.body, vars),
  };
}

/**
 * Validate a bilingual template. Returns { valid, unknownVariables: [] }.
 * Used by the admin form to warn about typos like {isi m} or {credit}.
 */
function validateTemplate(template) {
  const unknown = new Set();
  ['tr', 'en'].forEach((lang) => {
    const variant = (template && template[lang]) || {};
    [variant.title, variant.body].forEach((str) => {
      if (!str) return;
      let m;
      PLACEHOLDER_RE.lastIndex = 0;
      while ((m = PLACEHOLDER_RE.exec(str)) !== null) {
        if (!TEMPLATE_VARIABLES.includes(m[1])) unknown.add(m[1]);
      }
    });
  });
  return { valid: unknown.size === 0, unknownVariables: Array.from(unknown) };
}

module.exports = { renderTemplate, validateTemplate, pickLang, fillString, PLACEHOLDER_RE };
