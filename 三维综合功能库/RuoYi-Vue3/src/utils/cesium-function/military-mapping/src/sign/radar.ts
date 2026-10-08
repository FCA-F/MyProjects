// 雷达
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Radar extends Battalion {
  halfWidthRatio: number;
  shoulderAlongRatio: number;
  arcSegments: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.halfWidthRatio = 2.35;
    this.shoulderAlongRatio = 0.62;
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
    const halfWidth = length / this.halfWidthRatio;
    const shoulderAlong = length * this.shoulderAlongRatio;
    const arcHeight = length - shoulderAlong;

    this.geometryPointGroups = [
      this.createOutlinePoints(p1, dirX, dirY, normalX, normalY, halfWidth, shoulderAlong, arcHeight),
    ];

    return this.geometryPointGroups[0];
  }

  private createOutlinePoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    halfWidth: number,
    shoulderAlong: number,
    arcHeight: number,
  ) {
    const localPoints: number[][] = [[0, 0], [-halfWidth, shoulderAlong]];

    for (let i = 0; i <= this.arcSegments; i += 1) {
      const t = Math.PI - (Math.PI * i) / this.arcSegments;
      const across = Math.cos(t) * halfWidth;
      const along = shoulderAlong + Math.sin(t) * arcHeight;
      localPoints.push([across, along]);
    }

    localPoints.push([halfWidth, shoulderAlong], [0, 0]);

    const coords: number[] = [];
    localPoints.forEach(([across, along]) => {
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    });

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
