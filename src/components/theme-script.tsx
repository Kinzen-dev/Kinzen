/**
 * Runs before first paint so a stored theme choice never flashes.
 * No stored choice = follow the system (CSS light-dark()).
 */
const script = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
