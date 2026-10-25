import { headerAnchor, SiteHeader, type ThemeChoice } from "../site-header";

/*
 * The right end of the signed-in site header (search, ask, theme toggle, bell, account), cropped out
 * of a 1280px wide page. The toggle cycles system → light → dark like the site's ThemeToggle.
 */

const PAGE_WIDTH = 1280;
const MARGIN = 24;
const SEARCH_WIDTH = 224;
const toggle = headerAnchor("theme-toggle", { width: PAGE_WIDTH, signedIn: true });
const account = headerAnchor("account", { width: PAGE_WIDTH, signedIn: true });
const searchLeft = headerAnchor("search", { width: PAGE_WIDTH, signedIn: true }).x - SEARCH_WIDTH / 2;
/** Page x of the window's left edge. */
const CROP_X = searchLeft - MARGIN;

export const HEADER_CARD = {
  width: account.x + 22 + MARGIN - CROP_X,
  height: 56,
  /** Centre of the theme toggle in window px. */
  toggle: { x: toggle.x - CROP_X, y: toggle.y },
};

export function HeaderCard({ themeChoice, hoverToggle = false }: { themeChoice: ThemeChoice; hoverToggle?: boolean }) {
  return (
    <div className="absolute inset-0 bg-background">
      <div className="absolute top-0" style={{ left: -CROP_X, width: PAGE_WIDTH }}>
        <SiteHeader signedIn themeChoice={themeChoice} hover={hoverToggle ? "theme" : null} backgroundOpacity={1} />
      </div>
    </div>
  );
}
