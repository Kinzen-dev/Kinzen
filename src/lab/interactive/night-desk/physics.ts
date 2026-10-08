import * as THREE from "three";

/*
 * Just enough physics for the loose things on the desk, no engine: each prop moves on the desk
 * plane with its own friction model, bumps into fixed things (circles) and each other, can be
 * picked up and thrown, and falls off the edge under gravity. A crumpled note rolls (rotation
 * follows the distance travelled), the pen rolls across its axis but only slides along it, the
 * mug slides and wobbles on its base.
 */

export const DESK_Y = 0.75;
const G = 9.8;
const BOUNDS = { x0: -0.97, x1: 0.97, z0: -0.45, z1: 0.4 };
const FLOOR_Y = 0;

export type PropKind = "ball" | "pen" | "mug";

export type Prop = {
  kind: PropKind;
  mesh: THREE.Object3D;
  /** Collision radius on the plane (the pen: its thickness; its length is `half`). */
  r: number;
  half: number;
  /** Height of the centre above the surface it rests on. */
  rest: number;
  home: { x: number; z: number; yaw: number };
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  yawV: number;
  roll: number;
  q: THREE.Quaternion;
  tilt: number;
  tiltV: number;
  tiltAx: number;
  tiltAz: number;
  held: boolean;
  hx: number;
  hz: number;
  away: number;
  /** Seconds since it was last touched (sleeping props skip work). */
  idle: number;
};

export type Obstacle = { x: number; z: number; r: number; name: string };

export type ImpactFn = (prop: Prop, speed: number, what: string) => void;

export function makeProp(kind: PropKind, mesh: THREE.Object3D, r: number, rest: number, x: number, z: number, yaw = 0, half = 0): Prop {
  const p: Prop = {
    kind,
    mesh,
    r,
    half,
    rest,
    home: { x, z, yaw },
    x,
    y: DESK_Y + rest,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw,
    yawV: 0,
    roll: 0,
    q: new THREE.Quaternion(),
    tilt: 0,
    tiltV: 0,
    tiltAx: 1,
    tiltAz: 0,
    held: false,
    hx: x,
    hz: z,
    away: 0,
    idle: 10,
  };
  sync(p);
  return p;
}

const onDesk = (p: Prop) => p.x > BOUNDS.x0 && p.x < BOUNDS.x1 && p.z > BOUNDS.z0 && p.z < BOUNDS.z1;
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const axis = new THREE.Vector3();

function sync(p: Prop) {
  p.mesh.position.set(p.x, p.y, p.z);
  if (p.kind === "ball") {
    p.mesh.quaternion.copy(p.q);
  } else if (p.kind === "pen") {
    tmpQ.setFromAxisAngle(UP, p.yaw);
    tmpQ2.setFromAxisAngle(X, p.roll);
    p.mesh.quaternion.copy(tmpQ).multiply(tmpQ2);
  } else {
    tmpQ.setFromAxisAngle(UP, p.yaw);
    axis.set(p.tiltAx, 0, p.tiltAz).normalize();
    tmpQ2.setFromAxisAngle(axis, p.tilt);
    p.mesh.quaternion.copy(tmpQ2).multiply(tmpQ);
  }
}

/** The pen's axis on the desk plane. */
const penAxis = (p: Prop): [number, number] => [Math.cos(p.yaw), -Math.sin(p.yaw)];

/** Closest point to (cx, cz) on the prop's footprint (a point, or the pen's segment). */
function closest(p: Prop, cx: number, cz: number): [number, number] {
  if (p.kind !== "pen") return [p.x, p.z];
  const [ax, az] = penAxis(p);
  const t = Math.max(-p.half, Math.min(p.half, (cx - p.x) * ax + (cz - p.z) * az));
  return [p.x + ax * t, p.z + az * t];
}

/** Push a prop by a velocity change applied at a point (the pen picks up spin from off-centre hits). */
export function push(p: Prop, dvx: number, dvz: number, atX = p.x, atZ = p.z) {
  p.vx += dvx;
  p.vz += dvz;
  p.idle = 0;
  if (p.kind === "pen") {
    const rx = atX - p.x;
    const rz = atZ - p.z;
    p.yawV += -(rx * dvz - rz * dvx) * 18;
  } else if (p.kind === "mug") {
    // The mug rocks over in the push direction and rights itself.
    p.tiltAx = dvz;
    p.tiltAz = -dvx;
    p.tiltV += Math.hypot(dvx, dvz) * 4.5;
    p.yawV += (Math.random() - 0.5) * 3;
  } else {
    p.vy += Math.min(0.9, Math.hypot(dvx, dvz) * 0.25);
  }
}

export function step(props: Prop[], obstacles: Obstacle[], dt: number, impact: ImpactFn) {
  const sub = 3;
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    for (const p of props) integrate(p, h, impact);
    collide(props, obstacles, impact);
  }
  for (const p of props) sync(p);
}

function integrate(p: Prop, h: number, impact: ImpactFn) {
  p.idle += h;
  if (p.held) {
    const k = Math.min(1, h * 28);
    const nx = p.x + (p.hx - p.x) * k;
    const nz = p.z + (p.hz - p.z) * k;
    p.vx = p.vx * 0.7 + ((nx - p.x) / h) * 0.3;
    p.vz = p.vz * 0.7 + ((nz - p.z) / h) * 0.3;
    p.x = nx;
    p.z = nz;
    p.y += (DESK_Y + p.rest + 0.05 - p.y) * k;
    p.vy = 0;
    p.idle = 0;
    if (p.kind === "mug") {
      p.tiltAx = p.vz;
      p.tiltAz = -p.vx;
      p.tilt += (Math.min(0.35, Math.hypot(p.vx, p.vz) * 0.25) - p.tilt) * k;
    }
    if (p.kind === "ball") rollBall(p, h);
    return;
  }

  const support = onDesk(p) ? DESK_Y : FLOOR_Y;
  const ground = support + p.rest;
  const airborne = p.y > ground + 1e-4 || p.vy > 0;
  if (airborne) {
    p.vy -= G * h;
    p.y += p.vy * h;
    if (p.y <= ground) {
      // Landed: bounce a little, lose most of it.
      const hit = -p.vy;
      p.y = ground;
      p.vy = hit > 0.35 ? hit * (p.kind === "ball" ? 0.42 : 0.28) : 0;
      if (hit > 0.3) impact(p, hit, support === DESK_Y ? "desk" : "floor");
      if (p.kind === "mug") p.tiltV += hit * 0.8;
    }
    // Something hanging over the edge tips off it.
    if (support === FLOOR_Y && p.y > DESK_Y - 0.05 && p.y < DESK_Y + 0.2) p.vy -= 0.5 * h;
  }

  const onGround = p.y <= ground + 1e-4;
  const speed = Math.hypot(p.vx, p.vz);
  if (!onGround || speed > 0.005 || Math.abs(p.tiltV) > 0.01) p.idle = 0;
  if (onGround && speed > 0) {
    if (p.kind === "pen") {
      const [ax, az] = penAxis(p);
      const along = p.vx * ax + p.vz * az;
      let px = p.vx - along * ax;
      let pz = p.vz - along * az;
      const perp = Math.hypot(px, pz);
      // Sliding along the axis stops fast, rolling across it coasts.
      const a2 = Math.max(0, Math.abs(along) - 3.2 * h) * Math.sign(along);
      const p2 = Math.max(0, perp - 0.45 * h);
      if (perp > 0) {
        px *= p2 / perp;
        pz *= p2 / perp;
      }
      p.vx = px + a2 * ax;
      p.vz = pz + a2 * az;
      // Roll angle follows the distance rolled (sign from which side it rolls to).
      const side = Math.sign(-az * px + ax * pz) || 1;
      p.roll += (side * p2 * h) / p.r;
    } else {
      const dec = p.kind === "ball" ? 0.55 : 4.2;
      const ns = Math.max(0, speed - dec * h);
      p.vx *= ns / speed;
      p.vz *= ns / speed;
    }
  }
  p.x += p.vx * h;
  p.z += p.vz * h;
  if (p.kind === "ball") rollBall(p, h);

  p.yaw += p.yawV * h;
  p.yawV *= Math.exp(-h * (onGround ? 5 : 0.5));
  if (p.kind === "mug") {
    p.tiltV += (-p.tilt * 160 - p.tiltV * 7) * h;
    p.tilt = Math.max(-0.5, Math.min(0.5, p.tilt + p.tiltV * h));
  }

  // On the floor and settled: after a beat it comes back, dropped onto the desk from above.
  if (support === FLOOR_Y && onGround) {
    p.away += h;
    if (p.away > 1.4 && speed < 0.05) {
      p.away = 0;
      p.x = p.home.x;
      p.z = p.home.z;
      p.y = DESK_Y + 0.45;
      p.vx = p.vz = p.vy = 0;
      p.yaw = p.home.yaw;
      p.yawV = 0;
      p.tilt = p.tiltV = 0;
    }
  }
}

function rollBall(p: Prop, h: number) {
  const s = Math.hypot(p.vx, p.vz);
  if (s < 1e-5) return;
  axis.set(p.vz, 0, -p.vx).normalize();
  tmpQ.setFromAxisAngle(axis, (s * h) / p.r);
  p.q.premultiply(tmpQ);
}

function collide(props: Prop[], obstacles: Obstacle[], impact: ImpactFn) {
  for (const p of props) {
    if (p.y > DESK_Y + p.rest + 0.15 || p.y < DESK_Y - 0.05) continue;
    // The wall behind the desk.
    if (p.z - p.r < BOUNDS.z0 + 0.02 && onDeskX(p)) {
      p.z = BOUNDS.z0 + 0.02 + p.r;
      if (p.vz < 0) {
        if (-p.vz > 0.25) impact(p, -p.vz, "wall");
        p.vz = -p.vz * 0.4;
      }
    }
    for (const o of obstacles) {
      const [cx, cz] = closest(p, o.x, o.z);
      const dx = cx - o.x;
      const dz = cz - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + p.r;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const nz = dz / d;
      p.x += nx * (min - d);
      p.z += nz * (min - d);
      const vn = p.vx * nx + p.vz * nz;
      if (vn < 0) {
        if (-vn > 0.15) impact(p, -vn, o.name);
        push(p, -vn * 1.45 * nx, -vn * 1.45 * nz, cx, cz);
      }
    }
  }
  for (let i = 0; i < props.length; i++) {
    for (let j = i + 1; j < props.length; j++) {
      const a = props[i];
      const b = props[j];
      if (Math.abs(a.y - b.y) > 0.12) continue;
      const [ax, az] = closest(a, b.x, b.z);
      const [bx, bz] = closest(b, ax, az);
      const dx = ax - bx;
      const dz = az - bz;
      const d = Math.hypot(dx, dz);
      const min = a.r + b.r;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const nz = dz / d;
      const over = (min - d) / 2;
      a.x += nx * over;
      a.z += nz * over;
      b.x -= nx * over;
      b.z -= nz * over;
      const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rel < 0) {
        // Heavier mug, light paper: momentum splits by a rough mass.
        const ma = mass(a);
        const mb = mass(b);
        const j2 = (-(1 + 0.45) * rel) / (1 / ma + 1 / mb);
        if (!a.held) push(a, (j2 / ma) * nx, (j2 / ma) * nz, ax, az);
        if (!b.held) push(b, (-j2 / mb) * nx, (-j2 / mb) * nz, bx, bz);
        if (-rel > 0.15) impact(a, -rel, b.kind);
      }
    }
  }
}

const onDeskX = (p: Prop) => p.x > BOUNDS.x0 && p.x < BOUNDS.x1;
const mass = (p: Prop) => (p.kind === "mug" ? 4 : p.kind === "pen" ? 1 : 0.4);

/** True while anything is still moving (the reduced-motion renderer and the loop's sleep use it). */
export function settled(props: Prop[]): boolean {
  return props.every((p) => !p.held && p.idle > 3);
}
