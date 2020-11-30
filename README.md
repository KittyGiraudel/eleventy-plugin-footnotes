# eleventy-plugin-footnotes

This is an [11ty](https://www.11ty.dev) plugin to render [accessible footnotes](https://hugogiraudel.com/2020/11/24/accessible-footnotes-and-a-bit-of-react/) in an 11ty set up using Liquid.

**Notes:**

- It *might* work with Nunjucks but has not been tested. In theory, it should since it uses the universal 11ty methods to add shortcotes.
- This plugin makes no styling consideration whatsoever. Please refer to [this article on accessible footnotes](https://www.sitepoint.com/accessible-footnotes-css/) or [this stylesheet](eleventy-plugin-footnotes) for styling suggestions using CSS counters.
- Check out [my own site’s repository](https://github.com/HugoGiraudel/hugogiraudel.com) for a real life usage of this plugin.

## Installation

```sh
npm install eleventy-plugin-footnotes
```

```js
const footnotes = require('eleventy-plugin-footnotes')

module.exports = eleventyConfig => {
  const options = {}
  eleventyConfig.addPlugin(footnotes, options)
}
```

The plugin can be somewhat configured. Refer to the [customisation](#customisation) section for a complete look at the settings.

## Usage

1. Wrap a text section with the `footnoteref` Liquid tag while making sure to pass it an `id` as first argument, and the footnote content as a second argument. See [example](#example).

2. Render the footnotes section at the bottom of the article layout (or where you feel like) using the `footnotes` shortcode while making sure to pass it the `page` object.

```liquid
{% footnotes page %}
```

## Example

```html
Something about {% footnoteref "css-counters" "CSS counters are, in essence, variables maintained by CSS whose values may be incremented by CSS rules to track how many times they’re used." %}CSS counters{% endfootnoteref %} that deserves a footnote explaining
what they are.
```

## Customisation

- `title`: The `title` option is the content of the title of the footnotes section. This title *can* be [visually hidden](https://hugogiraudel.com/2016/10/13/css-hide-and-seek/) if desired but it should not be removed or emptied.

- `titleId`: The `titleId` option is the `id` set to the title of the footnotes section. It is also referred in the `aria-describedby` attribute of every footnote reference.

- `backLinkLabel`: The `backLinkLabel` option is a function resolving the `aria-label` of the back link of every footnote. It is important it differs from back link to back link.

- `baseClass`: The `baseClass` option is used as the base class for all the other BEM classes (`<base>__ref`, `<base>`, `<base>__title`, `<base>__list`, `<base>__list-item`, `<base>__back-link`).

This is the default options:

```js
{
  baseClass: 'Footnotes',
  title: 'Footnotes',
  titleId: 'footnotes-label',
  backLinkLabel: (footnote, index) => 'Back to reference ' + index + 1
}
