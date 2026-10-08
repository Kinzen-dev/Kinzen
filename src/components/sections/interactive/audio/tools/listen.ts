/*
 * The listening bench (lab only, never shipped): every voice on the real bus, with its controls.
 * Bundled by build-listen.mts into one self-contained HTML file with the audio files inlined.
 */
import { getAudioBus } from "../audio-bus";
import { createCozyMusic } from "../music";
import { createRain, type Rain } from "../rain";
import { createSfx } from "../sfx";
import { createThock } from "../thock";

const bus = getAudioBus();
const thock = createThock(bus);
const sfx = createSfx(bus);
const music = createCozyMusic(bus);
let rain: Rain | null = null;
let intensity = 0.7;
let velocity = 0.7;
let randomVel = true;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const on = (sel: string, ev: string, fn: (e: Event) => void) => $(sel).addEventListener(ev, fn);
const num = (e: Event) => Number((e.target as HTMLInputElement).value);

on("#mute", "click", () => {
  bus.setMuted(!bus.muted);
});
bus.onChange(() => {
  $("#mute").textContent = bus.muted ? "Sound: off" : "Sound: on";
  const ctx = bus.ctx;
  $("#lat").textContent = `context ${ctx.state}, ${ctx.sampleRate} Hz, base latency ${((ctx.baseLatency ?? 0) * 1000).toFixed(1)} ms, output latency ${((ctx.outputLatency ?? 0) * 1000).toFixed(1)} ms`;
});

on("#rain", "click", () => {
  if (rain) {
    rain.stop();
    rain = null;
    $("#rain").textContent = "Start rain";
  } else {
    rain = createRain(bus);
    rain.setIntensity(intensity);
    $("#rain").textContent = "Stop rain";
  }
});
on("#intensity", "input", (e) => {
  intensity = num(e);
  rain?.setIntensity(intensity);
  $("#intensity-v").textContent = intensity.toFixed(2);
});
on("#thunder-near", "click", () => rain?.thunder(0.2));
on("#thunder-far", "click", () => rain?.thunder(0.9));

let playing = false;
on("#music", "click", () => {
  playing = !playing;
  if (playing) music.start();
  else music.stop();
  $("#music").textContent = playing ? "Stop music" : "Start music";
});
on("#volume", "input", (e) => {
  music.setVolume(num(e));
  $("#volume-v").textContent = num(e).toFixed(2);
});

on("#velocity", "input", (e) => {
  velocity = num(e);
  $("#velocity-v").textContent = velocity.toFixed(2);
});
on("#randomvel", "change", (e) => {
  randomVel = (e.target as HTMLInputElement).checked;
});
const pad = $("#pad");
let spaceTimer = 0;
pad.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  thock.press(e.code, randomVel ? 0.45 + Math.random() * 0.5 : velocity);
  if (e.code === "Space" && !spaceTimer) spaceTimer = window.setInterval(() => thock.spaceRipple(), 850);
});
pad.addEventListener("keyup", (e) => {
  thock.release(e.code);
  if (e.code === "Space") {
    window.clearInterval(spaceTimer);
    spaceTimer = 0;
  }
});

const speed = () => Number(($("#speed") as HTMLInputElement).value);
on("#speed", "input", () => ($("#speed-v").textContent = speed().toFixed(2)));
on("#clink", "click", () => sfx.metalClink(speed()));
on("#splash", "click", () => sfx.splash(speed()));
on("#drop", "click", () => sfx.drop(speed()));
let silence: (() => void) | null = null;
on("#ring", "click", () => {
  silence?.();
  silence = sfx.phoneRing();
});
on("#ring-stop", "click", () => silence?.());
on("#lamp-on", "click", () => sfx.lamp(true));
on("#lamp-off", "click", () => sfx.lamp(false));
for (const k of ["mug", "pen", "ball", "desk", "floor", "wall", "phone", "lamp"] as const)
  on(`#knock-${k}`, "click", () => sfx.knock(k, speed()));
on("#thud", "click", () => sfx.thud(speed()));
on("#purr", "click", () => sfx.purr());
on("#chime", "click", () => sfx.chime());
