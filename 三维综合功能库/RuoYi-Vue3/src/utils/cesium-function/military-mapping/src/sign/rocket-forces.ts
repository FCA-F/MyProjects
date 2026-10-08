//火箭兵部
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Artillery extends Battalion {
  sideOffsetRatio: number;
  bar1WidthRatio:number;
  bar2WidthRatio:number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.sideOffsetRatio = 5;
    this.bar1WidthRatio=2.5
    this.bar2WidthRatio=3;

  }

  createGraphic(positions: Cartesian3[]) {
    if (positions.length < 2) {
      this.geometryPointGroups = [];
      return [];
    }

    const [p1, p2] = positions.map(this.cartesianToLnglat);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      this.geometryPointGroups = [];
      return [];
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const normalX = -dirY;
    const normalY = dirX;
    const sideOffset = length / this.sideOffsetRatio;
    const bar1Width=length/this.bar1WidthRatio
    const bar2Width=length/this.bar2WidthRatio
    const bar1=length
    const bar1Bottom=length*0.7
    const bar2=length*0.35
    const bar2Bottom=length*0.05
    const sideTop=length*0.65
    const sideBottom=length*0.4

    this.geometryPointGroups = [
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, length],
        [0, 0],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0,bar1],
        [-bar1Width,bar1Bottom]
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0,bar1],
        [bar1Width,bar1Bottom]
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, bar2],
        [bar2Width, bar2Bottom],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, bar2],
        [-bar2Width, bar2Bottom],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [sideOffset, sideTop],
        [sideOffset, sideBottom],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-sideOffset, sideTop],
        [-sideOffset, sideBottom],
      ]),
    ];

    return this.geometryPointGroups[0];
  }

  private createLocalLinePoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    localPoints: number[][],
  ) {
    const coords: number[] = [];
    localPoints.forEach(([across, along]) => {
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    });

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
