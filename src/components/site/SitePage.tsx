import Navbar from "@/components/Navbar";
import { FooterView } from "@/components/Footer";
import SalesAssistant from "@/components/assistant/SalesAssistant";
import { loadSiteSettings } from "@/lib/site-settings-server";
import type { PageDoc } from "@/lib/site/page-doc";
import type { SiteTheme } from "@/lib/site/theme";
import { fillLinkPlaceholders } from "@/lib/site/placeholders";
import { SECTION_COMPONENTS } from "./sections";

interface SitePageProps {
  doc: PageDoc;
  theme: SiteTheme;
  /** In the editor's preview: every section can be clicked to select it, and the chat stays off. */
  preview?: boolean;
}

/** A website page made of sections, with the theme's header and footer. */
export async function SitePage({ doc, theme, preview = false }: SitePageProps) {
  const settings = await loadSiteSettings();
  const visible = fillLinkPlaceholders(doc, settings.contactEmail).sections.filter((s) => !s.hidden);
  return (
    <>
      <Navbar links={theme.header.links} button={theme.header.button} logo={theme.logo} />
      <main className="pt-24 overflow-x-hidden">
        {visible.map((s) => {
          const Section = SECTION_COMPONENTS[s.type];
          if (!Section) return null;
          return (
            <div key={s.id} data-section-id={preview ? s.id : undefined} className={preview ? "relative" : undefined}>
              <Section settings={s.settings} id={s.id} />
            </div>
          );
        })}
      </main>
      <FooterView settings={settings} theme={theme} />
      {doc.assistant && !preview && <SalesAssistant />}
    </>
  );
}
