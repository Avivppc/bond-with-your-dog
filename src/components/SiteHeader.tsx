import Navbar from "@/components/Navbar";
import { loadLiveTheme } from "@/lib/site/server";

/** The public header with the links, button and logo from Website → Theme. */
export default async function SiteHeader() {
  const { header, logo } = await loadLiveTheme();
  return <Navbar links={header.links} button={header.button} logo={logo} />;
}
