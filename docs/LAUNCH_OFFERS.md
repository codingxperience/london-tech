# Launch offers

On 1 November 2026 the store owner approved adopting the proposed selling prices, comparison prices and opening stock as the store's launch figures. They are stored explicitly in `src/data/launch-offers.json`, merged into the source catalogue, and shown on ordinary URLs. There is no preview mode or demo labelling.

Comparison prices represent the approved regular prices; they are not a claim about verified historical sales. Negative percentages are calculated from each product's current confirmed selling and regular price. Arabic-Indic amounts show the same UGX price, without currency conversion.

Existing databases apply the launch values once, within a versioned transaction. Untouched guide prices become confirmed selling prices; unknown opening inventory receives the approved count. Existing merchant prices, comparison prices and numeric inventory (including zero) are retained. The migration does not rerun or replenish stock on later cold starts. A failed transaction rolls back its marker so it can be retried.

Subsequent changes belong in the store console. Cards, details, comparison, cart and server order validation read the same product fields. Newly added unconfirmed prices or unknown stock still require store confirmation. Payment availability depends on the configured Flutterwave merchant integration.
