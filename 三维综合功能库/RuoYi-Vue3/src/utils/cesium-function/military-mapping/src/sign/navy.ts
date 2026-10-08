// Navy
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Navy extends Battalion {
  ringRadiusRatio: number;
  ringCenterRatio: number;
  crossHalfWidthRatio: number;
  bottomArcRadiusRatio: number;
  segments: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.ringRadiusRatio = 0.1;
    this.ringCenterRatio = 0.9;
    this.crossHalfWidthRatio = 7.2;
    this.bottomArcRadiusRatio = 2;
    this.segments = 48;
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
    const ringRadius = length * this.ringRadiusRatio;
    const ringCenterAlong = length * this.ringCenterRatio;
    const crossHalfWidth = length / this.crossHalfWidthRatio;
    const crossAlong = length * 0.7;
    const arcRadius = length / this.bottomArcRadiusRatio;
    const arcCenterAlong = arcRadius;

    this.geometryPointGroups = [
      this.createCirclePoints(p1, dirX, dirY, normalX, normalY, ringCenterAlong, ringRadius),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, length*0.8],
        [0, 0],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-crossHalfWidth, crossAlong],
        [crossHalfWidth, crossAlong],
      ]),
      this.createBottomArcPoints(p1, dirX, dirY, normalX, normalY, arcCenterAlong, arcRadius),
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

  private createCirclePoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    centerAlong: number,
    radius: number,
  ) {
    const coords: number[] = [];
    for (let i = 0; i <= this.segments; i += 1) {
      const angle = (Math.PI * 2 * i) / this.segments;
      const across = Math.cos(angle) * radius;
      const along = centerAlong + Math.sin(angle) * radius;
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    }

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }

  private createBottomArcPoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    centerAlong: number,
    radius: number,
  ) {
    const coords: number[] = [];
    const startAngle = Math.PI * 1.08;
    const endAngle = Math.PI * 1.92;
    for (let i = 0; i <= this.segments; i += 1) {
      const angle = startAngle + ((endAngle - startAngle) * i) / this.segments;
      const across = Math.cos(angle) * radius;
      const along = centerAlong + Math.sin(angle) * radius;
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    }

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
