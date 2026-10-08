// Regiment
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Regiment extends Battalion {
  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
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

    const unitNormalX = -dy / length;
    const unitNormalY = dx / length;
    const lineGap = (length / this.lengthWidthRatio) * this.gapWidthRatio;

    this.geometryPointGroups = [
      this.buildLinePoints(p1, p2, unitNormalX, unitNormalY, lineGap),
      this.buildLinePoints(p1, p2, unitNormalX, unitNormalY, 0),
      this.buildLinePoints(p1, p2, unitNormalX, unitNormalY, -lineGap),
    ];

    return this.geometryPointGroups[0];
  }

  private buildLinePoints(
    p1: number[],
    p2: number[],
    unitNormalX: number,
    unitNormalY: number,
    centerOffset: number,
  ) {
    const centerOffsetX = unitNormalX * centerOffset;
    const centerOffsetY = unitNormalY * centerOffset;
    const start = [p1[0] + centerOffsetX, p1[1] + centerOffsetY];
    const end = [p2[0] + centerOffsetX, p2[1] + centerOffsetY];
    const coords = [...start, ...end];
    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
