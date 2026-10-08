//临时指挥所
import Base from '../base';
// @ts-ignore
import { Cartesian3 } from 'cesium';
import { LineStyle } from '../interface';

export default class NavyBattleTeam extends Base {
  points: Cartesian3[] = [];
  //
    bar1WidthRatio:number
  //
  minPointsForShape: number;

  constructor(cesium: any, viewer: any, style?: LineStyle & { outlineWidth?: number; outlineMaterial?: any }) {
    super(cesium, viewer, {
      ...style,
      material: style?.outlineMaterial || style?.material,
      lineWidth: style?.outlineWidth || style?.lineWidth || 6,
    });
    this.cesium = cesium;
    //
    this.bar1WidthRatio=1.2    
    //
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

    const bar1Width=length/this.bar1WidthRatio
    const bar1=length*0.6

    const localPoints = [
      [0,length],
      [0,bar1],
      [-bar1Width,bar1],
      [0,length],
      [0,0]
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
