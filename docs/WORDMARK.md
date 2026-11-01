# London Tech wordmark artwork

The wordmark SVG files use contours taken directly from the supplied `public/assets/london-tech-logo.png` artwork. No substitute font or generated lettering was used. The `LONDON` region is `(27,149)–(428,235)` and the `TECH` region is `(27,234)–(428,379)` in the 512px source.

The original navy and red were sampled from the interior letter pixels (`#08203f` and `#d23136`). The inverse variant uses white for the navy letters on dark surfaces and retains the source red. The shapes, including the distinctive split L/D and the dot in each O, remain the supplied logo's shapes.

The horizontal variants align the two words at the same cap height. The stacked variants preserve the source words' relative widths. All variants have transparent backgrounds and scale without a bitmap rectangle.

`BrandWordmark` supports `inverse`, `stacked`, `decorative`, `width`, `className` and `style`. Use `decorative` when its containing link already has an accessible London Tech label. Width may also be controlled responsively with the `--brand-wordmark-width` CSS variable.
