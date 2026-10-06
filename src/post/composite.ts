/**
 * Final paint shader: turns pigment densities into colour on paper.
 * Noise comes from a tiling texture (cheap on mobile GPUs).
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
uniform sampler2D tAcc;
uniform sampler2D tNoise;
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
uniform float flash;
uniform float edgeTaps;
uniform float gloom;
uniform vec3 lamp;
varying vec2 vUv;

vec4 N(vec2 p) { return texture2D(tNoise, p); }

vec3 desat(vec3 c, float k) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(l), k);
}

void main() {
  vec2 world = camPos + (vUv - 0.5) * viewSize;
  vec2 px = 1.0 / res;

  // Line boil: the painting is re-drawn by hand a few times per second.
  vec2 bo = vec2(fract(boil * 0.1373), fract(boil * 0.2719));
  vec2 wob = vec2(N(world * 0.093 + bo).b, N(world * 0.093 + bo + 0.37).b) - 0.5;
  wob += 0.45 * (vec2(N(world * 0.31 - bo).b, N(world * 0.31 - bo + 0.61).a) - 0.5);
  vec2 uv = vUv + wob * wobbleAmp * px;

  vec3 d = texture2D(tPig, uv).rgb;

  // Neighbourhood for edge pooling and bleed (4 or 8 taps).
  float r1 = 2.5;
  vec3 nb = texture2D(tPig, uv + vec2(r1, 0.0) * px).rgb
          + texture2D(tPig, uv + vec2(-r1, 0.0) * px).rgb
          + texture2D(tPig, uv + vec2(0.0, r1) * px).rgb
          + texture2D(tPig, uv + vec2(0.0, -r1) * px).rgb;
  if (edgeTaps > 4.5) {
    nb += texture2D(tPig, uv + vec2(r1, r1) * px * 0.7).rgb
        + texture2D(tPig, uv + vec2(-r1, r1) * px * 0.7).rgb
        + texture2D(tPig, uv + vec2(r1, -r1) * px * 0.7).rgb
        + texture2D(tPig, uv + vec2(-r1, -r1) * px * 0.7).rgb;
    nb *= 0.125;
  } else nb *= 0.25;

  vec3 edge = max(d - nb, 0.0);
  d += edge * vec3(0.9, 1.4, 1.4);
  float fib = N(world * 0.25).r;
  d = max(d, nb * (0.55 + 0.35 * fib));

  d.gb *= mix(0.72, 1.22, fib);
  d.r *= mix(0.9, 1.08, fib);

  vec4 R = texture2D(tRed, uv);
  float light = clamp(R.g, 0.0, 1.5);
  float erase = clamp(R.b, 0.0, 1.0);
  // UI shapes are kept out of the dark
  float uiM = clamp(R.a, 0.0, 1.0);

  float dark = night * (0.75 + 0.25 * N(world * 0.02 + time * 0.003).a) * (1.0 - uiM);
  d.r += dark * clamp(1.0 - light, 0.0, 1.0);
  d *= 1.0 - erase;
  d = min(d, vec3(1.35, 1.6, 1.6));

  float tone = N(world * 0.012).g - 0.5;
  vec3 paper = cPaper * (1.0 + tone * 0.06) * (0.97 + 0.04 * fib);

  vec3 A = mix(cA, mix(desat(cA, 0.85), cPaper, 0.35), washed);
  vec3 B = mix(cB, mix(desat(cB, 0.85), cPaper, 0.35), washed);
  vec3 tInk = clamp(cInk / cPaper, 0.001, 1.0);
  vec3 tA = clamp(A / cPaper, 0.001, 1.0);
  vec3 tB = clamp(B / cPaper, 0.001, 1.0);
  vec3 col = paper * pow(tInk, vec3(d.r)) * pow(tA, vec3(d.g)) * pow(tB, vec3(d.b));

  float red = clamp(R.r, 0.0, 1.0);
  vec3 redCol = cRed * (0.9 + 0.15 * fib);
  col = mix(col, redCol, red);

  // coloured inks: opaque gouache with paper texture
  vec4 Ac = texture2D(tAcc, uv);
  if (Ac.a > 0.003) {
    vec3 ac = Ac.rgb / Ac.a;
    col = mix(col, ac * (0.88 + 0.18 * fib), clamp(Ac.a, 0.0, 1.0));
  }

  col += vec3(1.0, 0.86, 0.6) * 0.08 * light * (0.4 + night + gloom * 1.5) * (1.0 - uiM);

  // dungeons: darkness beyond the lamp and the torches
  if (gloom > 0.001) {
    vec2 dl = (world - lamp.xy) * vec2(1.0, 1.15);
    float flick = (N(world * 0.11 + vec2(time * 0.07, time * 0.05)).r - 0.5) * 0.9;
    float lk = 1.0 - smoothstep(lamp.z * 0.4, lamp.z, length(dl) + flick);
    float lit = max(lk, clamp(light * 1.4, 0.0, 1.0));
    float g = gloom * (1.0 - lit) * (1.0 - uiM);
    col = mix(col, cInk * 0.4 + cPaper * 0.03, g);
  }

  float m = N(world * fogScale * 0.13 + fogDrift * time * 0.12).g;
  m = smoothstep(0.42, 0.78, m);
  col = mix(col, paper * 1.02, m * fog);

  vec2 vc = (vUv - 0.5) * vec2(viewSize.x / viewSize.y, 1.0);
  float v = smoothstep(0.45, 1.05, length(vc) * 1.05);
  col *= 1.0 - v * vignette * 0.32;
  col = mix(col, col * vec3(1.0, 0.93, 0.82), v * vignette * 0.5);

  vec2 gp = fract(vUv * res * vec2(0.1031, 0.1030) + boil * 0.17);
  gp += dot(gp, gp.yx + 33.33);
  col += (fract((gp.x + gp.y) * gp.x) - 0.5) * 0.018;

  col = mix(col, vec3(1.0, 0.99, 0.96) * (0.9 + 0.1 * fib), clamp(flash, 0.0, 1.0) * 0.82);
  col = mix(col, cPaper, fade);
  gl_FragColor = vec4(col, 1.0);
}
`;
