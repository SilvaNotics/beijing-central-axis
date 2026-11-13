import * as THREE from 'three';

/** Deterministic, locally generated surface maps; no network or image dependency. */
function texture(kind: 'brick' | 'tile' | 'stone' | 'ground', normal = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(256, 256);
  let seed = 781;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    const grout = kind === 'brick' ? y % 32 < 1 || (x + (Math.floor(y / 32) % 2) * 32) % 64 < 1 : kind === 'stone' ? y % 64 < 1 || (x + Math.floor(y / 64) % 2 * 32) % 64 < 1 : false;
    const ridge = kind === 'tile' ? Math.cos(x / 256 * Math.PI * 32) : 0;
    const value = grout ? 218 : 232 + (random() - .5) * 12 + ridge * 5;
    image.data[i] = normal ? 128 + ridge * 9 : value;
    image.data[i + 1] = normal ? 128 : value;
    image.data[i + 2] = normal ? 252 : value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = normal ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function createMaterials() {
  const tiles = texture('tile');
  const tileNormal = texture('tile', true);
  const stone = texture('stone');
  const ground = texture('ground');
  tiles.repeat.set(2, 2);
  tileNormal.repeat.set(2, 2);
  ground.repeat.set(30, 48);
  const make = (color: string, roughness = .85, map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color, roughness, ...(map ? { map } : {}) });
  return {
    // Weathered cinnabar and glazed tile sit inside the same dusk palette instead of reading as pure RGB primaries.
    wall: make('#813a30', .93),
    vermilion: make('#8e4435', .83),
    wood: make('#39291f', .9),
    gold: new THREE.MeshStandardMaterial({ color: '#9c7b45', roughness: .58, metalness: .08, map: tiles, normalMap: tileNormal, normalScale: new THREE.Vector2(.08, .08) }),
    blue: new THREE.MeshStandardMaterial({ color: '#496c78', roughness: .7, metalness: .04, map: tiles, normalMap: tileNormal, normalScale: new THREE.Vector2(.08, .08) }),
    green: make('#465d52', .82, tiles),
    grayRoof: make('#424a48', .9, tiles),
    stone: make('#c9bca4', .97, stone),
    paving: make('#85877d', .98, stone),
    darkStone: make('#303a39', .94, stone),
    earth: make('#5b625d', .98, ground),
    park: make('#3f5948', .99),
    leaf: new THREE.MeshStandardMaterial({ color: '#aeb9a6', roughness: 1, emissive: '#2b3528', emissiveIntensity: .32 }),
    trunk: make('#4a4235', 1),
    road: make('#aaa18f', .99),
    water: new THREE.MeshStandardMaterial({ color: '#476e76', roughness: .3, metalness: .08, transparent: true, opacity: .84, depthWrite: false, side: THREE.DoubleSide }),
    brass: new THREE.MeshStandardMaterial({ color: '#a58a59', metalness: .32, roughness: .66 }),
    contextWall: make('#89877b', .99),
    ridge: make('#6e5b43', .78),
    window: make('#2c251f', .92),
    plazaLine: make('#8d8372', 1),
    waterEdge: make('#8d9a8d', .94),
    flagRed: make('#8d332e', .82),
  };
}
export type Materials = ReturnType<typeof createMaterials>;

export function disposeMaterials(materials: Materials) {
  const textures = new Set<THREE.Texture>();
  for (const material of Object.values(materials)) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    material.dispose();
  }
  textures.forEach(item => item.dispose());
}
