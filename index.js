const clsx = require('clsx');

// Internal map storing the footnotes for every page. Keys are page file paths
// mapped to objects holding footnotes. Each footnote has refCount for unique
// ref ids.
// E.g.
// {
//    '_posts/foobar.md': {
//      'css-counters': { id: 'css-counters', description: '…', refCount: 2 }
//    }
// }
const FOOTNOTE_MAP = {}

// Internal map storing IDs that were referenced without a definition (so we can
// fix via transform when definition appears later)
const REFERENCED_WITHOUT_DEF = {}

// Internal map storing the count of placeholder refs per (page, id) so we can
// assign correct ref ids to the defining ref
const PENDING_REF_COUNT = {}

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
    FOOTNOTE_MAP[key] = FOOTNOTE_MAP[key] || {}

    // If no description is provided, the reference should either be omitted 
    // entirely, or if it uses an ID of another footnote reference, it should
    // render a reference to that existing footnote.
    if (!description) {
      const existing = FOOTNOTE_MAP[key][id]

      if (existing) {
        existing.refCount = (existing.refCount || 1) + 1

        const refId =
          existing.refCount === 1
            ? `${id}-ref`
            : `${id}-ref-${existing.refCount}`

        return `<a ${attrs({
          class: clsx(`${baseClass}__ref`, classes.ref),
          href: `#${id}-note`,
          id: refId,
          'data-footnote-index': existing.index,
          'aria-describedby': titleId,
          role: 'doc-noteref',
        })}>${content}</a>`
      }

      // If we lack a description, we currently do not know if it is because of
      // an editorial mistake or because the definition appears later in another
      // reference to the same footnote. We therefore need to keep track it and
      // render a placeholder that will be replaced in post-processing by the
      // actual anchor (or nothing if the definition remains missing).
      REFERENCED_WITHOUT_DEF[key] = REFERENCED_WITHOUT_DEF[key] || new Set()
      REFERENCED_WITHOUT_DEF[key].add(id)
      PENDING_REF_COUNT[key] = PENDING_REF_COUNT[key] || {}
      PENDING_REF_COUNT[key][id] = (PENDING_REF_COUNT[key][id] || 0) + 1

      return `<span data-footnote-placeholder data-footnote-id="${id}">${content}</span>`
    }

    // Register the footnote in the map (first ref)
    const hadPendingRefs = REFERENCED_WITHOUT_DEF[key]?.has(id)
    if (hadPendingRefs) REFERENCED_WITHOUT_DEF[key].delete(id)

    // Assign index so all refs to this footnote show the same number (CSS
    // counters would increment per-ref, so we provide this count in a separate
    // attribute).
    const index = Object.keys(FOOTNOTE_MAP[key]).length + 1
    const footnote = { id, description, refCount: 1, index }
    FOOTNOTE_MAP[key][id] = footnote

    // When definition comes after placeholders, defining ref gets ref-N
    // (placeholders get ref, ref-2, …).
    const pendingCount = PENDING_REF_COUNT[key]?.[id] || 0
    const refId = pendingCount > 0 ? `${id}-ref-${pendingCount + 1}` : `${id}-ref`

    // Return an anchor tag with all the necessary attributes
    return `<a ${attrs({
      class: clsx(`${baseClass}__ref`, classes.ref),
      href: `#${id}-note`,
      id: refId,
      'data-footnote-index': index,
      'aria-describedby': titleId,
      role: 'doc-noteref',
    })}>${content}</a>`
  }

  /**
   * Transform to replace placeholders (refs before definition) with proper
   * anchors.
   * @param {string} content - The HTML content to transform
   * @returns {string} The transformed HTML content
   * @internal
  */
  function footnoteTransform(content) {
    const inputPath = this?.page?.inputPath
    if (!inputPath) return content

    const footnoteMap = FOOTNOTE_MAP[inputPath]
    if (!footnoteMap) return content

    const refCount = {}
    const indexMap = Object.fromEntries(
      Object.entries(footnoteMap).map(([id, fn]) => [id, fn.index])
    )

    return content.replace(
      /<span(?=[^>]*data-footnote-placeholder)(?=[^>]*data-footnote-id="([^"]+)")[^>]*>([\s\S]*?)<\/span>/g,
      (_, fnId, innerContent) => {
        const index = indexMap[fnId]
        if (!index) {
          console.log(
            `[eleventy-plugin-footnotes] Warning: Footnote reference with id ‘${fnId}’ has no given description (missing or falsy second argument); footnote omitted entirely.\n`
          )
          return innerContent
        }

        refCount[fnId] = (refCount[fnId] || 0) + 1

        const refId = refCount[fnId] === 1
          ? `${fnId}-ref`
          : `${fnId}-ref-${refCount[fnId]}`

        return `<a ${attrs({
          class: clsx(`${baseClass}__ref`, classes.ref),
          href: `#${fnId}-note`,
          id: refId,
          'data-footnote-index': index,
          'aria-describedby': titleId,
          role: 'doc-noteref',
        })}>${innerContent.trim()}</a>`
      }
    )
  }

  // Register transform to replace placeholders with anchors
  if (config.addTransform) {
    config.addTransform('footnote-placeholders', footnoteTransform)
  }

  /**
   * `footnotes` shortcode that renders the footnotes references wherever it is
   * invoked.
   * @returns {string} The HTML content of the footnotes section
  */
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
  return { footnoteref, footnotes, footnoteTransform }
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
