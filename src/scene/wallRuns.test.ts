import { expect,it } from 'vitest';
import { wallRuns } from './wallRuns';

it('clips a flat-map ridge into two wings without drawing across the open courtyard',()=>{
  const court:[number,number][]=[[0,0],[4,0],[4,4],[3,4],[3,1],[1,1],[1,4],[0,4]];
  const inside=wallRuns([-1,2],[5,2],[court],true);
  expect(inside).toEqual([[[0,2],[1,2]],[[3,2],[4,2]]]);
  expect(wallRuns([-1,2],[5,2],[court])).toEqual([[[-1,2],[0,2]],[[1,2],[3,2]],[[4,2],[5,2]]]);
});
