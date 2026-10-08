// Battalion
import Base from '../base';
// @ts-ignore
import { Cartesian3 } from 'cesium';
import { LineStyle, VisibleAnimationOpts } from '../interface';

export default class Battalion extends Base {
  points: Cartesian3[] = [];
  lengthWidthRatio: number;
  gapWidthRatio: number;
  minPointsForShape: number;
  geometryPointGroups: Cartesian3[][] = [];
  lineEntities: any[] = [];

  constructor(cesium: any, viewer: any, style?: LineStyle & { outlineWidth?: number; outlineMaterial?: any }) {
    super(cesium, viewer, {
      ...style,
      material: style?.outlineMaterial || style?.material,
      lineWidth: style?.outlineWidth || style?.lineWidth || 6,
    });
    this.cesium = cesium;
    this.lengthWidthRatio = 12;
    this.gapWidthRatio = 4;
    this.minPointsForShape = 2;
    this.setState('drawing');
  }

  getType(): 'polygon' | 'line' {
    return 'line';
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
          const pickedGraphics = pickedObject.id.polyline;
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
    const halfGap = lineGap / 2;

    this.geometryPointGroups = [
      this.createLinePoints(p1, p2, unitNormalX, unitNormalY, halfGap),
      this.createLinePoints(p1, p2, unitNormalX, unitNormalY, -halfGap),
    ];

    return this.geometryPointGroups[0];
  }

  drawLine() {
    if (!this.geometryPointGroups.length) {
      return;
    }

    if (this.lineEntities.length) {
      return;
    }

    const style = this.style as LineStyle;
    this.geometryPointGroups.forEach((_, index) => {
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
    });

    this.lineEntity = this.lineEntities[0];
  }

  draggable() {
    let dragging = false;
    let startPosition: Cartesian3 | undefined;
    this.dragEventHandler = new this.cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.dragEventHandler.setInputAction((event: any) => {
      const pickRay = this.viewer.scene.camera.getPickRay(event.position);
      if (pickRay) {
        const cartesian = this.viewer.scene.globe.pick(pickRay, this.viewer.scene);
        const pickedObject = this.viewer.scene.pick(event.position);
        if (this.cesium.defined(pickedObject) && pickedObject.id instanceof this.cesium.Entity) {
          const clickedEntity = pickedObject.id;
          if (this.isCurrentEntity(clickedEntity.id)) {
            dragging = true;
            startPosition = cartesian;
            this.viewer.scene.screenSpaceCameraController.enableRotate = false;
          }
        }
      }
    }, this.cesium.ScreenSpaceEventType.LEFT_DOWN);

    this.dragEventHandler.setInputAction((event: any) => {
      if (dragging && startPosition) {
        const newPosition = this.pixelToCartesian(event.endPosition);
        if (newPosition) {
          const translation = this.cesium.Cartesian3.subtract(newPosition, startPosition, new this.cesium.Cartesian3());
          this.points = this.points.map((point) => {
            return this.cesium.Cartesian3.add(point, translation, new this.cesium.Cartesian3());
          });
          const geometryPoints = this.createGraphic(this.points);
          this.setGeometryPoints(geometryPoints);
          this.getControlPointEntities().forEach((pointEntity: any) => {
            const position = pointEntity.position?.getValue(this.cesium.JulianDate.now());
            const nextPosition = this.cesium.Cartesian3.add(position, translation, new this.cesium.Cartesian3());
            pointEntity.position?.setValue(nextPosition);
          });
          startPosition = newPosition;
        }
      } else {
        const pickRay = this.viewer.scene.camera.getPickRay(event.endPosition);
        if (pickRay) {
          const pickedObject = this.viewer.scene.pick(event.endPosition);
          if (this.cesium.defined(pickedObject) && pickedObject.id instanceof this.cesium.Entity) {
            const clickedEntity = pickedObject.id;
            this.viewer.scene.canvas.style.cursor = this.isCurrentEntity(clickedEntity.id) ? 'move' : 'default';
          } else {
            this.viewer.scene.canvas.style.cursor = 'default';
          }
        }
      }
    }, this.cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.dragEventHandler.setInputAction(() => {
      dragging = false;
      startPosition = undefined;
      this.viewer.scene.screenSpaceCameraController.enableRotate = true;
    }, this.cesium.ScreenSpaceEventType.LEFT_UP);
  }

  show(_opts?: VisibleAnimationOpts) {
    this.setEntitiesVisible(true);
    this.setState('static');
  }

  hide(_opts?: VisibleAnimationOpts) {
    this.setEntitiesVisible(false);
    this.setState('hidden');
  }

  remove() {
    this.lineEntities.forEach((entity) => this.viewer.entities.remove(entity));
    this.lineEntities = [];
    this.lineEntity = undefined as any;
    this.removeClickListener();
    this.removeMoveListener();
    this.removeDoubleClickListener();
    this.removeControlPoints();
  }

  isCurrentEntity(id: string) {
    return this.lineEntities.some((entity) => entity.id === id);
  }

  getPoints() {
    return this.points;
  }

  private createLinePoints(
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

  private setEntitiesVisible(visible: boolean) {
    this.lineEntities.forEach((entity) => {
      entity.show = visible;
    });
  }

  private getControlPointEntities() {
    return Array.isArray(this.controlPoints) ? this.controlPoints : this.controlPoints.values;
  }
}
