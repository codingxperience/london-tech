# Review draft offers

Open `/collections/shop/?preview=offers` to review the complete card treatment: negative discount percentages, crossed comparison prices, the selling price in English and Arabic, and remaining-stock labels.

The page shows a persistent **DEMO OFFER REVIEW** banner. Each card also says **Demo offer** and **Demo stock**. The examples use existing guide prices and deterministic sample comparison prices/counts. They are display-only: the catalogue, inventory, cart and payment validation retain the actual store values. Review mode continues during navigation in the same session; **Exit demo** removes it immediately. Reloading a URL without `preview=offers` uses normal store data.

In normal mode, confirmed selling/comparison prices produce a discount only when the comparison price is greater than the selling price. Known stock shows the exact remaining count. Unknown stock remains unconfirmed, and guide prices retain their label.

To replace the examples with real offers, update the product's selling price, previous price, confirmed-price setting and available quantity in the store console. Reference-photo notes are editable in the Gallery tab and survive routine price and stock updates. Model/reference uncertainties are recorded in [the catalogue audit](CATALOGUE_AUDIT.md).
