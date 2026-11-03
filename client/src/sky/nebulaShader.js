// Domain-warped fbm nebula — the technique award sites use for volumetric gas clouds.
// Rendered on a large background plane, additive, so bloom picks up the bright cores.
export const nebulaVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nebulaFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uC1; // strategy
  uniform vec3 uC2; // word
  uniform vec3 uC3; // party

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 3.0;
    float t = uTime * 0.018;
    // two levels of domain warp -> wispy, filamentary gas
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
    float f = fbm(p + 4.0 * r);

    vec3 col = vec3(0.01, 0.014, 0.035);
    col = mix(col, uC1, smoothstep(0.35, 0.95, f) * 0.7);
    col = mix(col, uC2, smoothstep(0.45, 1.0, r.x) * 0.6);
    col = mix(col, uC3, smoothstep(0.5, 1.05, q.y) * 0.55);

    // sparse, filamentary density so most of the frame stays deep space
    float density = pow(max(f - 0.12, 0.0), 2.3) * 2.2;
    col *= density;

    // large-scale void mask: big organic dark pockets, the breathing room stars live in
    float voids = smoothstep(0.32, 0.72, fbm(uv * 1.6 + vec2(11.3, 4.7)));
    col *= voids;

    // vignette the frame edges down to true black
    float d = distance(uv, vec2(0.5));
    col *= smoothstep(0.85, 0.15, d);

    gl_FragColor = vec4(col * 0.9, 1.0);
  }
`;
