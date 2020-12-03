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
    expect(anchor.getAttribute('role')).toBe('doc-noteref')
    expect(anchor.getAttribute('aria-describedby')).toBe('footnotes-label')
    expect(anchor.textContent).toBe(content)
  })

  it('should not render an anchor if description is omitted', () => {
    const root = document.createElement('div')
    root.innerHTML = footnoteref.call(context, content, id)

    const anchor = root.querySelector('a')

    expect(anchor).toEqual(null)
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
    expect(listItem.getAttribute('role')).toBe('doc-endnote')
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
})
