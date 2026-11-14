import * as THREE from 'three';
import type { Materials } from './materials';
import { wallRuns } from './wallRuns';
type Point=[number,number];
const cube=new THREE.BoxGeometry(1,1,1);
function stone(group:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);return mesh;
}
function crop(ring:Point[],limit:number,sign:number):Point[] {
  const result:Point[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],va=limit-sign*a[1],vb=limit-sign*b[1];
    if(va>=0)result.push(a);
    if(va*vb<0){const t=va/(va-vb);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return result;
}

/** Locate the stair tongues halfway down their run, then project their sides
 * back to the landing. The global cut can also shave a slanted terrace edge;
 * those shallow strips are exposed terrace, not additional stair entrances. */
function stairOpenings(ring:Point[],cut:number,run:number,sign:number):[number,number][] {
  const sample=cut+run/2,hits:number[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],za=sign*a[1],zb=sign*b[1];
    if((za<=sample&&zb>sample)||(zb<=sample&&za>sample))
      hits.push(a[0]+(b[0]-a[0])*(cut-za)/(zb-za));
  }
  hits.sort((a,b)=>a-b);
  const openings:[number,number][]=[];
  for(let i=0;i+1<hits.length;i+=2)openings.push([hits[i],hits[i+1]]);
  return openings;
}

/** Normalize three mapped stair locations into a centered display layout. */
function stairLayout(ring:Point[],run:number,sign:number,cut:number) {
  const sample=cut+run/2,hits:number[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],za=sign*a[1],zb=sign*b[1];
    if((za<=sample&&zb>sample)||(zb<=sample&&za>sample))
      hits.push(a[0]+(b[0]-a[0])*(sample-za)/(zb-za));
  }
  hits.sort((a,b)=>a-b);
  const mapped:[number,number][]=[];
  for(let i=0;i+1<hits.length;i+=2)mapped.push([hits[i],hits[i+1]]);
  if(mapped.length!==3)return [];
  const centers=mapped.map(([left,right])=>(left+right)/2),width=mapped.reduce((sum,[left,right])=>sum+right-left,0)/3;
  const center=centers[1],spacing=(centers[2]-centers[0])/2;
  return [center-spacing,center,center+spacing].map(x=>[x-width/2,x+width/2] as [number,number]);
}

function railingEdges(outline:Point[],cut:number,sign:number,openings:[number,number][]):[Point,Point][] {
  const edges:[Point,Point][]=[];
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    if(Math.abs(sign*a[1]-cut)>1e-7||Math.abs(sign*b[1]-cut)>1e-7) {
      edges.push([a,b]);continue;
    }
    let spans:[number,number][]=[[Math.min(a[0],b[0]),Math.max(a[0],b[0])]];
    for(const [left,right] of openings)spans=spans.flatMap(([lo,hi]):[number,number][]=>{
      if(right<=lo||left>=hi)return [[lo,hi]];
      const remaining:[number,number][]=[];
      if(left>lo)remaining.push([lo,left]);
      if(right<hi)remaining.push([right,hi]);
      return remaining;
    });
    for(const [lo,hi] of spans)edges.push([[lo,sign*cut],[hi,sign*cut]]);
  }
  return edges;
}

/** Join the entire normalized stair width to the mapped, sometimes inset deck. */
function stairLanding(platform:Point[],left:number,right:number,cut:number,sign:number) {
  const xs=[left,right,...platform.map(p=>p[0]).filter(x=>x>left&&x<right)].sort((a,b)=>a-b);
  let back=cut;
  for(let j=0;j<xs.length-1;j++)for(const t of [.001,.5,.999]) {
    const x=xs[j]+(xs[j+1]-xs[j])*t,hits:number[]=[];
    for(let i=0;i<platform.length;i++) {
      const a=platform[i],b=platform[(i+1)%platform.length];
      if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))
        hits.push(sign*(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])));
    }
    if(hits.length)back=Math.min(back,Math.max(...hits));
  }
  return {left,right,back:back-.02,front:cut};
}

function clearLandingRails(edges:[Point,Point][],landings:ReturnType<typeof stairLanding>[],sign:number):[Point,Point][] {
  for(const landing of landings)edges=edges.flatMap(([a,b]):[Point,Point][]=>{
    const dx=b[0]-a[0],dz=sign*(b[1]-a[1]),ts=[0,1];
    if(dx!==0)for(const x of [landing.left,landing.right])ts.push((x-a[0])/dx);
    if(dz!==0)for(const z of [landing.back,landing.front])ts.push((z-sign*a[1])/dz);
    const cuts=ts.filter(t=>t>=0&&t<=1).sort((a,b)=>a-b),result:[Point,Point][]=[];
    for(let i=0;i<cuts.length-1;i++) {
      const lo=cuts[i],hi=cuts[i+1],mid=(lo+hi)/2,x=a[0]+mid*dx,z=sign*a[1]+mid*dz;
      if(x>landing.left&&x<landing.right&&z>=landing.back-1e-7&&z<=landing.front+1e-7)continue;
      result.push([[a[0]+lo*dx,a[1]+sign*lo*dz],[a[0]+hi*dx,a[1]+sign*hi*dz]]);
    }
    return result;
  });
  return edges;
}

/** Mapped stone terrace; stair count, rail spacing and moldings are schematic. */
export function palacePlatform(ring:Point[],height:number,m:Materials,stairs?:{side:1|-1;run:number},openEnds=false,connectedDecks:Point[][]=[]) {
  const group=new THREE.Group();group.name='palace-stone-terrace';
  const sign=stairs?.side??1,far=Math.max(...ring.map(p=>sign*p[1])),cut=far-(stairs?.run??0),steps=stairs?15:3;
  const platform=stairs?crop(ring,cut,sign):ring;
  for(let tier=0;tier<(stairs?3:steps);tier++) {
    const outline=platform;
    const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
    const courses=stairs?3:steps,geometry=new THREE.ExtrudeGeometry(shape,{depth:height/courses,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,m.marble);mesh.position.y=tier*height/courses;group.add(mesh);
  }
  const openings=stairs?stairLayout(ring,stairs.run,sign,cut):[];
  if(stairs&&openings.length!==3)openings.push(...stairOpenings(ring,cut,stairs.run,sign));
  const landings=stairs?openings.map(([left,right])=>stairLanding(platform,left,right,cut,sign)):[];
  for(const landing of landings) {
    const mesh=stone(group,m.marble,(landing.left+landing.right)/2,height/2,sign*(landing.back+landing.front)/2,landing.right-landing.left,height,landing.front-landing.back);
    mesh.name='palace-stair-landing';
  }
  if(stairs&&openings.length===3) {
    const width=openings[0][1]-openings[0][0],stepDepth=stairs.run/steps,stepHeight=height/steps;
    for(const [flight,[left,right]] of openings.entries()) {
      const flightGroup=new THREE.Group();flightGroup.name=`palace-stair-flight-${flight}`;group.add(flightGroup);
      for(let tread=0;tread<steps;tread++) {
        const top=stepHeight*(tread+1),z=sign*(far-stepDepth*(tread+.5));
        stone(flightGroup,m.marble,(left+right)/2,top/2,z,width,top,stepDepth);
      }
    }
  }
  // Shared deck boundaries are circulation joins, not exposed railing edges.
  // A 2 cm display tolerance includes the exact common polygon boundary.
  const joins=connectedDecks.flatMap(ring=>[ring,...ring.map((a,i)=>{
    const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const nx=length?-dz/length*.002:0,nz=length?dx/length*.002:0;
    return [[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]] as Point[];
  })]);
  const rails=clearLandingRails(railingEdges(platform,cut,sign,openings),landings,sign).flatMap(([a,b])=>wallRuns(a,b,joins));
  for(const [a,b] of rails) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(openEnds&&Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1]))continue;
    if(length<.05)continue;
    const edge=new THREE.Group();edge.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);edge.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);group.add(edge);
    for(const fraction of [.30,.64,.97])stone(edge,m.stone,0,height*fraction,0,length,.035,.045);
    const count=Math.max(1,Math.ceil(length/.32));
    for(let j=0;j<=count;j++)stone(edge,m.marble,-length/2+j*length/count,height+.09,0,.035,.18,.035);
    stone(edge,m.marble,0,height+.14,0,length,.035,.035);
    stone(edge,m.marble,0,height+.06,0,length,.055,.023);
  }
  return group;
}
