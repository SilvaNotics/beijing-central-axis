import { landmarks } from '../data/heritage';
import { project } from './geo';

export const tiananmenWidth = 12;
export const tiananmenDepth = 6.2;
export const tiananmenPortals = [-4,-2,0,2,4];

/** Five principal bridges face the five openings; the outer two serve the flanks. */
export function jinshuiLayout() {
  const gate=project(landmarks.find(site=>site.id==='tiananmen')!.coords);
  const bridge=project(landmarks.find(site=>site.id==='jinshui')!.coords);
  return [-11,...tiananmenPortals,11].map((offset,index)=>({
    x:gate[0]+offset,
    riverZ:bridge[1],
    northZ:gate[1]+tiananmenDepth/2,
    southZ:bridge[1]+1.8,
    width:index===3?.85:index===0||index===6?.5:.65,
    portal:index>0&&index<6 ? offset : null,
  }));
}
