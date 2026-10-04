/**
 * Where the marketing-email box may start ticked: countries where marketing email to a new
 * sign-up is lawful on an opt-out basis, so leaving the box ticked is a valid yes.
 *
 * Everywhere else (the EU/EEA, UK, Israel, Canada, Australia, Brazil, Korea and most of the rest of
 * the world) the law wants the person's own explicit agreement first, or is unclear, so the box
 * starts unticked. The list is deliberately an allow-list: a country nobody has checked is strict.
 *
 * Verified opt-out: the United States (CAN-SPAM needs an unsubscribe link, a postal address and
 * prompt opt-outs, not prior consent). Japan's law allows a default-on box but its guidelines
 * recommend default-off, so Japan stays strict. To add a country, confirm its rule first.
 *
 * Product default, not legal advice: have a lawyer review it when the audience changes.
 */
export const PRETICK_COUNTRIES: ReadonlySet<string> = new Set<string>(["US"]);
