import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { localFootprintLayout, wgs84ToGcj02, type BuildingFootprint, type CityData } from './geodata';
import { project, pointInPolygon } from './geo';
import { mappedLayout, palaceAxis, jingshanPavilions } from './layouts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
const columnGeometry = new THREE.CylinderGeometry(.055, .07, 1, 12);

function box(group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(boxGeometry, mat);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  group.add(mesh); return mesh;
}
function cylinder(group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, radius: number, height: number) {
  const mesh = new THREE.Mesh(cylinderGeometry, mat);
  mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius);
  group.add(mesh); return mesh;
}
function beam(group: THREE.Group, mat: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
  const direction = to.clone().sub(from), mesh = new THREE.Mesh(cylinderGeometry, mat);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.scale.set(radius, direction.length(), radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  group.add(mesh); return mesh;
}
function roofRidges(group: THREE.Group, m: Materials, x: number, z: number, width: number, depth: number, rise: number, y: number) {
  const columns = Math.max(4, Math.min(10, Math.round(width * 1.02)));
  for (let i = 0; i < columns; i++) {
    const px = (i / (columns - 1) - .5) * width * .82;
    for (const side of [-1,1]) {
      beam(group,m.ridge,new THREE.Vector3(x+px,y+.015,z+side*depth*.46),new THREE.Vector3(x+px*.58,y+rise*.93,z+side*.045),.007);
    }
  }
  for (const side of [-1,1]) {
    beam(group,m.ridge,new THREE.Vector3(x-width*.5,y+.03,z+side*depth*.47),new THREE.Vector3(x+width*.5,y+.03,z+side*depth*.47),.018);
    beam(group,m.ridge,new THREE.Vector3(x+side*width*.5,y+.03,z-depth*.47),new THREE.Vector3(x+side*width*.5,y+.03,z+depth*.47),.018);
  }
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    beam(group,m.ridge,new THREE.Vector3(x+sx*width*.5,y+.03,z+sz*depth*.47),new THREE.Vector3(x+sx*width*.07,y+rise*.96,z),.014);
  }
}

function colonnade(group: THREE.Group, m: Materials, x: number, z: number, width: number, height: number, count: number, centered = true) {
  const offset = centered ? width / 2 : 0;
  for (let i = 0; i < count; i++) {
    const xx = x - offset + i * width / Math.max(1, count - 1);
    const column = new THREE.Mesh(columnGeometry, m.vermilion);
    column.position.set(xx, .48 + height / 2, z);
    column.scale.y = height;
    group.add(column);
  }
}

function archPanel(group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, width: number, height: number) {
  const shape = new THREE.Shape();
  const radius = width / 2;
  shape.moveTo(-radius, -height / 2);
  shape.lineTo(radius, -height / 2);
  shape.lineTo(radius, height / 2 - radius);
  shape.absarc(0, height / 2 - radius, radius, 0, Math.PI, false);
  shape.lineTo(-radius, -height / 2);
  const portal = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mat);
  portal.position.set(x, y, z);
  group.add(portal);
  return portal;
}

function court(group: THREE.Group, m: Materials, x: number, z: number, w: number, d: number, paved = true) {
  box(group, m.darkStone, x, .01, z, w + .32, .08, d + .32);
  box(group, paved ? m.paving : m.park, x, .055, z, w, .06, d);
}

/** Hipped, curved tile roof with raised corners, ridge and deep overhanging eaves. */
export function roofGeometry(width: number, depth: number, rise: number) {
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rings = 7;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const w = width / 2 * (1 - t * .83);
    const d = depth / 2 * (1 - t * .98);
    const y = rise * Math.pow(t, 1.55);
    const corner = r === 0 ? rise * .11 : 0;
    const points = [[-w, y + corner, -d], [0, y, -d], [w, y + corner, -d], [w, y, 0], [w, y + corner, d], [0, y, d], [-w, y + corner, d], [-w, y, 0]];
    points.forEach((p, i) => { vertices.push(...p); uvs.push(i / 8 * Math.max(1, width / 2), t * 2); });
  }
  for (let r = 0; r < rings; r++) for (let k = 0; k < 8; k++) {
    const a = r * 8 + k, b = r * 8 + (k + 1) % 8, c = a + 8, d = b + 8;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function hall(group: THREE.Group, m: Materials, x: number, z: number, w: number, d: number, h: number, roofMat = m.gold, double = false, elevation = 0) {
  const y = elevation;
  box(group, m.stone, x, y + .18, z, w + .9, .36, d + .8);
  box(group, m.vermilion, x, y + h / 2 + .46, z, w, h, d);
  // Recessed dark doors and a regular timber colonnade on both facades.
  const bays = Math.max(3, Math.floor(w / 1.05));
  for (let i = 0; i < bays; i++) {
    const xx = x - w / 2 + .32 + i * (w - .64) / (bays - 1);
    box(group, m.window, xx, y + h * .44 + .46, z + d / 2 + .018, .38, h * .70, .045);
    box(group, m.wood, xx, y + h * .46 + .46, z + d / 2 + .043, .025, h * .74, .018);
    const column = new THREE.Mesh(columnGeometry, m.vermilion);
    column.position.set(xx, y + h / 2 + .48, z + d / 2 + .24);
    column.scale.y = h;
    group.add(column);
    box(group, m.wood, xx, y + .49, z + d / 2 + .18, .52, .08, .42);
  }
  const eaveY = y + h + .46;
  const roofRise = h * .61;
  const roof = new THREE.Mesh(roofGeometry(w + 1.3, d + 1.12, roofRise), roofMat);
  roof.position.set(x, eaveY, z); group.add(roof);
  roofRidges(group,m,x,z,w+1.3,d+1.12,roofRise,eaveY);
  box(group, m.ridge, x, eaveY + h * .625, z, Math.max(.62, w * .34), .10, .11);
  if (double) {
    const upperBase = eaveY + h * .58;
    box(group, m.vermilion, x, upperBase + h * .16, z, w * .75, h * .32, d * .66);
    colonnade(group, m, x, z + d * .34, w * .66, h * .31, Math.max(3, Math.floor(w / 1.6)));
    const upperRise = h * .48;
    const upper = new THREE.Mesh(roofGeometry(w * .8, d * .72, upperRise), roofMat);
    upper.position.set(x, upperBase + h * .32, z); group.add(upper);
    roofRidges(group,m,x,z,w*.8,d*.72,upperRise,upperBase+h*.32);
    box(group, m.ridge, x, upperBase + h * .80, z, Math.max(.5, w * .24), .09, .10);
  }
  // Shallow stone stairs, a geometric rather than painted detail.
  for (let step = 0; step < 5; step++) box(group, m.stone, x, y + .025 + step * .045, z + d / 2 + .78 - step * .12, w * .52, .09, .76 - step * .12);
}

function enclosure(group: THREE.Group, m: Materials, w: number, d: number, wallHeight = 1.3, color = m.wall, centerX = 0) {
  box(group, color, centerX - w / 2, wallHeight / 2, 0, .28, wallHeight, d);
  box(group, color, centerX + w / 2, wallHeight / 2, 0, .28, wallHeight, d);
  box(group, color, centerX, wallHeight / 2, -d / 2, w, wallHeight, .28);
  // A central entrance opening remains visible.
  box(group, color, centerX - w * .29, wallHeight / 2, d / 2, w * .42, wallHeight, .28);
  box(group, color, centerX + w * .29, wallHeight / 2, d / 2, w * .42, wallHeight, .28);
  for (const side of [-1, 1]) {
    box(group, m.grayRoof, centerX + side * w / 2, wallHeight + .045, 0, .48, .09, d + .28);
    box(group, m.grayRoof, centerX, wallHeight + .045, side * d / 2, w + .28, .09, .48);
  }
}

function mappedHall(group: THREE.Group, site: Landmark, m: Materials, id: number, height = 1, double = false, alignX?: number) {
  const p = mappedLayout(id,site), hallGroup = new THREE.Group();
  hallGroup.name=p.name; hallGroup.userData.osmId=id; hallGroup.position.set(alignX ?? p.x,0,p.z);
  hall(hallGroup,m,0,0,p.w,p.d,height,m.gold,double);group.add(hallGroup); return hallGroup;
}

function footprintBuilding(group: THREE.Group, m: Materials, building: BuildingFootprint, site: Landmark, roofMat: THREE.Material, minimumSide = .22) {
  const p = localFootprintLayout(building, site);
  if (Math.max(p.width, p.depth) < minimumSide || Math.max(p.width, p.depth) > 18) return;
  const width = Math.max(.28, p.width), depth = Math.max(.24, p.depth), height = Math.max(.42, Math.min(2.2, p.height));
  const item = new THREE.Group();
  item.position.set(p.x, 0, p.z); item.rotation.y = p.rotation;
  box(item,m.darkStone,0,.035,0,width+.18,.07,depth+.18);
  box(item,m.vermilion,0,height*.5+.07,0,width,height,depth);
  if (width > 2.0 && depth > .7) {
    const columns = Math.max(2, Math.min(8, Math.round(width / .85)));
    for (let i=0;i<columns;i++) {
      const x=-width*.42+i*width*.84/Math.max(1,columns-1);
      box(item,m.window,x,height*.48+.07,depth*.5+.018,Math.min(.34,width/columns*.42),height*.58,.035);
      const column=new THREE.Mesh(columnGeometry,m.vermilion);
      column.position.set(x,.17+height*.45,depth*.5+.12);column.scale.y=height*.9;item.add(column);
    }
  }
  const rise=Math.min(.72,Math.max(.16,height*.55));
  const roof=new THREE.Mesh(roofGeometry(width+.34,depth+.30,rise),roofMat);roof.position.y=height+.09;item.add(roof);
  box(item,m.ridge,0,height+.10+rise*.93,0,Math.max(.20,width*.24),.045,.055);
  group.add(item);
}

function osmBuildings(group: THREE.Group, m: Materials, data: CityData | undefined, site: Landmark, excludes: Set<number>, roofMat: THREE.Material | ((building: BuildingFootprint) => THREE.Material), include?: (layout: ReturnType<typeof localFootprintLayout>) => boolean) {
  if (!data) return;
  for (const building of data.buildings) {
    if (excludes.has(building.id)) continue;
    const layout = localFootprintLayout(building, site);
    if (!include || include(layout)) footprintBuilding(group,m,building,site,typeof roofMat === 'function' ? roofMat(building) : roofMat);
  }
}

function ancestralTemple(group: THREE.Group,m: Materials,site: Landmark,w: number,d: number) {
  const sleeping=mappedLayout(684772314,site), rear=mappedLayout(60540211,site);
  const axisX = (sleeping.x + rear.x) / 2;
  court(group,m,axisX,0,Math.min(38,w*.92),Math.min(43,d*.94));
  box(group,m.stone,axisX,.09,1,3.2,.08,39);
  box(group,m.brass,axisX,.14,1,.10,.02,39);
  const front=new THREE.Group();front.name='享殿';front.position.set(axisX,0,sleeping.z+7.4);
  hall(front,m,0,0,6.86,3.0,1.55,m.gold,true,.28);group.add(front);
  mappedHall(group,site,m,684772314,1.0,false,axisX);mappedHall(group,site,m,60540211,.82,false,axisX);
  enclosure(group,m,39,43,1.25,m.wall,axisX);
  for(const side of [-1,1]) {
    for (const [dz, length, height] of [[6.8,8.4,.58],[-3.2,11.5,.66],[-12.6,7.8,.52]] as const) {
      const wing=new THREE.Group();wing.position.set(axisX+side*8.1,0,sleeping.z+dz);wing.rotation.y=Math.PI/2;
      hall(wing,m,0,0,length,1.65,height);group.add(wing);
    }
  }
  for (const z of [-18.5,18.5]) {
    box(group,m.wall,axisX-.6,1.0,z,.9,2.0,.24);
    box(group,m.wall,axisX+.6,1.0,z,.9,2.0,.24);
    hall(group,m,axisX,z,1.2,1.0,.62,m.gold);
  }
  for (const x of [-1,1]) {
    box(group,m.stone,axisX+x*4.2,1.35,18.7,.18,2.7,.18);
    box(group,m.stone,axisX+x*4.2,2.7,18.7,.52,.12,.52);
  }
}

function pavilion(group: THREE.Group,m: Materials,x:number,z:number,y:number,radius:number,sides:number,roof:THREE.Material) {
  const p=new THREE.Group();p.position.set(x,y,z);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(radius*1.12,radius*1.2,.18,sides),m.stone);p.add(platform);
  for(let i=0;i<sides;i++) {const a=i/sides*Math.PI*2;cylinder(p,m.vermilion,Math.cos(a)*radius*.68,.65,Math.sin(a)*radius*.68,.045,1.2);}
  for(let tier=0;tier<2;tier++) {
    const r=radius*(1-tier*.22),top=new THREE.Mesh(new THREE.ConeGeometry(r,.7,sides),roof);
    top.rotation.y=Math.PI/4;top.position.y=1.2+tier*.6;p.add(top);
  }
  cylinder(p,m.gold,0,2.35,0,.055,.25);group.add(p);return p;
}

function jingshan(group:THREE.Group,m:Materials,site:Landmark,w:number,d:number) {
  // A broad east–west ridge, with five peaks rather than one hemispherical dome.
  for(const [index,id] of jingshanPavilions.entries()) {
    const p=mappedLayout(id,site), y=index===2?4.57:Math.abs(index-2)===1?3.5:2.6;
    const hill=new THREE.Mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),m.park);
    hill.position.set(p.x,0,p.z);hill.scale.set(index===2?10:7,y,9);group.add(hill);
    const roof=index===2?m.gold:Math.abs(index-2)===1?m.green:m.blue;
    const pavi=pavilion(group,m,p.x,p.z,y,index===2?.8:.65,index===2?4:Math.abs(index-2)===1?8:16,roof);pavi.name=p.name;
  }
  mappedHall(group,site,m,26390117,1.15);
  mappedHall(group,site,m,26390236,.85,true);
  const shou=mappedLayout(26390117,site);
  for(const side of [-1,1]) {const wing=new THREE.Group();wing.position.set(shou.x+side*7,0,shou.z+4);wing.rotation.y=Math.PI/2;hall(wing,m,0,0,6.5,1.7,.65);group.add(wing);}
  hall(group,m,shou.x,shou.z+8,5,1.9,.75);
}

function palace(group: THREE.Group, m: Materials, w: number, d: number, imperial = false, site: Landmark, data?: CityData) {
  if (imperial) {
    const axis = palaceAxis.map(id => ({ id, ...mappedLayout(id, site) })), axisX = axis.reduce((sum, item) => sum + item.x, 0) / axis.length;
    court(group, m, axisX, 0, w - 1.6, d - 1.6);
    enclosure(group, m, w, d, 1.55, m.wall, axisX);
    // Broad stone courts and a continuous axial walk make the hierarchy legible from the overview.
    court(group, m, axisX, d * .175, 31, 44);
    court(group, m, axisX, -d * .235, 25, 32);
    box(group, m.stone, axisX, .12, .3, 5.5, .08, d - 8);
    box(group, m.brass, axisX, .17, .3, .12, .02, d - 8);
    for (const id of palaceAxis) mappedHall(group, site, m, id, id === 638449347 ? 1.7 : id === 638981229 ? .85 : 1.2, id === 638449347 || id === 638473398 || id === 638981317, axisX);
    // Zhonghedian is square and sits between Taihedian and Baohedian, not a long hall.
    const taihe = mappedLayout(638449347, site), baohe = mappedLayout(638473398, site);
    const middle = new THREE.Group(); middle.name = '中和殿'; middle.position.set(axisX, .28, (taihe.z + baohe.z) / 2);
    court(middle, m, 0, 0, 4.2, 4.2); hall(middle, m, 0, 0, 2.35, 2.35, .82, m.gold, true); group.add(middle);
    for (const id of [40631331,40631343,40631116,40631121,685316170,40631788,40631798,40631806,40631817,40631826,40631832,40593735,40606461,40592355,40592356]) {
      mappedHall(group, site, m, id, .7);
    }
    for (const id of [43512262,43519304]) {
      const p = mappedLayout(id, site);
      court(group,m,p.x,p.z,p.w+2.5,p.d+2.8);
      for (const dz of [-1.3, 1.3]) hall(group,m,p.x,p.z+dz,p.w*.48,p.d*.42,.82);
    }
    const garden = mappedLayout(40795244, site);
    court(group,m,axisX,garden.z,16,11,false);
    box(group,m.stone,axisX,.10,garden.z,2.2,.09,11);
    box(group,m.stone,axisX,.10,garden.z,16,.09,1.6);
    for (const [x,z] of [[-5,-2],[5,-2],[-4,3],[4,3]] as const) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),m.grayRoof);
      rock.position.set(axisX+x,.55,garden.z+z); rock.scale.set(1.2,.65,.9); group.add(rock);
    }
    const detailed = new Set([
      ...palaceAxis,
      ...[40631331,40631343,40631116,40631121,685316170,40631788,40631798,40631806,40631817,40631826,40631832,40593735,40606461,40592355,40592356,43512262,43519304],
    ]);
    osmBuildings(group,m,data,site,detailed,building=>/殿|宫/.test(building.name ?? '')?m.gold:m.grayRoof,layout=>Math.abs(layout.x)<w/2-.6&&Math.abs(layout.z)<d/2-.6);
  } else {
    court(group,m,0,0,w*.92,d*.92);
    enclosure(group,m,w,d,1.2,m.wall);
    for (let row = 0; row < 3; row++) hall(group, m, 0, -d * .25 + row * d * .23, w * .52, d * .10, 1.5, m.gold);
    for (const x of [-1, 1]) hall(group, m, x * w * .35, 0, w * .13, d * .55, .85);
  }
}

function roundRoof(group: THREE.Group, m: Materials, radius: number, y: number, rise: number) {
  const points = [new THREE.Vector2(0,rise),new THREE.Vector2(radius*.14,rise*.91),new THREE.Vector2(radius*.36,rise*.57),new THREE.Vector2(radius*.68,rise*.23),new THREE.Vector2(radius,.04),new THREE.Vector2(radius*1.04,.12)];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(points,40),m.blue);
  roof.position.y=y;group.add(roof);
  const eave=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,4,40),m.gold);eave.rotation.x=Math.PI/2;eave.position.y=y+.06;group.add(eave);
}
function balustrade(group:THREE.Group,m:Materials,radius:number,y:number,count=32) {
  const rail=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,4,48),m.stone);rail.rotation.x=Math.PI/2;rail.position.y=y+.3;group.add(rail);
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2;cylinder(group,m.stone,Math.cos(a)*radius,y+.16,Math.sin(a)*radius,.04,.34);}
}
function terrace(group:THREE.Group,m:Materials,radius:number,step=.19) {
  for(let i=0;i<3;i++){
    const r=radius-i*.47;cylinder(group,m.stone,0,.12+i*step,0,r,step);
    balustrade(group,m,r-.09,.12+i*step);
    for(const direction of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const stairs=new THREE.Group();stairs.rotation.y=direction;
      for(let j=0;j<4;j++)box(stairs,m.stone,0,.03+j*.05,r+.65-j*.17,.6,.08,1-j*.17);group.add(stairs);
    }
  }
}
function heaven(group: THREE.Group, m: Materials, _w: number, _d: number, site: Landmark, data?: CityData) {
  const prayer=mappedLayout(43921139,site),vault=mappedLayout(43921121,site),qian=mappedLayout(43921140,site);
  const prayerCourt=new THREE.Group();prayerCourt.name='祈谷坛';prayerCourt.position.set(prayer.x,0,prayer.z);
  court(prayerCourt,m,0,0,24,24);
  box(prayerCourt,m.marble,0,.09,0,7.6,.10,7.6);
  box(prayerCourt,m.darkStone,0,.10,0,.42,.04,7.3);
  // The Hall of Prayer: a low red drum beneath three deep-blue circular eaves.
  const tower=new THREE.Group();tower.name='祈年殿';terrace(tower,m,4.5,.22);
  cylinder(tower,m.vermilion,0,1.29,0,1.46,1.05);
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2, px=Math.cos(a)*1.44, pz=Math.sin(a)*1.44;
    cylinder(tower,m.vermilion,px,1.32,pz,.065,1.08);
    const panel=box(tower,m.wood,px*.99,1.26,pz*.99,.52,.68,.055);
    panel.rotation.y=-a;
    box(tower,m.goldLeaf,px*.995,1.26,pz*.995,.055,.65,.07).rotation.y=-a;
  }
  const eaves = [
    {radius:2.16,y:2.04,rise:.58,band:1.92},
    {radius:1.70,y:2.62,rise:.53,band:1.48},
    {radius:1.27,y:3.15,rise:.60,band:1.08},
  ];
  for(const roof of eaves) {
    roundRoof(tower,m,roof.radius,roof.y,roof.rise);
    const trim=new THREE.Mesh(new THREE.TorusGeometry(roof.radius,.055,5,56),m.goldLeaf);
    trim.rotation.x=Math.PI/2;trim.position.y=roof.y+.10;tower.add(trim);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(roof.band,roof.band,.24,32,1,true),m.blue);
    band.position.y=roof.y-.10;tower.add(band);
  }
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.20,14,10),m.goldLeaf);finial.position.y=4.04;tower.add(finial);
  cylinder(tower,m.goldLeaf,0,3.86,0,.09,.34);
  prayerCourt.add(tower);group.add(prayerCourt);
  const northern=new THREE.Group();northern.name='皇乾殿';northern.position.set(qian.x,0,qian.z);hall(northern,m,0,0,qian.w,qian.d,.75,m.blue);group.add(northern);
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.position.set(prayer.x+side*7.6,0,prayer.z+1);wing.rotation.y=Math.PI/2;hall(wing,m,0,0,8,1.6,.72,m.blue);group.add(wing);
  }
  const gateZ=prayer.z+10;
  hall(group,m,prayer.x,gateZ,4.4,1.7,.76,m.blue);
  for(const side of [-1,1]) {
    box(group,m.wall,prayer.x+side*10.4,.62,prayer.z, .28,1.24,21);
    box(group,m.grayRoof,prayer.x+side*10.4,1.28,prayer.z,.48,.10,21.4);
  }
  for(const side of [-1,1]) {
    box(group,m.wall,prayer.x,.62,prayer.z+side*10.4,21,1.24,.28);
    box(group,m.grayRoof,prayer.x,1.28,prayer.z+side*10.4,21.4,.10,.48);
  }
  // The raised processional way joins the northern and southern altar precincts.
  const bridge=new THREE.Group();bridge.name='丹陛桥';
  const bridgeEnd=vault.z-7,bridgeLength=bridgeEnd-gateZ;
  box(bridge,m.stone,prayer.x,.16,(gateZ+bridgeEnd)/2,2.94,.3,bridgeLength);
  for(const dx of [-1.38,0,1.38])box(bridge,m.brass,prayer.x+dx,.32,(gateZ+bridgeEnd)/2,.035,.02,bridgeLength);group.add(bridge);
  const vaultGroup=new THREE.Group();vaultGroup.name='皇穹宇与回音壁';vaultGroup.position.set(vault.x,0,vault.z);
  cylinder(vaultGroup,m.paving,0,.04,0,3.25,.08);
  cylinder(vaultGroup,m.marble,0,.18,0,1.30,.25);cylinder(vaultGroup,m.vermilion,0,.86,0,.96,1.05);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(vaultGroup,m.wood,Math.cos(a)*.94,.78,Math.sin(a)*.94,.38,.68,.055).rotation.y=-a;}
  roundRoof(vaultGroup,m,1.16,1.37,.74);cylinder(vaultGroup,m.goldLeaf,0,2.16,0,.06,.22);
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(3.25,3.25,.6,64,1,true,.18,Math.PI*2-.36),m.wall);wall.position.y=.34;vaultGroup.add(wall);
  const wallCap=new THREE.Mesh(new THREE.TorusGeometry(3.25,.075,4,64,Math.PI*2-.36),m.blue);wallCap.rotation.x=Math.PI/2;wallCap.rotation.z=.18;wallCap.position.y=.65;vaultGroup.add(wallCap);
  for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*2.1,0,.8);wing.rotation.y=Math.PI/2;hall(wing,m,0,0,2.3,.8,.4,m.blue);vaultGroup.add(wing);}group.add(vaultGroup);
  const mound=new THREE.Group();mound.name='圜丘';mound.position.set(vault.x,0,vault.z+11.2);
  cylinder(mound,m.paving,0,.01,0,6.7,.06);terrace(mound,m,2.7,.16);
  const enclosure=new THREE.Mesh(new THREE.TorusGeometry(6.4,.08,4,64),m.wall);enclosure.rotation.x=Math.PI/2;enclosure.position.y=.25;mound.add(enclosure);group.add(mound);
  // Zhaigong is west of the ritual axis; the Long Corridor extends east of Qiniandian.
  const fasting=new THREE.Group();fasting.name='斋宫';fasting.position.set(prayer.x-55,0,vault.z-9);
  box(fasting,m.paving,0,.01,0,13,.08,17);hall(fasting,m,0,0,4.8,2.7,.8,m.green);hall(fasting,m,0,5,4,1.8,.65,m.green);
  for(const side of [-1,1])box(fasting,m.wall,side*6.5,.35,0,.18,.7,17);group.add(fasting);
  const corridor=new THREE.Group();corridor.name='七十二长廊';corridor.position.set(prayer.x+14,0,prayer.z-1.2);
  for(let i=0;i<18;i++) cylinder(corridor,m.vermilion,0,.60,-8.5+i,.055,1.15);
  box(corridor,m.green,0,1.22,0,.92,.09,18);box(corridor,m.ridge,0,1.3,0,.08,.05,18);group.add(corridor);
  const park=data?.context.find(feature => feature.kind === 'park' && feature.name === '天坛公园');
  if(park) {
    const [originX,originZ]=project(site.coords), ring=park.coordinates.map(project).map(([x,z]):[number,number]=>[x-originX,z-originZ]);
    const detailed=new Set([43921139,43921121,43921140]);
    osmBuildings(group,m,data,site,detailed,m.grayRoof,layout=>Math.hypot(layout.x,layout.z)<92&&pointInPolygon([layout.x,layout.z],ring));
  }
}

function squarePoint(site: Landmark, coords: [number, number]): [number, number] {
  const [x,z]=project(wgs84ToGcj02(coords)), [originX,originZ]=project(site.coords);
  return [x-originX,z-originZ];
}

function modernCivicBuilding(group: THREE.Group, m: Materials, x: number, z: number, width: number, depth: number, height: number, face: -1 | 1, museum = false) {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  court(building, m, 0, 0, width + 3.6, depth + 3.2);
  box(building, m.civicStoneDark, 0, .16, 0, width + 1.5, .32, depth + 1.5);
  box(building, m.civicStone, 0, height / 2 + .32, 0, width, height, depth);
  box(building, m.civicStoneDark, 0, height + .38, 0, width + .48, .16, depth + .48);
  box(building, m.bronzeRoof, 0, height + .50, 0, width + .90, .10, depth + .90);
  // Long stone frieze and recessed glazing establish the civic, mid-century facade.
  const friezeX = face * (width / 2 + .035), facadeZSpan = depth * .91;
  box(building, m.civicStoneDark, friezeX, height - .42, 0, .08, .34, facadeZSpan);
  const columnCount = museum ? 14 : 12;
  const columnX = face * (width / 2 + .48);
  for (let i = 0; i < columnCount; i++) {
    const columnZ = -depth * .31 + i * depth * .62 / (columnCount - 1);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.17,.20,height*.80,14),m.civicStone);
    column.position.set(columnX, .34 + height*.40, columnZ);
    building.add(column);
    box(building,m.civicStoneDark,columnX,.34+height*.81,columnZ,.48,.12,.48);
    box(building,m.civicStoneDark,columnX,.31,columnZ,.52,.12,.50);
  }
  box(building,m.civicStone,face*(width*.52),height*.48,0,1.1,height*.76,depth*.72);
  box(building,m.civicStoneDark,face*(width*.52+.57),height*.73,0,.09,.40,depth*.70);
  box(building,m.glass,face*(width*.52+.63),height*.46,0,.045,height*.54,depth*.56);
  for (let i=0;i<9;i++) {
    const columnZ=-depth*.20+i*depth*.40/8;
    const column=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,height*.62,12),m.civicStone);
    column.position.set(face*(width*.52+.72),.34+height*.31,columnZ);building.add(column);
  }
  for (const side of [-1,1]) {
    const wingZ=side*depth*.39;
    box(building,m.glass,face*(width*.49),height*.46,wingZ,.055,height*.38,depth*.15);
    for(let i=0;i<3;i++) box(building,m.civicStoneDark,face*(width*.50),height*(.34+i*.17),wingZ,.06,.09,depth*.18);
  }
  // Repetitive pilasters on the visible end wall keep the civic buildings legible from the oblique atlas view.
  for (let i=-4;i<=4;i++) {
    box(building,m.civicStoneDark,i*width*.095,height*.43,depth/2+.04,.28,height*.68,.07);
    box(building,m.civicStoneDark,i*width*.095,height*.43,-depth/2-.04,.28,height*.68,.07);
  }
  // Wide low steps, shallow cornice and roof flags replace the former palace roof silhouette.
  for (let step=0;step<5;step++) box(building,m.civicStone,face*(width/2+.75+step*.34),.05+step*.04,0,.66,.08,depth*.56-step*.20);
  const roofY=height+.59;
  box(building,m.civicStoneDark,0,height+.39,0,width+.72,.08,depth+.72);
  box(building,m.glass,0,height+.68,0,2.1,.06,depth*.46);
  for (let i=-4;i<=4;i++) box(building,m.flatRoof,i*width*.10,height+.72,0,.055,.035,depth*.88);
  for (const side of [-1,1]) box(building,m.civicStoneDark,face*(width/2+.34),roofY,side*depth*.34,.12,.32,depth*.30);
  if(!museum) {
    const emblem=new THREE.Mesh(new THREE.CylinderGeometry(.40,.40,.08,24),m.flagRed);
    emblem.rotation.z=Math.PI/2;emblem.position.set(face*(width/2+.13),height-.62,0);building.add(emblem);
  } else {
    for (const side of [-1,1]) {
      const towerZ=side*depth*.47;
      box(building,m.civicStone,face*(width/2-.24),height*.70,towerZ,width*.24,height*1.22,depth*.11);
      box(building,m.civicStoneDark,face*(width/2-.24),height*1.31,towerZ,width*.29,.14,depth*.14);
      box(building,m.bronzeRoof,face*(width/2-.24),height*1.40,towerZ,width*.34,.10,depth*.17);
    }
  }
  for (let i=-3;i<=3;i++) {
    box(building,m.stone,0,roofY+.45,i*depth*.08,.07,.75,.07);
  }
  group.add(building);
}

function monument(group: THREE.Group, m: Materials, x: number, z: number) {
  const base = new THREE.Group();
  base.position.set(x, 0, z);
  court(base, m, 0, 0, 5.7, 6.9);
  for (let i = 0; i < 3; i++) box(base, m.marble, 0, .14 + i * .12, 0, 4.8 - i * .45, .16, 5.6 - i * .40);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.28,.52,3.52,4),m.marble);
  shaft.position.y=2.12;shaft.rotation.y=Math.PI/4;base.add(shaft);
  box(base,m.brass,0,1.75,.37,.38,.70,.045);
  box(base,m.marble,0,3.92,0,.72,.16,.72);
  group.add(base);
}

function memorialHall(group: THREE.Group, m: Materials, x: number, z: number) {
  const hallGroup = new THREE.Group();
  hallGroup.position.set(x,0,z);
  court(hallGroup,m,0,0,12.2,10.8);
  box(hallGroup,m.civicStoneDark,0,.22,0,11.2,.34,9.8);
  box(hallGroup,m.civicStone,0,1.73,0,8.4,2.75,6.7);
  for(const side of [-1,1]) {
    colonnade(hallGroup,m,0,side*3.35,7.3,2.45,10);
    box(hallGroup,m.civicStoneDark,0,3.20,side*3.35,8.2,.18,.46);
    box(hallGroup,m.glass,0,1.85,side*3.39,6.8,1.55,.045);
  }
  for(const side of [-1,1]) colonnade(hallGroup,m,side*4.2,0,6.0,2.45,9,false);
  box(hallGroup,m.civicStoneDark,0,3.25,0,9.5,.22,7.8);
  box(hallGroup,m.flatRoof,0,3.41,0,9.2,.10,7.55);
  group.add(hallGroup);
}

function squareEnsemble(group: THREE.Group, m: Materials, site: Landmark) {
  const [squareX,squareZ]=squarePoint(site,[116.3914649,39.9023598]);
  const squareWidth=50, squareDepth=88;
  court(group,m,squareX,squareZ,squareWidth,squareDepth);
  box(group,m.stone,squareX,.095,squareZ,6.0,.03,squareDepth-2);
  box(group,m.brass,squareX,.13,squareZ,.07,.02,squareDepth-2);
  for (const x of [-20,-15,-10,-5,5,10,15,20]) box(group,m.darkStone,squareX+x,.096,squareZ,.055,.014,squareDepth-4);
  for (let z=-35;z<=35;z+=8) box(group,m.darkStone,squareX,.096,squareZ+z,44,.014,.055);
  for (const side of [-1,1]) {
    box(group,m.stone,squareX+side*22.6,.102,squareZ,.28,.02,squareDepth-2);
    box(group,m.darkStone,squareX+side*19.2,.107,squareZ,.12,.025,squareDepth-2);
  }
  const [greatX,greatZ]=squarePoint(site,[116.3873054,39.9034605]);
  const [museumX,museumZ]=squarePoint(site,[116.3954437,39.9037113]);
  const [monumentX,monumentZ]=squarePoint(site,[116.3914248,39.903197]);
  const [memorialX,memorialZ]=squarePoint(site,[116.391545,39.901114]);
  const [flagX,flagZ]=squarePoint(site,[116.3913049,39.9055772]);
  modernCivicBuilding(group,m,greatX,greatZ,21.7,34.0,4.3,1,false);
  modernCivicBuilding(group,m,museumX,museumZ,21.1,33.5,4.5,-1,true);
  monument(group,m,monumentX,monumentZ);
  memorialHall(group,m,memorialX,memorialZ);

  // Flagpole and lamps follow the mapped north edge of the square.
  cylinder(group,m.stone,flagX,1.18,flagZ,.07,2.25);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.35,.72,4,2),new THREE.MeshStandardMaterial({color:'#8d332e',roughness:.8,side:THREE.DoubleSide}));
  flag.position.set(flagX+.70,2.03,flagZ);flag.rotation.y=.18;group.add(flag);
  for (const side of [-1,1]) for (let i=0;i<9;i++) {
    const z=squareZ-24+i*6.2;
    box(group,m.stone,squareX+side*23.2,.56,z,.24,.05,.24);
    box(group,m.stone,squareX+side*23.2,.84,z,.08,1.08,.08);
    box(group,m.brass,squareX+side*23.2,1.38,z,.30,.18,.30);
  }
}

function gate(group: THREE.Group, m: Materials, w: number, d: number, tiananmen: boolean, zhengyang: boolean) {
  const baseW = Math.min(w, tiananmen ? 15 : 8);
  const baseD = Math.min(d, tiananmen ? 6 : 5);
  box(group, m.darkStone, 0, .08, 0, baseW + 1.4, .16, baseD + 1.5);
  box(group, m.wall, 0, 1.3, 0, baseW, 2.6, baseD);
  box(group, m.stone, 0, 2.68, 0, baseW + .28, .16, baseD + .32);
  const count = tiananmen ? 5 : zhengyang ? 1 : 3;
  for (let i = 0; i < count; i++) {
    const xx = (i - (count - 1) / 2) * (baseW / (count + 1));
    archPanel(group,m.window,xx,1.18,baseD/2+.021,.72,1.82);
    archPanel(group,m.window,xx,1.18,-baseD/2-.021,.72,1.82);
    box(group,m.wood,xx,.35,baseD/2+.035,.82,.22,.025);
    box(group,m.wood,xx,.35,-baseD/2-.035,.82,.22,.025);
  }
  hall(group, m, 0, 0, baseW * .88, baseD * .82, 1.9, zhengyang ? m.grayRoof : m.gold, true, 2.6);
  for (const face of [-1,1]) for (let i = -6; i <= 6; i++) box(group, m.stone, i * baseW / 13, 2.9, face*baseD/2, .12, .34, .30);
  if (tiananmen) {
    for (const side of [-1,1]) {
      box(group,m.stone,side*(baseW*.62),1.3,baseD*.45,.18,2.6,.18);
      const cloud=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,5,18),m.stone);cloud.rotation.x=Math.PI/2;cloud.position.set(side*baseW*.62,2.6,baseD*.45);group.add(cloud);
      box(group,m.darkStone,side*(baseW*.48),.46,baseD/2+1.0,.62,.55,1.15);
    }
  }
  if (zhengyang) {
    box(group, m.darkStone, 0, 1.0, 13.5, 6.1, 2, 3.7);
    box(group,m.darkStone,0,3.5,13.5,6.1,3.5,3.7);
    const arrowRoof=new THREE.Mesh(roofGeometry(6.7,4.3,1.3),m.grayRoof);arrowRoof.position.set(0,5.25,13.5);group.add(arrowRoof);
    for(let row=0;row<4;row++)for(let col=0;col<9;col++)archPanel(group,m.window,(col-4)*.56,2.5+row*.67,15.36,.25,.34);

  }
}

export function createLandmark(site: Landmark, m: Materials, data?: CityData): THREE.Group {
  const group = new THREE.Group(); group.name = site.id;
  const w = site.footprint[0] / 10, d = site.footprint[1] / 10;
  switch (site.kind) {
    case 'palace': palace(group, m, w, d, site.id === 'forbidden-city', site, data); break;
    case 'temple': if (site.id === 'taimiao') ancestralTemple(group,m,site,w,d); else heaven(group, m, w, d, site, data); break;
    case 'gate': gate(group, m, w, d, site.id === 'tiananmen' || site.id === 'duanmen', site.id === 'zhengyang'); break;
    case 'tower': {
      for (const [id, roof] of [[425993664,m.grayRoof],[267371087,m.gold]] as const) {
        const p = mappedLayout(id,site), tower = new THREE.Group(); tower.name=p.name; tower.position.set(p.x,0,p.z);
        box(tower,m.darkStone,0,1.1,0,p.w,2.2,p.d);
        hall(tower,m,0,0,p.w*.8,p.d*.75,id===425993664?1.7:1.1,roof,id!==425993664,2.2); group.add(tower);
      }
      break;
    }
    case 'bridge': {
      const bridges = site.id === 'jinshui' ? 7 : 1;
      for (let i = 0; i < bridges; i++) {
        const x = bridges === 7 ? [-4.8, -2.4, -1.2, 0, 1.2, 2.4, 4.8][i] : 0;
        box(group, m.stone, x, .30, 0, 1.0, .32, Math.max(d, 2.2));
        for (const s of [-1, 1]) for (let j = 0; j < 7; j++) box(group, m.stone, x + s * .46, .65, -Math.max(d, 2.2) / 2 + j * Math.max(d, 2.2) / 6, .08, .60, .08);
        for (const s of [-1, 1]) box(group, m.stone, x + s * .46, .90, 0, .08, .07, Math.max(d, 2.2));
      }
      break;
    }
    case 'hill': jingshan(group,m,site,w,d); break;
    case 'altar': {
      if(site.id==='xiannongtan') {
        for(const id of [587608666,587608670,727056014])mappedHall(group,site,m,id,.85);
        const altar=mappedLayout(587608667,site);
        for(let i=0;i<2;i++)box(group,m.stone,altar.x,.12+i*.14,altar.z,altar.w-i*.2,.17,altar.d-i*.2);
        const field=new THREE.Group();field.name='一亩三分地';field.position.set(altar.x+8,0,altar.z+4);
        box(field,m.earth,0,.04,0,4,.08,5);for(let i=0;i<8;i++)box(field,m.park,-1.7+i*.48,.09,0,.18,.04,4.8);group.add(field);
      } else {
        // The altar is open to the sky; the hall stands to its north.
        enclosure(group,m,12,14,.45);const hall=mappedHall(group,site,m,60540199,.85);
        const altarZ=hall.position.z+5.5;
        for(let i=0;i<3;i++)box(group,m.stone,hall.position.x,.12+i*.12,altarZ,3.2-i*.3,.15,3.2-i*.3);
        box(group,m.gold,hall.position.x,.49,altarZ,.9,.03,.9);
        for(const [dx,dz,mat] of [[1,0,m.green],[-1,0,m.stone],[0,-1,m.darkStone],[0,1,m.vermilion]] as const)box(group,mat,hall.position.x+dx*.85,.49,altarZ+dz*.85,dx? .8:2.5,.03,dz?.8: .9);
      }
      break;
    }
    case 'square': squareEnsemble(group,m,site); break;
    case 'road': box(group, m.road, 0, .04, 0, Math.max(w, 1.2), .10, d); break;
  }
  return group;
}

/** Merge static geometry by material, keeping roof/court detail with few draw calls. */
export function bake(group: THREE.Group, castShadow = true) {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    let g = object.geometry.clone().applyMatrix4(object.matrixWorld);
    if (g.index) { const nonIndexed = g.toNonIndexed(); g.dispose(); g = nonIndexed; }
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const array = batches.get(object.material) ?? []; array.push(g); batches.set(object.material, array);
  });
  const result = new THREE.Group();
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(item => item.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow; mesh.receiveShadow = true; result.add(mesh);
  }
  // Temporary authored roof geometries are no longer needed after baking.
  group.traverse(object => { if (object instanceof THREE.Mesh && object.geometry !== boxGeometry && object.geometry !== cylinderGeometry) object.geometry.dispose(); });
  return result;
}
