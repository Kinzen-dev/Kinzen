import * as THREE from "three";
import type { SpotId } from "./copy";
import { inkify, steamMaterial, unlit, windowMaterial } from "./ink";
import { DESK_Y, makeProp, type Obstacle, type Prop } from "./physics";
import {
  AgentScreen,
  CatDoodle,
  Notepad,
  cityTexture,
  dialTexture,
  keyboardTexture,
  leafArtTexture,
  noteTexture,
  polaroidTexture,
  rng,
} from "./textures";

/*
 * The room, modelled in code at desk scale (metres): desk, ultrawide monitor, keyboard, lamp,
 * gold desk phone with a coiled cord, notepad, pen, mug, crumpled note, pen cup, books, two
 * plants, the window over the city, and the wall's pinned papers (one is the cat doodle).
 * Every mesh gets its own ink id; each hotspot owns a contiguous id range so the line pass
 * can light up its whole outline on hover.
 */

export type Leaf = { pivot: THREE.Object3D; base: THREE.Euler; v: number; a: number; k: number };

export type Built = {
  scene: THREE.Scene;
  ranges: Record<SpotId, [number, number]>;
  propRanges: [number, number][];
  anchors: Record<SpotId, THREE.Vector3>;
  lamp: { light: THREE.SpotLight; head: THREE.Object3D; inner: THREE.ShaderMaterial; bulb: THREE.ShaderMaterial };
  phone: { group: THREE.Group; handset: THREE.Object3D; cord: THREE.Mesh; rebuildCord: () => void; dial: THREE.Object3D };
  screen: THREE.ShaderMaterial;
  steam: THREE.Mesh;
  screenLight: THREE.PointLight;
  glass: THREE.ShaderMaterial;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  props: Prop[];
  obstacles: Obstacle[];
  leaves: Leaf[];
  plants: THREE.Vector3[];
  agents: AgentScreen;
  notepad: Notepad;
  cat: CatDoodle;
  catNote: THREE.Object3D;
};

type Opts = { phone: boolean; font: string };

export function buildRoom({ phone, font }: Opts): Built {
  const scene = new THREE.Scene();
  let nextId = 1;
  const seg = (n: number) => (phone ? Math.max(6, Math.round(n * 0.6)) : n);

  /** A material with a given ink id (several materials of one object share it). */
  const lamId = (id: number, color: THREE.ColorRepresentation, extra: Partial<THREE.MeshLambertMaterialParameters> = {}, hatch = 1) =>
    inkify(new THREE.MeshLambertMaterial({ color, ...extra }), id, { hatch });
  const lam = (color: THREE.ColorRepresentation, extra: Partial<THREE.MeshLambertMaterialParameters> = {}, hatch = 1) =>
    lamId(nextId++, color, extra, hatch);
  const add = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    shadow: [boolean, boolean] = [true, true],
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = shadow[0];
    m.receiveShadow = shadow[1];
    parent.add(m);
    return m;
  };
  const ranges = {} as Record<SpotId, [number, number]>;
  const spot = (id: SpotId, build: () => void) => {
    const lo = nextId;
    build();
    ranges[id] = [lo, nextId - 1];
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt: number, rb: number, h: number, n = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg(n), 1, open);
  const obstacles: Obstacle[] = [];

  /* ---- Room shell ---- */
  const WALL_Z = -0.62;
  const WIN = { x0: -0.84, x1: 0.84, y0: 1.0, y1: 2.12 };
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-3.4, 0);
  wallShape.lineTo(3.4, 0);
  wallShape.lineTo(3.4, 3.6);
  wallShape.lineTo(-3.4, 3.6);
  wallShape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(WIN.x0, WIN.y0);
  hole.lineTo(WIN.x0, WIN.y1);
  hole.lineTo(WIN.x1, WIN.y1);
  hole.lineTo(WIN.x1, WIN.y0);
  hole.closePath();
  wallShape.holes.push(hole);
  add(scene, new THREE.ShapeGeometry(wallShape), lam("#29324d", {}, 0), [0, 0, WALL_Z], [0, 0, 0], [false, true]);
  add(scene, new THREE.PlaneGeometry(8, 6), lam("#0f1322", {}, 0), [0, 0, 1], [-Math.PI / 2, 0, 0], [false, true]);

  /* ---- Window (reveal, frame, mullion, sill, glass) ---- */
  const frame = "#151b2c";
  spot("window", () => {
    const depth = 0.16;
    const zc = WALL_Z - depth / 2;
    const w = WIN.x1 - WIN.x0;
    const h = WIN.y1 - WIN.y0;
    const reveal = lam("#232b42", {}, 0.3);
    add(scene, box(w + 0.02, 0.02, depth), reveal, [0, WIN.y1 + 0.01, zc]);
    add(scene, box(0.02, h, depth), reveal, [WIN.x0 - 0.01, (WIN.y0 + WIN.y1) / 2, zc]);
    add(scene, box(0.02, h, depth), lam("#232b42", {}, 0.3), [WIN.x1 + 0.01, (WIN.y0 + WIN.y1) / 2, zc]);
    // Sill juts into the room.
    add(scene, box(w + 0.12, 0.03, depth + 0.1), lam("#2a3149"), [0, WIN.y0 - 0.015, zc + 0.05]);
    const glassZ = WALL_Z - depth + 0.02;
    const fm = lam(frame, {}, 0.3);
    const bar = 0.035;
    add(scene, box(w, bar, 0.04), fm, [0, WIN.y1 - bar / 2, glassZ + 0.02]);
    add(scene, box(w, bar, 0.04), lam(frame, {}, 0.3), [0, WIN.y0 + bar / 2, glassZ + 0.02]);
    add(scene, box(bar, h, 0.04), lam(frame, {}, 0.3), [WIN.x0 + bar / 2, (WIN.y0 + WIN.y1) / 2, glassZ + 0.02]);
    add(scene, box(bar, h, 0.04), lam(frame, {}, 0.3), [WIN.x1 - bar / 2, (WIN.y0 + WIN.y1) / 2, glassZ + 0.02]);
    add(scene, box(bar, h, 0.04), lam(frame, {}, 0.3), [-0.3, (WIN.y0 + WIN.y1) / 2, glassZ + 0.02]);
  });
  const glass = windowMaterial(nextId++, cityTexture());
  add(scene, new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), glass, [0, (WIN.y0 + WIN.y1) / 2, WALL_Z - 0.14], [0, 0, 0], [false, false]);
  ranges.window[1] = nextId - 1;

  /* ---- Desk ---- */
  const wood = "#3b2d24";
  add(scene, box(1.98, 0.04, 0.9), lam(wood, {}, 0.4), [0, DESK_Y - 0.02, -0.03]);
  add(scene, box(0.04, DESK_Y - 0.04, 0.84), lam("#2c2220"), [-0.95, (DESK_Y - 0.04) / 2, -0.03]);
  add(scene, box(0.44, DESK_Y - 0.04, 0.84), lam("#2c2220"), [0.74, (DESK_Y - 0.04) / 2, -0.03]);
  for (let i = 0; i < 3; i++) {
    const y = 0.13 + i * 0.22;
    add(scene, box(0.4, 0.2, 0.012), lam("#33281f"), [0.74, y, 0.395]);
    add(scene, box(0.08, 0.012, 0.02), lam("#8a6a3a"), [0.74, y + 0.05, 0.405]);
  }
  add(scene, box(1.5, 0.3, 0.02), lam("#241c1a"), [-0.15, DESK_Y - 0.19, -0.44]);

  /* ---- Monitor + keyboard + mouse ---- */
  const agents = new AgentScreen(font);
  let screen!: THREE.ShaderMaterial;
  const MON = { x: 0.02, y: 1.075, z: -0.27, w: 1.06, h: 0.42 };
  spot("monitor", () => {
    const g = new THREE.Group();
    g.position.set(MON.x, 0, MON.z);
    scene.add(g);
    add(g, box(0.28, 0.012, 0.17), lam("#161a24"), [0, DESK_Y + 0.006, -0.02]);
    add(g, box(0.055, 0.25, 0.03), lam("#161a24"), [0, DESK_Y + 0.13, -0.05]);
    const head = new THREE.Group();
    head.position.set(0, MON.y, 0);
    head.rotation.x = -0.05;
    g.add(head);
    add(head, box(MON.w, MON.h, 0.03), lam("#10131b", {}, 0.4), [0, 0, 0]);
    screen = unlit(nextId++, { map: agents.texture, gain: 1.15 });
    add(head, new THREE.PlaneGeometry(MON.w - 0.04, MON.h - 0.04), screen, [0, 0.002, 0.0152], [0, 0, 0], [false, false]);
    const kb = nextId++;
    const side = lamId(kb, "#1b1f2b");
    add(scene, box(0.47, 0.02, 0.15), [side, side, lamId(kb, "#ffffff", { map: keyboardTexture() }), side, side, side], [-0.05, DESK_Y + 0.01, 0.07], [0.04, 0, 0]);
  });
  const mouse = new THREE.SphereGeometry(1, seg(16), seg(10));
  mouse.scale(0.034, 0.016, 0.052);
  add(scene, mouse, lam("#1b1f2b"), [0.24, DESK_Y + 0.004, 0.06]);
  obstacles.push({ x: MON.x, z: MON.z - 0.02, r: 0.12, name: "monitor" });
  const screenLight = new THREE.PointLight("#8fa6ff", 0.35, 1.6, 2);
  screenLight.position.set(MON.x, MON.y - 0.05, MON.z + 0.25);
  scene.add(screenLight);

  /* ---- Lamp ---- */
  const lampBase = new THREE.Vector3(-0.7, DESK_Y, -0.2);
  const P1 = new THREE.Vector3(-0.78, 1.12, -0.28);
  const P2 = new THREE.Vector3(-0.58, 1.27, -0.08);
  const T = new THREE.Vector3(-0.34, DESK_Y, 0.1);
  let lampHead!: THREE.Group;
  let inner!: THREE.ShaderMaterial;
  let bulb!: THREE.ShaderMaterial;
  spot("lamp", () => {
    const metal = "#2a3042";
    add(scene, cyl(0.075, 0.08, 0.022, 32), lam(metal), [lampBase.x, DESK_Y + 0.011, lampBase.z]);
    add(scene, cyl(0.012, 0.012, 0.012, 12), lam("#c8952f"), [lampBase.x + 0.045, DESK_Y + 0.026, lampBase.z + 0.03]);
    const arm = (a: THREE.Vector3, b: THREE.Vector3) => {
      const len = a.distanceTo(b);
      const m = add(scene, cyl(0.008, 0.008, len, 8), lam(metal), [0, 0, 0]);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    };
    const base = lampBase.clone().setY(DESK_Y + 0.02);
    arm(base, P1);
    arm(P1, P2);
    // A spring alongside each arm, like the real thing.
    arm(base.clone().add(new THREE.Vector3(0.02, 0.04, 0.01)), P1.clone().add(new THREE.Vector3(0.02, -0.06, 0.01)));
    for (const p of [P1, P2]) add(scene, new THREE.SphereGeometry(0.016, seg(12), seg(8)), lam(metal), [p.x, p.y, p.z]);
    lampHead = new THREE.Group();
    lampHead.position.copy(P2);
    scene.add(lampHead);
    const aim = new THREE.Group();
    lampHead.add(aim);
    // Point the shade's axis (-y) at the target.
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), T.clone().sub(P2).normalize());
    add(aim, cyl(0.03, 0.095, 0.13, 32, true), lam("#262c3d", { side: THREE.FrontSide }), [0, -0.07, 0]);
    inner = unlit(nextId++, { color: "#ffcf86", gain: 1.6 });
    inner.side = THREE.BackSide;
    add(aim, cyl(0.029, 0.093, 0.128, 32, true), inner, [0, -0.07, 0], [0, 0, 0], [false, false]);
    add(aim, cyl(0.03, 0.03, 0.03, 16), lam("#262c3d"), [0, 0.01, 0]);
    bulb = unlit(nextId++, { color: "#fff1d0", gain: 5 });
    add(aim, new THREE.SphereGeometry(0.03, seg(16), seg(12)), bulb, [0, -0.1, 0], [0, 0, 0], [false, false]);
  });
  obstacles.push({ x: lampBase.x, z: lampBase.z, r: 0.08, name: "lamp" });
  const light = new THREE.SpotLight("#ffc46e", 2.2, 3.2, 0.95, 0.75, 1.6);
  light.position.copy(P2).add(T.clone().sub(P2).normalize().multiplyScalar(0.09));
  light.target.position.copy(T);
  light.castShadow = true;
  light.shadow.mapSize.set(phone ? 512 : 1024, phone ? 512 : 1024);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.01;
  light.shadow.camera.near = 0.03;
  light.shadow.camera.far = 3;
  scene.add(light, light.target);
  // Spill from the lamp's shade across the right of the desk (the phone catches it).
  const spill = new THREE.PointLight("#ffbf6a", 0.35, 1.8, 2);
  spill.position.set(0.25, 1.15, 0.3);
  scene.add(spill);

  /* ---- Phone ---- */
  const phoneGroup = new THREE.Group();
  let handset!: THREE.Group;
  let cord!: THREE.Mesh;
  let dial!: THREE.Mesh;
  const gold = (k = 1) =>
    inkify(
      new THREE.MeshPhongMaterial({ color: new THREE.Color("#e0ab45").multiplyScalar(k), specular: "#ffe7b0", shininess: 38, emissive: new THREE.Color("#5a3c10").multiplyScalar(k) }),
      nextId++,
      { hatch: 0.3 },
    );
  const cordStart = new THREE.Vector3(-0.115, 0.02, 0.0);
  const cordPath = () => {
    const end = handset.position.clone().add(new THREE.Vector3(-0.1, -0.03, 0).applyEuler(handset.rotation));
    const mid = cordStart.clone().lerp(end, 0.5).add(new THREE.Vector3(-0.07, -0.02, 0.05));
    const curve = new THREE.CatmullRomCurve3([end, end.clone().add(new THREE.Vector3(-0.03, -0.04, 0.01)), mid, cordStart.clone().add(new THREE.Vector3(-0.04, -0.01, 0.02)), cordStart]);
    const N = 220;
    const pts: THREE.Vector3[] = [];
    const frames = curve.computeFrenetFrames(N, false);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPointAt(t);
      const a = t * Math.PI * 2 * 26;
      const r = 0.009 * Math.min(1, t * 12, (1 - t) * 12);
      p.addScaledVector(frames.normals[i], Math.cos(a) * r).addScaledVector(frames.binormals[i], Math.sin(a) * r);
      pts.push(p);
    }
    return new THREE.CatmullRomCurve3(pts);
  };
  spot("phone", () => {
    phoneGroup.position.set(0.6, DESK_Y, 0.0);
    phoneGroup.rotation.y = -0.38;
    scene.add(phoneGroup);
    const prof = new THREE.Shape();
    prof.moveTo(-0.095, 0);
    prof.lineTo(0.095, 0);
    prof.lineTo(0.085, 0.035);
    prof.lineTo(-0.06, 0.088);
    prof.lineTo(-0.09, 0.085);
    prof.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.19, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: phone ? 1 : 3, curveSegments: 4 });
    bodyGeo.rotateY(Math.PI / 2);
    bodyGeo.translate(-0.095, 0.008, 0);
    add(phoneGroup, bodyGeo, gold());
    // The dial's top face carries the drawn finger holes.
    const dialSide = gold();
    const dialFace = inkify(new THREE.MeshPhongMaterial({ map: dialTexture(), specular: "#ffe2a0", shininess: 40 }), nextId - 1, { hatch: 0.5 });
    dial = add(phoneGroup, cyl(0.05, 0.052, 0.01, 40), [dialSide, dialFace, dialSide], [0, 0.064, 0.012], [0.32, 0, 0]);
    for (const x of [-0.072, 0.072]) add(phoneGroup, box(0.022, 0.032, 0.03), gold(0.9), [x, 0.095, -0.06]);
    handset = new THREE.Group();
    handset.position.set(0, 0.122, -0.06);
    phoneGroup.add(handset);
    const bar = new THREE.CapsuleGeometry(0.016, 0.17, 4, seg(12));
    bar.rotateZ(Math.PI / 2);
    add(handset, bar, gold());
    for (const x of [-0.1, 0.1]) add(handset, cyl(0.032, 0.026, 0.036, 20), gold(), [x, -0.018, 0]);
    cord = add(phoneGroup, new THREE.TubeGeometry(cordPath(), phone ? 160 : 320, 0.0028, 5), gold(0.85), [0, 0, 0], [0, 0, 0], [true, false]);
  });
  const rebuildCord = () => {
    cord.geometry.dispose();
    cord.geometry = new THREE.TubeGeometry(cordPath(), phone ? 160 : 320, 0.0028, 5);
  };
  obstacles.push({ x: 0.6, z: 0.0, r: 0.11, name: "phone" });

  /* ---- Notepad ---- */
  const notepad = new Notepad();
  {
    const id = nextId++;
    const paper = lamId(id, "#ffffff", { map: notepad.texture, emissive: "#ffffff", emissiveMap: notepad.texture, emissiveIntensity: 0.16 }, 0.5);
    const side = lamId(id, "#d8cfbb", {}, 0.5);
    add(scene, box(0.27, 0.012, 0.2), [side, side, paper, side, side, side], [0.31, DESK_Y + 0.006, 0.24], [0, 0.12, 0]);
  }

  /* ---- Loose props ---- */
  const props: Prop[] = [];
  let steam!: THREE.Mesh;
  const propRanges: [number, number][] = [];
  const prop = (build: () => Prop) => {
    const lo = nextId;
    props.push(build());
    propRanges.push([lo, nextId - 1]);
  };
  // Pen.
  prop(() => {
    const g = new THREE.Group();
    scene.add(g);
    const body = cyl(0.0058, 0.0058, 0.13, 12);
    body.rotateZ(Math.PI / 2);
    add(g, body, lam("#1f2433"));
    const tip = new THREE.ConeGeometry(0.0058, 0.02, seg(12));
    tip.rotateZ(-Math.PI / 2);
    add(g, tip, lam("#c8952f"), [0.075, 0, 0]);
    add(g, box(0.05, 0.003, 0.004), lam("#c8952f"), [-0.035, 0.007, 0]);
    return makeProp("pen", g, 0.0075, 0.0058, 0.5, 0.25, 1.25, 0.075);
  });
  // Mug.
  prop(() => {
    const g = new THREE.Group();
    scene.add(g);
    const profile = [
      [0, 0],
      [0.036, 0],
      [0.04, 0.004],
      [0.041, 0.092],
      [0.037, 0.094],
      [0.035, 0.012],
      [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(g, new THREE.LatheGeometry(profile, seg(28)), lam("#d9d2c3"));
    add(g, new THREE.CircleGeometry(0.035, seg(24)), lam("#2a1a10", {}, 0.4), [0, 0.078, 0], [-Math.PI / 2, 0, 0]);
    add(g, new THREE.TorusGeometry(0.024, 0.0065, seg(8), seg(16), Math.PI), lam("#d9d2c3"), [0.041, 0.05, 0], [0, 0, -Math.PI / 2]);
    steam = add(scene, new THREE.PlaneGeometry(0.07, 0.17), steamMaterial(), [0, 0, 0], [0, 0, 0], [false, false]);
    steam.renderOrder = 5;
    return makeProp("mug", g, 0.045, 0, -0.42, 0.2, 0.6);
  });
  // Crumpled note.
  prop(() => {
    const geo = new THREE.IcosahedronGeometry(0.027, 1);
    const r = rng(5);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const seen = new Map<string, number>();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
      const k = seen.get(key) ?? 0.72 + r() * 0.45;
      seen.set(key, k);
      v.multiplyScalar(k);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const m = add(scene, geo, lam("#e6dcc6", { flatShading: true }, 0.8));
    return makeProp("ball", m, 0.026, 0.024, -0.14, 0.31);
  });

  /* ---- Static clutter ---- */
  let shelfY = DESK_Y;
  {
    // Pen cup with pencils.
    const cup = new THREE.Vector3(-0.32, DESK_Y, -0.24);
    add(scene, cyl(0.034, 0.03, 0.1, 20, true), lam("#2c3347", { side: THREE.DoubleSide }), [cup.x, DESK_Y + 0.05, cup.z]);
    add(scene, cyl(0.03, 0.03, 0.004, 20), lam("#2c3347"), [cup.x, DESK_Y + 0.002, cup.z]);
    const r = rng(9);
    for (let i = 0; i < 4; i++) {
      const tilt = (r() - 0.5) * 0.5;
      const m = add(scene, cyl(0.004, 0.004, 0.17, 6), lam(i % 2 ? "#c8952f" : "#d9d2c3"), [cup.x + (r() - 0.5) * 0.03, DESK_Y + 0.1, cup.z + (r() - 0.5) * 0.03], [tilt, 0, (r() - 0.5) * 0.5]);
      m.castShadow = true;
    }
    obstacles.push({ x: cup.x, z: cup.z, r: 0.04, name: "cup" });
    // Books, left (with a coaster on top) and right (under the palm).
    const books = (x: number, z: number, n: number, yaw: number, colors: string[]) => {
      let y = DESK_Y;
      for (let i = 0; i < n; i++) {
        const h = 0.03 + (i % 2) * 0.008;
        add(scene, box(0.25 - i * 0.015, h, 0.18 - i * 0.01), lam(colors[i % colors.length]), [x + (i % 2) * 0.008, y + h / 2, z], [0, yaw + (i - 1) * 0.06, 0]);
        y += h;
      }
      obstacles.push({ x, z, r: 0.12, name: "books" });
      return y;
    };
    books(-0.8, 0.12, 3, 0.15, ["#3a3d5c", "#5b3d36", "#2e4a4a"]);
    shelfY = books(0.79, -0.27, 2, -0.1, ["#4a3a2e", "#2f3a58"]);
  }

  /* ---- Plants ---- */
  const leaves: Leaf[] = [];
  const plants: THREE.Vector3[] = [];
  function pot(x: number, y: number, z: number, r: number, h: number) {
    const prof = [
      [0, 0],
      [r * 0.72, 0],
      [r, h],
      [r * 1.06, h],
      [r * 1.06, h + 0.012],
      [r * 0.95, h + 0.012],
      [r * 0.95, h - 0.01],
      [0, h - 0.01],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    add(scene, new THREE.LatheGeometry(prof, seg(24)), lam("#5e4334"), [x, y, z]);
    add(scene, new THREE.CircleGeometry(r * 0.94, seg(20)), lam("#1d1612", {}, 0.5), [x, y + h - 0.012, z], [-Math.PI / 2, 0, 0]);
  }
  function leafGeo(shape: "heart" | "blade", len: number, wid: number, curl: number) {
    const s = new THREE.Shape();
    if (shape === "heart") {
      s.moveTo(0, 0);
      s.bezierCurveTo(wid * 0.9, len * 0.05, wid * 0.7, len * 0.7, 0, len);
      s.bezierCurveTo(-wid * 0.7, len * 0.7, -wid * 0.9, len * 0.05, 0, 0);
    } else {
      s.moveTo(0, 0);
      s.quadraticCurveTo(wid, len * 0.4, 0, len);
      s.quadraticCurveTo(-wid, len * 0.4, 0, 0);
    }
    const g = new THREE.ShapeGeometry(s, phone ? 5 : 9);
    // Bend: the leaf cups across its width and droops along its length.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, x * x * 6 * Math.max(wid, 0.01) * 4 - (y / len) ** 2 * curl);
    }
    g.computeVertexNormals();
    return g;
  }
  const leafMat = () => lam("#2f4636", { side: THREE.DoubleSide }, 1);
  function plantLeft() {
    const x = -0.86;
    const z = -0.3;
    pot(x, DESK_Y, z, 0.07, 0.12);
    obstacles.push({ x, z, r: 0.08, name: "pot" });
    plants.push(new THREE.Vector3(x, DESK_Y + 0.25, z));
    const r = rng(21);
    const n = phone ? 7 : 10;
    for (let i = 0; i < n; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(x + (r() - 0.5) * 0.04, DESK_Y + 0.11, z + (r() - 0.5) * 0.04);
      const yaw = (i / n) * Math.PI * 2 + r() * 0.4;
      const out = 0.35 + r() * 0.55;
      pivot.rotation.set(0, yaw, 0);
      scene.add(pivot);
      const stemLen = 0.1 + r() * 0.16;
      const stem = add(pivot, cyl(0.003, 0.004, stemLen, 5), lam("#3b5541"), [0, stemLen / 2, 0]);
      stem.rotation.x = out * 0.5;
      stem.position.set(0, (stemLen / 2) * Math.cos(out * 0.5), (stemLen / 2) * Math.sin(out * 0.5));
      const leaf = add(pivot, leafGeo("heart", 0.12 + r() * 0.06, 0.06 + r() * 0.025, 0.04), leafMat());
      leaf.position.set(0, stemLen * Math.cos(out * 0.5), stemLen * Math.sin(out * 0.5));
      leaf.rotation.set(0.5 + out * 0.8, 0, (r() - 0.5) * 0.4);
      leaves.push({ pivot, base: pivot.rotation.clone(), v: 0, a: 0, k: 40 + r() * 30 });
    }
  }
  function plantRight(y0: number) {
    const x = 0.8;
    const z = -0.28;
    pot(x, y0, z, 0.06, 0.1);
    plants.push(new THREE.Vector3(x, y0 + 0.25, z));
    const r = rng(33);
    const n = phone ? 8 : 13;
    for (let i = 0; i < n; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y0 + 0.09, z);
      pivot.rotation.set(0, (i / n) * Math.PI * 2 + r() * 0.3, 0);
      scene.add(pivot);
      const len = 0.2 + r() * 0.16;
      const leaf = add(pivot, leafGeo("blade", len, 0.018 + r() * 0.01, 0.06 + r() * 0.08), leafMat());
      leaf.rotation.set(-0.25 - r() * 0.65, 0, 0);
      leaves.push({ pivot, base: pivot.rotation.clone(), v: 0, a: 0, k: 30 + r() * 30 });
    }
  }
  plantLeft();
  plantRight(shelfY);

  /* ---- Wall: framed leaf study, polaroids, sticky notes, the cat ---- */
  const paperMat = (t: THREE.Texture, glow = 0.18) => {
    const m = lam("#ffffff", { map: t, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: glow }, 0.3);
    return m;
  };
  add(scene, box(0.32, 0.42, 0.02), lam("#141925"), [-1.13, 1.52, WALL_Z + 0.012]);
  add(scene, new THREE.PlaneGeometry(0.28, 0.38), paperMat(leafArtTexture(), 0.25), [-1.13, 1.52, WALL_Z + 0.0225], [0, 0, 0], [false, true]);
  add(scene, new THREE.PlaneGeometry(0.13, 0.13), paperMat(noteTexture(4)), [-1.04, 1.2, WALL_Z + 0.004], [0, 0, 0.06], [false, true]);
  add(scene, new THREE.PlaneGeometry(0.15, 0.18), paperMat(polaroidTexture(2)), [1.04, 1.66, WALL_Z + 0.004], [0, 0, 0.07], [false, true]);
  add(scene, new THREE.PlaneGeometry(0.15, 0.18), paperMat(polaroidTexture(3)), [1.23, 1.55, WALL_Z + 0.006], [0, 0, -0.09], [false, true]);
  add(scene, new THREE.PlaneGeometry(0.11, 0.11), paperMat(noteTexture(8, "#d9c8e8")), [1.27, 1.43, WALL_Z + 0.004], [0, 0, 0.12], [false, true]);
  const cat = new CatDoodle();
  const catNote = new THREE.Group();
  catNote.position.set(1.08, 1.36, WALL_Z + 0.006);
  scene.add(catNote);
  spot("cat", () => {
    const m = add(catNote, new THREE.PlaneGeometry(0.2, 0.2), paperMat(cat.texture, 0.3), [0, -0.1, 0], [0, 0, 0], [false, true]);
    m.userData.flutter = true;
    // The pin.
    add(catNote, new THREE.SphereGeometry(0.008, 8, 6), lam("#c8952f"), [0, -0.012, 0.004]);
  });

  /* ---- Light ---- */
  const hemi = new THREE.HemisphereLight("#3a4668", "#0b0d16", 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#7f93c8", 0.3);
  sun.position.set(0.6, 2.4, -3.2);
  sun.target.position.set(0, DESK_Y, 0);
  sun.castShadow = !phone;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -1.3;
  sun.shadow.camera.right = 1.3;
  sun.shadow.camera.top = 1.3;
  sun.shadow.camera.bottom = -1.3;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 6;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.01;
  scene.add(sun, sun.target);

  const anchors: Record<SpotId, THREE.Vector3> = {
    monitor: new THREE.Vector3(MON.x + 0.36, MON.y + 0.12, MON.z + 0.02),
    phone: new THREE.Vector3(0.6, DESK_Y + 0.17, 0.0),
    lamp: P2.clone().add(new THREE.Vector3(0, 0.07, 0)),
    window: new THREE.Vector3(0.36, 1.66, WALL_Z - 0.14),
    cat: new THREE.Vector3(1.19, 1.34, WALL_Z),
  };

  return {
    scene,
    ranges,
    propRanges,
    anchors,
    lamp: { light, head: lampHead, inner, bulb },
    phone: { group: phoneGroup, handset, cord, rebuildCord, dial },
    screen,
    steam,
    screenLight,
    glass,
    hemi,
    sun,
    props,
    obstacles,
    leaves,
    plants,
    agents,
    notepad,
    cat,
    catNote,
  };
}

/** Dispose everything the room allocated. */
export function disposeRoom(scene: THREE.Scene) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      if (mat instanceof THREE.ShaderMaterial) for (const u of Object.values(mat.uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
      mat.dispose();
    }
  });
}
