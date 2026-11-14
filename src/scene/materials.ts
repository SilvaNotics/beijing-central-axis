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

/** Grain, pores and mineral seams are generated locally at a fixed seed. */
function naturalSurface(kind:'granite'|'soil'|'rock'|'bark') {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(256,256);
  const hash=(x:number,y:number)=>{let n=Math.imul(x+173,374761393)^Math.imul(y+619,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
    const grain=hash(x,y),coarse=hash(Math.floor(x/11),Math.floor(y/11));
    const seam=kind==='bark'?Math.sin(x*.25+Math.sin(y*.06)*.7):kind==='soil'?Math.sin(y*.14+Math.sin(x*.04)*2):Math.sin(x*.023+y*.035+Math.sin(y*.06));
    const value=kind==='granite'?192+grain*48+coarse*12-(grain<.035?45:0):kind==='rock'?185+grain*28+seam*19:kind==='bark'?171+grain*24+seam*38:181+grain*28+coarse*22+seam*10;
    const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
}

/** Local inscription surface; small rear engraving is represented by strokes. */
function monumentInscription(front:boolean) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=768;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#ddd4c1';ctx.fillRect(0,0,256,768);
  if(front) {
    ctx.fillStyle='#947126';ctx.font='70px "Noto Serif CJK SC", "SimSun", serif';ctx.textAlign='center';ctx.textBaseline='middle';
    [...'人民英雄永垂不朽'].forEach((character,i)=>ctx.fillText(character,128,60+i*91));
  } else {
    ctx.fillStyle='#969186';
    for(let column=0;column<8;column++)for(let row=0;row<30;row++) {
      const x=24+column*28,y=35+row*23;
      ctx.fillRect(x,y,15,2);ctx.fillRect(x+7,y-4,2,15);ctx.fillRect(x+3,y+8,12,2);
    }
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
}

export function createMaterials() {
  const tiles = texture('tile');
  const tileNormal = texture('tile', true);
  const stone = texture('stone');
  const ground = texture('ground');
  const cityBrick = texture('brick');
  const granite=naturalSurface('granite'),soil=naturalSurface('soil'),rock=naturalSurface('rock'),bark=naturalSurface('bark');
  tiles.repeat.set(2, 2);
  tileNormal.repeat.set(2, 2);
  ground.repeat.set(30, 48);
  const make = (color: string, roughness = .85, map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color, roughness, ...(map ? { map } : {}) });
  return {
    // Weathered cinnabar and glazed tile sit inside the same dusk palette instead of reading as pure RGB primaries.
    wall: make('#813a30', .93, texture('brick')),
    grayBrick: make('#777970', .95, texture('brick')),
    cityWallBrick: new THREE.MeshStandardMaterial({ color: '#9c9787', roughness: .97, map: cityBrick, bumpMap: cityBrick, bumpScale: .004 }),
    weatheredStone:new THREE.MeshStandardMaterial({color:'#aca48d',roughness:1,map:granite,bumpMap:granite,bumpScale:.009,vertexColors:true}),
    cutEarth:new THREE.MeshStandardMaterial({color:'#827159',roughness:1,map:soil,bumpMap:soil,bumpScale:.012,vertexColors:true}),
    gardenRock:new THREE.MeshStandardMaterial({color:'#a5a394',roughness:1,map:rock,bumpMap:rock,bumpScale:.018,vertexColors:true}),
    hillEarth:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,vertexColors:true}),
    vermilion: make('#8e4435', .83),
    wood: make('#39291f', .9),
    paintedBlue: make('#2d505d', .88),
    gold: new THREE.MeshStandardMaterial({ color: '#9c7b45', roughness: .58, metalness: .08, map: tiles, normalMap: tileNormal, normalScale: new THREE.Vector2(.08, .08), side: THREE.DoubleSide }),
    blue: new THREE.MeshStandardMaterial({ color: '#294d67', roughness: .62, metalness: .05, map: tiles, normalMap: tileNormal, normalScale: new THREE.Vector2(.08, .08), side: THREE.DoubleSide }),
    green: new THREE.MeshStandardMaterial({ color: '#465d52', roughness: .82, map: tiles, side: THREE.DoubleSide }),
    purpleGlaze: new THREE.MeshStandardMaterial({color:'#665568',roughness:.62,map:tiles,side:THREE.DoubleSide}),
    grayRoof: new THREE.MeshStandardMaterial({ color: '#4b504c', roughness: .9, map: tiles, side: THREE.DoubleSide }),
    stone: make('#c9bca4', .97, stone),
    paving: make('#85877d', .98, stone),
    darkStone: make('#303a39', .94, stone),
    earth: make('#5b625d', .98, ground),
    park: make('#3f5948', .99),
    leaf: new THREE.MeshStandardMaterial({ color: '#c2cab3', roughness: 1, vertexColors:true, emissive: '#253123', emissiveIntensity: .12 }),
    trunk: new THREE.MeshStandardMaterial({color:'#625442',roughness:1,map:bark,bumpMap:bark,bumpScale:.012}),
    road: make('#aaa18f', .99),
    water: new THREE.MeshStandardMaterial({ color: '#476e76', roughness: .3, metalness: .08, transparent: true, opacity: .84, depthWrite: false, side: THREE.DoubleSide }),
    brass: new THREE.MeshStandardMaterial({ color: '#a58a59', metalness: .32, roughness: .66 }),
    contextWall: make('#89877b', .99),
    ridge: make('#6e5b43', .78),
    window: make('#2c251f', .92),
    plazaLine: make('#8d8372', 1),
    waterEdge: make('#8d9a8d', .94),
    flagRed: new THREE.MeshStandardMaterial({color:'#8d332e',roughness:.82,side:THREE.DoubleSide}),
    marble: make('#ddd4c1', .93, stone),
    monumentFront: make('#ffffff', .93, monumentInscription(true)),
    monumentBack: make('#ffffff', .93, monumentInscription(false)),
    civicStone: make('#c3bfb3', .94, stone),
    civicStoneDark: make('#85847d', .96, stone),
    glass: new THREE.MeshStandardMaterial({ color: '#283d40', roughness: .22, metalness: .22 }),
    flatRoof: make('#51524d', .9),
    bronzeRoof: make('#665d4d', .76, tiles),
    goldLeaf: new THREE.MeshStandardMaterial({ color: '#d1a94e', roughness: .42, metalness: .3 }),
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
