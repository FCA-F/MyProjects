// 占领地
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class OccupiedArea extends Battalion {
  smoothSteps: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.smoothSteps = 15;
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

    const rightSide = [
      [0, length],
      [length * 0.3, length * 0.95],
      [length * 0.65, length * 0.78],
      [length * 0.9, length * 0.49],
      [length * 0.9, length * 0.1],
      [length * 0.7, length * -0.1],
      [length * 0.4, length * -0.08],
      [0, 0],
    ];
    const leftSide = rightSide
      .slice(1, -1)
      .reverse()
      .map(([across, along]) => [-across, along]);
    const controlPoints = [...rightSide, ...leftSide, [0, length]];

    this.geometryPointGroups = [
      this.createSmoothLinePoints(p1, dirX, dirY, normalX, normalY, controlPoints),
    ];

    return this.geometryPointGroups[0];
  }

  private createSmoothLinePoints(
    p1: number[],
    dirX: number,
    dirY: number,
    normalX: number,
    normalY: number,
    controlPoints: number[][],
  ) {
    const localPoints: number[][] = [];
    for (let i = 0; i < controlPoints.length - 1; i += 1) {
      const p0 = controlPoints[Math.max(i - 1, 0)];
      const pA = controlPoints[i];
      const pB = controlPoints[i + 1];
      const p3 = controlPoints[Math.min(i + 2, controlPoints.length - 1)];

      for (let step = 0; step < this.smoothSteps; step += 1) {
        const t = step / this.smoothSteps;
        localPoints.push(this.interpolateCatmullRom(p0, pA, pB, p3, t));
      }
    }
    localPoints.push(controlPoints[controlPoints.length - 1]);

    const coords: number[] = [];
    localPoints.forEach(([across, along]) => {
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    });

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }

  private interpolateCatmullRom(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
    const t2 = t * t;
    const t3 = t2 * t;
    return [
      0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
      0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    ];
  }
}
