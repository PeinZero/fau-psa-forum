import type { SceneId } from "../lib/timeline.ts";
import { lines as answer } from "./answer.ts";
import { lines as ask } from "./ask.ts";
import { lines as backToChat } from "./backToChat.ts";
import { lines as bothSides } from "./bothSides.ts";
import { lines as endCard } from "./endCard.ts";
import { lines as everything } from "./everything.ts";
import { lines as noise } from "./noise.ts";
import { lines as onePlace } from "./onePlace.ts";
import { lines as search } from "./search.ts";
import { lines as startHere } from "./startHere.ts";
import type { Line } from "./types.ts";

export const sceneLines: Record<SceneId, Line[]> = {
  noise,
  onePlace,
  search,
  answer,
  ask,
  bothSides,
  startHere,
  everything,
  backToChat,
  endCard,
};
