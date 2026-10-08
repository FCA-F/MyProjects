// Defense line
import Battalion from './battalion';
import * as Utils from '../utils';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class DefenseLine extends Battalion {
  toothSpacing: number;
  toothLengthRatio: number;
  minToothCount: number;
  maxToothCount: number;
  t: number;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.toothSpacing = 1000;
    this.toothLengthRatio = 1.4;
    this.minToothCount = 1;
    this.maxToothCount = 80;
    this.t = 0.3;
    this.onDoubleClick();
  }

  addPoint(cartesian: Cartesian3) {
    this.points.push(cartesian);
    if (this.points.length < 2) {
      this.onMouseMove();
    } else {
      const geometryPoints = this.createGraphic(this.points);
      this.setGeometryPoints(geometryPoints);
      this.drawLine();
    }
  }

  updateMovingPoint(cartesian: Cartesian3) {
    const tempPoints = [...this.points, cartesian];
    const geometryPoints = this.createGraphic(tempPoints);
    this.setGeometryPoints(geometryPoints);
    this.drawLine();
  }

  createGraphic(positions: Cartesian3[]) {
    if (positions.length < 2) {
      this.geometryPointGroups = [];
      return [];
    }

    const linePoints = this.createCurvePoints(positions);
    const length = this.getLineLength(linePoints);
    const meterLength = this.getLineMeterLength(linePoints);

    if (length === 0 || meterLength === 0) {
      this.geometryPointGroups = [];
      return [];
    }

    const toothCount = this.getToothCount(meterLength);
    const toothSpacing = (this.toothSpacing * length) / meterLength;
    const toothLength = toothSpacing / this.toothLengthRatio;
    const mainLine = this.lnglatPointsToCartesian(linePoints);
    const teeth = this.createTeethPointGroups(linePoints, length, toothLength, toothCount);

    this.geometryPointGroups = [mainLine, ...teeth];

    return this.geometryPointGroups[0];
  }

  drawLine() {
    super.drawLine();

    while (this.lineEntities.length > this.geometryPointGroups.length) {
      const entity = this.lineEntities.pop();
      this.viewer.entities.remove(entity);
    }

    const style = this.style as any;
    while (this.lineEntities.length < this.geometryPointGroups.length) {
      const index = this.lineEntities.length;
      const lineEntity = this.viewer.entities.add({
        polyline: {
          positions: new this.cesium.CallbackProperty(() => {
            return this.geometryPointGroups[index];
          }, false),
          width: style.lineWidth,
          material: style.material,
          clampToGround: true,
        },
      });

      this.lineEntities.push(lineEntity);
    }
  }

  finishDrawing() {
    if (this.points.length < this.minPointsForShape) {
      return;
    }

    super.finishDrawing();
  }

  private createCurvePoints(positions: Cartesian3[]) {
    const lnglatPoints = positions.map(this.cartesianToLnglat);
    if (lnglatPoints.length < 3) {
      return lnglatPoints;
    }

    return Utils.getCurvePoints(this.t, lnglatPoints);
  }

  private createTeethPointGroups(linePoints: number[][], lineLength: number, toothLength: number, toothCount: number) {
    const groups: Cartesian3[][] = [];
    const startLength = lineLength * 0.02;
    const endLength = lineLength * 0.98;

    for (let i = 0; i < toothCount; i += 1) {
      const t = toothCount === 1 ? 0.5 : i / (toothCount - 1);
      const position = this.getPointAtLength(linePoints, startLength + (endLength - startLength) * t);
      const base = position.point;
      const prev = position.prev;
      const next = position.next;
      const tangentX = next[0] - prev[0];
      const tangentY = next[1] - prev[1];
      const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
      const normalX = tangentY / tangentLength;
      const normalY = -tangentX / tangentLength;
      const tip = [base[0] + normalX * toothLength, base[1] + normalY * toothLength];

      groups.push(this.lnglatPointsToCartesian([base, tip]));
    }

    return groups;
  }

  private getPointAtLength(points: number[][], targetLength: number) {
    let currentLength = 0;

    for (let i = 1; i < points.length; i += 1) {
      const start = points[i - 1];
      const end = points[i];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (currentLength + segmentLength >= targetLength) {
        const t = segmentLength === 0 ? 0 : (targetLength - currentLength) / segmentLength;
        return {
          point: [start[0] + dx * t, start[1] + dy * t],
          prev: start,
          next: end,
        };
      }

      currentLength += segmentLength;
    }

    return {
      point: points[points.length - 1],
      prev: points[Math.max(points.length - 2, 0)],
      next: points[points.length - 1],
    };
  }

  private getToothCount(meterLength: number) {
    const count = Math.round(meterLength / this.toothSpacing);
    return Math.min(this.maxToothCount, Math.max(this.minToothCount, count));
  }

  private getLineLength(points: number[][]) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
      const dx = points[i][0] - points[i - 1][0];
      const dy = points[i][1] - points[i - 1][1];
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private getLineMeterLength(points: number[][]) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
      const current = this.cesium.Cartesian3.fromDegrees(points[i][0], points[i][1]);
      const previous = this.cesium.Cartesian3.fromDegrees(points[i - 1][0], points[i - 1][1]);
      length += this.cesium.Cartesian3.distance(current, previous);
    }
    return length;
  }

  private lnglatPointsToCartesian(points: number[][]) {
    const coords: number[] = [];
    points.forEach(([lng, lat]) => {
      coords.push(lng, lat);
    });

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }
}
