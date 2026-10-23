export const GUIDE_TITLE_MIN = 4;
export const GUIDE_TITLE_MAX = 120;
export const GUIDE_SUMMARY_MAX = 300;
export const GUIDE_SLUG_MAX = 80;
export const STEP_TITLE_MIN = 2;
export const STEP_TITLE_MAX = 120;
export const STEP_BODY_MAX = 5000;
export const GUIDE_STEPS_MAX = 30;

export const GUIDE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GUIDE_SLUG_MAX)
    .replace(/-+$/, "");
}

/** Lets the moderation area add the entry next to Announcements. */
export const GUIDES_MOD_NAV_ITEM = { href: "/mod/guides", label: "Guides" } as const;
