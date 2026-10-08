// Destination
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Destination extends Battalion {
  innerRadiusRatio: number;
  diagonalInsetRatio: number;
  circleSegments: number;
  innerCircleFillPoints: Cartesian3[] = [];
  innerCircleFillEntity: any;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.innerRadiusRatio = 12;
    this.diagonalInsetRatio = Math.SQRT2;
    this.circleSegments = 64;
  }

  createGraphic(positions: Cartesian3[]) {
    if (positions.length < 2) {
      this.geometryPointGroups = [];
      this.innerCircleFillPoints = [];
      return [];
    }

    const [p1, p2] = positions.map(this.cartesianToLnglat);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      this.geometryPointGroups = [];
      this.innerCircleFillPoints = [];
      return [];
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const normalX = -dirY;
    const normalY = dirX;
    const radius = length / 2;
    const centerAlong = length / 2;
    const innerRadius = length / this.innerRadiusRatio;
    const diagonalOffset = radius / this.diagonalInsetRatio;
    const innerCirclePoints = this.createCirclePoints(p1, dirX, dirY, normalX, normalY, centerAlong, innerRadius);

    this.geometryPointGroups = [
      this.createCirclePoints(p1, dirX, dirY, normalX, normalY, centerAlong, radius),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-diagonalOffset, centerAlong + diagonalOffset],
        [diagonalOffset, centerAlong - diagonalOffset],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [diagonalOffset, centerAlong + diagonalOffset],
        [-diagonalOffset, centerAlong - diagonalOffset],
      ]),
      innerCirclePoints,
    ];
    this.innerCircleFillPoints = innerCirclePoints;

    return this.geometryPointGroups[0];
  }

  drawLine() {
    super.drawLine();

    if (this.innerCircleFillEntity || !this.innerCircleFillPoints.length) {
      return;
    }

    const style = this.style as any;
    this.innerCircleFillEntity = this.viewer.entities.add({
      polygon: {
        hierarchy: new this.cesium.CallbackProperty(() => {
          return new this.cesium.PolygonHierarchy(this.innerCircleFillPoints);
        }, false),
        material: style.material,
      },
    });
  }

  onClick() {
    this.eventHandler = new this.cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.eventHandler.setInputAction((evt: any) => {
      const pickedObject = this.viewer.scene.pick(evt.position);
      const hitEntities = this.cesium.defined(pickedObject) && pickedObject.id instanceof this.cesium.Entity;

      if (this.state === 'drawing') {
        const cartesian = this.pixelToCartesian(evt.position);
        const points = this.getPoints();

        if (!cartesian) {
          return;
        }

        if (!this.freehand && points.length > 0 && !this.checkDistance(cartesian, points[points.length - 1])) {
          return;
        }

        this.addPoint(cartesian);

        if (this.getPoints().length === 1) {
          this.eventDispatcher.dispatchEvent('drawStart');
        }
        this.eventDispatcher.dispatchEvent('drawUpdate', cartesian);
      } else if (this.state === 'edit') {
        if (!hitEntities || !this.isCurrentEntity(pickedObject.id.id)) {
          this.setState('static');
          this.removeControlPoints();
          this.disableDrag();
          this.eventDispatcher.dispatchEvent('editEnd', this.getPoints());
        }
      } else if (this.state === 'static') {
        if (hitEntities && this.isCurrentEntity(pickedObject.id.id)) {
          const pickedGraphics = pickedObject.id.polyline || pickedObject.id.polygon;
          if (this.cesium.defined(pickedGraphics)) {
            this.setState('edit');
            this.addControlPoints();
            this.draggable();
            this.eventDispatcher.dispatchEvent('editStart');
          }
        }
      }
    }, this.cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  show(opts?: any) {
    super.show(opts);
    if (this.innerCircleFillEntity) {
      this.innerCircleFillEntity.show = true;
    }
  }

  hide(opts?: any) {
    super.hide(opts);
    if (this.innerCircleFillEntity) {
      this.innerCircleFillEntity.show = false;
    }
  }

  remove() {
    if (this.innerCircleFillEntity) {
      this.viewer.entities.remove(this.innerCircleFillEntity);
      this.innerCircleFillEntity = undefined;
    }
    super.remove();
  }

  isCurrentEntity(id: string) {
    return super.isCurrentEntity(id) || this.innerCircleFillEntity?.id === id;
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
}
