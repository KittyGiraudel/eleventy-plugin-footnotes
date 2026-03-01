# eleventy-plugin-footnotes

This is an [11ty](https://www.11ty.dev) plugin to render [accessible footnotes](https://kittygiraudel.com/2020/11/24/accessible-footnotes-and-a-bit-of-react/) using Liquid.

- [Installation](#installation)
- [Usage](#usage)
- [Example](#example)
- [Customisation](#customisation)
- [FAQ](#faq)
  - [Why are footnotes not rendered?](#why-are-footnotes-not-rendered)
  - [Why is a specific footnote not rendered?](#why-is-a-specific-footnote-not-rendered)
  - [Why are numbers not displayed?](#why-are-numbers-not-displayed)

**Notes:**

- This plugin makes no styling consideration whatsoever. Refer to the [FAQ](#why-are-footnotes-not-rendered) for more information about styling.
- Check out [my own site’s repository](https://github.com/KittyGiraudel/site) for a real life usage of this plugin.

## Installation

Install the dependency from npm:

```sh
npm install eleventy-plugin-footnotes
```

Update your 11ty configuration:

```js
const footnotes = require('eleventy-plugin-footnotes')

module.exports = eleventyConfig => {
  eleventyConfig.addPlugin(footnotes, { /* … */ })
}
```

The plugin can be somewhat configured. Refer to the [customisation](#customisation) section for a complete look at the settings.

## Usage

1. Wrap a text section with the `footnoteref` Liquid tag while making sure to pass it an `id` as first argument, and the footnote content as a second argument. See [example](#example).

2. Render the footnotes section at the bottom of the article layout (or where you feel like) using the `{% footnotes %}` shortcode.

## Example

```html
Something about {% footnoteref "css-counters", "CSS counters are, in essence, variables maintained by CSS whose values may be incremented by CSS rules to track how many times they’re used." %}CSS counters{% endfootnoteref %} that deserves a footnote explaining
what they are.
```

Note that footnotes accept HTML, so you can inject any markup you want in there. If you would like to use Markdown (or any other filters of your choice), you could extract the footnote in a variable before: 

```html
{% assign css_counters_footnote = "[CSS counters](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Lists_and_Counters/Using_CSS_counters) are, in essence, variables maintained by CSS whose values may be incremented by CSS rules to track how many times they’re used." | markdown | replace: "<p>", "" | replace: "</p>", "" %}

Something about {% footnoteref "css-counters" css_counters_footnote %}CSS counters{% endfootnoteref %} that deserves a footnote explaining
what they are.
```

If the footnote content (2nd argument) is omitted: when another footnote with the same `id` already exists on the page, the reference is rendered and links to that existing footnote (so you can reference the same footnote multiple times). When no footnote with that `id` exists yet, the reference is not rendered and a warning is logged.

You can reference the same footnote multiple times in either order:

```html
In this article, {% footnoteref "pseudonyms", "All names used here are pseudonyms." %}Alice{% endfootnoteref %} and {% footnoteref "pseudonyms" %}Bob{% endfootnoteref %} are interviewees.
```

```html
In this article, {% footnoteref "pseudonyms" %}Alice{% endfootnoteref %} and {% footnoteref "pseudonyms", "All names used here are pseudonyms." %}Bob{% endfootnoteref %} are interviewees.
```

## Customisation

- `title`: The `title` option is the content of the title of the footnotes section. This title *can* be [visually hidden](https://kittygiraudel.com/2016/10/13/css-hide-and-seek/) if desired but it should not be removed or emptied.

- `titleId`: The `titleId` option is the `id` set to the title of the footnotes section. It is also referred in the `aria-describedby` attribute of every footnote reference.

- `backLinkLabel`: The `backLinkLabel` option is a function resolving the `aria-label` of the back link of every footnote. It is important it differs from back link to back link.

- `baseClass`: The `baseClass` option is used as the base class for all the other BEM classes (`<base>__ref`, `<base>`, `<base>__title`, `<base>__list`, `<base>__list-item`, `<base>__back-link`).

- `classes`: Custom class names map for each element rendered by the plugin, in case you want to apply some additional utility classes. Note that if you specify `baseClass`, these class names will be applied *in addition* to the BEMish class names rather than overriding them. The following keys can be used in this map:
  - `container`: class name for the footnotes footer that renders the title and all of the footnotes.
  - `title`: class name for the title that appears above the footnotes list.
  - `ref`: class name for the anchor that takes you to the footnote.
  - `list`: class name for the list that renders the footnotes themselves.
  - `listItem`: class name for the list items.
  - `backLink`: class name for the back-link that appears at the end of each footnote.

These are the default options:

```js
{
  baseClass: 'Footnotes',
  title: 'Footnotes',
  titleId: 'footnotes-label',
  backLinkLabel: (footnote, index) => 'Back to reference ' + index + 1,
  classes: {},
}
```

## FAQ

### Why are footnotes not rendered?

Make sure you have included the `footnotes` shortcode somewhere in your page, usually at the bottom of your content section.

```html
{% footnotes %}
```

### Why is a specific footnote not rendered?

If a reference does not pass the footnote content as second argument (or passes a falsy value), the footnote will be discarded entirely and the reference will not be wrapped with an anchor tag.

Additionally, a log like this one will be output during compilation:

```
[eleventy-plugin-footnotes] Warning: Footnote reference with id ‘css-counters’ has no given description (missing or falsy second argument); footnote omitted entirely.
```

Note that if a reference does not provide footnote content but uses an `id` that was already defined by another footnote, it will properly render a reference to that footnote. This allow for multiple references pointing to the same footnote. See [Multiple references to the same footnotes](#multiple-references-to-the-same footnote) for styling considerations.

### Why are numbers not displayed?

Unlike other footnoting systems, this one uses properly labeled anchors as references instead of numbers (e.g. `[1]`). This is better for accessibility since links can be tabbed through or listed devoid of their surrounding context, and therefore should be self-explanatory.

To still render a sup number after every reference, you can use CSS counters. Initialise a counter on your content container (or `body`), and increment it at every reference. Use a pseudo-element to render the number.

```css
body { counter-reset: footnotes }

[role="doc-noteref"]::after {
  counter-increment: footnotes;
  content: '[' counter(footnotes) ']'
}
```

### Multiple references to the same footnote

Using CSS counters means it is not possible to have multiple references to the same footnote, because the CSS counter will naturally increment with each reference — regardless of where it points to.

To work around the problem, the library also adds a `data-footnote-index` attribute to each footnote reference (so multiple references to the same footnote show the same number). Use a pseudo-element to render it:

```css
[role="doc-noteref"]::after {
  content: '[' attr(data-footnote-index) ']'
}
```

---

Refer to [this article on accessible footnotes](https://www.sitepoint.com/accessible-footnotes-css/) or [this stylesheet](https://github.com/KittyGiraudel/site/tree/main/assets/css/components/footnotes.css) for a more comprehensive styling solution.
