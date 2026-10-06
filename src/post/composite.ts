/**
 * Final paint shader: turns pigment densities into colour on paper.
 * Wobble (line boil), edge pooling, bleed, granulation, Beer-Lambert glazes,
 * opaque vermilion, light/darkness, erasure, mist, vignette and grain.
 */
export const compositeVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const compositeFrag = /* glsl */ `
precision highp float;
uniform sampler2D tPig;
uniform sampler2D tRed;
uniform vec2 res;
uniform vec2 camPos;
uniform vec2 viewSize;
uniform float boil;
uniform float time;
uniform float wobbleAmp;
uniform vec3 cPaper;
uniform vec3 cInk;
uniform vec3 cA;
uniform vec3 cB;
uniform vec3 cRed;
uniform float washed;
uniform float night;
uniform float fog;
uniform float fogScale;
uniform vec2 fogDrift;
uniform float vignette;
uniform float fade;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}

// Paper fibres: long thin streaks plus fine pulp.
float paperFiber(vec2 w) {
  vec2 q = vec2(w.x * 2.2 + w.y * 0.6, w.y * 18.0 - w.x * 3.0);
  float f1 = vnoise(q);
  vec2 q2 = vec2(w.x * 14.0 - w.y * 2.0, w.y * 3.0 + w.x * 1.1);
  float f2 = vnoise(q2 + 31.0);
  float pulp = vnoise(w * 40.0);
  return clamp(0.45 * f1 + 0.35 * f2 + 0.2 * pulp, 0.0, 1.0);
}

vec3 desat(vec3 c, float k) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(l), k);
}

void main() {
  vec2 world = camPos + (vUv - 0.5) * viewSize;
  vec2 px = 1.0 / res;

  // Line boil: the whole painting is re-drawn by hand a few times per second.
  vec2 wq = world * 2.6 + vec2(boil * 7.31, boil * 3.17);
  vec2 wob = vec2(vnoise(wq), vnoise(wq + 19.7)) - 0.5;
  vec2 wq2 = world * 9.0 + vec2(boil * 2.9, -boil * 5.3);
  wob += 0.45 * (vec2(vnoise(wq2), vnoise(wq2 + 7.3)) - 0.5);
  vec2 uv = vUv + wob * wobbleAmp * px;

  vec4 P = texture2D(tPig, uv);
  vec3 d = P.rgb;

  // Neighbourhood for edge pooling and bleed.
  float r1 = 2.5;
  vec3 nb = vec3(0.0);
  nb += texture2D(tPig, uv + vec2( r1, 0.0) * px).rgb;
  nb += texture2D(tPig, uv + vec2(-r1, 0.0) * px).rgb;
  nb += texture2D(tPig, uv + vec2(0.0,  r1) * px).rgb;
  nb += texture2D(tPig, uv + vec2(0.0, -r1) * px).rgb;
  nb += texture2D(tPig, uv + vec2( r1,  r1) * px * 0.7).rgb;
  nb += texture2D(tPig, uv + vec2(-r1,  r1) * px * 0.7).rgb;
  nb += texture2D(tPig, uv + vec2( r1, -r1) * px * 0.7).rgb;
  nb += texture2D(tPig, uv + vec2(-r1, -r1) * px * 0.7).rgb;
  nb *= 0.125;

  // Pigment pools at the edge of a wash: darken where density exceeds its surroundings.
  vec3 edge = max(d - nb, 0.0);
  d += edge * vec3(0.9, 1.4, 1.4);
  // Ink bleeds slightly into the fibres around it.
  float fib = paperFiber(world);
  d = max(d, nb * (0.55 + 0.35 * fib));

  // Granulation: pigment settles in the paper's valleys.
  d.gb *= mix(0.72, 1.22, fib);
  d.r *= mix(0.9, 1.08, fib);

  vec4 R = texture2D(tRed, uv);
  float light = clamp(R.g, 0.0, 1.5);
  float erase = clamp(R.b, 0.0, 1.0);

  // Darkness (dusk, blizzard) is a wash of ink held back by light.
  float dark = night * (0.75 + 0.25 * fbm(world * 0.3 + time * 0.02));
  d.r += dark * clamp(1.0 - light, 0.0, 1.0);
  d *= 1.0 - erase;
  d = min(d, vec3(1.35, 1.6, 1.6));

  // Paper tone varies gently across the scroll.
  float tone = fbm(world * 0.08) - 0.5;
  vec3 paper = cPaper * (1.0 + tone * 0.05) * (0.97 + 0.04 * fib);

  // Washed-out areas: pigments lose saturation and strength until the memory returns.
  vec3 A = mix(cA, mix(desat(cA, 0.85), cPaper, 0.35), washed);
  vec3 B = mix(cB, mix(desat(cB, 0.85), cPaper, 0.35), washed);

  vec3 tInk = clamp(cInk / cPaper, 0.001, 1.0);
  vec3 tA = clamp(A / cPaper, 0.001, 1.0);
  vec3 tB = clamp(B / cPaper, 0.001, 1.0);
  vec3 col = paper * pow(tInk, vec3(d.r)) * pow(tA, vec3(d.g)) * pow(tB, vec3(d.b));

  // Vermilion is opaque (seal paste), painted over everything.
  float red = clamp(R.r, 0.0, 1.0);
  vec3 redCol = cRed * (0.9 + 0.15 * fib) * (1.0 - 0.25 * clamp(R.r - 1.0, 0.0, 1.0));
  col = mix(col, redCol, red);

  // Glow of lanterns and fire on the paper.
  col += vec3(1.0, 0.86, 0.6) * 0.08 * light * (0.4 + night);

  // Mist drifting over the scroll.
  float m = fbm(world * fogScale + fogDrift * time);
  m = smoothstep(0.35, 0.85, m);
  col = mix(col, paper * 1.02, m * fog);

  // Aged paper: darker, warmer edges.
  vec2 vc = (vUv - 0.5) * vec2(viewSize.x / viewSize.y, 1.0);
  float v = smoothstep(0.45, 1.05, length(vc) * 1.05);
  col *= 1.0 - v * vignette * 0.32;
  col = mix(col, col * vec3(1.0, 0.93, 0.82), v * vignette * 0.5);

  // Fine grain.
  float g = hash(vUv * res + boil * 1.7) - 0.5;
  col += g * 0.018;

  col = mix(col, cPaper, fade);
  gl_FragColor = vec4(col, 1.0);
}
`;
