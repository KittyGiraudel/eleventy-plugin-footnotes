const plugin = require('./')

const config = { addPairedShortcode: jest.fn(), addShortcode: jest.fn() }

describe('The `footnoteref` paired shortcode', () => {
  const { footnoteref } = plugin(config)
  const context = { page: { inputPath: 'tests/footnoteref' } }
  const content = 'CSS counters'
  const id = 'css-counters'
  const footnote =
    'CSS counters are, in essence, variables maintained by CSS whose values may be incremented by CSS rules to track how many times they’re used.'

  it('should properly render an anchor', () => {
    const root = document.createElement('div')
    root.innerHTML = footnoteref.call(context, content, id, footnote)

    const anchor = root.querySelector('a')

    expect(anchor).not.toEqual(null)
    expect(anchor.getAttribute('href')).toBe(`#${id}-note`)
    expect(anchor.getAttribute('id')).toBe(`${id}-ref`)
    expect(anchor.getAttribute('data-footnote-index')).toBe('1')
    expect(anchor.getAttribute('role')).toBe('doc-noteref')
    expect(anchor.getAttribute('aria-describedby')).toBe('footnotes-label')
    expect(anchor.textContent).toBe(content)
  })

  it('should output placeholder when description is omitted and no footnote with that id exists', () => {
    const contextWithoutFootnote = { page: { inputPath: 'tests/footnoteref-orphan' } }
    const result = footnoteref.call(contextWithoutFootnote, content, id)

    expect(result).toContain('data-footnote-placeholder')
    expect(result).toContain('data-footnote-id="css-counters"')
    expect(result).toContain('CSS counters')
  })

  it('should render an anchor linking to existing footnote when description is omitted but id matches', () => {
    const root = document.createElement('div')
    // First ref with description registers the footnote
    root.innerHTML =
      footnoteref.call(context, 'Alice', 'pseudonyms', 'All names in this article are pseudonyms.') +
      footnoteref.call(context, 'Bob', 'pseudonyms')

    const anchors = root.querySelectorAll('a')
    expect(anchors.length).toBe(2)
    expect(anchors[0].getAttribute('href')).toBe('#pseudonyms-note')
    expect(anchors[0].getAttribute('id')).toBe('pseudonyms-ref')
    expect(anchors[1].getAttribute('href')).toBe('#pseudonyms-note')
    expect(anchors[1].getAttribute('id')).toBe('pseudonyms-ref-2')
    expect(anchors[1].textContent).toBe('Bob')
  })

  it('should output same data-footnote-index for all refs to the same footnote', () => {
    const ctx = { page: { inputPath: 'tests/footnoteref-index' } }
    const root = document.createElement('div')
    root.innerHTML =
      footnoteref.call(ctx, 'Alice', 'shared', 'One footnote for both.') +
      footnoteref.call(ctx, 'Bob', 'shared')

    const anchors = root.querySelectorAll('a')
    expect(anchors[0].getAttribute('data-footnote-index')).toBe('1')
    expect(anchors[1].getAttribute('data-footnote-index')).toBe('1')
  })

  it('should support definition appearing after ref (placeholders + transform)', () => {
    const ctx = { page: { inputPath: 'tests/footnoteref-def-second' } }
    const { footnoteref, footnoteTransform, footnotes } = plugin(config)
    const root = document.createElement('div')
    const aliceHtml = footnoteref.call(ctx, 'Alice', 'late-def')
    const bobHtml = footnoteref.call(ctx, 'Bob', 'late-def', 'Definition comes second.')
    const footnotesHtml = footnotes.call(ctx)

    // Before transform: Alice is placeholder span, Bob is anchor
    expect(aliceHtml).toContain('data-footnote-placeholder')
    expect(aliceHtml).toContain('data-footnote-id="late-def"')
    expect(bobHtml).toContain('id="late-def-ref-2"')

    // Simulate full page and run transform
    const fullHtml = `<div>${aliceHtml}${bobHtml}</div>${footnotesHtml}`
    const transformed = footnoteTransform.call(ctx, fullHtml)

    const transformedRoot = document.createElement('div')
    transformedRoot.innerHTML = transformed
    const anchors = transformedRoot.querySelectorAll('a[href="#late-def-note"]')
    expect(anchors.length).toBe(2)
    expect(anchors[0].getAttribute('id')).toBe('late-def-ref')
    expect(anchors[0].textContent).toBe('Alice')
    expect(anchors[1].getAttribute('id')).toBe('late-def-ref-2')
    expect(anchors[1].textContent).toBe('Bob')
    expect(anchors[0].getAttribute('data-footnote-index')).toBe('1')
    expect(anchors[1].getAttribute('data-footnote-index')).toBe('1')
  })

  it('should warn when placeholder never gets a definition', () => {
    const ctx = { page: { inputPath: 'tests/footnoteref-orphan-warn' } }
    const { footnoteref, footnoteTransform } = plugin(config)
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const placeholder = footnoteref.call(ctx, 'Orphan', 'never-defined')
    const fullHtml = `<div>${placeholder}</div>`

    footnoteTransform.call(ctx, fullHtml)

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/never-defined.*no given description|no given description.*never-defined/)
    )
    spy.mockRestore()
  })
})

describe('The `footnotes` shortcode', () => {
  const { footnoteref, footnotes } = plugin(config, {
    titleId: 'footnotes-title-id',
    title: 'Footnote references',
  })
  const context = { page: { inputPath: 'tests/footnotes' } }
  const root = document.createElement('div')

  beforeAll(() => {
    footnoteref.call(context, 'foo', 'foo-id', 'foo-footnote')
    footnoteref.call(context, 'bar', 'bar-id', 'bar-footnote')
    footnoteref.call(context, 'baz', 'baz-id', 'baz-footnote')
  })

  beforeEach(() => {
    root.innerHTML = footnotes.call(context)
  })

  it('should not render anything if no footnotes', () => {
    root.innerHTML = footnotes.call({ page: { inputPath: 'foobar' } })
    expect(root.textContent).toBe('')
  })

  it('should render a container', () => {
    const container = root.querySelector('footer')
    expect(container).not.toBeUndefined()
    expect(container.getAttribute('role')).toBe('doc-endnotes')
    expect(container.getAttribute('class')).toBe('Footnotes')
  })

  it('should render a title', () => {
    const title = root.querySelector('h2')
    expect(title).not.toBeUndefined()
    expect(title.getAttribute('class')).toBe('Footnotes__title')
    expect(title.getAttribute('id')).toBe('footnotes-title-id')
    expect(title.textContent).toBe('Footnote references')
  })

  it('should render a list', () => {
    const list = root.querySelector('ol')
    expect(list).not.toBeUndefined()
    expect(list.getAttribute('class')).toBe('Footnotes__list')
    expect(list.querySelectorAll('li').length).toBe(3)
  })

  it('should render list items', () => {
    const listItem = root.querySelector('li')
    expect(listItem).not.toBeUndefined()
    expect(listItem.getAttribute('class')).toBe('Footnotes__list-item')
    expect(listItem.getAttribute('id')).toBe('foo-id-note')
    expect(listItem.textContent).toBe('foo-footnote ↩')
  })

  it('should render back links', () => {
    const backLink = root.querySelector('a')
    expect(backLink).not.toBeUndefined()
    expect(backLink.getAttribute('class')).toBe('Footnotes__back-link')
    expect(backLink.getAttribute('href')).toBe('#foo-id-ref')
    expect(backLink.getAttribute('aria-label')).toBe('Back to reference 1')
    expect(backLink.getAttribute('role')).toBe('doc-backlink')
    expect(backLink.textContent).toBe('↩')
  })
})

describe('The `eleventy-plugin-footnotes` plugin', () => {
  const context = { page: { inputPath: 'tests/config' } }

  it('should allow customising the title id', () => {
    const { footnoteref, footnotes } = plugin(config, { titleId: 'foobar' })
    const root = document.createElement('div')
    root.innerHTML = footnoteref.call(context, 'foo', 'foo-id', 'foo-footnote')
    root.innerHTML += footnotes.call(context)
    const anchor = root.querySelector('a')
    const title = root.querySelector('h2')

    expect(anchor.getAttribute('aria-describedby')).toBe('foobar')
    expect(title.getAttribute('id')).toBe('foobar')
  })

  it('should allow customising the title', () => {
    const { footnotes } = plugin(config, { title: 'this is the title' })
    const root = document.createElement('div')
    root.innerHTML = footnotes.call(context)
    const title = root.querySelector('h2')

    expect(title.textContent).toBe('this is the title')
  })

  it('should allow customising the base class', () => {
    const { footnotes, footnoteref } = plugin(config, { baseClass: 'Kitty' })
    const root = document.createElement('div')
    root.innerHTML = footnoteref.call(context, 'foo', 'foo-id', 'foo-footnote')
    root.innerHTML += footnotes.call(context)

    expect(root.querySelector('a').getAttribute('class')).toBe('Kitty__ref')
    expect(root.querySelector('footer').getAttribute('class')).toBe('Kitty')
    expect(root.querySelector('h2').getAttribute('class')).toBe('Kitty__title')
    expect(root.querySelector('ol').getAttribute('class')).toBe('Kitty__list')
    expect(root.querySelector('li').getAttribute('class')).toBe(
      'Kitty__list-item'
    )
    expect(root.querySelector('li a').getAttribute('class')).toBe(
      'Kitty__back-link'
    )
  })

  it('should allow customising the back link label', () => {
    const { footnotes } = plugin(config, {
      backLinkLabel: (_, i) => 'Go to ' + (i + 1),
    })
    const root = document.createElement('div')
    root.innerHTML = footnotes.call(context)

    expect(root.querySelector('a').getAttribute('aria-label')).toBe('Go to 1')
  })

  it('should allow customizing class names for individual elements', () => {
    const { footnotes, footnoteref } = plugin(config, {
      baseClass: 'Kitty',
      classes: {
        container: 'footer',
        title: 'title',
        ref: 'ref',
        list: 'list',
        listItem: 'item',
        backLink: 'back-link',
      }
    })
    const root = document.createElement('div')
    root.innerHTML = footnoteref.call(context, 'foo', 'foo-id', 'foo-footnote')
    root.innerHTML += footnotes.call(context)

    // Use classlists in case we change the internal order of class names in the future
    const containerClasses = root.querySelector('footer').classList
    const titleClasses = root.querySelector('h2').classList
    const refClasses = root.querySelector('a').classList
    const listClasses = root.querySelector('ol').classList
    const itemClasses = root.querySelector('li').classList
    const backLinkClasses = root.querySelector('li a').classList

    expect(containerClasses.contains('Kitty')).toBe(true)
    expect(containerClasses.contains('footer')).toBe(true)
    expect(containerClasses.length).toBe(2)

    expect(titleClasses.contains('Kitty__title')).toBe(true)
    expect(titleClasses.contains('title')).toBe(true)
    expect(titleClasses.length).toBe(2)

    expect(refClasses.contains('Kitty__ref')).toBe(true)
    expect(refClasses.contains('ref')).toBe(true)
    expect(refClasses.length).toBe(2)

    expect(listClasses.contains('Kitty__list')).toBe(true)
    expect(listClasses.contains('list')).toBe(true)
    expect(listClasses.length).toBe(2)

    expect(itemClasses.contains('Kitty__list-item')).toBe(true)
    expect(itemClasses.contains('item')).toBe(true)
    expect(itemClasses.length).toBe(2)

    expect(backLinkClasses.contains('Kitty__back-link')).toBe(true)
    expect(backLinkClasses.contains('back-link')).toBe(true)
    expect(backLinkClasses.length).toBe(2)
  })
})
