import { createTiantanGround } from './tiantanGround';
import { createTiantanWalls } from './tiantanWalls';
import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { localBuildingRing, localFootprintLayout, wgs84ToGcj02, type BuildingFootprint, type CityData } from './geodata';
import { project, pointInPolygon } from './geo';
import { mappedLayout, palaceAxis, jingshanPavilions } from './layouts';
import { localPalaceBoundary, alignPalaceRoof } from './precincts';
import { createPalaceGarden } from './palaceGarden';
import { createPalaceLandscape } from './palaceLandscape';
import { createPalacePaving, createInnerJinshuiBridges, palaceWaterAreas } from './palaceWater';
import { createPalaceWalls } from './palaceWalls';
import { clipPalaceFootprint, createPalaceCityWalls } from './palaceCityWalls';
import { createPalaceGates, palaceGateIds, shenwuForecourtLayout } from './palaceGates';
import { axisThroughShenwu } from './axisRoute';
import { createRoadRemains } from './roadRemains';
import { jinshuiLayout } from './gateLayout';
import { createDuanmen } from './duanmen';
import { createTiananmen } from './tiananmen';
import { createYongdingmen } from './yongdingmen';
import { templeBoundary, moundCenter, tiantanDetailedIds, moundInnerGates, moundOuterGates, layoutCorners } from './templeLayout';
import { createCivicBuilding, createMonument, createFlagCourt } from './civicArchitecture';
import { civicLayouts, squareLocations } from './civicLayout';
import { timberBody, timberEaves, timberRoofApron } from './timberArchitecture';
import { wallRuns } from './wallRuns';
import { polygonBuilding, polygonRoof } from './polygonBuildings';
import { polygonRoofDetails } from './polygonRoofDetails';
import { palaceTerraces,palaceRaisedBuildings,palaceRoofCore,sharedPalaceTerrace } from './palaceMassing';
import { palacePlatform } from './palacePlatforms';
import { zhengyangLayout, zhengyangCityPlatform, zhengyangCityRoofs } from './zhengyangLayout';
import { zhengyangDetails } from './zhengyangDetails';
import { squareGround } from './squareGround';
import { createArrowTower } from './arrowTower';
import { createJingshanTerrain, jingshanPeaks, jingshanHeight } from './jingshanTerrain';
import { jingshanAnnexes } from './jingshanLayout';
import { createJingshanPavilion } from './jingshanPavilions';
import { moundEnclosures } from './moundEnclosures';
import { lingxingGate,masonryTempleGate } from './templeGates';
import { createBellDrum, createWanning } from './northernLandmarks';
import { agricultureCompounds } from './agricultureLayout';
import { roofGeometry, roofSection, roofGables, mappedRoofForm, type RoofForm } from './roofForms';
import { palaceHallProfiles, zhongheLayout, zhongheProfile, type HallProfile } from './palaceArchitecture';
import { palaceSideHallLayout } from './palaceSideHalls';
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

function court(group: THREE.Group, m: Materials, x: number, z: number, w: number, d: number, paved = true) {
  box(group, m.darkStone, x, .01, z, w + .32, .08, d + .32);
  box(group, paved ? m.paving : m.park, x, .055, z, w, .06, d);
}

function hall(group: THREE.Group, m: Materials, x: number, z: number, w: number, d: number, h: number, roofMat = m.gold, double = false, elevation = 0, fitFootprint = false, profile?: HallProfile,sharedPlatform=false) {
  // Mapped dimensions already include the eaves. Keep the roof inside that
  // envelope instead of expanding it into neighbouring halls and passages.
  const roofW = fitFootprint ? w : w + Math.min(1.3,d*.3);
  const roofD = fitFootprint ? d : d + Math.min(1.12,d*.28);
  if (fitFootprint) { w *= .82; d *= .78; }
  const y = elevation, floor=profile?.platform??.46;
  const form=profile?.roof??'hipped';
  double=profile?.double??double;
  if(profile)h=(profile.height-floor-(form==='pyramidal'?.16:.04))/(double?2.38:1.61);
  if(profile&&!sharedPlatform) {
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
  } else if(!sharedPlatform)box(group, m.stone, x, y + .18, z, Math.min(roofW,w+.7), .36, Math.min(roofD,d+.6));
  const facade=new THREE.Group();facade.position.set(x,0,z);group.add(facade);
  timberBody(facade,m,w,d,h,y+floor,true,profile);
  const eaveY = y + h + floor;
  const roofRise = h * .61;
  const roof = new THREE.Mesh(roofGeometry(roofW, roofD, roofRise,double && form !== 'pyramidal' ? 'hipped' : form), roofMat);
  roof.position.set(x, eaveY, z); group.add(roof);
  timberEaves(facade,m,roofW,roofD,w*.8,d*.8,eaveY);
  roofRidges(group,m,x,z,roofW,roofD,roofRise,eaveY,double && form !== 'pyramidal' ? 'hipped' : form);
  if(!double) {
    const gables=roofGables(roofW,roofD,roofRise,form,m.wood);gables.position.set(x,eaveY,z);group.add(gables);
    if(form==='pyramidal')cylinder(group,m.goldLeaf,x,eaveY+roofRise+.08,z,.07,.16);
    else box(group,m.ridge,x,eaveY+roofRise+.02,z,roofSection(roofW,roofD,roofRise,1,form).w*2,.04,.08);
  }
  if (double) {
    const upperBase = eaveY + h * .58;
    // Extend the whole room through the lower roof, keeping its columns,
    // enclosure and windows together beneath the existing upper eave.
    const upperRoom=timberBody(facade,m,w*.75,d*.66,h*.90,eaveY,false,{enclosure:'flush'});
    timberRoofApron(upperRoom,roof,m.ridge);
    const upperRise = h * .48;
    const upper = new THREE.Mesh(roofGeometry(w * .8, d * .72, upperRise,form), roofMat);
    upper.position.set(x, upperBase + h * .32, z); group.add(upper);
    timberEaves(facade,m,w*.8,d*.72,w*.60,d*.50,upperBase+h*.32,false);
    roofRidges(group,m,x,z,w*.8,d*.72,upperRise,upperBase+h*.32,form);
    const gables=roofGables(w*.8,d*.72,upperRise,form,m.wood);gables.position.set(x,upperBase+h*.32,z);group.add(gables);
    if (form === 'pyramidal') cylinder(group,m.goldLeaf,x,upperBase+h*.80+.07,z,.045,.10);
    else box(group,m.ridge,x,upperBase+h*.80+.02,z,roofSection(w*.8,d*.72,upperRise,1,form).w*2,.04,.08);
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
    hall(hallGroup,m,0,0,layout.width,layout.depth,height,m.gold,double,0,true,palaceHallProfiles[id],site.id==='forbidden-city'&&[638449347,638473398].includes(id));
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

function pointSegmentDistance(p:[number,number],a:[number,number],b:[number,number]) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
}

function palaceBoundaryGap(ring:[number,number][],boundary:[number,number][]) {
  let gap=Infinity;
  for(const point of ring)for(let i=0;i<boundary.length;i++)gap=Math.min(gap,pointSegmentDistance(point,boundary[i],boundary[(i+1)%boundary.length]));
  return gap;
}

function footprintBuilding(group: THREE.Group, m: Materials, building: BuildingFootprint, site: Landmark, roofMat: THREE.Material, minimumSide = .22, offsetX = 0, display?: ReturnType<typeof shenwuForecourtLayout>, data?:CityData) {
  const raw = display ?? localFootprintLayout(building, site);
  const p = site.id==='forbidden-city' ? alignPalaceRoof(raw) : raw;
  if (Math.max(p.width, p.depth) < (site.id==='forbidden-city'?.02:minimumSide)) return;
  if(building.building==='gate') {
    const gate=masonryTempleGate(m,p,site.id==='tiantan'?m.green:roofMat);gate.name=building.name??String(building.id);gate.userData.osmId=building.id;gate.position.set(p.x+offsetX,0,p.z);gate.rotation.y=p.rotation;group.add(gate);return;
  }
  const [ox,oz] = project(site.coords);
  const ring = display?.ring ?? localBuildingRing(building).map(([x,z]):[number,number] => [x-ox,z-oz]);
  const area = Math.abs(ring.reduce((sum,[x,z],i) => {
    const next = ring[(i+1)%ring.length]; return sum+x*next[1]-next[0]*z;
  },0))/2;
  const isWall = building.building === 'wall' || /墙/.test(building.name ?? '');
  // All perimeter footprints are assembled together so polygon seams have no parapets.
  if(site.id==='forbidden-city'&&/城墙/.test(building.name??''))return;
  if(site.id==='forbidden-city') {
    const boundary=localPalaceBoundary(site),clipped=clipPalaceFootprint(ring,boundary);
    if(clipped.length<3&&palaceBoundaryGap(ring,boundary)>1.5)return;
    if(clipped.length>=3&&(clipped.length!==ring.length||clipped.some((point,i)=>Math.hypot(point[0]-ring[i][0],point[1]-ring[i][1])>1e-5))) {
      const item=polygonBuilding(clipped,m,roofMat,.48);
      item.name=building.name??String(building.id);item.userData.osmId=building.id;item.position.x=offsetX;group.add(item);return;
    }
  }
  if(site.id==='forbidden-city'&&palaceTerraces.has(building.id)) {
    const stairs=building.id===638449433?{side:1 as const,run:1.5}:building.id===638467894?{side:-1 as const,run:1.6}:undefined;
    const approach=building.id===638981261?data?.buildings.find(b=>b.id===638807694):undefined;
    const connected=approach?[localBuildingRing(approach).map(([x,z]):[number,number]=>[x-ox,z-oz])]:[];
    const item=palacePlatform(ring,palaceTerraces.get(building.id)!,m,stairs,building.id===638807694,connected);
    item.userData.osmId=building.id;item.position.x=offsetX;group.add(item);return;
  }
  if(site.id==='forbidden-city'&&palaceRaisedBuildings.has(building.id)) {
    const core=palaceRoofCore(building,site),item=new THREE.Group();
    item.name=building.name??String(building.id);item.userData.osmId=building.id;
    // Keep the mapped plinth, including its steps, separate from the roof core.
    footprintSolid(item,ring,.12,m.marble);
    const upper=new THREE.Group();upper.position.set(core.x,.12,core.z);upper.rotation.y=core.rotation;item.add(upper);
    const pavilion=[638590122,638590123].includes(building.id),tower=/崇楼/.test(building.name??'');
    const profile:HallProfile={roof:pavilion?'hipped':'hip-gable',double:pavilion||tower,height:pavilion?(building.id===638590122?2.38:2.26):tower?1.65:1.10,platform:.20,frontBays:pavilion?9:3,sideBays:pavilion?3:1};
    hall(upper,m,0,0,core.width,core.depth,.7,m.gold,profile.double,0,true,profile);
    item.position.x=offsetX;group.add(item);return;
  }
  if(building.id===149216919) {
    footprintSolid(group,ring,.75,m.civicStone);footprintSolid(group,ring,.10,m.flatRoof,.75);return;
  }
  if(site.id==='forbidden-city'&&/院墙|侧墙/.test(building.name??'')) {
    const item=polygonBuilding(ring,m,m.grayRoof,.38,'wall');
    item.name=building.name!;item.userData.osmId=building.id;item.position.x=offsetX;group.add(item);return;
  }
  if(!isWall&&building.building!=='ruins'&&area/(p.width*p.depth)<.86) {
    const item=polygonBuilding(ring,m,roofMat,Math.max(.40,Math.min(.85,p.height*.8)));
    if(building.id===40542466)item.add(polygonRoofDetails(item.getObjectByName('mapped-concave-roof') as THREE.Mesh,m));
    item.name=building.name??String(building.id);item.userData.osmId=building.id;item.position.x=offsetX;group.add(item);return;
  }
  if (isWall || building.building === 'ruins') {
    const height = isWall ? (/城墙/.test(building.name ?? '') ? 1 : .38) : building.building === 'ruins' ? .4 : .7;
    const item=new THREE.Group();item.name=building.name??String(building.id);item.userData.osmId=building.id;
    footprintSolid(item,ring,height,isWall ? m.wall : m.vermilion);
    footprintSolid(item,ring,.08,isWall ? m.grayRoof : roofMat,height);
    group.add(item);
    return;
  }
  const width = Math.max(.08, p.width-.04), depth = Math.max(.08, p.depth-.04), height = Math.max(.32, Math.min(2.2, p.height));
  const item = new THREE.Group();
  item.name = building.name ?? String(building.id); item.userData.osmId = building.id;
  item.position.set(p.x + offsetX, 0, p.z); item.rotation.y = p.rotation;
  box(item,m.darkStone,0,.035,0,width,.07,depth);
  // A percentage inset removes metres from the ends of a long row of rooms.
  // Bound the eaves clearance so the complete mapped range has a timber body.
  const bodyW=site.id==='forbidden-city'?width-Math.min(.32,width*.16):width*.84;
  const bodyD=site.id==='forbidden-city'?depth-Math.min(.28,depth*.22):depth*.78;
  if(width>.65&&depth>.38)timberBody(item,m,bodyW,bodyD,height,.07,false);
  else {
    // Normalize the timber details before scaling: fixed-size window frames and
    // brackets would overwhelm a two-to-six metre hut if used at full size.
    const compact=new THREE.Group();compact.scale.set(width/1.2,height/.8,depth/.8);compact.position.y=.07;
    timberBody(compact,m,1.2*.84,.8*.78,.8,0,false,{frontBays:width>.45?3:1,sideBays:1});
    item.add(compact);
  }
  const rise=Math.min(.72,Math.max(.16,height*.55)),form=mappedRoofForm(building.roof);
  const roof=new THREE.Mesh(roofGeometry(width,depth,rise,form),roofMat);roof.position.y=height+.09;item.add(roof);
  const gables=roofGables(width,depth,rise,form,m.wood);gables.position.y=height+.09;item.add(gables);
  timberEaves(item,m,width,depth,site.id==='forbidden-city'?bodyW*.9:width*.70,site.id==='forbidden-city'?bodyD*.9:depth*.64,height+.09,false);
  if(form==='pyramidal')cylinder(item,m.goldLeaf,0,height+.09+rise+.04,0,.035,.08);
  else box(item,m.ridge,0,height+.10+rise*.98,0,roofSection(width,depth,rise,1,form).w*2,.045,.055);
  group.add(item);
}

function osmBuildings(group: THREE.Group, m: Materials, data: CityData | undefined, site: Landmark, excludes: Set<number>, roofMat: THREE.Material | ((building: BuildingFootprint) => THREE.Material), include?: (layout: ReturnType<typeof localFootprintLayout>, building:BuildingFootprint) => boolean, offsetX = 0) {
  if (!data) return;
  for (const building of data.buildings) {
    if (excludes.has(building.id)) continue;
    const layout = localFootprintLayout(building, site);
    if (!include || include(layout,building)) footprintBuilding(group,m,building,site,typeof roofMat === 'function' ? roofMat(building) : roofMat, .22, offsetX, site.id==='forbidden-city' ? shenwuForecourtLayout(site,data,building.id) : undefined,data);
  }
}

/** A single mapped building owns its roof and facade; no second generic copy. */
function sourceHall(group: THREE.Group,m: Materials,site: Landmark,data: CityData,id: number,height: number,roofMat=m.gold,double=false,profile?:HallProfile) {
  const building=data.buildings.find(b=>b.id===id);
  if(!building)return;
  const p=localFootprintLayout(building,site);
  if(building.building==='gate') {
    const item=masonryTempleGate(m,{...p,height},roofMat);item.name=building.name??String(id);item.userData.osmId=id;item.position.set(p.x,0,p.z);item.rotation.y=p.rotation;group.add(item);return item;
  }
  const item=new THREE.Group();
  item.name=building.name ?? String(id);item.userData.osmId=id;
  item.position.set(p.x,0,p.z);item.rotation.y=p.rotation;
  hall(item,m,0,0,p.width,p.depth,height,roofMat,double,0,true,profile);group.add(item);
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

function jingshan(group:THREE.Group,m:Materials,site:Landmark,data?:CityData) {
  group.add(createJingshanTerrain(site,m,data));
  for(const id of jingshanPavilions) {
    const p=jingshanPeaks(site).find(p=>p.osmId===id)!,y=jingshanHeight(site,p.x,p.z,data)+.045;
    const pavi=createJingshanPavilion(id,m);pavi.position.set(p.x,y,p.z);pavi.name=p.name;group.add(pavi);
  }
  mappedHall(group,site,m,26390117,1.15);
  mappedHall(group,site,m,26390236,.85,true);
  for(const p of jingshanAnnexes(site)) {
    const annex=new THREE.Group();annex.position.set(p.x,0,p.z);annex.rotation.y=p.rotation;
    hall(annex,m,0,0,p.w,p.d,p.h);group.add(annex);
  }
}

function palace(group: THREE.Group, m: Materials, w: number, d: number, imperial = false, site: Landmark, data?: CityData) {
  if (imperial) {
    const boundary = localPalaceBoundary(site);
    const axisX = palaceAxis.map(id => mappedLayout(id, site).x).reduce((sum, x) => sum + x, 0) / palaceAxis.length;
    group.add(createPalacePaving(site,data,m,axisX,d));
    if(data)group.add(createPalaceCityWalls(site,data,m));
    const water = palaceWaterAreas(site,data).map(area=>area.ring);
    const [palaceX,palaceZ]=project(site.coords);
    const stripe=axisThroughShenwu([[palaceX+axisX,palaceZ+.3-(d-8)/2],[palaceX+axisX,palaceZ+.3+(d-8)/2]],site,data);
    for(let i=1;i<stripe.length;i++) {
      const a:[number,number]=[stripe[i-1][0]-palaceX,stripe[i-1][1]-palaceZ],b:[number,number]=[stripe[i][0]-palaceX,stripe[i][1]-palaceZ];
      for(const [from,to] of wallRuns(a,b,water)) {
        const mesh=box(group,m.brass,(from[0]+to[0])/2,.17,(from[1]+to[1])/2,.12,.02,Math.hypot(to[0]-from[0],to[1]-from[1]));
        mesh.rotation.y=Math.atan2(to[0]-from[0],to[1]-from[1]);
      }
    }
    if(data)group.add(createInnerJinshuiBridges(site,data,m));
    const sharedDeck=data?sharedPalaceTerrace(site,data):[];
    if(sharedDeck.length){const deck=palacePlatform(sharedDeck,.813,m,undefined,true);deck.name='three-hall-shared-terrace';deck.position.y=.002;group.add(deck);}
    for (const id of palaceAxis.filter(id => !data || !palaceGateIds.some(gateId => gateId === id))) mappedHall(group, site, m, id, id === 638449347 ? 1.7 : id === 638981229 ? .85 : 1.2, id === 638449347 || id === 638473398 || id === 638981317, undefined, data);
    const middleLayout=zhongheLayout(site,data),middle=new THREE.Group();middle.name='中和殿';
    middle.position.set(middleLayout.x,0,middleLayout.z);
    middle.rotation.y=middleLayout.rotation;
    hall(middle,m,0,0,middleLayout.width,middleLayout.depth,.8,m.gold,false,0,true,zhongheProfile,sharedDeck.length>0);group.add(middle);
    for (const id of [40631331,40631343,40631116,40631121,685316170,40631788,40631798,40631806,40631817,40631826,40631832,40593735,40606461,40592355,40592356]) {
      mappedHall(group, site, m, id, .7, false, undefined, data);
    }
    for (const id of [43512262,43519304]) {
      const building=data?.buildings.find(b=>b.id===id);
      if(building) {
        const [ox,oz]=project(site.coords),ring=localBuildingRing(building).map(([x,z]):[number,number]=>[x-ox,z-oz]);
        const item=new THREE.Group();item.name=building.name??String(id);item.userData.osmId=id;group.add(item);
        footprintSolid(item,ring,.18,m.marble);
        const layout=palaceSideHallLayout(building,site);
        for(const name of ['front','rear','corridor'] as const) {
          const p=layout[name],part=new THREE.Group();part.name=`palace-side-hall-${name}`;
          part.position.set(p.x,0,p.z);part.rotation.y=p.rotation;item.add(part);
          const corridor=name==='corridor';
          if(corridor) {
            part.rotation.y+=Math.PI/2;
            timberBody(part,m,p.depth,p.width*.78,.48,.18,false,{frontBays:3,sideBays:1,enclosure:'flush'});
            const roof=new THREE.Mesh(roofGeometry(p.depth,p.width,.22,'gable'),m.gold);roof.position.y=.66;part.add(roof);
            const gables=roofGables(p.depth,p.width,.22,'gable',m.wood);gables.position.y=.66;part.add(gables);
            timberEaves(part,m,p.depth,p.width,p.depth*.95,p.width*.75,.66,false);
            roofRidges(part,m,0,0,p.depth,p.width,.22,.66,'gable');
          } else hall(part,m,0,0,p.width,p.depth,1,m.gold,false,0,true,
            {roof:'hip-gable',double:false,height:1.48,platform:.18,frontBays:5,sideBays:3},true);
        }
      } else mappedHall(group,site,m,id,.82,false);
    }
    if(data)group.add(createPalaceLandscape(site,data,m));
    group.add(createPalaceGarden(site,m,data));
    const detailed = new Set([
      ...palaceAxis,...palaceGateIds,42424174,
      ...[40631331,40631343,40631116,40631121,685316170,40631788,40631798,40631806,40631817,40631826,40631832,40593735,40606461,40592355,40592356,43512262,43519304],
    ]);
    // Wall centres sit on the boundary; include their full footprint without a
    // centre-only clipping test. The moat remains the mapped water polygon.
    detailed.add(638156366);
    osmBuildings(group,m,data,site,detailed,building=>/房|库|所|厕所/.test(building.name ?? '')?m.grayRoof:m.gold,(layout,building)=>{
      const ring=localBuildingRing(building).map(([x,z]):[number,number]=>[x-project(site.coords)[0],z-project(site.coords)[1]]);
      return clipPalaceFootprint(ring,boundary).length>=3||palaceBoundaryGap(ring,boundary)<=1.5;
    });
    if (data) group.add(...createPalaceGates(site, data, m, (parent, part) => {
      const upper = new THREE.Group(); upper.name = part.name;
      upper.position.set(part.x, part.elevation, part.z); upper.rotation.y = part.rotation;
      // Gate stairs/railings belong to the deck, not a generic hall platform.
      hall(upper, m, 0, 0, part.width, part.depth, 1, m.gold, part.profile.double, 0, true, part.profile, true);
      parent.add(upper);
    }));
    // Buildings must exist before wall ends can meet their actual lower facade.
    if(data)group.add(createPalaceWalls(site,data,m,group));
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
  const gap=Math.asin(Math.min(.8,.72/(2*radius)))+.015;
  for(let side=0;side<4;side++) {
    const rail=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,4,24,Math.PI/2-gap*2),m.stone);
    rail.rotation.x=Math.PI/2;rail.rotation.z=side*Math.PI/2+gap;rail.position.y=y+.27;group.add(rail);
  }
  for(let i=0;i<count;i++) {
    const a=i/count*Math.PI*2;
    if(Math.abs(Math.atan2(Math.sin(4*a),Math.cos(4*a)))/4<gap+.015)continue;
    cylinder(group,m.stone,Math.cos(a)*radius,y+.14,Math.sin(a)*radius,.035,.28);
  }
}
function terrace(group:THREE.Group,m:Materials,radius:number,step=.19,profile?:{radius:number;height:number}[]) {
  const levels=profile??Array.from({length:3},(_,i)=>({radius:radius-i*radius*.16,height:step}));
  let base=profile?.054:.08;
  for(const level of levels) {
    const r=level.radius,top=base+level.height,tier=cylinder(group,m.marble,0,base+level.height/2,0,r,level.height);
    tier.name='terrace-tier';
    balustrade(group,m,r-.06,top);
    const steps=profile?9:4,run=profile?.045:.13;
    for(const direction of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      const stairs=new THREE.Group();stairs.rotation.y=direction;
      for(let j=0;j<steps;j++) {
        const rise=level.height*(j+1)/steps;
        box(stairs,m.marble,0,base+rise/2,r+(steps-j-.5)*run,.65,rise,run+.005);
      }
      group.add(stairs);
    }
    base=top;
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
  group.add(createTiantanGround(site,data,m));
  group.add(createTiantanWalls(site,data,m));
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
  // Clip only where the real footprint crosses the wall. A corridor's bounding
  // rectangle contains open courtyard and used to remove the southeast wall.
  const [originX,originZ]=project(site.coords);
  const obstacles=data.buildings.map(building=>localBuildingRing(building).map(([x,z]):[number,number]=>[x-originX,z-originZ]));
  const wallSegment=(a:[number,number],b:[number,number])=>{
    for(const [start,end] of wallRuns(a,b,obstacles)) {
      const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz);
      const item=new THREE.Group();item.name='prayer-wall';item.position.set((start[0]+end[0])/2,0,(start[1]+end[1])/2);item.rotation.y=-Math.atan2(dz,dx);
      box(item,m.wall,0,.43,0,length,.86,.12);box(item,m.grayRoof,0,.89,0,length,.08,.20);prayerCourt.add(item);
    }
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
  for(const id of [43921140,43921141,43921137,43921136,43921111,43921133,43921117,43921122,43921123,43921120])sourceHall(group,m,site,data,id,id===43921140?.75:.55,m.blue);
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
  cylinder(mound,m.paving,0,.035,0,5.15,.07);terrace(mound,m,2.7455,.16,[{radius:2.7455,height:.167},{radius:1.9655,height:.163},{radius:1.1825,height:.187}]);
  // Stone joints on the open upper terrace, with no generic building overlay.
  for(let row=1;row<=9;row++) {
    const radius=row*(1.1825-.045)/9,ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.006,3,64),m.plazaLine);ring.rotation.x=Math.PI/2;ring.position.y=.576;mound.add(ring);
    for(let i=0;i<row*9;i++) {const a=i/(row*9)*Math.PI*2,inner=radius-(1.1825-.045)/9;beam(mound,m.plazaLine,new THREE.Vector3(Math.sin(a)*inner,.576,Math.cos(a)*inner),new THREE.Vector3(Math.sin(a)*radius,.576,Math.cos(a)*radius),.005);}
  }
  group.add(mound);
  // Both concentric enclosures have stone gates. The OSM east outer gate's
  // misleading name must not turn it into a tiny solid red-roofed house.
  for(const id of [...moundInnerGates,...moundOuterGates]) {
    const p=at(id),gate=lingxingGate(m,p.width);gate.userData.osmId=id;gate.position.set(p.x,0,p.z);gate.rotation.y=p.rotation;group.add(gate);
  }
  const enclosures=moundEnclosures(data.buildings,site);
  const inner=new THREE.Group();inner.name='圜丘内壝墙';group.add(inner);
  const outer=new THREE.Group();outer.name='圜丘外壝墙';group.add(outer);
  footprintSolid(outer,enclosures.ring,.035,m.paving);
  for(const [host,runs,height] of [[inner,enclosures.inner,.189],[outer,enclosures.outer,.275]] as const)for(const [a,b] of runs) {
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),wall=new THREE.Group();wall.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);wall.rotation.y=-Math.atan2(dz,dx);host.add(wall);
    box(wall,m.wall,0,height/2,0,length,height,.085);
    const cap=new THREE.Mesh(roofGeometry(length,.15,.035,'gable'),m.blue);cap.position.y=height;wall.add(cap);
  }
  // The bent corridor is one concave footprint, not a straight bar through the court.
  const corridor=byId(31099286),[ox,oz]=project(site.coords),corridorRing=localBuildingRing(corridor).map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const passage=new THREE.Group();passage.name='七十二长廊';passage.userData.osmId=corridor.id;
  footprintSolid(passage,corridorRing,.09,m.stone);footprintSolid(passage,corridorRing,.035,m.wood,.77);
  const corridorRoof=new THREE.Mesh(polygonRoof(corridorRing,.805),m.green);corridorRoof.name='mapped-concave-roof';passage.add(corridorRoof);
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

function agriculture(group:THREE.Group,m:Materials,site:Landmark,data?:CityData) {
  if(!data)return;
  const profiles:[number,number,number,number,RoofForm][]=[
    [587608666,1.75,7,3,'hip-gable'],[587608670,1.4,7,3,'hip-gable'],[727056014,1.35,5,3,'hip-gable'],
    [727056021,1.05,11,3,'gable'],[727056022,1.05,11,3,'gable'],[727056019,1.0,5,2,'gable'],[727056020,1.0,5,2,'gable'],
  ];
  for(const [id,height,frontBays,sideBays,roof] of profiles) {
    const item=sourceHall(group,m,site,data,id,.8,id===727056014?m.green:m.grayRoof,false,{height,frontBays,sideBays,roof,double:false,platform:.165});
    if(item) {
      const p=localFootprintLayout(data.buildings.find(b=>b.id===id)!,site);
      for(const side of [-1,1])box(item,m.green,0,height*.65,side*p.depth/2,p.width,.045,.055);
    }
  }
  const [ox,oz]=project(site.coords);
  const mappedRings=profiles.map(([id])=>localBuildingRing(data.buildings.find(b=>b.id===id)!).map(([x,z]):[number,number]=>[x-ox,z-oz]));
  const boundary=(host:THREE.Group,x:number,z:number,w:number,d:number,obstacles:[number,number][][],cap:THREE.Material)=>{
    const points:[number,number][]=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
    for(let i=0;i<4;i++)for(const [a,b] of wallRuns(points[i],points[(i+1)%4],obstacles)) {
      const segment=new THREE.Group(),dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      segment.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);segment.rotation.y=-Math.atan2(dz,dx);host.add(segment);
      box(segment,m.wall,0,.30,0,length,.60,.09);box(segment,cap,0,.63,0,length,.06,.15);
    }
  };
  const taisui=localFootprintLayout(data.buildings.find(b=>b.id===587608666)!,site),bai=localFootprintLayout(data.buildings.find(b=>b.id===587608670)!,site);
  const courtX=(taisui.x+bai.x)/2,courtZ=(taisui.z+bai.z)/2;
  court(group,m,courtX,courtZ,6.6,12.0);
  boundary(group,courtX,courtZ,6.6,12.0,mappedRings,m.grayRoof);
  for(const compound of agricultureCompounds(site)) {
    const host=new THREE.Group();host.name=compound.name;host.position.set(compound.x,0,compound.z);group.add(host);
    court(host,m,0,compound.courtZ,compound.width,compound.depth);
    const masks:[number,number][][]=compound.parts.map(p=>{
      const c=Math.cos(p.turn??0),s=Math.sin(p.turn??0);
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]):[number,number]=>[p.x+a*p.width/2*c+b*p.depth/2*s,p.z-a*p.width/2*s+b*p.depth/2*c]);
    });
    for(const ring of mappedRings)masks.push(ring.map(([x,z])=>[x-compound.x,z-compound.z]));
    boundary(host,0,compound.courtZ,compound.width,compound.depth,masks,compound.name==='庆成宫'?m.green:m.grayRoof);
    box(host,m.stone,0,.102,compound.courtZ,.55,.035,compound.depth-.15);
    for(const part of compound.parts) {
      const item=new THREE.Group();item.name=part.name;item.position.set(part.x,0,part.z);item.rotation.y=part.turn??0;host.add(item);
      if(part.kind==='gate') {
        const outline=new THREE.Shape();outline.moveTo(-part.width/2,0);outline.lineTo(part.width/2,0);outline.lineTo(part.width/2,.75);outline.lineTo(-part.width/2,.75);outline.closePath();
        for(const x of [-part.width*.30,0,part.width*.30]) {
          const r=part.width*.075,hole=new THREE.Path();hole.moveTo(x-r,.02);hole.lineTo(x+r,.02);hole.lineTo(x+r,.50-r);hole.absarc(x,.50-r,r,0,Math.PI,false);hole.lineTo(x-r,.02);outline.holes.push(hole);
        }
        const wall=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:part.depth*.8,bevelEnabled:false,curveSegments:12}),m.wall);wall.position.z=-part.depth*.4;item.add(wall);
        const roof=new THREE.Mesh(roofGeometry(part.width,part.depth,.23),m[part.color]);roof.position.y=.75;item.add(roof);
      } else if(part.kind==='granary') {
        cylinder(item,m.stone,0,.08,0,.68,.16);cylinder(item,m.wall,0,.52,0,.59,.8);
        const roof=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.78,0),new THREE.Vector2(.70,.08),new THREE.Vector2(.38,.32),new THREE.Vector2(0,.55)],32),m.grayRoof);roof.position.y=.92;item.add(roof);
        cylinder(item,m.green,0,.94,0,.76,.06);box(item,m.wood,0,.50,.594,.26,.60,.025);
      } else if(part.kind==='well') {
        const sides=part.bays===6?6:4,r=part.width/2;
        cylinder(item,m.stone,0,.065,0,r,.13);
        for(let i=0;i<sides;i++) {const a=i/sides*Math.PI*2;cylinder(item,m.vermilion,Math.sin(a)*r*.7,.50,Math.cos(a)*r*.7,.025,.85);}
        const roof=new THREE.Mesh(new THREE.ConeGeometry(r,.45,sides),m.grayRoof);roof.position.y=1.1;roof.rotation.y=Math.PI/4;item.add(roof);
        box(item,m.paintedBlue,0,.91,0,part.width*.74,.06,part.depth*.74);
      } else hall(item,m,0,0,part.width,part.depth,.7,m[part.color],part.double??false,0,true,{height:part.height,platform:part.name.includes('庆成宫')?.30:.12,frontBays:part.bays,sideBays:3,roof:part.roof,double:part.double??false});
    }
  }
  const altarLayout=localFootprintLayout(data.buildings.find(b=>b.id===587608667)!,site),altar=new THREE.Group();altar.name='先农神坛';altar.userData.osmId=587608667;altar.position.set(altarLayout.x,0,altarLayout.z);group.add(altar);
  box(altar,m.darkStone,0,.075,0,1.5,.15,1.5);box(altar,m.stone,0,.16,0,1.52,.035,1.52);
  const viewing=localFootprintLayout(data.buildings.find(b=>b.id===587608669)!,site),platform=new THREE.Group();platform.name='观耕台';platform.userData.osmId=587608669;platform.position.set(viewing.x,0,viewing.z);group.add(platform);
  box(platform,m.green,0,.075,0,1.606,.15,1.606);box(platform,m.goldLeaf,0,.125,0,1.62,.025,1.62);box(platform,m.stone,0,.17,0,1.64,.05,1.64);
  for(const turn of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    for(const [host,size,steps] of [[altar,1.5,8],[platform,1.606,9]] as const) {
      const edge=new THREE.Group();edge.rotation.y=turn;host.add(edge);
      if(host===platform)for(const side of [-1,1]) {
        box(edge,m.marble,side*.54,.33,size/2,.55,.14,.03);box(edge,m.marble,side*.78,.34,size/2,.04,.31,.04);
      }
      if(host===platform&&turn===Math.PI)continue;
      for(let j=0;j<steps;j++)box(edge,m.stone,0,.16*(j+1)/steps/2,size/2+.42-j*.045,.43,.16*(j+1)/steps,.06);
    }
  }
  const field=new THREE.Group();field.name='一亩三分地';field.position.set(viewing.x,0,viewing.z+2.65);group.add(field);
  box(field,m.earth,0,.035,0,3.0,.07,2.9);
  for(let row=0;row<15;row++)box(field,m.park,-1.4+row*.20,.09,0,.11,.07,2.8);
  for(const side of [-1,1])box(field,m.stone,side*1.55,.08,0,.09,.10,3.05);
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

function squareEnsemble(group: THREE.Group, m: Materials, site: Landmark, data?:CityData) {
  const ground=squareGround(data),[ox,oz]=project(site.coords);
  const ring=ground.ring.map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const paving=footprintSolid(group,ring,.06,m.paving);paving.name='square-paving';
  for(const line of ground.joints) {
    const [a,b]=line;beam(group,m.plazaLine,new THREE.Vector3(a[0]-ox,.064,a[1]-oz),new THREE.Vector3(b[0]-ox,.064,b[1]-oz),.007);
  }
  const [a,b]=ground.axis;beam(group,m.brass,new THREE.Vector3(a[0]-ox,.07,a[1]-oz),new THREE.Vector3(b[0]-ox,.07,b[1]-oz),.018);
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
  group.add(createFlagCourt(m,flagX,flagZ));
  for(const side of [0,1])for(let i=0;i<9;i++) {
    const edge=side===0?[ground.ring[0],ground.ring[3]]:[ground.ring[1],ground.ring[2]],t=(i+1)/10;
    const x=edge[0][0]+(edge[1][0]-edge[0][0])*t-ox+(side===0?.4:-.4),z=edge[0][1]+(edge[1][1]-edge[0][1])*t-oz;
    box(group,m.stone,x,.56,z,.24,.05,.24);box(group,m.stone,x,.84,z,.08,1.08,.08);box(group,m.brass,x,1.38,z,.30,.18,.30);
  }
}

function gate(group: THREE.Group, m: Materials, w: number, d: number, kind: 'general' | 'duanmen' | 'zhengyang') {
  const zhengyang = kind === 'zhengyang';
  const duanmen = kind === 'duanmen';
  const baseW = Math.min(w, duanmen ? 12 : 8);
  const baseD = Math.min(d, duanmen ? 6.5 : 5);
  const wallHeight = duanmen ? 2.55 : 2.6;
  box(group, m.darkStone, 0, .08, 0, baseW + 1.4, .16, baseD + 1.5);
  const facade=new THREE.Shape();
  facade.moveTo(-baseW/2,0);facade.lineTo(baseW/2,0);facade.lineTo(baseW/2,wallHeight);facade.lineTo(-baseW/2,wallHeight);facade.closePath();
  const count = duanmen ? 5 : zhengyang ? 1 : 3;
  for(let i=0;i<count;i++) {
    const xx=(i-(count-1)/2)*(baseW/(count+1));
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
  const towerWidth = duanmen ? baseW*.78 : baseW*.88;
  const towerDepth = duanmen ? baseD*.76 : baseD*.82;
  hall(group, m, 0, 0, towerWidth, towerDepth, duanmen ? 1.65 : 1.9, zhengyang ? m.grayRoof : m.gold, true, wallHeight+.06);
  for (const face of [-1,1]) for (let i = -6; i <= 6; i++) box(group, m.stone, i * baseW / 13, wallHeight+.22, face*baseD/2, .12,.34,.30);
  if (duanmen) {
    for(const side of [-1,1]) {
      box(group,m.wall,side*baseW*.55,wallHeight*.70,1.7,2.3,wallHeight*.9,2.2);
      box(group,m.grayRoof,side*baseW*.55,wallHeight*1.17,1.7,2.7,.12,2.6);
    }
    for(const side of [-1,1]) box(group,m.wall,side*baseW*.47,wallHeight*.37,-1.8,2.0,.74,1.2);
  }
}

/** Three-eave city tower, independently positioned from the arrow tower.
 * ZHENGYANG-FIRE-2020 p.2 gives the platform envelope and overall height.
 * Taper, floor elevations and individual roof pitches remain interpretations.
 */
function zhengyangGate(parent:THREE.Group,m:Materials,site:Landmark,data?:CityData) {
  const p=zhengyangLayout(site,data).city,g=new THREE.Group();g.name='正阳门城楼';g.userData.osmId=25109960;g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;parent.add(g);
  const base=new THREE.Group();base.name='city-tower-platform';g.add(base);
  const {width:w,depth:d,height:h}=zhengyangCityPlatform,topW=9.0,topD=d*.90;
  const shape=new THREE.Shape([[-w/2,0],[w/2,0],[topW/2,h],[-topW/2,h]].map(([x,y])=>new THREE.Vector2(x,y)));
  const arch=new THREE.Path();arch.moveTo(-.30,.015);arch.lineTo(.30,.015);arch.lineTo(.30,.329);arch.absarc(0,.329,.30,0,Math.PI,false);arch.lineTo(-.30,.015);shape.holes.push(arch);
  const masonry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:20});
  const positions=masonry.getAttribute('position');
  for(let i=0;i<positions.count;i++)positions.setZ(i,(positions.getZ(i)-d/2)*(1-.10*positions.getY(i)/h));
  masonry.computeVertexNormals();base.add(new THREE.Mesh(masonry,m.grayBrick));
  box(g,m.stone,0,h+.035,0,topW+.04,.07,topD+.04);
  // The source describes 1.2 m parapets, rather than tall open stone balusters.
  for(const sign of [-1,1]) {
    box(g,m.grayBrick,0,h+.06,sign*(topD/2-.04),topW,.12,.08);
    box(g,m.stone,0,h+.125,sign*(topD/2-.04),topW+.025,.025,.10);
  }
  const bodyW=3.67,bodyD=1.65;
  const lower=timberBody(g,m,bodyW,bodyD,.90,1.54,true,{frontBays:7,sideBays:3});lower.name='city-tower-floor';
  const upper=timberBody(g,m,3.50,1.5,.61,2.75,true,{frontBays:7,sideBays:3});upper.name='city-tower-floor';
  for(const [width,depth,y,rise] of zhengyangCityRoofs) {
    const roof=new THREE.Mesh(roofGeometry(width,depth,rise,'hip-gable'),m.grayRoof);roof.position.y=y;roof.name='city-tower-roof';g.add(roof);
    const gables=roofGables(width,depth,rise,'hip-gable',m.wood);gables.position.y=y;g.add(gables);
    timberEaves(g,m,width,depth,bodyW*.78,bodyD*.66,y);
    for(const sign of [-1,1])box(g,m.green,0,y+.012,sign*depth/2,width,.024,.035);
    box(g,m.grayRoof,0,y+rise+.02,0,roofSection(width,depth,rise,1,'hip-gable').w*2,.04,.06);
  }
  // The band below the uppermost eave is not another inhabited storey.
  box(g,m.vermilion,0,3.72,0,3.24,.22,1.28);
  for(const sign of [-1,1])box(g,m.green,0,3.79,sign*.66,3.3,.065,.06);
  zhengyangDetails(g,m);
}


export function createLandmark(site: Landmark, m: Materials, data?: CityData): THREE.Group {
  const group = new THREE.Group(); group.name = site.id;
  const w = site.footprint[0] / 10, d = site.footprint[1] / 10;
  switch (site.kind) {
    case 'palace': palace(group, m, w, d, site.id === 'forbidden-city', site, data); break;
    case 'temple': if (site.id === 'taimiao') ancestralTemple(group,m,site,data); else heaven(group, m, w, d, site, data); break;
    case 'gate':
      if(site.id==='zhengyang')zhengyangGate(group,m,site,data);
      else if(site.id==='tiananmen')createTiananmen(group,m);
      else if(site.id==='duanmen')createDuanmen(group,m);
      else if(site.id==='yongdingmen')createYongdingmen(group,m);
      else gate(group, m, w, d, 'general');
      if(site.id==='zhengyang'&&data)group.add(createArrowTower(site,m,data));
      break;
    case 'tower': group.add(createBellDrum(site,m)); break;
    case 'bridge': {
      if(site.id==='jinshui') {
        const [ox,oz]=project(site.coords);
        for(const bridge of jinshuiLayout(data?.context)) {
          const x=bridge.x-ox,north=bridge.northZ-oz;
          const waterNorth=bridge.crossingNorthZ-oz,waterSouth=bridge.crossingSouthZ-oz;
          if(bridge.portal!==null&&north<waterNorth) {
            const approach=new THREE.Group();approach.name='jinshui-causeway';group.add(approach);
            box(approach,m.paving,x,.055,(north+waterNorth)/2,bridge.width,.11,waterNorth-north);
          }
          const bridgeGroup=new THREE.Group();
          bridgeGroup.name=bridge.portal===null?'jinshui-lateral-bridge':'jinshui-principal-bridge';
          bridgeGroup.userData.portal=bridge.portal;
          group.add(bridgeGroup);
          // The long north segment is a paved causeway, not part of the bridge.
          // This group contains only the span between the mapped water banks.
          box(bridgeGroup,m.stone,x,.13,waterNorth,bridge.width,.26,.18);
          box(bridgeGroup,m.stone,x,.13,waterSouth,bridge.width,.26,.18);
          const waterSpan=waterSouth-waterNorth;
          for(let i=0;i<12;i++) {
            const z=waterNorth+(i+.5)*waterSpan/12, rise=.10*Math.sin((i+.5)/12*Math.PI);
            box(bridgeGroup,m.marble,x,.20+rise,z,bridge.width,.10,waterSpan/12+.015);
            for(const side of [-1,1]) {
              const px=x+side*(bridge.width/2-.035);
              box(bridgeGroup,m.marble,px,.40+rise,z,.065,.35,.065);
              box(bridgeGroup,m.marble,px,.57+rise,z,.07,.05,waterSpan/12+.018);
              box(bridgeGroup,m.marble,px,.33+rise,z,.045,.12,waterSpan/12+.018);
            }
          }
        }
        break;
      }
      group.add(createWanning(site,m));
      break;
    }
    case 'hill': jingshan(group,m,site,data); break;
    case 'altar': {
      if(site.id==='xiannongtan') {
        agriculture(group,m,site,data);
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
    case 'square': squareEnsemble(group,m,site,data); break;
    case 'road': group.add(createRoadRemains(site,m)); break;
  }
  return group;
}

/** Merge static geometry by material, keeping roof/court detail with few draw calls. */
export function bake(group: THREE.Group, castShadow = true) {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const repeated=new Map<THREE.BufferGeometry,Map<THREE.Material,THREE.Mesh[]>>();
  group.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
    const byMaterial=repeated.get(object.geometry)??new Map<THREE.Material,THREE.Mesh[]>();
    const objects=byMaterial.get(object.material)??[];objects.push(object);byMaterial.set(object.material,objects);repeated.set(object.geometry,byMaterial);
  });
  const result = new THREE.Group();
  for(const [source,byMaterial] of repeated)for(const [material,objects] of byMaterial) {
    if(objects.length>=8) {
      // Repeated beams, columns and window bars keep one geometry instead of
      // hundreds of thousands of transformed vertex copies.
      const mesh=new THREE.InstancedMesh(source.clone(),material,objects.length);
      objects.forEach((object,i)=>mesh.setMatrixAt(i,object.matrixWorld));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=castShadow;mesh.receiveShadow=true;result.add(mesh);
      continue;
    }
    for(const object of objects) {
      let g=source.clone().applyMatrix4(object.matrixWorld);
      if(g.index){const nonIndexed=g.toNonIndexed();g.dispose();g=nonIndexed;}
      const count=g.getAttribute('position').count;
      if(!g.getAttribute('normal'))g.computeVertexNormals();
      if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));
      if((material as THREE.MeshStandardMaterial).vertexColors&&!g.getAttribute('color'))g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(count*3).fill(1),3));
      const array=batches.get(material)??[];array.push(g);batches.set(material,array);
    }
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(item => item.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow; mesh.receiveShadow = true; result.add(mesh);
  }
  // Temporary authored roof geometries are no longer needed after baking.
  const sharedGeometries:THREE.BufferGeometry[]=[boxGeometry,cylinderGeometry,terraceGeometry,columnGeometry];
  for(const geometry of repeated.keys())if(!sharedGeometries.includes(geometry))geometry.dispose();
  return result;
}
