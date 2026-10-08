//步兵
import Battalion from './battalion';
// @ts-ignore
import { Cartesian3 } from 'cesium';

export default class Infantry extends Battalion {
  crossHalfWidthRatio: number;
  crossHeightRatio: number;
  circleRadiusRatio: number;
  circleSegments: number;
  circleFillPoints: Cartesian3[] = [];
  circleFillEntity: any;

  constructor(cesium: any, viewer: any, style?: any) {
    super(cesium, viewer, style);
    this.crossHalfWidthRatio = 2.4;
    this.crossHeightRatio = 0.55;
    this.circleRadiusRatio = 13;
    this.circleSegments = 48;
  }

  createGraphic(positions: Cartesian3[]) {
    if (positions.length < 2) {
      this.geometryPointGroups = [];
      this.circleFillPoints = [];
      return [];
    }

    const [p1, p2] = positions.map(this.cartesianToLnglat);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      this.geometryPointGroups = [];
      this.circleFillPoints = [];
      return [];
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const normalX = -dirY;
    const normalY = dirX;
    const crossHalfWidth = length / this.crossHalfWidthRatio;
    const crossHeight = length * this.crossHeightRatio;
    const circleRadius = length / this.circleRadiusRatio;
    const circleCenter = length - circleRadius;
    const circleBottom = circleCenter - circleRadius;
    const circlePoints = this.createCirclePoints(p1, dirX, dirY, normalX, normalY, circleCenter, circleRadius);

    this.geometryPointGroups = [
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [0, 0],
        [0, circleBottom],
      ]),
      this.createLocalLinePoints(p1, dirX, dirY, normalX, normalY, [
        [-crossHalfWidth, crossHeight],
        [crossHalfWidth, crossHeight],
      ]),
      circlePoints,
    ];
    this.circleFillPoints = circlePoints;

    return this.geometryPointGroups[0];
  }

  drawLine() {
    super.drawLine();

    if (this.circleFillEntity || !this.circleFillPoints.length) {
      return;
    }

    const style = this.style as any;
    this.circleFillEntity = this.viewer.entities.add({
      polygon: {
        hierarchy: new this.cesium.CallbackProperty(() => {
          return new this.cesium.PolygonHierarchy(this.circleFillPoints);
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
    if (this.circleFillEntity) {
      this.circleFillEntity.show = true;
    }
  }

  hide(opts?: any) {
    super.hide(opts);
    if (this.circleFillEntity) {
      this.circleFillEntity.show = false;
    }
  }

  remove() {
    if (this.circleFillEntity) {
      this.viewer.entities.remove(this.circleFillEntity);
      this.circleFillEntity = undefined;
    }
    super.remove();
  }

  isCurrentEntity(id: string) {
    return super.isCurrentEntity(id) || this.circleFillEntity?.id === id;
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
