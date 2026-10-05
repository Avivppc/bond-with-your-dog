import Navbar from "@/components/Navbar";
import { FooterView } from "@/components/Footer";
import SalesAssistant from "@/components/assistant/SalesAssistant";
import { loadSiteSettings } from "@/lib/site-settings-server";
import type { PageDoc } from "@/lib/site/page-doc";
import type { SiteTheme } from "@/lib/site/theme";
import { fillLinkPlaceholders } from "@/lib/site/placeholders";
import { styleWrapper } from "@/lib/site/section-style";
import { editableTexts, fieldTargets } from "@/lib/site/inline-edit";
import { SECTION_DEFS } from "@/lib/site/registry";
import { PreviewInsert } from "./PreviewInsert";
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
  // Indexes count hidden sections too, so a "+" in the preview inserts at the right place.
  const sections = fillLinkPlaceholders(doc, settings.contactEmail).sections.map((s, index) => ({ ...s, index }));
  const visible = sections.filter((s) => !s.hidden);
  return (
    <>
      <Navbar links={theme.header.links} button={theme.header.button} logo={theme.logo} />
      <main className="pt-24 overflow-x-hidden">
        {preview && <PreviewInsert index={0} />}
        {visible.map((s) => {
          const Section = SECTION_COMPONENTS[s.type];
          if (!Section) return null;
          const wrap = styleWrapper(s.style);
          return (
            <div key={s.id}>
              <div
                id={s.style.anchor || undefined}
                data-section-id={preview ? s.id : undefined}
                data-edit-map={preview && SECTION_DEFS[s.type] ? JSON.stringify(editableTexts(SECTION_DEFS[s.type].fields, s.settings)) : undefined}
                data-target-map={preview && SECTION_DEFS[s.type] ? JSON.stringify(fieldTargets(SECTION_DEFS[s.type].fields, s.settings)) : undefined}
                className={[preview ? "relative" : "", wrap.className].filter(Boolean).join(" ") || undefined}
                style={wrap.style}
              >
                <Section settings={s.settings} id={s.id} />
              </div>
              {preview && <PreviewInsert index={s.index + 1} />}
            </div>
          );
        })}
      </main>
      <FooterView settings={settings} theme={theme} />
      {doc.assistant && !preview && <SalesAssistant />}
    </>
  );
}
