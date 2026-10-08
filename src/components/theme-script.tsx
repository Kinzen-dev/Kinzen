/**
 * Runs before first paint: a stored theme choice never flashes. No stored choice = follow the
 * system (CSS light-dark()).
 * (Until v4 this also probed WebGL2 before paint for the hero field. The v4 hero opens on the ink
 * desk, an SVG, and its GPU scenes load after first paint, so nothing is decided before paint and
 * no probe context is created.)
 */
const script = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
