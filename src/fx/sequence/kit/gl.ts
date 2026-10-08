/** Small WebGL2 helpers for the raw-GL scenes (particles, fluid) on the shared stage context. */

export const QUAD_VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

/**
 * Compile and link without blocking: with KHR_parallel_shader_compile the driver compiles in the
 * background and this waits (yielding) until it reports done; without it, it yields before the
 * link is checked. Either way no program compile lands in a frame or forms one long task.
 */
export async function programAsync(gl: WebGL2RenderingContext, vs: string, fs: string): Promise<Program> {
  const ext = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  const v = sh(gl.VERTEX_SHADER, vs);
  const f = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (ext) {
    while (!gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR) && !gl.isContextLost()) await breathe();
  } else await breathe();
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost())
    throw new Error(`link: ${gl.getProgramInfoLog(prog)} ${gl.getShaderInfoLog(v)} ${gl.getShaderInfoLog(f)}`);
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

/** Clear one render target to zero (a scene coming back on stage starts from still water). */
export function clearTarget(gl: WebGL2RenderingContext, t: Target | null) {
  if (!t) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
  gl.viewport(0, 0, t.w, t.h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/**
 * The raw scenes share the context with three.js, whose state cache does not see their calls.
 * Every raw draw starts from this known state, and the stage calls renderer.resetState() after it.
 */
export function rawState(gl: WebGL2RenderingContext) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.STENCIL_TEST);
  gl.disable(gl.BLEND);
  gl.colorMask(true, true, true, true);
  gl.depthMask(true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
}

/** Float32 to half floats (only for GPUs without float32 render targets). */
export function halfOf(src: Float32Array): Uint16Array {
  const out = new Uint16Array(src.length);
  const f = new Float32Array(1);
  const i = new Uint32Array(f.buffer);
  for (let n = 0; n < src.length; n++) {
    f[0] = src[n];
    const x = i[0];
    const sign = (x >> 16) & 0x8000;
    const e = ((x >> 23) & 0xff) - 127 + 15;
    const m = x & 0x7fffff;
    if (e <= 0) out[n] = sign;
    else if (e >= 31) out[n] = sign | 0x7c00;
    else out[n] = sign | (e << 10) | (m >> 13);
  }
  return out;
}

/** Yield to the browser between heavy setup steps, so none of them becomes one long task. */
export const breathe = () => new Promise<void>((r) => setTimeout(r, 0));
