import { describe, expect, it } from 'vitest';
import { landmarks } from '../data/heritage';
import { project } from './geo';
import { roadStation, southernRoadPath, roadPlanRings } from './southernRoad';

describe('road and gate alignment',()=>{
  it('terminates at the mapped gate rather than the road label longitude',()=>{
    const gate=project(landmarks.find(site=>site.id==='yongdingmen')!.coords);
    expect(southernRoadPath().at(-1)).toEqual(gate);
    const end=roadStation(0);
    expect([end.x,end.z]).toEqual(gate);
  });
  it('places the 100 m and 400 m details along the same centreline',()=>{
    const gate=roadStation(0),near=roadStation(100),far=roadStation(400);
    expect(Math.hypot(near.x-gate.x,near.z-gate.z)).toBeCloseTo(10,6);
    expect(Math.hypot(far.x-gate.x,far.z-gate.z)).toBeCloseTo(40,6);
    expect(near.rotation).toBeCloseTo(far.rotation,8);
    // A local +z edge points towards the gate after rotation.
    expect(Math.sin(near.rotation)).toBeCloseTo((gate.x-near.x)/10,8);
    expect(Math.cos(near.rotation)).toBeCloseTo((gate.z-near.z)/10,8);
  });
  it('keeps paired remains symmetric about the actual path',()=>{
    const center=roadStation(100),left=roadStation(100,-8),right=roadStation(100,8);
    expect((left.x+right.x)/2).toBeCloseTo(center.x,8);
    expect((left.z+right.z)/2).toBeCloseTo(center.z,8);
    expect(Math.hypot(left.x-right.x,left.z-right.z)).toBeCloseTo(1.6,8);
    const rings=roadPlanRings();
    const slab=rings.at(-3)!;
    expect(slab.reduce((sum,p)=>sum+p[0]/4,0)).toBeCloseTo(left.x,8);
    expect(slab.reduce((sum,p)=>sum+p[1]/4,0)).toBeCloseTo(left.z,8);
  });
});
