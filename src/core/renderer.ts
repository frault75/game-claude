import * as THREE from 'three';
import { compositeFrag, compositeVert } from '../post/composite';
import { makeNoiseTexture } from '../post/noiseTex';

/** UI space shared by the renderer and touch input. */
export function uiSize(w: number, h: number): { w: number; h: number } {
  const short = Math.max(700, Math.min(1080, Math.min(w, h) * 1.7));
  return w >= h ? { w: short * (w / h), h: short } : { w: short, h: short * (h / w) };
}

export const IS_MOBILE = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
import type { Palette } from '../game/palettes';

THREE.ColorManagement.enabled = false;

export interface PostParams {
  washed: number;
  night: number;
  fog: number;
  fogScale: number;
  fogDrift: [number, number];
  vignette: number;
  wobble: number;
  fade: number;
  flash: number;
  /** Dungeon darkness outside the child's lamp and other lights (0..1). */
  gloom: number;
  /** The child's lamp: world x, y and radius. */
  lamp: [number, number, number];
}

/**
 * Two pigment buffers (world + UI drawn into each), then one full-screen paint pass.
 *   scenePig / uiPig  -> rtPig  (ink, pigment A, pigment B)
 *   sceneRed / uiRed  -> rtRed  (vermilion, light, erase)
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scenePig = new THREE.Scene();
  readonly sceneRed = new THREE.Scene();
  readonly uiPig = new THREE.Scene();
  readonly uiRed = new THREE.Scene();
  /** Coloured inks (gouache): real RGB, premultiplied. */
  readonly sceneAcc = new THREE.Scene();
  readonly uiAcc = new THREE.Scene();
  /** Invisible UI shapes that keep darkness off the HUD (written to the red buffer's alpha only). */
  readonly uiMask = new THREE.Scene();
  /** Sheets that hide the world's red and real-colour layers beneath them (open panels). */
  readonly uiCover = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly uiCamera: THREE.OrthographicCamera;
  /** World units visible vertically (grows in portrait so enough width stays visible). */
  viewH = 14;
  baseViewH = IS_MOBILE ? 11.5 : 14;
  minViewW = 12;
  zoom = 1;
  /** UI virtual units: 1080 tall. */
  /** UI virtual units: the short side of the screen is `uiShort` units (1080 on desktop, less on phones so text stays readable). */
  uiH = 1080;
  uiW = 1920;
  private rtPig: THREE.WebGLRenderTarget;
  private rtRed: THREE.WebGLRenderTarget;
  private rtAcc: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly composite: THREE.ShaderMaterial;
  renderScale = 1;
  pxW = 1;
  pxH = 1;
  boilHz = 10;
  boilEnabled = true;
  readonly post: PostParams = {
    washed: 0, night: 0, fog: 0.25, fogScale: 0.12, fogDrift: [0.05, 0.02], vignette: 1, wobble: 1.6, fade: 0, flash: 0,
    gloom: 0, lamp: [0, 0, 6],
  };

  constructor(readonly canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl.autoClear = false;
    this.gl.info.autoReset = false;
    this.gl.setClearColor(0x000000, 0);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.camera.position.set(0, 0, 10);
    this.uiCamera = new THREE.OrthographicCamera(-960, 960, 540, -540, -100, 100);
    this.uiCamera.position.set(0, 0, 10);
    const float = this.gl.capabilities.isWebGL2 && (this.gl.extensions.has('EXT_color_buffer_float') || this.gl.extensions.has('EXT_color_buffer_half_float'));
    const rtOpts: THREE.RenderTargetOptions = {
      type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    };
    this.rtPig = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.rtRed = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.rtAcc = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, type: THREE.UnsignedByteType });
    this.composite = new THREE.ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tPig: { value: this.rtPig.texture },
        tRed: { value: this.rtRed.texture },
        tAcc: { value: this.rtAcc.texture },
        tNoise: { value: makeNoiseTexture() },
        edgeTaps: { value: IS_MOBILE ? 4 : 8 },
        res: { value: new THREE.Vector2(1, 1) },
        camPos: { value: new THREE.Vector2() },
        viewSize: { value: new THREE.Vector2(1, 1) },
        boil: { value: 0 },
        time: { value: 0 },
        wobbleAmp: { value: 1.6 },
        cPaper: { value: new THREE.Color() },
        cInk: { value: new THREE.Color() },
        cA: { value: new THREE.Color() },
        cB: { value: new THREE.Color() },
        cRed: { value: new THREE.Color('#C23A2B') },
        washed: { value: 0 },
        night: { value: 0 },
        fog: { value: 0.2 },
        fogScale: { value: 0.12 },
        fogDrift: { value: new THREE.Vector2(0.05, 0.02) },
        vignette: { value: 1 },
        fade: { value: 0 },
        flash: { value: 0 },
        gloom: { value: 0 },
        lamp: { value: new THREE.Vector3(0, 0, 6) },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.resize();
  }

  get viewW(): number {
    return this.viewH * (this.pxW / this.pxH);
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gl.setPixelRatio(1);
    // Pixel budget: the paint shader softens everything anyway. Phones get far fewer pixels.
    const budget = IS_MOBILE ? 650_000 : 2_100_000;
    const scale = Math.min(dpr * this.renderScale, Math.sqrt(budget / (w * h)));
    this.viewH = Math.max(this.baseViewH, this.minViewW / (w / h));
    this.pxW = Math.max(1, Math.round(w * scale));
    this.pxH = Math.max(1, Math.round(h * scale));
    this.gl.setSize(this.pxW, this.pxH, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.rtPig.setSize(this.pxW, this.pxH);
    this.rtRed.setSize(this.pxW, this.pxH);
    this.rtAcc.setSize(this.pxW, this.pxH);
    this.composite.uniforms.res.value.set(this.pxW, this.pxH);
    const ui = uiSize(w, h);
    this.uiW = ui.w;
    this.uiH = ui.h;
    const u = this.uiCamera;
    u.left = -this.uiW / 2; u.right = this.uiW / 2; u.top = this.uiH / 2; u.bottom = -this.uiH / 2;
    u.updateProjectionMatrix();
  }

  setPalette(p: Palette): void {
    const u = this.composite.uniforms;
    (u.cPaper.value as THREE.Color).set(p.paper);
    (u.cInk.value as THREE.Color).set(p.ink);
    (u.cA.value as THREE.Color).set(p.a);
    (u.cB.value as THREE.Color).set(p.b);
  }

  /** Blend palettes for transitions. */
  lerpPalette(from: Palette, to: Palette, t: number): void {
    const u = this.composite.uniforms;
    const c = new THREE.Color();
    (u.cPaper.value as THREE.Color).set(from.paper).lerp(c.set(to.paper), t);
    (u.cInk.value as THREE.Color).set(from.ink).lerp(c.set(to.ink), t);
    (u.cA.value as THREE.Color).set(from.a).lerp(c.set(to.a), t);
    (u.cB.value as THREE.Color).set(from.b).lerp(c.set(to.b), t);
  }

  /** Screen pixel (CSS) to world coordinates. */
  screenToWorld(sx: number, sy: number): [number, number] {
    const w = window.innerWidth, h = window.innerHeight;
    const vh = this.viewH / this.zoom;
    const vw = vh * (w / h);
    return [this.camera.position.x + (sx / w - 0.5) * vw, this.camera.position.y - (sy / h - 0.5) * vh];
  }

  render(time: number, camX: number, camY: number): void {
    const vh = this.viewH / this.zoom;
    const vw = vh * (this.pxW / this.pxH);
    const cam = this.camera;
    cam.position.x = camX;
    cam.position.y = camY;
    cam.left = -vw / 2; cam.right = vw / 2; cam.top = vh / 2; cam.bottom = -vh / 2;
    cam.updateProjectionMatrix();

    const gl = this.gl;
    gl.info.reset();
    gl.setRenderTarget(this.rtPig);
    gl.clear(true, false, false);
    gl.render(this.scenePig, cam);
    gl.render(this.uiPig, this.uiCamera);
    gl.setRenderTarget(this.rtRed);
    gl.clear(true, false, false);
    // the red buffer's alpha is reserved for the UI mask: the world writes colour only
    const ctx = gl.getContext();
    ctx.colorMask(true, true, true, false);
    gl.render(this.sceneRed, cam);
    gl.render(this.uiCover, this.uiCamera);
    ctx.colorMask(false, false, false, true);
    gl.render(this.uiMask, this.uiCamera);
    ctx.colorMask(true, true, true, true);
    gl.render(this.uiRed, this.uiCamera);
    gl.setRenderTarget(this.rtAcc);
    gl.clear(true, false, false);
    gl.render(this.sceneAcc, cam);
    gl.render(this.uiCover, this.uiCamera);
    gl.render(this.uiAcc, this.uiCamera);

    const u = this.composite.uniforms;
    const p = this.post;
    u.camPos.value.set(camX, camY);
    u.viewSize.value.set(vw, vh);
    u.time.value = time;
    u.boil.value = this.boilEnabled ? Math.floor(time * this.boilHz) % 1000 : 0;
    u.wobbleAmp.value = this.boilEnabled ? p.wobble * (this.pxH / 1080) : 0.6 * (this.pxH / 1080);
    u.washed.value = p.washed;
    u.night.value = p.night;
    u.fog.value = p.fog;
    u.fogScale.value = p.fogScale;
    u.fogDrift.value.set(p.fogDrift[0], p.fogDrift[1]);
    u.vignette.value = p.vignette;
    u.fade.value = p.fade;
    u.flash.value = p.flash;
    u.gloom.value = p.gloom;
    u.lamp.value.set(p.lamp[0], p.lamp[1], p.lamp[2]);
    gl.setRenderTarget(null);
    gl.clear(true, false, false);
    gl.render(this.quadScene, this.quadCam);
  }
}
