import "./styles.css";
import "./fonts";

import { AbsoluteFill, Composition, Sequence } from "remotion";

import { Score } from "./audio/score";
import { DURATION, FPS, HEIGHT, SCENES, WIDTH } from "./lib/timeline";
import { sceneComponents } from "./scenes";
import { Gallery, GALLERY_FRAMES } from "./screens/gallery";
import { Backdrop } from "./stage/backdrop";

function Film() {
  return (
    <AbsoluteFill>
      <Backdrop />
      {SCENES.map((s) => {
        const Scene = sceneComponents[s.id];
        return (
          <Sequence key={s.id} name={s.title} from={s.from} durationInFrames={s.durationInFrames}>
            <Scene />
          </Sequence>
        );
      })}
      <Score />
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <>
      <Composition id="Film" component={Film} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
      {SCENES.map((s, i) => {
        const Scene = sceneComponents[s.id];
        const Preview = () => (
          <AbsoluteFill>
            <Backdrop offset={s.from} />
            <Scene />
          </AbsoluteFill>
        );
        return (
          <Composition
            key={s.id}
            id={`S${String(i + 1).padStart(2, "0")}-${s.id}`}
            component={Preview}
            durationInFrames={s.durationInFrames}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        );
      })}
      <Composition id="Gallery" component={Gallery} durationInFrames={GALLERY_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
}
