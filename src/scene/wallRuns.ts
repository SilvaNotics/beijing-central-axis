import { pointInPolygon } from './geo';
type Point=[number,number];

/** Visible wall runs after exact polygon intersections, including concave corridors. */
export function wallRuns(a:Point,b:Point,obstacles:Point[][],inside=false):[Point,Point][] {
  const dx=b[0]-a[0],dz=b[1]-a[1],parameters=[0,1];
  for(const ring of obstacles)for(let i=0;i<ring.length;i++) {
    const c=ring[i],d=ring[(i+1)%ring.length],ex=d[0]-c[0],ez=d[1]-c[1];
    const determinant=dx*ez-dz*ex;
    if(Math.abs(determinant)<1e-10)continue;
    const cx=c[0]-a[0],cz=c[1]-a[1],t=(cx*ez-cz*ex)/determinant,u=(cx*dz-cz*dx)/determinant;
    if(t>0&&t<1&&u>=0&&u<=1)parameters.push(t);
  }
  parameters.sort((a,b)=>a-b);
  const point=(t:number):Point=>[a[0]+dx*t,a[1]+dz*t],result:[Point,Point][]=[];
  for(let i=1;i<parameters.length;i++) {
    const from=parameters[i-1],to=parameters[i];
    const contained=obstacles.some(ring=>pointInPolygon(point((from+to)/2),ring));
    if(to-from<1e-8||contained!==inside)continue;
    result.push([point(from),point(to)]);
  }
  return result;
}
