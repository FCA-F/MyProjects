<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="军事标绘" :initialLeft="0" :initialTop="0" :isMove="false">
            <div v-for="group in drawGroups" :key="group.title" class="group">
                <div class="group-title">{{ group.title }}</div>
                <div class="button-wrap">
                    <el-button v-for="item in group.items" :key="item.key" size="small" class="tool-btn" color="#1E88E5"
                        @click="startDraw(item.key)">
                        {{ item.label }}
                    </el-button>
                </div>
            </div>
            <div class="action-row">
                <el-button class="clear-btn" @click="clearDraw" color="red">清空全部</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import MilitaryMapping from '@/utils/cesium-function/military-mapping/src/index'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let geometries: any[] = []
const militaryBlue = Cesium.Color.fromCssColorString('rgba(96, 165, 250, 1)')

type DrawKey =
    | 'FineArrow'
    | 'AttackArrow'
    | 'SwallowtailAttackArrow'
    | 'SquadCombat'
    | 'SwallowtailSquadCombat'
    | 'StraightArrow'
    | 'CurvedArrow'
    | 'AssaultDirection'
    | 'DoubleArrow'
    | 'FreehandLine'
    | 'FreehandPolygon'
    | 'Curve'
    | 'Ellipse'
    | 'Lune'
    | 'Reactangle'
    | 'Triangle'
    | 'Polygon'
    | 'Circle'
    | 'Sector'
    | 'Company'
    | 'Battalion'
    | 'Regiment'
    | 'MissileTroops'
    | 'EngineerTroops'
    | 'NavyBattleTeam'
    | 'AirArmy'
    | 'AntiAircraftArtillery'
    | 'ReconPost'
    | 'CompanyLevelCommandPost'
    | 'TemporaryCommandPost'
    | 'Tank'
    | 'TankUnits'
    | 'Signalman'
    | 'Drone'
    | 'UnmannedAerialVehicle'
    | 'Medic'
    | 'Plane'
    | 'Helicopter'
    | 'CommandPost'
    | 'ArmoredCar'
    | 'Artillery'
    | 'RocketLauncher'
    | 'RocketForces'
    | 'Brigade'
    | 'Division'
    | 'Army'
    | 'Infantry'
    | 'Destination'
    | 'ReconTroops'
    | 'AirborneTroops'
    | 'Radar'
    | 'Navy'
    | 'OccupiedArea'
    | 'PreOccupiedArea'
    | 'DefenseLine'

const drawGroups: { title: string; items: { key: DrawKey; label: string }[] }[] = [
    {
        title: '箭头',
        items: [
            { key: 'FineArrow', label: '细箭头' },
            { key: 'AttackArrow', label: '攻击箭头' },
            { key: 'SwallowtailAttackArrow', label: '燕尾攻击箭头' },
            { key: 'SquadCombat', label: '分队战斗' },
            { key: 'SwallowtailSquadCombat', label: '燕尾分队战斗' },
            { key: 'StraightArrow', label: '直箭头' },
            { key: 'CurvedArrow', label: '曲箭头' },
            { key: 'AssaultDirection', label: '突击方向' },
            { key: 'DoubleArrow', label: '双箭头' },
        ],
    },
    {
        title: '线面',
        items: [
            { key: 'FreehandLine', label: '自由线' },
            { key: 'FreehandPolygon', label: '自由面' },
            { key: 'Curve', label: '曲线' },
            { key: 'Ellipse', label: '椭圆' },
            { key: 'Lune', label: '半月形' },
            { key: 'Reactangle', label: '矩形' },
            { key: 'Triangle', label: '三角形' },
            { key: 'Polygon', label: '多边形' },
            { key: 'Circle', label: '圆形' },
            { key: 'Sector', label: '扇形' },

        ],
    },
    {
        title: '标号',
        items: [
            { key: 'Company', label: '连' },
            { key: 'Battalion', label: '营' },
            { key: 'Regiment', label: '团' },
            { key: 'Brigade', label: '旅' },
            { key: 'Division', label: '师' },
            { key: 'Army', label: '集团军' },
            { key: 'Infantry', label: '步兵' },
            { key: 'Tank', label: '坦克' },
            { key: 'TankUnits', label: '坦克分队' },
            { key: 'Artillery', label: '炮兵' },
            { key: 'RocketLauncher', label: '火箭发射车' },
            { key: 'RocketForces', label: '火箭部队' },
            { key: 'MissileTroops', label: '导弹部队' },
            { key: 'EngineerTroops', label: '工兵部队' },
            { key: 'NavyBattleTeam', label: '海军战斗群' },
            { key: 'Navy', label: '海军' },
            { key: 'AirArmy', label: '空军' },
            { key: 'AirborneTroops', label: '空降兵' },
            { key: 'AntiAircraftArtillery', label: '高炮' },
            { key: 'ReconPost', label: '侦察所' },
            { key: 'ReconTroops', label: '侦察部队' },
            { key: 'CompanyLevelCommandPost', label: '连级指挥所' },
            { key: 'TemporaryCommandPost', label: '临时指挥所' },
            { key: 'CommandPost', label: '指挥所' },
            { key: 'ArmoredCar', label: '装甲车' },
            { key: 'Signalman', label: '通信员' },
            { key: 'Drone', label: '无人机' },
            { key: 'UnmannedAerialVehicle', label: '无人机平台' },
            { key: 'Medic', label: '医务兵' },
            { key: 'Plane', label: '飞机' },
            { key: 'Helicopter', label: '直升机' },
            { key: 'Destination', label: '目的地' },
            { key: 'Radar', label: '雷达' },
            { key: 'OccupiedArea', label: '占领区' },
            { key: 'PreOccupiedArea', label: '预占领区' },
            { key: 'DefenseLine', label: '防线' },
        ],
    },
]

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    initCesiumBase(viewer, {
        destination: { lng: 114.200232, lat: 31.278762, height: 2000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
    })
}

const startDraw = (key: DrawKey) => {
    if (!viewer) {
        return
    }

    const GeometryCtor = MilitaryMapping[key] as new (cesium: typeof Cesium, viewer: Cesium.Viewer, style?: any) => any
    const geometry = new GeometryCtor(Cesium, viewer, {
        material: militaryBlue,
        outlineMaterial: militaryBlue,
        lineWidth: 3,
        outlineWidth: 3,
    })
    geometries.push(geometry)
}

const clearDraw = () => {
    geometries.forEach((geometry) => geometry?.remove?.())
    geometries = []
}

onBeforeUnmount(() => {
    clearDraw()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}

.group {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 0px;
}

.group-title {
    flex: 0 0 36px;
    line-height: 32px;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    white-space: nowrap;
}

.button-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
}

.tool-btn {
    height: 28px;
    padding: 0 10px;
}

.action-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
}

.clear-btn {
    height: 28px;
    padding: 0 12px;
}
</style>
