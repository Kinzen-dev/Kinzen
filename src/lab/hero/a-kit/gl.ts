/** Small WebGL2 helpers for the raw-GL lab demos (particles, fluid). */

export const QUAD_VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

export function program(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost())
      throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const prog = gl.createProgram()!;
  const v = sh(gl.VERTEX_SHADER, vs);
  const f = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost())
    throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
  gl.deleteShader(v);
  gl.deleteShader(f);
  const u: Program["u"] = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i);
    if (info) u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(prog, info.name);
  }
  return { prog, u };
}

export type Target = { tex: WebGLTexture[]; fbo: WebGLFramebuffer; w: number; h: number };

export function texture(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internal: number,
  format: number,
  type: number,
  filter: number,
  data: ArrayBufferView | null = null,
): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
  return t;
}

/** A framebuffer over one or more same-size colour textures (MRT when more than one). */
export function target(gl: WebGL2RenderingContext, tex: WebGLTexture[], w: number, h: number): Target {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  tex.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  if (tex.length > 1) gl.drawBuffers(tex.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) throw new Error("framebuffer incomplete");
  return { tex, fbo, w, h };
}

export function freeTarget(gl: WebGL2RenderingContext, t: Target | null) {
  if (!t) return;
  t.tex.forEach((x) => gl.deleteTexture(x));
  gl.deleteFramebuffer(t.fbo);
}

/** Lose the context on purpose so the GPU memory goes back at once (the viewer swaps demos). */
export function releaseContext(gl: WebGL2RenderingContext) {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}

/** Canvas pixel size for a CSS box at a DPR, under a pixel budget. */
export function fitCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number, dpr: number, budget = 4_000_000) {
  let k = dpr;
  if (cssW * cssH * k * k > budget) k = Math.sqrt(budget / (cssW * cssH));
  const w = Math.max(1, Math.round(cssW * k));
  const h = Math.max(1, Math.round(cssH * k));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, k };
}
