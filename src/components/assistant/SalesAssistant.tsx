import SalesLauncher from "./SalesLauncher";

/**
 * Mount point for the visitor assistant on public marketing pages (home, chapters, checkout).
 * The on/off check (assistant_settings.sales_enabled) runs from the launcher through the API, not
 * here: most marketing pages are prerendered, so a check at render time would freeze the switch
 * at build time. Never mount this in the admin or the member app.
 */
export default function SalesAssistant() {
  return <SalesLauncher />;
}
