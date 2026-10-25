import type { ComponentType } from "react";

import type { SceneId } from "../lib/timeline";
import { NoiseScene } from "./01-noise";
import { OnePlaceScene } from "./02-one-place";
import { SearchScene } from "./03-search";
import { AnswerScene } from "./04-answer";
import { AskScene } from "./05-ask";
import { BothSidesScene } from "./06-both-sides";
import { StartHereScene } from "./07-start-here";
import { EverythingScene } from "./08-everything";
import { BackToChatScene } from "./09-back-to-chat";
import { EndCardScene } from "./10-end-card";

export const sceneComponents: Record<SceneId, ComponentType> = {
  noise: NoiseScene,
  onePlace: OnePlaceScene,
  search: SearchScene,
  answer: AnswerScene,
  ask: AskScene,
  bothSides: BothSidesScene,
  startHere: StartHereScene,
  everything: EverythingScene,
  backToChat: BackToChatScene,
  endCard: EndCardScene,
};
