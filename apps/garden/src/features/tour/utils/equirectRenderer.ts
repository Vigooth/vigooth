import type { Camera } from './panorama';

/**
 * A minimal equirectangular panorama renderer, hand-rolled on WebGL.
 *
 * three.js would do this too, at roughly 600 KB gzipped for one textured sphere —
 * against which the whole garden app is a few tens of KB. So there is no sphere
 * here at all: a full-screen quad is drawn and the fragment shader turns each
 * pixel into a view ray, then samples the panorama at that ray's azimuth and
 * elevation. Same picture, no geometry, no dependency.
 *
 * The rotation the shader applies below is the exact counterpart of
 * `projectToScreen` in ./panorama — the two must stay in step or the markers
 * would drift off the things they label.
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vNdc;

void main() {
  vNdc = aPosition;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vNdc;

uniform sampler2D uPanorama;
uniform float uYaw;
uniform float uPitch;
uniform float uTanHalfFov;
uniform float uAspect;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

void main() {
  // The ray through this pixel, in camera space: looking down -z, +x right, +y up.
  vec3 ray = normalize(vec3(vNdc.x * uTanHalfFov * uAspect, vNdc.y * uTanHalfFov, -1.0));

  // Pitch about x, then yaw about y.
  float cosPitch = cos(uPitch);
  float sinPitch = sin(uPitch);
  vec3 pitched = vec3(
    ray.x,
    ray.y * cosPitch - ray.z * sinPitch,
    ray.y * sinPitch + ray.z * cosPitch
  );

  float cosYaw = cos(uYaw);
  float sinYaw = sin(uYaw);
  vec3 world = vec3(
    pitched.x * cosYaw - pitched.z * sinYaw,
    pitched.y,
    pitched.x * sinYaw + pitched.z * cosYaw
  );

  float azimuth = atan(world.x, -world.z);
  float elevation = asin(clamp(world.y, -1.0, 1.0));

  // The panorama's left seam is azimuth 0; its top row is straight up.
  gl_FragColor = texture2D(uPanorama, vec2(fract(azimuth / TAU), 0.5 - elevation / PI));
}
`;

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface EquirectRenderer {
  /** Upload a panorama, replacing any previous one. */
  setPanorama: (image: HTMLImageElement) => void;
  /** Draw one frame. Resizes the drawing buffer to the canvas first. */
  render: (camera: Camera) => void;
  dispose: () => void;
}

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // The log is the only way to tell a real syntax error from a lost context,
    // which fails compilation with no diagnostic at all.
    console.error('Panorama shader failed to compile:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

/**
 * Either a renderer or the reason there is none.
 *
 * A reason rather than a bare null: "no WebGL on this device" and "the shader
 * would not build" call for very different responses, and reporting the first
 * when the second happened sends the reader off blaming their hardware.
 */
export type RendererResult = { renderer: EquirectRenderer } | { error: string };

export function createEquirectRenderer(canvas: HTMLCanvasElement): RendererResult {
  const gl: GL | null = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return { error: "WebGL n'est pas disponible sur cet appareil" };
  if (gl.isContextLost()) return { error: 'Contexte WebGL perdu — recharge la page' };

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    return { error: 'Le rendu du panorama n’a pas pu s’initialiser (voir la console)' };
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  // The shaders are linked into the program now; the objects themselves are dead
  // weight past this point.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Panorama program failed to link:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return { error: 'Le rendu du panorama n’a pas pu s’initialiser (voir la console)' };
  }

  gl.useProgram(program);

  // Two triangles covering clip space. The shader reads the interpolated position
  // straight back as normalised device coordinates.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    yaw: gl.getUniformLocation(program, 'uYaw'),
    pitch: gl.getUniformLocation(program, 'uPitch'),
    tanHalfFov: gl.getUniformLocation(program, 'uTanHalfFov'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
  };

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let hasPanorama = false;

  const setPanorama = (image: HTMLImageElement) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Left as-is rather than flipped: the shader's v runs from the top row down,
    // which is where an equirectangular panorama keeps the sky.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Wrapping horizontally is what hides the seam where the panorama meets
    // itself. WebGL 1 only allows it on power-of-two textures, which the upload
    // path guarantees; anything else falls back to a clamp and a faint seam
    // rather than refusing to render.
    const repeatable =
      gl instanceof WebGL2RenderingContext ||
      (isPowerOfTwo(image.naturalWidth) && isPowerOfTwo(image.naturalHeight));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeatable ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    hasPanorama = true;
  };

  const render = (camera: Camera) => {
    if (!hasPanorama) return;

    // Match the drawing buffer to the element, capped: a phone at DPR 3 would
    // otherwise shade nine times the pixels for no visible gain on a photo.
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.uniform1f(uniforms.yaw, camera.yaw);
    gl.uniform1f(uniforms.pitch, camera.pitch);
    gl.uniform1f(uniforms.tanHalfFov, Math.tan(camera.fov / 2));
    gl.uniform1f(uniforms.aspect, width / height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  // Deliberately does NOT call WEBGL_lose_context.loseContext(). A canvas hands
  // back the same context object every time, so losing it would poison every
  // later setup on that canvas — which StrictMode triggers on the very first
  // mount, by running this effect, cleaning it up, and running it again. That
  // looked exactly like a device without WebGL. Deleting the resources is enough;
  // the context is released with the canvas.
  const dispose = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };

  return { renderer: { setPanorama, render, dispose } };
}
