//火炮
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Artillery extends Battalion {
  sideOffsetRatio: number;
  sideTopRatio: number;
  sideBottomRatio: number;
  baseHalfWidthRatio: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.sideOffsetRatio = 5;
    this.sideTopRatio = 0.65;
    this.sideBottomRatio = 0.35;
    this.baseHalfWidthRatio = 6;
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
    const baseHalfWidth = length / this.baseHalfWidthRatio;
    const sideTop = length * this.sideTopRatio;
    const sideBottom = length * this.sideBottomRatio;

    this.geometryPointGroups = [
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, length],
        [0, 0],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-baseHalfWidth, 0],
        [baseHalfWidth, 0],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-sideOffset, sideBottom],
        [-sideOffset, sideTop],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [sideOffset, sideBottom],
        [sideOffset, sideTop],
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
