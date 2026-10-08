import FineArrow from './arrow/fine-arrow';
import AttackArrow from './arrow/attack-arrow';
import SwallowtailAttackArrow from './arrow/swallowtail-attack-arrow';
import SquadCombat from './arrow/squad-combat';
import SwallowtailSquadCombat from './arrow/swallowtail-squad-combat';
import StraightArrow from './arrow/straight-arrow';
import CurvedArrow from './arrow/curved-arrow';
import AssaultDirection from './arrow/assault-direction';
import DoubleArrow from './arrow/double-arrow';
import FreehandLine from './line/freehand-line';
import FreehandPolygon from './polygon/freehand-polygon';
import Curve from './line/curve';
import Ellipse from './polygon/ellipse';
import Lune from './polygon/lune';
import Reactangle from './polygon/rectangle';
import Triangle from './polygon/triangle';
import Polygon from './polygon/polygon';
import Circle from './polygon/circle';
import Sector from './polygon/sector';

//Sign
import Company from './sign/company';
import Battalion from './sign/battalion';
import Regiment from './sign/regiment';
import MissileTroops from './sign/missile-troops';
import EngineerTroops from './sign/engineer-troops';
import NavyBattleTeam from './sign/navy-battle-team';
import AirArmy from './sign/air-army';
import AntiAircraftArtillery from './sign/anti-aircraft-artillery'
import ReconPost from './sign/recon-post'
import CompanyLevelCommandPost from './sign/company-level-command-post'
import TemporaryCommandPost from './sign/temporary-command-post'
import Tank from './sign/tank'
import TankUnits from './sign/tank-units'
import Signalman from './sign/signalman'
import Drone from './sign/drone'
import UnmannedAerialVehicle from './sign/unmanned-aerial-vehicle'
import Medic from './sign/medic'
import Plane from './sign/plane'
import Helicopter from './sign/helicopter'
import CommandPost from './sign/command-post'
import ArmoredCar from './sign/armored-car'
import Artillery from './sign/artillery'
import RocketLauncher from './sign/rocket-launcher'
import RocketForces from './sign/rocket-forces'
import Brigade from './sign/brigade'
import Division from './sign/division'
import Army from './sign/army'
import Infantry from './sign/infantry'
import Destination from './sign/destination'
import ReconTroops from './sign/recon-troops'
import AirborneTroops from './sign/airborne-troops'
import Radar from './sign/radar'
import Navy from './sign/navy'
import OccupiedArea from './sign/occupied-area'
import PreOccupiedArea from './sign/pre-occupied-area'
import DefenseLine from './sign/defense-line'

import { GeometryStyle } from './interface';
import * as CesiumTypeOnly from 'cesium';

const CesiumPlot: any = {
  FineArrow,
  AttackArrow,
  SwallowtailAttackArrow,
  SquadCombat,
  SwallowtailSquadCombat,
  StraightArrow,
  CurvedArrow,
  AssaultDirection,
  DoubleArrow,
  FreehandLine,
  FreehandPolygon,
  Curve,
  Ellipse,
  Lune,
  Reactangle,
  Triangle,
  Polygon,
  Circle,
  Sector,
  Company,
  Battalion,
  Regiment,
  MissileTroops,
  EngineerTroops,
  NavyBattleTeam,
  AirArmy,
  AntiAircraftArtillery,
  ReconPost,
  CompanyLevelCommandPost,
  TemporaryCommandPost,
  Tank,
  TankUnits,
  Signalman,
  Drone,
  UnmannedAerialVehicle,
  Medic,
  Plane,
  Helicopter,
  CommandPost,
  ArmoredCar,
  Artillery,
  RocketLauncher,
  RocketForces,
  Brigade,
  Division,
  Army,
  Infantry,
  Destination,
  ReconTroops,
  AirborneTroops,
  Radar,
  Navy,
  OccupiedArea,
  PreOccupiedArea,
  DefenseLine
};

type CreateGeometryFromDataOpts = {
  type: string;
  cartesianPoints: CesiumTypeOnly.Cartesian3[];
  style: GeometryStyle;
};
/**
 * 根据点位数据生成几何图形
 * @param points
 */
CesiumPlot.createGeometryFromData = (cesium: any, viewer: any, opts: CreateGeometryFromDataOpts) => {
  const { type, style, cartesianPoints } = opts;
  const geometry = new CesiumPlot[type](cesium, viewer, style);

  geometry.points = cartesianPoints;
  const geometryPoints = geometry.createGraphic(cartesianPoints);
  geometry.setGeometryPoints(geometryPoints);
  if (geometry.type == 'polygon') {
    geometry.drawPolygon();
  } else {
    geometry.drawLine();
  }
  geometry.finishDrawing();
  geometry.onClick();
  return geometry;
};

export default CesiumPlot;
