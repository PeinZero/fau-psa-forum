import { loadFont as loadNotoEmoji } from "@remotion/google-fonts/NotoColorEmoji";
import { loadFont as loadRedditSans } from "@remotion/google-fonts/RedditSans";

// Same family as the site (next/font Reddit Sans); a neutral emoji set keeps the chat generic.
loadRedditSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext"] });
loadNotoEmoji("normal", { weights: ["400"], subsets: ["emoji"] });
