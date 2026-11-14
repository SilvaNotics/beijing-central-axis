import {project,pointInPolygon} from './geo';
import {wgs84ToGcj02,type CityData} from './geodata';
import {wallRuns} from './wallRuns';
type Point=[number,number];
// Fallback control lines from bundled OSM ways 675930560, 4231223,
// 1363804678, 29549788 and 127843732. The original WGS84 snapshot is preserved.
const fallback={
  north:[[116.3894463,39.9060159],[116.3898651,39.9060285],[116.3926313,39.9061132],[116.3930805,39.9061255]],
  west:[[116.3894463,39.9060159],[116.3895611,39.9036108],[116.3897004,39.9005257],[116.3898158,39.8987502]],
  east:[[116.3931003,39.9058361],[116.3932139,39.903728],[116.3933161,39.9015519],[116.3934589,39.8988801]],
  south:[[116.3898158,39.8987502],[116.390231,39.898764],[116.3934589,39.8988801]],
} satisfies Record<string,Point[]>;
const local=(ring:Point[])=>ring.map(p=>project(wgs84ToGcj02(p)));
function sample(points:Point[],value:number,alongX=false) {
  const axis=alongX?0:1,other=alongX?1:0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i];
    if(value<Math.min(a[axis],b[axis])||value>Math.max(a[axis],b[axis])||a[axis]===b[axis])continue;
    return a[other]+(b[other]-a[other])*(value-a[axis])/(b[axis]-a[axis]);
  }
  return points.reduce((a,b)=>Math.abs(a[axis]-value)<Math.abs(b[axis]-value)?a:b)[other];
}
/** Visible paving parcel, distinct from the official broad 880 × 500 m description.
 * Roads constrain its footprint; curb setbacks and paving joints are interpreted.
 */
export function squareGround(data?:CityData) {
  const road=(name:string,key:keyof typeof fallback)=>{
    const all=data?.context.filter(f=>f.kind==='road'&&f.name===name).flatMap(f=>f.coordinates.map(project));
    return all?.length?all.sort((a,b)=>a[1]-b[1]):local(fallback[key]);
  };
  const west=road('广场西侧路','west'),east=road('广场东侧路','east');
  const southLine=local(fallback.south),[axisX]=project(wgs84ToGcj02([116.3913049,39.9055772]));
  // Meet the south carriageway rather than truncating paving at the flag court.
  // .9 = current rendered half-road (.45), border (.2), and a small curb margin.
  // This is a display setback, not a measured road width or heritage boundary.
  const north=sample(local(fallback.north),axisX,true)+.9,south=sample(southLine,axisX,true)-1.8;
  const left=(z:number)=>sample(west,z)+1.5,right=(z:number)=>sample(east,z)-1.5;
  const ring:Point[]=[[left(north),north],[right(north),north],[right(south),south],[left(south),south]];
  const joints:Point[][]=[];
  for(let z=north+4;z<south-1;z+=4)joints.push([[left(z)+.15,z],[right(z)-.15,z]]);
  for(let x=Math.min(...ring.map(p=>p[0]))+2;x<Math.max(...ring.map(p=>p[0]));x+=3)joints.push(...wallRuns([x,north+.1],[x,south-.1],[ring],true));
  const axis:Point[]=[[axisX,north],[axisX,south]];
  return {ring,joints,axis,north,south,axisX,contains:(p:Point)=>pointInPolygon(p,ring)};
}
