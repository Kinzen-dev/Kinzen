import { SOFTWARE } from "@/fx/engine/capability";

/**
 * Runs before first paint.
 * 1. A stored theme choice never flashes. No stored choice = follow the system (CSS light-dark()).
 * 2. The hero field gate: on the home page, html[data-fx="pending"] is set only when the particle
 *    field is going to draw the wordmark (resolved theme dark, no reduced motion, no ?fx=off, no
 *    Save-Data, a hardware WebGL2 context with a float colour buffer). In that state the DOM
 *    wordmark is never shown (fx.css), so the dust condenses out of nothing instead of over a
 *    second copy of the name; fx.css reveals it after 1.8 s unless the field reports a drawn frame
 *    (data-fx="on"), and the field reveals it at once if it gives up (data-fx="off").
 *    The WebGL2 probe is a real context (about 5 to 15 ms on the GPUs measured, then released) so
 *    a software renderer or a blocklisted GPU is answered here, before paint, and those visitors
 *    see the wordmark from the first frame instead of after a blank wait for the field's verdict.
 *    window.__kzFxGate is reused by HeroFx after a client-side navigation back to the home page.
 * No scripting = no attribute = the DOM wordmark, as served.
 */
const gate = `function(){try{var d=document.documentElement,t=d.dataset.theme,m=function(q){return matchMedia(q).matches},n=navigator.connection;if(t==="light"||(t!=="dark"&&!m("(prefers-color-scheme: dark)"))||m("(prefers-reduced-motion: reduce)")||new URLSearchParams(location.search).get("fx")==="off"||(n&&n.saveData))return false;var g=document.createElement("canvas").getContext("webgl2");if(!g)return false;var x=g.getExtension("WEBGL_debug_renderer_info"),r=String(g.getParameter(x?x.UNMASKED_RENDERER_WEBGL:g.RENDERER)),f=!!(g.getExtension("EXT_color_buffer_float")||g.getExtension("EXT_color_buffer_half_float")),l=g.getExtension("WEBGL_lose_context");l&&l.loseContext();return f&&!/${SOFTWARE.source}/i.test(r)}catch(e){return false}}`;

const script = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}window.__kzFxGate=${gate};if(/^\\/(th\\/?)?$/.test(location.pathname)&&window.__kzFxGate())document.documentElement.dataset.fx="pending";`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
