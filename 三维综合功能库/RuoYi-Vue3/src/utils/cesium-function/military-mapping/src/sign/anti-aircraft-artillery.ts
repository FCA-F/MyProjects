//防空炮兵
import Base from '../base';
// @ts-ignore
import { Cartesian3 } from 'cesium';
import { LineStyle } from '../interface';

export default class NavyBattleTeam extends Base {
  points: Cartesian3[] = [];
  rectLengthRatio:number;
  rectWidthRatio:number
  bar1WidthRatio: number;
  minPointsForShape: number;

  constructor(cesium: any, viewer: any, style?: LineStyle & { outlineWidth?: number; outlineMaterial?: any }) {
    super(cesium, viewer, {
      ...style,
      material: style?.outlineMaterial || style?.material,
      lineWidth: style?.outlineWidth || style?.lineWidth || 6,
    });
    this.cesium = cesium;
    this.rectLengthRatio=0.5;
    this.rectWidthRatio=1
    this.bar1WidthRatio = 0.6;
    this.minPointsForShape = 2;
    this.setState('drawing');
  }

  getType(): 'polygon' | 'line' {
    return 'line';
  }

  addPoint(cartesian: Cartesian3) {
    if (this.points.length < 2) {
      this.points.push(cartesian);
      this.onMouseMove();
    }

    if (this.points.length === 2) {
      const geometryPoints = this.createGraphic(this.points);
      this.setGeometryPoints(geometryPoints);
      this.drawLine();
      this.finishDrawing();
    }
  }

  updateMovingPoint(cartesian: Cartesian3) {
    const tempPoints = [...this.points, cartesian];
    const geometryPoints = this.createGraphic(tempPoints);
    this.setGeometryPoints(geometryPoints);
    this.drawLine();
  }

  updateDraggingPoint(cartesian: Cartesian3, index: number) {
    this.points[index] = cartesian;
    const geometryPoints = this.createGraphic(this.points);
    this.setGeometryPoints(geometryPoints);
    this.drawLine();
  }

  createGraphic(positions: Cartesian3[]) {
    if (positions.length < 2) {
      return [];
    }

    const [p1, p2] = positions.map(this.cartesianToLnglat);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return [];
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const normalX = -dirY;
    const normalY = dirX;

    const rectHalfLength=length/this.rectLengthRatio/2;

    const localPoints = [
      //矩形框
      [0,length],
      [-rectHalfLength,length],
      [-rectHalfLength,0],
      [rectHalfLength,0],
      [rectHalfLength,length],
      [0,length],
      //两斜线
      [0,length],
      [-rectHalfLength,0],
      [0,length],
      [rectHalfLength,0],
      [0,length],
      //内三角
      [0,length],
      [-rectHalfLength*0.8,length*0.2],
      [rectHalfLength*0.8,length*0.2],
    ];

    const coords: number[] = [];
    localPoints.forEach(([across, along]) => {
      const lng = p1[0] + dirX * along + normalX * across;
      const lat = p1[1] + dirY * along + normalY * across;
      coords.push(lng, lat);
    });

    return this.cesium.Cartesian3.fromDegreesArray(coords);
  }

  getPoints() {
    return this.points;
  }
}
