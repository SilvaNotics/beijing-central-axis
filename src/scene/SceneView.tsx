import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { landmarks } from '../data/heritage';
import { createCity, bounds } from './city';
import { mappedLayout } from './layouts';
import { createMaterials, disposeMaterials } from './materials';
import { loadCityData, type CityData } from './geodata';
import type { SceneViewProps } from './types';
import './scene.css';

interface SceneController {
  focus: (id: string) => void;
  quality: (value: SceneViewProps['quality']) => void;
  reset: () => void;
  active: (value: boolean) => void;
  dispose: () => void;
}

export default function SceneView(props: SceneViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const propsRef = useRef(props); propsRef.current = props;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current || !labels.current) return;
    const container = host.current, labelLayer = labels.current;
    let cancelled = false;
    const abort = new AbortController();
    const start = window.setTimeout(() => {
      if (cancelled) return;
      void loadCityData(abort.signal).then(data => {
        if (cancelled) return;
        controller.current = mountScene(container, labelLayer, propsRef, data); setReady(true); propsRef.current.onReady?.('ready');
      }).catch(error => { if (!cancelled) { console.error('Atlas renderer unavailable:', error); propsRef.current.onReady?.('fallback'); } });
    }, 60);
    return () => { cancelled = true; abort.abort(); clearTimeout(start); controller.current?.dispose(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (props.selection) controller.current?.focus(props.selection);
    else if (props.sample) controller.current?.focus('sample');
    else if (props.focus === 'all') controller.current?.reset();
    else controller.current?.focus(props.focus);
  }, [props.selection, props.focus, props.sample, props.viewRevision, ready]);
  useEffect(() => { controller.current?.quality(props.quality); }, [props.quality, ready]);
  useEffect(() => { controller.current?.active(props.active !== false); }, [props.active, ready]);
  return <div className={`scene-world ${ready ? 'is-ready' : ''}`} ref={host}>
    <div ref={labels} className="scene-labels" aria-label="地图地标">
      {landmarks.map(site => <button key={site.id} className={`scene-label ${props.selection === site.id ? 'selected' : ''}`} data-site={site.id} onClick={() => props.onSelect(site.id)} tabIndex={-1} aria-label={`查看${site.name}`}><span className="label-point" /><span className="label-title">{site.name}</span></button>)}
      <div className="scene-annotations" aria-hidden="true">
        <span data-annotation="heroes">人民英雄纪念碑</span>
        <span data-annotation="memorial">毛主席纪念堂</span>
        <span data-annotation="great-hall">人民大会堂</span>
        <span data-annotation="museum">中国国家博物馆</span>
        <span data-annotation="prayer-hall">祈年殿</span>
        <span data-annotation="imperial-vault">皇穹宇</span>
        <span data-annotation="circular-altar">圜丘坛</span>
        <span data-annotation="danbi-bridge">丹陛桥</span>
      </div>
    </div>
    <div className="scene-vignette" aria-hidden="true" />
    <div className="scene-light-caption" aria-hidden="true"><i />暮光中的北京城<small>LIGHT & SHADOW, ALONG THE AXIS</small></div>
  </div>;
}

function mountScene(container: HTMLDivElement, labelLayer: HTMLDivElement, ref: { current: SceneViewProps }, data: CityData): SceneController {
  const failedInitCleanup: (() => void)[] = [];
  try {
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: mobile ? 'low-power' : 'high-performance', alpha: false });
  failedInitCleanup.push(() => { renderer.dispose(); renderer.domElement.remove(); });
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const software = debug ? /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))) : false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = ref.current.quality === 'cinematic' && !mobile && !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'atlas-canvas';
  renderer.domElement.setAttribute('aria-label', '北京中轴线三维沙盘，可用左键或鼠标中键拖动平移、滚轮缩放；遗产名录提供键盘入口');
  renderer.domElement.setAttribute('role', 'img');
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
  const skyContext = sky.getContext('2d')!;
  const gradient = skyContext.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#314649'); gradient.addColorStop(.56,'#596562'); gradient.addColorStop(1,'#817867');
  skyContext.fillStyle = gradient; skyContext.fillRect(0,0,2,256);
  const skyTexture = new THREE.CanvasTexture(sky); skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;
  scene.fog = new THREE.FogExp2('#667069', .00009);
  failedInitCleanup.push(() => skyTexture.dispose());
  failedInitCleanup.push(() => scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) object.geometry.dispose(); }));
  const camera = new THREE.PerspectiveCamera(33, 1, 1, 3800);
  const controls = new OrbitControls(camera, renderer.domElement);
  failedInitCleanup.push(() => controls.dispose());
  controls.enableRotate = false;
  controls.enableDamping = false; controls.dampingFactor = .12;
  controls.screenSpacePanning = false; controls.minDistance = 42; controls.maxDistance = 2300;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  const materials = createMaterials();
  failedInitCleanup.push(() => disposeMaterials(materials));
  const city = createCity(materials, data, ref.current.sample);
  scene.add(city.object);
  const terrainCleanup = () => {
    const terrain = city.object.getObjectByName('city-plan') as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    terrain.material.map?.dispose(); terrain.material.dispose();
  };
  failedInitCleanup.push(terrainCleanup);
  scene.add(new THREE.HemisphereLight('#d5d8cf', '#665343', 1.9));
  const sun = new THREE.DirectionalLight('#ffd2a0', 2.2);
  sun.position.set(-180, 320, 120); scene.add(sun, sun.target);
  sun.castShadow = !mobile && !software;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0003; sun.shadow.normalBias = .12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 1200;
  failedInitCleanup.push(() => sun.dispose());
  let active = ref.current.active !== false;
  let width = 1, height = 1, frame = 0, disposed = false, rendering = false, needsFrames = 5;
  let activeFocus = 'all';
  let animation: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; target: THREE.Vector3; start: number } | null = null;
  const labelElements = [...labelLayer.querySelectorAll<HTMLButtonElement>('[data-site]')];
  const annotationElements = [...labelLayer.querySelectorAll<HTMLElement>('[data-annotation]')];
  const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  let down = { x: 0, y: 0 };

  const fit = (center: THREE.Vector3, extent: number, animated = true) => {
    const distance = extent / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const shadowExtent = Math.min(600, extent * .8);
    Object.assign(sun.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent });
    sun.shadow.camera.updateProjectionMatrix(); sun.target.position.copy(center);
    sun.position.copy(center).add(new THREE.Vector3(-180, 320, 120));
    const angle = activeFocus === 'all' ? .52 : activeFocus === 'square' ? .52 : activeFocus === 'tiantan' ? .46 : .68;
    const to = center.clone().add(new THREE.Vector3(0, Math.sin(angle) * distance, Math.cos(angle) * distance));
    if (activeFocus === 'square') to.x += distance * .18;
    if (animated && !reducedMotion) animation = { from: camera.position.clone(), to, fromTarget: controls.target.clone(), target: center.clone(), start: performance.now() };
    else { animation = null; camera.position.copy(to); controls.target.copy(center); controls.update(); }
    invalidate();
  };
  const overview = (animated = true) => {
    activeFocus = 'all';
    fit(new THREE.Vector3(25, 0, 3), Math.max(1020, 640 / Math.max(.4, camera.aspect)), animated);
  };
  const focus = (id: string) => {
    activeFocus = id;
    const site = landmarks.find(s => s.id === id);
    if (site || id === 'sample') {
      const s = site ?? landmarks.find(s => s.id === 'forbidden-city')!;
      const target = city.anchors.get(s.id)!.clone(); target.y = 0;
      let extent = id === 'sample' ? 47 : Math.max(24, s.footprint[0] / 10 / Math.max(.45, camera.aspect) * 1.6, s.footprint[1] / 10 * 1.5);
      if (id === 'sample') { target.z += 8; }
      if (s.id === 'tiantan') {
        const prayer=mappedLayout(43921139,s),vault=mappedLayout(43921121,s);
        target.x+=prayer.x;target.z+=(prayer.z+vault.z)/2+4;extent=Math.max(58,38/Math.max(.45,camera.aspect));
      }
      fit(target, extent);
    } else {
      const sites = landmarks.filter(s => s.region === id);
      const box = new THREE.Box3();
      sites.forEach(s => {
        const p = city.anchors.get(s.id)!;
        box.expandByPoint(new THREE.Vector3(p.x - s.footprint[0] / 20, 0, p.z - s.footprint[1] / 20));
        box.expandByPoint(new THREE.Vector3(p.x + s.footprint[0] / 20, 0, p.z + s.footprint[1] / 20));
      });
      if (!box.isEmpty()) { const size = box.getSize(new THREE.Vector3()); fit(box.getCenter(new THREE.Vector3()), Math.max(size.z, size.x / camera.aspect) * 1.4); }
    }
    const anchor = city.anchors.get(id);
    city.halo.visible = Boolean(anchor);
    if (anchor) { city.halo.position.set(anchor.x, .25, anchor.z); }
  };
  const updateLabels = () => {
    const occupied: { x: number; y: number; w: number }[] = [];
    const sorted = [...labelElements].sort((a, b) => (a.dataset.site === ref.current.selection ? -1 : b.dataset.site === ref.current.selection ? 1 : 0));
    const normal = new THREE.Vector3();
    for (const el of sorted) {
      const id = el.dataset.site!;
      const anchor = city.anchors.get(id)!.clone();
      if (id === 'square') { anchor.x -= 18; anchor.z -= 10; }
      if (id === 'forbidden-city') { anchor.x += 18; anchor.z += 10; }
      normal.copy(anchor).project(camera);
      const x = (normal.x + 1) * width / 2, y = (1 - normal.y) * height / 2;
      const w = Math.min(145, el.textContent!.length * 12 + 18);
      const selected = id === ref.current.selection;
      const inRegion = !['north', 'central', 'south'].includes(activeFocus) || landmarks.find(s => s.id === id)?.region === activeFocus;
      const visible = normal.z < 1 && normal.z > -1 && x > 20 && x < width - w && y > 65 && y < height - 75 && inRegion && (selected || !occupied.some(p => Math.abs(p.x - x) < Math.max(w, p.w) + 8 && Math.abs(p.y - y) < 27));
      el.style.opacity = visible ? '1' : '0'; el.style.pointerEvents = visible ? 'auto' : 'none';
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (visible) occupied.push({ x, y, w });
    }
    const squareAnchor = city.anchors.get('square');
    const annotations: Record<string, THREE.Vector3> = {
      heroes: new THREE.Vector3(-.8, 4.2, -15.8),
      memorial: new THREE.Vector3(.3, 3.4, 7.4),
      'great-hall': new THREE.Vector3(-36, 3, -18.7),
      museum: new THREE.Vector3(33.6, 3, -21.5),
    };
    const squareVisible = Boolean(squareAnchor) && (activeFocus === 'square' || ref.current.selection === 'square');
    const tiantanAnchor = city.anchors.get('tiantan');
    if (tiantanAnchor) {
      const site = landmarks.find(item => item.id === 'tiantan')!;
      const prayer = mappedLayout(43921139,site), vault = mappedLayout(43921121,site);
      annotations['prayer-hall'] = new THREE.Vector3(prayer.x,6.5,prayer.z);
      annotations['imperial-vault'] = new THREE.Vector3(vault.x,3.5,vault.z);
      annotations['circular-altar'] = new THREE.Vector3(vault.x,2,vault.z+11.2);
      annotations['danbi-bridge'] = new THREE.Vector3(prayer.x,1,(prayer.z+vault.z)/2);
    }
    const tiantanVisible = Boolean(tiantanAnchor) && (activeFocus === 'tiantan' || ref.current.selection === 'tiantan');
    for (const el of annotationElements) {
      const offset = annotations[el.dataset.annotation!];
      const tiantan = ['prayer-hall','imperial-vault','circular-altar','danbi-bridge'].includes(el.dataset.annotation!);
      const origin = tiantan ? tiantanAnchor : squareAnchor;
      const activeGroup = tiantan ? tiantanVisible : squareVisible;
      if (!activeGroup || !origin || !offset) { el.style.opacity = '0'; continue; }
      normal.copy(origin).add(offset).project(camera);
      const x = (normal.x + 1) * width / 2, y = (1 - normal.y) * height / 2;
      const visible = normal.z < 1 && normal.z > -1 && x > 45 && x < width - 70 && y > 45 && y < height - 60;
      el.style.opacity = visible ? '1' : '0';
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
    }
  };
  function invalidate() { if (disposed || !active || document.hidden) return; needsFrames = 2; if (!frame && !rendering) frame = requestAnimationFrame(render); }
  function render(time: number) {
    frame = 0; if (disposed || !active || document.hidden) return; rendering = true;
    if (animation) {
      const t = Math.min(1, (time - animation.start) / 1150), eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(animation.from, animation.to, eased);
      controls.target.lerpVectors(animation.fromTarget, animation.target, eased);
      if (t === 1) animation = null;
    }
    controls.update();
    const target = controls.target;
    const clampedX = THREE.MathUtils.clamp(target.x, -bounds.width / 2, bounds.width / 2);
    const clampedZ = THREE.MathUtils.clamp(target.z, -bounds.depth / 2, bounds.depth / 2);
    camera.position.x += clampedX - target.x; camera.position.z += clampedZ - target.z;
    target.x = clampedX; target.z = clampedZ;
    camera.updateMatrixWorld(); renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      container.dataset.triangles = String(renderer.info.render.triangles);
      container.dataset.drawCalls = String(renderer.info.render.calls);
    }
    updateLabels();
    rendering = false;
    if ((animation || --needsFrames > 0) && !frame) frame = requestAnimationFrame(render);
  }
  const resize = () => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (activeFocus === 'all') overview(false); else invalidate();
  };
  const onPointerDown = (e: PointerEvent) => { if (e.button === 1) e.preventDefault(); down = { x: e.clientX, y: e.clientY }; animation = null; };
  const onPointerUp = (e: PointerEvent) => {
    if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(city.pickers)[0];
    if (hit) ref.current.onSelect(hit.object.userData.id as string);
  };
  const onContextLost = (event: Event) => { event.preventDefault(); ref.current.onReady?.('fallback'); };
  const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else invalidate(); };
  document.addEventListener('visibilitychange', onVisibility);
  controls.addEventListener('change', invalidate);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  failedInitCleanup.push(() => { cancelAnimationFrame(frame); observer.disconnect(); });
  if (ref.current.selection) focus(ref.current.selection); else if (ref.current.sample) focus('sample'); else if (ref.current.focus !== 'all') focus(ref.current.focus);
  return {
    focus,
    reset: () => { city.halo.visible = false; overview(); },
    quality: value => {
      renderer.shadowMap.enabled = value === 'cinematic' && !mobile && !software;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, value === 'cinematic' && !software ? 1.75 : 1.15));
      renderer.setSize(width, height); invalidate();
    },
    active: value => { if(active===value)return; active = value; if (value) { animation = null; invalidate(); } else { cancelAnimationFrame(frame); frame = 0; } },
    dispose: () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      sun.dispose(); document.removeEventListener('visibilitychange', onVisibility);
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { object.geometry.dispose(); if (object instanceof THREE.LineSegments || city.pickers.includes(object as THREE.Mesh) || object === city.halo) (object.material as THREE.Material).dispose(); } });
      terrainCleanup(); skyTexture.dispose(); disposeMaterials(materials); renderer.dispose(); renderer.domElement.remove();
    },
  };
  } catch (error) {
    for (const dispose of failedInitCleanup.reverse()) { try { dispose(); } catch { /* Preserve the original initialization failure. */ } }
    throw error;
  }
}
