import { Audio, staticFile } from "remotion";

/** The original 120 BPM electronic-pop score, rendered to a file by `npm run score`. */
export function Score() {
  return <Audio src={staticFile("audio/score.wav")} />;
}
