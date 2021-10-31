const clsx = require('clsx');

// Internal map storing the footnotes for every page. Keys are page file paths
// mapped to objects holding footnotes.
// E.g.
// {
//    '_posts/foobar.md': {
//      'css-counters': { id: 'css-counters', description: '…' }
//    }
// }
const FOOTNOTE_MAP = {}

/** 
 * @param {object} config - 11ty config
 * @param {object} [options] - Plugin options
 * @param {string} [baseClass] - Base CSS class for BEM
 * @param {object} [classes] - custom class names for each element
 * @param {string} [title] - Footnotes section title
 * @param {string} [titleId] - Footnotes section title ID
 * @param {func} [backLinkLabel] - Footnote back link label generator
*/
module.exports = (config, options = {}) => {
  const { 
    baseClass = 'Footnotes',
    title = 'Footnotes',
    titleId = 'footnotes-label',
    backLinkLabel = ((_, index) => `Back to reference ${index + 1}`),
    classes = {}
  } = options;
  const bemClass = getBemClass(baseClass)

  /** 
   * @param {string} content - Footnote reference content
   * @param {string} id - Footnote id
   * @param {string} description - Actual footnote content
  */ 
  function footnoteref(content, id, description) {
    const key = this.page.inputPath
    const footnote = { id, description }

    if (!description) {
      console.log(
        `[eleventy-plugin-footnotes] Warning: Footnote reference with id ‘${id}’ has no given description (missing or falsy second argument); footnote omitted entirely.\n`
      )

      return content
    }

    // Register the footnote in the map
    FOOTNOTE_MAP[key] = FOOTNOTE_MAP[key] || {}
    FOOTNOTE_MAP[key][id] = footnote

    // Return an anchor tag with all the necessary attributes
    return `<a ${attrs({
      class: clsx(`${baseClass}__ref`, classes.ref),
      href: `#${id}-note`,
      id: `${id}-ref`,
      'aria-describedby': titleId,
      role: 'doc-noteref',
    })}>${content}</a>`
  }

  /** `footnotes` shortcode that renders the footnotes references wherever it's invoked. */
  function footnotes() {
    const key = this.page.inputPath
    const footnotes = Object.values(FOOTNOTE_MAP[key] || {})

    // If there are no footnotes for the given page, render nothing
    if (footnotes.length === 0) return ''

    const containerAttrs = attrs({ role: 'doc-endnotes', class: clsx(bemClass(), classes.container) })
    const titleAttrs = attrs({ id: titleId, class: clsx(bemClass('title'), classes.title) })
    const listAttrs = attrs({ class: clsx(bemClass('list'), classes.list) })

    function renderFootnote(footnote, index) {
      const listItemAttrs = attrs({
        id: `${footnote.id}-note`,
        class: clsx(bemClass('list-item'), classes.listItem),
        role: 'doc-endnote',
      })
      const backLinkAttrs = attrs({
        class: clsx(bemClass('back-link'), classes.backLink),
        href: `#${footnote.id}-ref`,
        'aria-label': backLinkLabel(footnote, index),
        role: 'doc-backlink',
      })

      return `<li ${listItemAttrs}>${footnote.description} <a ${backLinkAttrs}>↩</a></li>`
    }

    return `
  <footer ${containerAttrs}>
    <h2 ${titleAttrs}>${title}</h2>
    <ol ${listAttrs}>${footnotes.map(renderFootnote).join('\n')}</ol>
  </footer>`
  }

  // API exposed by the plugin
  config.addPairedShortcode('footnoteref', footnoteref)
  config.addShortcode('footnotes', footnotes)

  // Returned for testing purposes
  return { footnoteref, footnotes }
}

/** Small utility to convert an object into a string of HTML attributes */
function attrs(object) {
  return Object.keys(object).reduce((acc, key, index) => {
    return [acc, `${key}="${object[key]}"`].filter(Boolean).join(' ')
  }, '')
}

/** Small utility to append element suffix to BEM block base class */
function getBemClass(block) {
  return element => block + (element ? '__' + element : '')
}
