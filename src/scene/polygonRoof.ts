import * as THREE from 'three';

type Point=[number,number];
type Plane=[number,number,number];
type Patch={ring:Point[];plane:Plane};
const epsilon=1e-9;
const value=(p:Plane,[x,z]:Point)=>p[0]*x+p[1]*z+p[2];
const subtract=(a:Plane,b:Plane):Plane=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];

/** Clip a convex roof patch on the exact line where two pitches meet. */
function clip(ring:Point[],plane:Plane):Point[] {
  const result:Point[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],va=value(plane,a),vb=value(plane,b);
    if(va>=0)result.push(a);
    if((va>0&&vb<0)||(va<0&&vb>0)) {
      const t=va/(va-vb);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
  }
  return result;
}

/** Four linear pieces of a square-ended distance field around one eave. */
function edgePlanes(a:Point,b:Point):Plane[] {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),x=(b[0]-a[0])/length,z=(b[1]-a[1])/length;
  return [[-z,x,z*a[0]-x*a[1]],[z,-x,-z*a[0]+x*a[1]],[-x,-z,x*a[0]+z*a[1]],[x,z,-x*b[0]-z*b[1]]];
}

/**
 * Piecewise planar atlas roof, clipped to the mapped footprint. Square-ended
 * eave distances make concave junctions angular; they are an interpretation,
 * not a surveyed straight skeleton or a claim about individual roof trusses.
 */
export function polygonRoof(source:Point[],eave:number) {
  const ring=source.filter((p,i)=>i===0||Math.hypot(p[0]-source[i-1][0],p[1]-source[i-1][1])>epsilon);
  if(ring.length>1&&Math.hypot(ring[0][0]-ring.at(-1)![0],ring[0][1]-ring.at(-1)![1])<epsilon)ring.pop();
  const geometry=new THREE.BufferGeometry();
  if(ring.length<3)return geometry;
  // Start above every possible pitch. Each edge lowers the envelope, splitting
  // at plane intersections rather than sampling a dense, smoothed height grid.
  const extent=Math.max(...ring.map(p=>p[0]))-Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[1]))-Math.min(...ring.map(p=>p[1]));
  let patches:Patch[]=THREE.ShapeUtils.triangulateShape(ring.map(([x,z])=>new THREE.Vector2(x,z)),[])
    .map(face=>({ring:face.map(i=>ring[i]),plane:[0,0,extent]}));
  const edges=ring.map((a,i)=>({a,b:ring[(i+1)%ring.length]}))
    .sort((a,b)=>Math.hypot(b.b[0]-b.a[0],b.b[1]-b.a[1])-Math.hypot(a.b[0]-a.a[0],a.b[1]-a.a[1]));
  for(const {a,b} of edges) {
    const planes=edgePlanes(a,b),next:Patch[]=[];
    for(const patch of patches) {
      // One linear piece already above the old roof proves this edge cannot
      // lower it anywhere in the convex patch (including its interior).
      if(planes.some(p=>patch.ring.every(v=>value(subtract(p,patch.plane),v)>=-epsilon))) {
        next.push(patch);continue;
      }
      for(let i=0;i<planes.length;i++) {
        const plane=planes[i];let region=patch.ring;
        for(let j=0;j<planes.length&&region.length>=3;j++)if(i!==j)region=clip(region,subtract(plane,planes[j]));
        if(region.length<3)continue;
        const delta=subtract(patch.plane,plane);
        const lower=clip(region,delta),upper=clip(region,delta.map(v=>-v) as Plane);
        if(lower.length>=3)next.push({ring:lower,plane});
        if(upper.length>=3)next.push({ring:upper,plane:patch.plane});
      }
    }
    patches=next;
  }
  const positions:number[]=[],uvs:number[]=[];
  for(const patch of patches)for(let i=1;i<patch.ring.length-1;i++) {
    const triangle=[patch.ring[0],patch.ring[i],patch.ring[i+1]], [a,b,c]=triangle;
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(area)<epsilon)continue;
    if(area>0)triangle.reverse();
    for(const p of triangle) {
      positions.push(p[0],eave+.025+.72*Math.max(0,value(patch.plane,p)),p[1]);uvs.push(p[0]*.5,p[1]*.8);
    }
  }
  // Unshared vertices preserve crease normals across hips and valleys.
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  return geometry;
}
