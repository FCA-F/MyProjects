// 侦察兵部
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class ReconTroops extends Battalion {
  circleRadiusRatio: number;
  circleCenterRatio: number;
  antennaWidthRatio: number;
  antennaHeightRatio: number;
  antennaStartIndex: number;
  circleSegments: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.circleRadiusRatio = 2;
    this.circleCenterRatio = 0.5;
    this.antennaWidthRatio = 2.5;
    this.antennaHeightRatio = 5.5;
    this.antennaStartIndex = 10;
    this.circleSegments = 64;
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
    const radius = length / this.circleRadiusRatio;
    const centerAlong = length * this.circleCenterRatio;
    const antennaStartAngle = (Math.PI * 2 * this.antennaStartIndex) / this.circleSegments;
    const rightAntennaStart = this.getCircleLocalPoint(centerAlong, radius, antennaStartAngle);
    const leftAntennaStart = this.getCircleLocalPoint(centerAlong, radius, Math.PI - antennaStartAngle);
    const antennaStartAlong = rightAntennaStart[1];
    const antennaEndAlong = antennaStartAlong + length / this.antennaHeightRatio;
    const antennaEndAcross = length / this.antennaWidthRatio;

    this.geometryPointGroups = [
      this.createCirclePoints(p1, dirX, dirY, normalX, normalY, centerAlong, radius),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        leftAntennaStart,
        [-antennaEndAcross, antennaEndAlong],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        rightAntennaStart,
        [antennaEndAcross, antennaEndAlong],
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
    for (let i = 0; i <= this.circleSegments; i += 1) {
      const angle = (Math.PI * 2 * i) / this.circleSegments;
      const across = Math.cos(angle) * radius;
      const along = centerAlong + Math.sin(angle) * radius;
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    }

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }

  private getCircleLocalPoint(centerAlong: number, radius: number, angle: number) {
    return [Math.cos(angle) * radius, centerAlong + Math.sin(angle) * radius];
  }
}
