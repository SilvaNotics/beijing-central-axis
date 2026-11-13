import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { localBuildingRing, localFootprintLayout, wgs84ToGcj02, type BuildingFootprint, type CityData } from './geodata';
import { project, pointInPolygon } from './geo';
import { mappedLayout, palaceAxis, jingshanPavilions } from './layouts';
import { localPalaceBoundary, alignPalaceRoof } from './precincts';
import { roadStation } from './southernRoad';
import { jinshuiLayout, tiananmenDepth, tiananmenWidth, tiananmenPortals } from './gateLayout';
import { templeBoundary, moundCenter, tiantanDetailedIds, layoutCorners } from './templeLayout';
import { createCivicBuilding, createMonument } from './civicArchitecture';
import { civicLayouts, squareLocations } from './civicLayout';
import { timberBody, timberEaves } from './timberArchitecture';
import { roofGeometry, roofSection, roofGables, mappedRoofForm, type RoofForm } from './roofForms';
import { palaceHallProfiles, zhongheLayout, zhongheProfile, type HallProfile } from './palaceArchitecture';
export { roofGeometry } from './roofForms';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
const terraceGeometry = new THREE.CylinderGeometry(1, 1, 1, 96);
const columnGeometry = new THREE.CylinderGeometry(.055, .07, 1, 12);

function box(group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(boxGeometry, mat);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  group.add(mesh); return mesh;
}
function cylinder(group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, radius: number, height: number) {
  const mesh = new THREE.Mesh(radius > .5 ? terraceGeometry : cylinderGeometry, mat);
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
function roofRidges(group: THREE.Group, m: Materials, x: number, z: number, width: number, depth: number, rise: number, y: number, form: RoofForm = 'hipped') {
  const columns = Math.max(4, Math.min(10, Math.round(width * 1.02)));
  for (let i = 0; i < columns; i++) {
    const px = (i / (columns - 1) - .5) * width * .82;
    for (const side of [-1,1]) {
      for(let section=0;section<4;section++) {
        const point=(t:number)=>{const p=roofSection(width,depth,rise,t,form);return new THREE.Vector3(x+px*p.w/(width/2),y+p.y+.012,z+side*p.d);};
        beam(group,m.ridge,point(section/4),point((section+1)/4),.006);
      }
    }
  }
  for (const side of [-1,1]) {
    beam(group,m.ridge,new THREE.Vector3(x-width*.5,y+.03,z+side*depth*.47),new THREE.Vector3(x+width*.5,y+.03,z+side*depth*.47),.018);
    beam(group,m.ridge,new THREE.Vector3(x+side*width*.5,y+.03,z-depth*.47),new THREE.Vector3(x+side*width*.5,y+.03,z+depth*.47),.018);
  }
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    for(let section=0;section<4;section++) {
      const point=(t:number)=>{const p=roofSection(width,depth,rise,t,form);return new THREE.Vector3(x+sx*p.w,y+p.y+p.corner+.02,z+sz*p.d);};
      beam(group,m.ridge,point(section/4),point((section+1)/4),.014);
    }
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

function hall(group: THREE.Group, m: Materials, x: number, z: number, w: number, d: number, h: number, roofMat = m.gold, double = false, elevation = 0, fitFootprint = false, profile?: HallProfile) {
  // Mapped dimensions already include the eaves. Keep the roof inside that
  // envelope instead of expanding it into neighbouring halls and passages.
  const roofW = fitFootprint ? w : w + Math.min(1.3,d*.3);
  const roofD = fitFootprint ? d : d + Math.min(1.12,d*.28);
  if (fitFootprint) { w *= .82; d *= .78; }
  const y = elevation, floor=profile?.platform??.46;
  const form=profile?.roof??'hipped';
  double=profile?.double??double;
  if(profile)h=(profile.height-floor-(form==='pyramidal'?.16:.04))/(double?2.38:1.61);
  if(profile) {
    const levels=floor>.6?3:1;
    for(let tier=0;tier<levels;tier++) {
      const height=floor/levels;
      box(group,m.marble,x,y+(tier+.5)*height,z,roofW*.98-tier*.14,height,roofD*.98-tier*.14);
    }
    const topW=roofW*.98-(levels-1)*.14,topD=roofD*.98-(levels-1)*.14;
    for(const turn of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      const width=turn%Math.PI===0?topW:topD,depth=turn%Math.PI===0?topD:topW;
      const edge=new THREE.Group();edge.position.set(x,y,z);edge.rotation.y=turn;group.add(edge);
      const entrances=levels===3&&width>4?[-width*.28,0,width*.28]:[0];
      const stairW=entrances.length===3?.66:Math.min(width*.36,1.15);
      for(const entrance of entrances)for(let step=0;step<6;step++) {
        const top=floor*(step+1)/6;
        box(edge,m.marble,entrance,top/2,depth/2+.6-step*.12,stairW,top,.16);
      }
      // Openings in the balustrade coincide with each stair, including side exits.
      const count=Math.max(3,Math.round(width/.24));
      for(let i=0;i<=count;i++) {
        const xx=-width/2+i*width/count;
        if(entrances.some(entrance=>Math.abs(xx-entrance)<stairW/2+.04))continue;
        box(edge,m.marble,xx,floor+.12,depth/2,.035,.24,.035);
        if(i===count)continue;
        const next=xx+width/count;
        if(entrances.some(entrance=>xx<entrance+stairW/2&&next>entrance-stairW/2))continue;
        box(edge,m.marble,(xx+next)/2,floor+.22,depth/2,width/count,.035,.035);
        box(edge,m.marble,(xx+next)/2,floor+.10,depth/2,width/count,.07,.023);
      }
    }
  } else box(group, m.stone, x, y + .18, z, Math.min(roofW,w+.7), .36, Math.min(roofD,d+.6));
  const facade=new THREE.Group();facade.position.set(x,0,z);group.add(facade);
  timberBody(facade,m,w,d,h,y+floor,true,profile);
  const eaveY = y + h + floor;
  const roofRise = h * .61;
  const roof = new THREE.Mesh(roofGeometry(roofW, roofD, roofRise,double?'hipped':form), roofMat);
  roof.position.set(x, eaveY, z); group.add(roof);
  timberEaves(facade,m,roofW,roofD,w*.8,d*.8,eaveY);
  roofRidges(group,m,x,z,roofW,roofD,roofRise,eaveY,double?'hipped':form);
  if(!double) {
    const gables=roofGables(roofW,roofD,roofRise,form,m.wood);gables.position.set(x,eaveY,z);group.add(gables);
    if(form==='pyramidal')cylinder(group,m.goldLeaf,x,eaveY+roofRise+.08,z,.07,.16);
    else box(group,m.ridge,x,eaveY+roofRise+.02,z,roofSection(roofW,roofD,roofRise,1,form).w*2,.04,.08);
  }
  if (double) {
    const upperBase = eaveY + h * .58;
    timberBody(facade,m,w*.75,d*.66,h*.32,upperBase,false);
    const upperRise = h * .48;
    const upper = new THREE.Mesh(roofGeometry(w * .8, d * .72, upperRise,form), roofMat);
    upper.position.set(x, upperBase + h * .32, z); group.add(upper);
    timberEaves(facade,m,w*.8,d*.72,w*.60,d*.50,upperBase+h*.32,false);
    roofRidges(group,m,x,z,w*.8,d*.72,upperRise,upperBase+h*.32,form);
    const gables=roofGables(w*.8,d*.72,upperRise,form,m.wood);gables.position.set(x,upperBase+h*.32,z);group.add(gables);
    box(group,m.ridge,x,upperBase+h*.80+.02,z,roofSection(w*.8,d*.72,upperRise,1,form).w*2,.04,.08);
  }
  // Shallow stone stairs, a geometric rather than painted detail.
  if(!fitFootprint) for (let step = 0; step < 5; step++) box(group, m.stone, x, y + .025 + step * .045, z + d / 2 + .78 - step * .12, w * .52, .09, .76 - step * .12);
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

function mappedHall(group: THREE.Group, site: Landmark, m: Materials, id: number, height = 1, double = false, alignX?: number, data?: CityData) {
  const p = mappedLayout(id,site), hallGroup = new THREE.Group();
  hallGroup.name=p.name; hallGroup.userData.osmId=id; hallGroup.position.set(alignX ?? p.x,0,p.z);
  const footprint=data?.buildings.find(building=>building.id===id);
  if(footprint) {
    const layout=alignPalaceRoof(localFootprintLayout(footprint,site));
    hallGroup.position.set(layout.x,0,layout.z);hallGroup.rotation.y=layout.rotation;
    hall(hallGroup,m,0,0,layout.width,layout.depth,height,m.gold,double,0,true,palaceHallProfiles[id]);
  } else hall(hallGroup,m,0,0,p.w,p.d,height,m.gold,double,0,true,palaceHallProfiles[id]);
  group.add(hallGroup); return hallGroup;
}

/** Extrude the actual outline; a concave wall must never become a filled court. */
function footprintSolid(group: THREE.Group, ring: [number, number][], height: number, material: THREE.Material, y = 0) {
  const shape = new THREE.Shape(ring.map(([x,z]) => new THREE.Vector2(x,-z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y; group.add(mesh); return mesh;
}

function footprintBuilding(group: THREE.Group, m: Materials, building: BuildingFootprint, site: Landmark, roofMat: THREE.Material, minimumSide = .22, offsetX = 0) {
  const raw = localFootprintLayout(building, site);
  const p = site.id==='forbidden-city' ? alignPalaceRoof(raw) : raw;
  if (Math.max(p.width, p.depth) < minimumSide) return;
  const [ox,oz] = project(site.coords);
  const ring = localBuildingRing(building).map(([x,z]):[number,number] => [x-ox,z-oz]);
  const area = Math.abs(ring.reduce((sum,[x,z],i) => {
    const next = ring[(i+1)%ring.length]; return sum+x*next[1]-next[0]*z;
  },0))/2;
  const isWall = building.building === 'wall' || /墙/.test(building.name ?? '');
  if(building.id===149216919) {
    footprintSolid(group,ring,.75,m.civicStone);footprintSolid(group,ring,.10,m.flatRoof,.75);return;
  }
  if (isWall || area / (p.width*p.depth) < .64 || building.building === 'ruins') {
    const height = isWall ? (/城墙/.test(building.name ?? '') ? 1 : .38) : building.building === 'ruins' ? .4 : .7;
    footprintSolid(group,ring,height,isWall ? m.wall : m.vermilion);
    footprintSolid(group,ring,.08,isWall ? m.grayRoof : roofMat,height);
    return;
  }
  const width = Math.max(.08, p.width-.04), depth = Math.max(.08, p.depth-.04), height = Math.max(.32, Math.min(2.2, p.height));
  const item = new THREE.Group();
  item.name = building.name ?? String(building.id); item.userData.osmId = building.id;
  item.position.set(p.x + offsetX, 0, p.z); item.rotation.y = p.rotation;
  box(item,m.darkStone,0,.035,0,width,.07,depth);
  if(width>.65&&depth>.38)timberBody(item,m,width*.84,depth*.78,height,.07,false);
  else box(item,m.vermilion,0,height*.5+.07,0,width*.84,height,depth*.78);
  const rise=Math.min(.72,Math.max(.16,height*.55)),form=mappedRoofForm(building.roof);
  const roof=new THREE.Mesh(roofGeometry(width,depth,rise,form),roofMat);roof.position.y=height+.09;item.add(roof);
  const gables=roofGables(width,depth,rise,form,m.wood);gables.position.y=height+.09;item.add(gables);
  if(width>.65&&depth>.38)timberEaves(item,m,width,depth,width*.70,depth*.64,height+.09,false);
  if(form==='pyramidal')cylinder(item,m.goldLeaf,0,height+.09+rise+.04,0,.035,.08);
  else box(item,m.ridge,0,height+.10+rise*.98,0,roofSection(width,depth,rise,1,form).w*2,.045,.055);
  group.add(item);
}

function osmBuildings(group: THREE.Group, m: Materials, data: CityData | undefined, site: Landmark, excludes: Set<number>, roofMat: THREE.Material | ((building: BuildingFootprint) => THREE.Material), include?: (layout: ReturnType<typeof localFootprintLayout>) => boolean, offsetX = 0) {
  if (!data) return;
  for (const building of data.buildings) {
    if (excludes.has(building.id)) continue;
    const layout = localFootprintLayout(building, site);
    if (!include || include(layout)) footprintBuilding(group,m,building,site,typeof roofMat === 'function' ? roofMat(building) : roofMat, .22, offsetX);
  }
}

/** A single mapped building owns its roof and facade; no second generic copy. */
function sourceHall(group: THREE.Group,m: Materials,site: Landmark,data: CityData,id: number,height: number,roofMat=m.gold,double=false) {
  const building=data.buildings.find(b=>b.id===id);
  if(!building)return;
  const p=localFootprintLayout(building,site),item=new THREE.Group();
  item.name=building.name ?? String(id);item.userData.osmId=id;
  item.position.set(p.x,0,p.z);item.rotation.y=p.rotation;
  hall(item,m,0,0,p.width,p.depth,height,roofMat,double,0,true);group.add(item);
  return item;
}

function ancestralTemple(group: THREE.Group,m: Materials,site: Landmark,data?: CityData) {
  if(!data)return;
  const boundary=templeBoundary(site);
  footprintSolid(group,boundary,.045,m.paving);
  const detailed=new Set([684772333,684772314,60540211,60540212]);
  for(const id of detailed)sourceHall(group,m,site,data,id,id===684772333?1.55:.85,m.gold,id===684772333);
  osmBuildings(group,m,data,site,detailed,m.gold,p=>pointInPolygon([p.x,p.z],boundary));
  // Perimeter wall centers sit on the boundary. Include their explicit mapped
  // geometry even when a center-in-polygon test would clip an outer edge.
  for(const id of [684772294,684772301,685106006,685106007,685107465,685107468]) {
    const b=data.buildings.find(b=>b.id===id);
    if(b&&!pointInPolygon([localFootprintLayout(b,site).x,localFootprintLayout(b,site).z],boundary))footprintBuilding(group,m,b,site,m.gold);
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
    const boundary = localPalaceBoundary(site);
    const axisX = palaceAxis.map(id => mappedLayout(id, site).x).reduce((sum, x) => sum + x, 0) / palaceAxis.length;
    footprintSolid(group, boundary, .045, m.paving);
    // Broad stone courts and a continuous axial walk make the hierarchy legible from the overview.
    court(group, m, axisX, d * .175, 31, 44);
    court(group, m, axisX, -d * .235, 25, 32);
    box(group, m.stone, axisX, .12, .3, 5.5, .08, d - 8);
    box(group, m.brass, axisX, .17, .3, .12, .02, d - 8);
    for (const id of palaceAxis) mappedHall(group, site, m, id, id === 638449347 ? 1.7 : id === 638981229 ? .85 : 1.2, id === 638449347 || id === 638473398 || id === 638981317, undefined, data);
    const middleLayout=zhongheLayout(site),middle=new THREE.Group();middle.name='中和殿';
    middle.position.set(middleLayout.x,0,middleLayout.z);
    hall(middle,m,0,0,middleLayout.width,middleLayout.depth,.8,m.gold,false,0,true,zhongheProfile);group.add(middle);
    for (const id of [40631331,40631343,40631116,40631121,685316170,40631788,40631798,40631806,40631817,40631826,40631832,40593735,40606461,40592355,40592356]) {
      mappedHall(group, site, m, id, .7, false, undefined, data);
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
    // Wall centres sit on the boundary; include their full footprint without a
    // centre-only clipping test. The moat remains the mapped water polygon.
    const minX=Math.min(...boundary.map(p=>p[0]))-1, maxX=Math.max(...boundary.map(p=>p[0]))+1;
    const minZ=Math.min(...boundary.map(p=>p[1]))-1, maxZ=Math.max(...boundary.map(p=>p[1]))+1;
    detailed.add(638156366);
    osmBuildings(group,m,data,site,detailed,building=>/房|库|所|厕所/.test(building.name ?? '')?m.grayRoof:m.gold,layout=>layout.x>minX&&layout.x<maxX&&layout.z>minZ&&layout.z<maxZ);
    const meridian = data?.buildings.find(building=>building.id===638156366);
    if (meridian) {
      const [ox,oz]=project(site.coords), ring=localBuildingRing(meridian).map(([x,z]):[number,number]=>[x-ox,z-oz]);
      footprintSolid(group,ring,1.2,m.wall);
      const north=Math.min(...ring.map(p=>p[1])), south=Math.max(...ring.map(p=>p[1]));
      hall(group,m,axisX,north+1.3,6.0,2.0,1.05,m.gold,true,1.2);
      for(const side of [-1,1]) {
        const wing=new THREE.Group();wing.position.set(axisX+side*5.1,1.2,(north+south)/2);wing.rotation.y=Math.PI/2;
        hall(wing,m,0,0,south-north-1.3,1.05,.42,m.gold);group.add(wing);
        hall(group,m,axisX+side*5.1,south-.9,1.65,1.65,.65,m.gold,true,1.2);
      }
    }
  } else {
    court(group,m,0,0,w*.92,d*.92);
    enclosure(group,m,w,d,1.2,m.wall);
    for (let row = 0; row < 3; row++) hall(group, m, 0, -d * .25 + row * d * .23, w * .52, d * .10, 1.5, m.gold);
    for (const x of [-1, 1]) hall(group, m, x * w * .35, 0, w * .13, d * .55, .85);
  }
}

function roundRoof(group: THREE.Group, m: Materials, radius: number, y: number, rise: number) {
  const points = [new THREE.Vector2(0,rise),new THREE.Vector2(radius*.14,rise*.91),new THREE.Vector2(radius*.36,rise*.57),new THREE.Vector2(radius*.68,rise*.23),new THREE.Vector2(radius,.04),new THREE.Vector2(radius*1.04,.12)];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(points.reverse(),48),m.blue);
  roof.position.y=y;group.add(roof);
  const eave=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,4,40),m.gold);eave.rotation.x=Math.PI/2;eave.position.y=y+.06;group.add(eave);
}
function balustrade(group:THREE.Group,m:Materials,radius:number,y:number,count=48) {
  const gap=.11;
  for(let side=0;side<4;side++) {
    const rail=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,4,24,Math.PI/2-gap*2),m.stone);
    rail.rotation.x=Math.PI/2;rail.rotation.z=side*Math.PI/2+gap;rail.position.y=y+.27;group.add(rail);
  }
  for(let i=0;i<count;i++) {
    const a=i/count*Math.PI*2;
    if(Math.abs(Math.sin(2*a))<.18)continue;
    cylinder(group,m.stone,Math.cos(a)*radius,y+.14,Math.sin(a)*radius,.035,.28);
  }
}
function terrace(group:THREE.Group,m:Materials,radius:number,step=.19) {
  for(let i=0;i<3;i++) {
    const r=radius-i*radius*.16,top=.08+(i+1)*step;
    cylinder(group,m.marble,0,top-step/2,0,r,step);
    balustrade(group,m,r-.09,top);
    for(const direction of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      const stairs=new THREE.Group();stairs.rotation.y=direction;
      for(let j=0;j<4;j++)box(stairs,m.marble,0,top-step+(j+1)*step/4-.025,r+.32-j*.13,.65,.05,.16);
      group.add(stairs);
    }
  }
}

/** Solid annular wall: both inner and outer faces, with a south entrance. */
function circularWall(group: THREE.Group,m: Materials,radius:number,height:number,gap=.18) {
  const ring:[number,number][]=[];
  for(let i=0;i<=96;i++) {const a=gap+(Math.PI*2-2*gap)*i/96;ring.push([Math.sin(a)*radius,Math.cos(a)*radius]);}
  for(let i=96;i>=0;i--) {const a=gap+(Math.PI*2-2*gap)*i/96;ring.push([Math.sin(a)*(radius-.10),Math.cos(a)*(radius-.10)]);}
  footprintSolid(group,ring,height,m.wall,.07);
  footprintSolid(group,ring,.07,m.blue,height+.07);
}

function heaven(group: THREE.Group, m: Materials, _w: number, _d: number, site: Landmark, data?: CityData) {
  if(!data)return;
  const byId=(id:number)=>data.buildings.find(b=>b.id===id)!;
  const at=(id:number)=>localFootprintLayout(byId(id),site);
  const prayer=at(43921139),vault=at(43921121),prayerGate=at(43921137);
  const prayerCourt=new THREE.Group();prayerCourt.name='祈谷坛';
  // Use the actual gate and wing extents, never a square centered on the hall.
  const courtIds=[43921139,43921140,43921111,43921133,43921137,43921110,43921126];
  const corners=courtIds.flatMap(id=>layoutCorners(byId(id),site));
  const left=Math.min(...corners.map(p=>p[0]))-.3,right=Math.max(...corners.map(p=>p[0]))+.3;
  const north=Math.min(...corners.map(p=>p[1]))-.6,south=prayerGate.z;
  court(prayerCourt,m,(left+right)/2,(north+south)/2,right-left,south-north);
  // Walls terminate at mapped gates and adjoining roofs, leaving open passages.
  const nearbyCorners=data.buildings.filter(b=>b.ring.some(([x,z])=>x>116.405&&x<116.409&&z>39.880&&z<39.884)).map(b=>layoutCorners(b,site));
  const wallSegment=(a:[number,number],b:[number,number])=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
    const cuts:[number,number][]=[];
    for(const corners of nearbyCorners) {
      const points=corners.map(([x,z])=>[(x-a[0])*ux+(z-a[1])*uz,-(x-a[0])*uz+(z-a[1])*ux]);
      if(Math.min(...points.map(p=>p[1]))>.2||Math.max(...points.map(p=>p[1]))<-.2)continue;
      cuts.push([Math.max(0,Math.min(...points.map(p=>p[0]))-.15),Math.min(length,Math.max(...points.map(p=>p[0]))+.15)]);
    }
    let start=0;
    const segment=(end:number)=>{if(end<=start)return;const item=new THREE.Group();item.position.set(a[0]+ux*(start+end)/2,0,a[1]+uz*(start+end)/2);item.rotation.y=-Math.atan2(uz,ux);box(item,m.wall,0,.43,0,end-start,.86,.12);box(item,m.grayRoof,0,.89,0,end-start,.08,.20);prayerCourt.add(item);};
    for(const [lo,hi] of cuts.filter(([lo,hi])=>hi>lo).sort((a,b)=>a[0]-b[0])){segment(lo);start=Math.max(start,hi);}
    segment(length);
  };
  wallSegment([left,north],[right,north]);wallSegment([left,north],[left,south]);wallSegment([right,north],[right,south]);wallSegment([left,south],[right,south]);
  group.add(prayerCourt);
  const tower=new THREE.Group();tower.name='祈年殿';tower.userData.osmId=43921139;tower.position.set(prayer.x,0,prayer.z);
  terrace(tower,m,4.5,.22);
  cylinder(tower,m.vermilion,0,1.30,0,1.15,1.10);
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2,px=Math.sin(a)*1.16,pz=Math.cos(a)*1.16;
    cylinder(tower,m.vermilion,px,1.30,pz,.055,1.1);
    const panel=box(tower,m.wood,px,1.28,pz,.37,.72,.035);panel.rotation.y=a;
    for(const offset of [-.11,0,.11]) {
      const slat=box(tower,m.goldLeaf,px+Math.cos(a)*offset,1.32,pz-Math.sin(a)*offset,.018,.54,.04);slat.rotation.y=a;
    }
  }
  for(const roof of [{radius:1.46,y:1.91,rise:.56,band:1.28},{radius:1.14,y:2.48,rise:.48,band:.98},{radius:.83,y:2.98,rise:.54,band:.67}]) {
    roundRoof(tower,m,roof.radius,roof.y,roof.rise);
    cylinder(tower,m.green,0,roof.y-.12,0,roof.band,.23);
    for(let i=0;i<24;i++) {
      const a=i/24*Math.PI*2;
      const bracket=box(tower,m.goldLeaf,Math.sin(a)*roof.band,roof.y-.1,Math.cos(a)*roof.band,.055,.10,.055);bracket.rotation.y=a;
    }
  }
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),m.goldLeaf);finial.position.y=3.67;tower.add(finial);cylinder(tower,m.goldLeaf,0,3.54,0,.055,.25);group.add(tower);
  for(const id of [43921140,43921141,43921137,43921136,43921111,43921133,43921117,43921122,43921123,43921120,43922670])sourceHall(group,m,site,data,id,id===43921140?.75:.55,m.blue);
  // Danbi bridge follows its two mapped gate centers, including the small yaw.
  const start=at(43921136),end=at(43921120),dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz);
  const bridge=new THREE.Group();bridge.name='丹陛桥';bridge.position.set((start.x+end.x)/2,0,(start.z+end.z)/2);bridge.rotation.y=Math.atan2(dx,dz);
  box(bridge,m.stone,0,.12,0,2.94,.24,length);
  for(const x of [-1.38,0,1.38])box(bridge,m.brass,x,.25,0,.025,.02,length);group.add(bridge);
  const vaultHall=new THREE.Group();vaultHall.name='皇穹宇';vaultHall.userData.osmId=43921121;vaultHall.position.set(vault.x,0,vault.z);
  cylinder(vaultHall,m.marble,0,.18,0,1.12,.30);cylinder(vaultHall,m.vermilion,0,.87,0,.78,1.08);
  for(let i=0;i<12;i++) {const a=i/12*Math.PI*2;box(vaultHall,m.wood,Math.sin(a)*.79,.85,Math.cos(a)*.79,.28,.65,.04).rotation.y=a;}
  cylinder(vaultHall,m.green,0,1.42,0,.84,.15);roundRoof(vaultHall,m,.99,1.47,.73);cylinder(vaultHall,m.goldLeaf,0,2.24,0,.06,.22);group.add(vaultHall);
  const echoGate=at(43921123),echo=new THREE.Group();echo.name='回音壁';
  const northDx=vault.x-echoGate.x,northDz=vault.z-echoGate.z,northLength=Math.hypot(northDx,northDz);
  echo.position.set(echoGate.x+northDx/northLength*3.25,0,echoGate.z+northDz/northLength*3.25);
  echo.rotation.y=Math.atan2(-northDx,-northDz);
  cylinder(echo,m.paving,0,.04,0,3.22,.08);circularWall(echo,m,3.25,.60,.24);group.add(echo);
  const [moundX,moundZ]=moundCenter(site),mound=new THREE.Group();mound.name='圜丘';mound.position.set(moundX,0,moundZ);
  cylinder(mound,m.paving,0,.035,0,5.15,.07);terrace(mound,m,2.7,.16);
  // Stone joints on the open upper terrace, with no generic building overlay.
  for(let row=1;row<=9;row++) {
    const radius=row*.185,ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.006,3,64),m.plazaLine);ring.rotation.x=Math.PI/2;ring.position.y=.568;mound.add(ring);
    for(let i=0;i<row*9;i++) {const a=i/(row*9)*Math.PI*2;beam(mound,m.plazaLine,new THREE.Vector3(Math.sin(a)*(radius-.18),.568,Math.cos(a)*(radius-.18)),new THREE.Vector3(Math.sin(a)*radius,.568,Math.cos(a)*radius),.005);}
  }
  group.add(mound);
  // Open stone Lingxing gates retain their own mapped footprint centers.
  for(const id of [727026433,727026437,727026438,727026439]) {
    const p=at(id),gate=new THREE.Group();gate.name='棂星门';gate.userData.osmId=id;gate.position.set(p.x,0,p.z);gate.rotation.y=p.rotation;
    for(const x of [-.5,-.18,.18,.5]){box(gate,m.marble,x*p.width,.48,0,.09,.96,.12);box(gate,m.marble,x*p.width,1,0,.16,.08,.18);}
    box(gate,m.marble,0,.75,0,p.width,.12,.13);group.add(gate);
  }
  // The bent corridor is one concave footprint, not a straight bar through the court.
  const corridor=byId(31099286),[ox,oz]=project(site.coords),corridorRing=localBuildingRing(corridor).map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const passage=new THREE.Group();passage.name='七十二长廊';passage.userData.osmId=corridor.id;
  footprintSolid(passage,corridorRing,.09,m.stone);footprintSolid(passage,corridorRing,.12,m.green,.77);
  for(let i=1;i<corridorRing.length;i++) {
    const a=corridorRing[i-1],b=corridorRing[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.8));
    for(let j=0;j<count;j++)cylinder(passage,m.vermilion,a[0]+(b[0]-a[0])*j/count,.40,a[1]+(b[1]-a[1])*j/count,.035,.74);
  }
  group.add(passage);
  const park=data.context.find(feature=>feature.kind==='park'&&feature.name==='天坛公园');
  if(park) {
    const ring=park.coordinates.map(project).map(([x,z]):[number,number]=>[x-ox,z-oz]);
    osmBuildings(group,m,data,site,tiantanDetailedIds,m.grayRoof,p=>pointInPolygon([p.x,p.z],ring));
  }
}

function squarePoint(site: Landmark, coords: [number, number]): [number, number] {
  const [x,z]=project(wgs84ToGcj02(coords)), [originX,originZ]=project(site.coords);
  return [x-originX,z-originZ];
}

function memorialHall(group: THREE.Group, m: Materials, x: number, z: number) {
  const hallGroup = new THREE.Group();
  hallGroup.position.set(x,0,z);
  court(hallGroup,m,0,0,12.2,10.8);
  box(hallGroup,m.civicStoneDark,0,.22,0,11.2,.34,9.8);
  box(hallGroup,m.civicStone,0,1.73,0,7.8,2.75,6.1);
  for(const side of [-1,1]) {
    box(hallGroup,m.civicStoneDark,0,3.20,side*3.65,9.3,.18,.46);
    box(hallGroup,m.glass,0,1.85,side*3.065,6.8,1.55,.045);
    for(let i=0;i<10;i++) {
      const px=-4.35+i*8.7/9;
      cylinder(hallGroup,m.civicStone,px,1.66,side*3.65,.13,2.6);
      box(hallGroup,m.civicStoneDark,px,.36,side*3.65,.34,.10,.34);
      box(hallGroup,m.civicStoneDark,px,2.98,side*3.65,.34,.12,.34);
    }
    for(let i=1;i<8;i++) {
      const pz=-3.65+i*7.3/8;
      cylinder(hallGroup,m.civicStone,side*4.35,1.66,pz,.13,2.6);
      box(hallGroup,m.civicStoneDark,side*4.35,.36,pz,.34,.10,.34);
      box(hallGroup,m.civicStoneDark,side*4.35,2.98,pz,.34,.12,.34);
    }
  }
  box(hallGroup,m.civicStoneDark,0,3.25,0,9.5,.22,7.8);
  box(hallGroup,m.flatRoof,0,3.41,0,9.2,.10,7.55);
  group.add(hallGroup);
}

function squareEnsemble(group: THREE.Group, m: Materials, site: Landmark) {
  const [squareX,squareZ]=squarePoint(site,squareLocations.plaza);
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
  const [greatX,greatZ]=squarePoint(site,civicLayouts['great-hall'].coords);
  const [museumX,museumZ]=squarePoint(site,civicLayouts.museum.coords);
  const [monumentX,monumentZ]=squarePoint(site,squareLocations.monument);
  const [memorialX,memorialZ]=squarePoint(site,squareLocations.memorial);
  const [flagX,flagZ]=squarePoint(site,squareLocations.flag);
  group.add(createCivicBuilding('great-hall',m,greatX,greatZ));
  group.add(createCivicBuilding('museum',m,museumX,museumZ));
  group.add(createMonument(m,monumentX,monumentZ));
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

function gate(group: THREE.Group, m: Materials, w: number, d: number, kind: 'general' | 'tiananmen' | 'duanmen' | 'zhengyang') {
  const tiananmen = kind === 'tiananmen';
  const zhengyang = kind === 'zhengyang';
  const duanmen = kind === 'duanmen';
  const baseW = tiananmen ? tiananmenWidth : Math.min(w, duanmen ? 12 : 8);
  const baseD = tiananmen ? tiananmenDepth : Math.min(d, duanmen ? 6.5 : 5);
  const wallHeight = tiananmen ? 3.0 : duanmen ? 2.55 : 2.6;
  box(group, m.darkStone, 0, .08, 0, baseW + 1.4, .16, baseD + 1.5);
  const facade=new THREE.Shape();
  facade.moveTo(-baseW/2,0);facade.lineTo(baseW/2,0);facade.lineTo(baseW/2,wallHeight);facade.lineTo(-baseW/2,wallHeight);facade.closePath();
  const count = tiananmen || duanmen ? 5 : zhengyang ? 1 : 3;
  for(let i=0;i<count;i++) {
    const xx=tiananmen?tiananmenPortals[i]:(i-(count-1)/2)*(baseW/(count+1));
    const radius=i===Math.floor(count/2)?.48:.40, height=1.95;
    const opening=new THREE.Path();
    opening.moveTo(xx-radius,.12);opening.lineTo(xx+radius,.12);opening.lineTo(xx+radius,height-radius);
    opening.absarc(xx,height-radius,radius,0,Math.PI,false);opening.lineTo(xx-radius,.12);
    facade.holes.push(opening);
    box(group,m.stone,xx,.09,0,radius*2,.18,baseD+.3);
  }
  const wall=new THREE.Mesh(new THREE.ExtrudeGeometry(facade,{depth:baseD,bevelEnabled:false,curveSegments:14}),m.wall);
  wall.position.z=-baseD/2;group.add(wall);
  box(group, m.stone, 0, wallHeight+.06, 0, baseW + .28, .16, baseD + .32);
  const towerWidth = tiananmen ? baseW*.80 : duanmen ? baseW*.78 : baseW*.88;
  const towerDepth = tiananmen ? baseD*.70 : duanmen ? baseD*.76 : baseD*.82;
  hall(group, m, 0, 0, towerWidth, towerDepth, tiananmen ? 2.15 : duanmen ? 1.65 : 1.9, zhengyang ? m.grayRoof : m.gold, true, wallHeight+.06);
  for (const face of [-1,1]) for (let i = -6; i <= 6; i++) box(group, m.stone, i * baseW / 13, wallHeight+.22, face*baseD/2, .12,.34,.30);
  if (tiananmen) {
    box(group,m.stone,0,2.47,baseD/2+.045,.62,.86,.045);
    box(group,m.window,0,2.47,baseD/2+.072,.49,.72,.025);
    for(const side of [-1,1]) {
      box(group,m.stone,side*baseW*.273,2.49,baseD/2+.045,baseW*.36,.38,.045);
      box(group,m.wall,side*baseW*.273,2.49,baseD/2+.073,baseW*.33,.22,.018);
    }
    for (const side of [-1,1]) {
      box(group,m.stone,side*(baseW*.62),1.3,baseD*.45,.18,2.6,.18);
      const cloud=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,5,18),m.stone);cloud.rotation.x=Math.PI/2;cloud.position.set(side*baseW*.62,2.6,baseD*.45);group.add(cloud);
      box(group,m.darkStone,side*(baseW*.48),.46,baseD/2+1.0,.62,.55,1.15);
    }
  }
  if (duanmen) {
    for(const side of [-1,1]) {
      box(group,m.wall,side*baseW*.55,wallHeight*.70,1.7,2.3,wallHeight*.9,2.2);
      box(group,m.grayRoof,side*baseW*.55,wallHeight*1.17,1.7,2.7,.12,2.6);
    }
    for(const side of [-1,1]) box(group,m.wall,side*baseW*.47,wallHeight*.37,-1.8,2.0,.74,1.2);
  }
  if (zhengyang) {
    box(group, m.darkStone, 0, 1.0, 13.5, 6.1, 2, 3.7);
    box(group,m.darkStone,0,3.5,13.5,6.1,3.5,3.7);
    const arrowRoof=new THREE.Mesh(roofGeometry(6.7,4.3,1.3),m.grayRoof);arrowRoof.position.set(0,5.25,13.5);group.add(arrowRoof);
    for(let row=0;row<4;row++)for(let col=0;col<9;col++)archPanel(group,m.window,(col-4)*.56,2.5+row*.67,15.36,.25,.34);

  }
}

function roadRemains(group: THREE.Group, m: Materials, site: Landmark) {
  const [ox,oz]=project(site.coords);
  const place=(metres:number,lateral=0)=>{
    const p=roadStation(metres,lateral),item=new THREE.Group();
    item.position.set(p.x-ox,0,p.z-oz);item.rotation.y=p.rotation;group.add(item);return item;
  };
  // The modern park path ends at the gate. Its joints, edging and nearby stone
  // remains all share a station on this path, rather than a longitude-only strip.
  for(let metres=28;metres<440;metres+=4) {
    const item=place(metres);
    box(item,m.paving,0,.025,0,1.4,.05,.402);
    for(const side of [-1,1])box(item,m.stone,side*.72,.055,0,.055,.06,.402);
    box(item,m.stone,0,.058,0,.48,.035,.392);
    for(const side of [-1,1])box(item,m.darkStone,side*.08,.078,0,.006,.008,.392);
    box(item,m.darkStone,0,.078,.19,.48,.008,.012);
  }
  // Official descriptions locate the paired stone remains about 100 m north
  // of the gate. The display length is schematic, not an excavation boundary.
  for(const side of [-1,1]) {
    const bed=place(100,side*8);bed.name='永定门北侧石板道遗存';
    box(bed,m.darkStone,0,.04,0,.72,.08,3.8);
    box(bed,m.earth,0,.09,0,.64,.06,3.65);
    for(let row=0;row<22;row++)for(let col=0;col<3;col++)
      box(bed,m.stone,(col-1)*.155,.135,-1.65+row*.155,.147,.045,.14);
    for(const edge of [-1,1])box(bed,m.darkStone,edge*.36,.15,0,.06,.14,3.9);
  }
  const excavation=place(400,-5);excavation.name='永定门内历史道路叠压遗存';
  box(excavation,m.darkStone,0,.025,0,.95,.05,2.2);
  for(let layer=0;layer<7;layer++)box(excavation,layer%2?m.earth:m.paving,0,.055+layer*.035,-.6+layer*.19,.8,.035,1.0);
}

export function createLandmark(site: Landmark, m: Materials, data?: CityData): THREE.Group {
  const group = new THREE.Group(); group.name = site.id;
  const w = site.footprint[0] / 10, d = site.footprint[1] / 10;
  switch (site.kind) {
    case 'palace': palace(group, m, w, d, site.id === 'forbidden-city', site, data); break;
    case 'temple': if (site.id === 'taimiao') ancestralTemple(group,m,site,data); else heaven(group, m, w, d, site, data); break;
    case 'gate': gate(group, m, w, d, site.id === 'tiananmen' ? 'tiananmen' : site.id === 'duanmen' ? 'duanmen' : site.id === 'zhengyang' ? 'zhengyang' : 'general'); break;
    case 'tower': {
      for (const [id, roof] of [[425993664,m.grayRoof],[267371087,m.gold]] as const) {
        const p = mappedLayout(id,site), tower = new THREE.Group(); tower.name=p.name; tower.position.set(p.x,0,p.z);
        box(tower,m.darkStone,0,1.1,0,p.w,2.2,p.d);
        hall(tower,m,0,0,p.w*.8,p.d*.75,id===425993664?1.7:1.1,roof,id!==425993664,2.2); group.add(tower);
      }
      break;
    }
    case 'bridge': {
      if(site.id==='jinshui') {
        const [ox,oz]=project(site.coords);
        for(const bridge of jinshuiLayout()) {
          const x=bridge.x-ox,north=bridge.northZ-oz,south=bridge.southZ-oz,river=bridge.riverZ-oz;
          // The approach reaches the matching opening; only the river span has
          // the raised stone railings. This preserves the forecourt between them.
          box(group,m.stone,x,.10,(north+south)/2,bridge.width,.18,south-north);
          for(let i=0;i<12;i++) {
            const z=river-1.5+(i+.5)*.25, rise=.10*Math.sin((i+.5)/12*Math.PI);
            box(group,m.marble,x,.20+rise,z,bridge.width,.10,.252);
            for(const side of [-1,1]) {
              const px=x+side*(bridge.width/2-.035);
              box(group,m.marble,px,.40+rise,z,.065,.35,.065);
              box(group,m.marble,px,.57+rise,z,.07,.05,.255);
              box(group,m.marble,px,.33+rise,z,.045,.12,.255);
            }
          }
        }
        break;
      }
      const bridges = 1;
      for (let i = 0; i < bridges; i++) {
        const x = 0;
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
        if(!data)break;
        const boundary=templeBoundary(site);
        footprintSolid(group,boundary,.035,m.paving);
        sourceHall(group,m,site,data,60540199,.85);
        const altarBuilding=data.buildings.find(b=>b.id===687599164)!;
        const altar=localFootprintLayout(altarBuilding,site),platform=new THREE.Group();platform.name='社稷坛';platform.userData.osmId=altarBuilding.id;
        platform.position.set(altar.x,0,altar.z);platform.rotation.y=altar.rotation;
        for(let i=0;i<3;i++)box(platform,m.stone,0,.10+i*.10,0,altar.width-i*.12,.12,altar.depth-i*.12);
        const w=altar.width-.3,d=altar.depth-.3;
        box(platform,m.gold,0,.365,0,w,.025,d);
        box(platform,m.darkStone,0,.38,-d/3,w,.02,d/3);box(platform,m.vermilion,0,.38,d/3,w,.02,d/3);
        box(platform,m.green,w/3,.38,0,w/3,.02,d/3);box(platform,m.marble,-w/3,.38,0,w/3,.02,d/3);group.add(platform);
        osmBuildings(group,m,data,site,new Set([60540199,687599164]),m.gold,p=>pointInPolygon([p.x,p.z],boundary));
        for(const id of [687587940,687587941,687587942,687587943]) {
          const b=data.buildings.find(b=>b.id===id);
          if(b&&!pointInPolygon([localFootprintLayout(b,site).x,localFootprintLayout(b,site).z],boundary))footprintBuilding(group,m,b,site,m.gold);
        }
      }
      break;
    }
    case 'square': squareEnsemble(group,m,site); break;
    case 'road': roadRemains(group,m,site); break;
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
  group.traverse(object => { if (object instanceof THREE.Mesh && object.geometry !== boxGeometry && object.geometry !== cylinderGeometry && object.geometry !== terraceGeometry && object.geometry !== columnGeometry) object.geometry.dispose(); });
  return result;
}
