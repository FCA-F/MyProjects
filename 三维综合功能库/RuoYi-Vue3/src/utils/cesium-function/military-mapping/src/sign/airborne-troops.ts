// Airborne troops
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class AirborneTroops extends Battalion {
  arcHalfWidthRatio: number;
  arcBaseRatio: number;
  stemBottomRatio: number;
  footWidthRatio: number;
  arcSegments: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.arcHalfWidthRatio = 2.15;
    this.arcBaseRatio = 0.64;
    this.stemBottomRatio = 0;
    this.footWidthRatio = 5.8;
    this.arcSegments = 48;
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
    const arcHalfWidth = length / this.arcHalfWidthRatio;
    const arcBaseAlong = length * this.arcBaseRatio;
    const arcHeight = length - arcBaseAlong;
    const stemBottom = length * this.stemBottomRatio;
    const footWidth = length / this.footWidthRatio;

    this.geometryPointGroups = [
      this.createArcPoints(p1, dirX, dirY, normalX, normalY, arcBaseAlong, arcHalfWidth, arcHeight),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-arcHalfWidth, arcBaseAlong],
        [arcHalfWidth, arcBaseAlong],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, arcBaseAlong],
        [0, stemBottom],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, stemBottom],
        [-footWidth, stemBottom],
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

  private createArcPoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    baseAlong: number,
    halfWidth: number,
    height: number,
  ) {
    const coords: number[] = [];
    for (let i = 0; i <= this.arcSegments; i += 1) {
      const t = Math.PI - (Math.PI * i) / this.arcSegments;
      const across = Math.cos(t) * halfWidth;
      const along = baseAlong + Math.sin(t) * height;
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    }

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
