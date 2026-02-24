import { curseVisualClass } from '../../core/systems/curseSystem';
import CurseMeter from '../hud/CurseMeter';

type Props = {
  roomName: string;
  targetConsonant: string;
  curse: number;
};

export default function SceneView({ roomName, targetConsonant, curse }: Props) {
  return (
    <section className={`scene-view ${curseVisualClass(curse)}`}>
      <video className="scene-video" src="/assets/scenes/oldhouse_room_loop.mp4" muted loop playsInline autoPlay />

      <img className="overlay smoke" src="/assets/overlays/overlay_smoke_room.png" alt="smoke" />
      <img className="overlay crack" src="/assets/overlays/overlay_crack_glass.png" alt="crack" />
      <img className="overlay noise" src="/assets/overlays/overlay_noise_film.png" alt="noise" />
      <img className="overlay vignette" src="/assets/overlays/overlay_vignette.png" alt="vignette" />

      <span className="glyph-blink">{targetConsonant}</span>

      <div className="scene-hud">
        <h1>{roomName}</h1>
        <CurseMeter curse={curse} />
      </div>
    </section>
  );
}
