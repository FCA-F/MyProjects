<template>
    <aside class="roaming-help" :class="{ 'is-collapsed': isCollapsed }">
        <div class="help-header">
            <div class="help-title">
                <span class="title-icon">
                    <el-icon>
                        <VideoCamera />
                    </el-icon>
                </span>
                <div>
                    <strong>城市漫游</strong>
                    <span>自由探索三维城市场景</span>
                </div>
            </div>

            <el-tooltip :content="isCollapsed ? '展开操作面板' : '收起操作面板'" placement="right">
                <el-button
                    class="collapse-button"
                    text
                    circle
                    :aria-label="isCollapsed ? '展开操作面板' : '收起操作面板'"
                    @click="isCollapsed = !isCollapsed"
                >
                    <el-icon>
                        <ArrowRight v-if="isCollapsed" />
                        <ArrowLeft v-else />
                    </el-icon>
                </el-button>
            </el-tooltip>
        </div>

        <template v-if="!isCollapsed">
            <div class="scene-status">
                <span class="status-dot"></span>
                <span>漫游模式</span>
                <i></i>
                <span>场景已就绪</span>
            </div>

            <div class="help-section">
                <div class="section-label">
                    <el-icon>
                        <Promotion />
                    </el-icon>
                    <span>移动控制</span>
                </div>

                <div class="movement-layout">
                    <span class="keycap keycap-w">W</span>
                    <span class="keycap keycap-a">A</span>
                    <span class="keycap keycap-s">S</span>
                    <span class="keycap keycap-d">D</span>
                </div>
                <p class="section-hint">控制角色前后左右移动</p>
            </div>

            <div class="help-divider"></div>

            <div class="help-section">
                <div class="section-label">
                    <el-icon>
                        <Mouse />
                    </el-icon>
                    <span>视角控制</span>
                </div>

                <div class="control-list">
                    <div class="control-row">
                        <span class="mouse-icon">
                            <el-icon>
                                <Mouse />
                            </el-icon>
                        </span>
                        <span>拖动鼠标</span>
                        <small>旋转视角</small>
                    </div>
                    <div class="control-row">
                        <span class="mouse-icon mouse-scroll-icon" role="img" aria-label="滚轮">
                            <el-icon>
                                <Mouse />
                            </el-icon>
                            <span class="scroll-wheel-mark"></span>
                        </span>
                        <span>调整距离</span>
                        <small>拉近 / 拉远</small>
                    </div>
                </div>
            </div>

            <div class="help-shortcuts">
                <div class="shortcut-item">
                    <span class="keycap keycap-wide">Shift</span>
                    <span>加速奔跑</span>
                </div>
                <div class="shortcut-item">
                    <span class="keycap keycap-space">Space</span>
                    <span>跳跃</span>
                </div>
            </div>

            <div class="help-footer">
                <el-icon>
                    <InfoFilled />
                </el-icon>
                <span>点击场景后即可开始漫游</span>
            </div>
        </template>
    </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    ArrowLeft,
    ArrowRight,
    InfoFilled,
    Mouse,
    Promotion,
    VideoCamera,
} from '@element-plus/icons-vue'

const isCollapsed = ref(false)
</script>

<style scoped>
.roaming-help {
    --roaming-navy: #102a43;
    --roaming-blue: #347eea;
    --roaming-cyan: #45c4b0;
    position: absolute;
    top: 22px;
    left: 22px;
    z-index: 4;
    width: 270px;
    overflow: hidden;
    border: 1px solid rgba(126, 221, 224, 0.48);
    border-radius: 10px;
    background: rgba(7, 29, 49, 0.84);
    box-shadow:
        0 14px 34px rgba(3, 22, 39, 0.28),
        0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    backdrop-filter: blur(13px);
    color: #e7f6fb;
    pointer-events: auto;
    transition:
        width 0.2s ease,
        background-color 0.2s ease,
        box-shadow 0.2s ease;
}

.roaming-help::before {
    position: absolute;
    top: 0;
    right: 20px;
    left: 20px;
    height: 2px;
    background: var(--roaming-cyan);
    box-shadow: 0 0 12px rgba(69, 196, 176, 0.9);
    content: '';
}

.roaming-help.is-collapsed {
    width: 46px;
    border-color: rgba(126, 221, 224, 0.58);
    background: rgba(7, 29, 49, 0.9);
}

.help-header {
    display: flex;
    min-height: 62px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 12px 10px;
}

.help-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 9px;
}

.title-icon {
    display: inline-flex;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(126, 221, 224, 0.42);
    border-radius: 8px;
    background: rgba(52, 126, 234, 0.2);
    color: #8cdded;
}

.title-icon :deep(svg) {
    width: 17px;
    height: 17px;
}

.help-title strong,
.help-title div > span {
    display: block;
}

.help-title strong {
    color: #f3fbff;
    font-size: 14px;
    font-weight: 700;
}

.help-title div > span {
    margin-top: 3px;
    overflow: hidden;
    color: #99b8c9;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.collapse-button {
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    margin: 0;
    color: #a8d6df;
}

.collapse-button:hover,
.collapse-button:focus-visible {
    background: rgba(69, 196, 176, 0.16);
    color: #e7ffff;
}

.is-collapsed .help-header {
    justify-content: center;
    padding: 12px 8px;
}

.is-collapsed .help-title {
    display: none;
}

.is-collapsed .collapse-button {
    margin: 0;
}

.scene-status {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 12px 12px;
    padding: 7px 9px;
    border: 1px solid rgba(126, 221, 224, 0.22);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.06);
    color: #b9d4df;
    font-size: 10px;
}

.scene-status i {
    width: 1px;
    height: 12px;
    margin: 0 2px;
    background: rgba(190, 228, 236, 0.28);
}

.status-dot {
    width: 6px;
    height: 6px;
    border: 2px solid rgba(130, 241, 219, 0.36);
    border-radius: 50%;
    background: var(--roaming-cyan);
    box-shadow: 0 0 8px rgba(69, 196, 176, 0.95);
}

.help-section {
    padding: 0 14px;
}

.section-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: #e8f8fc;
    font-size: 11px;
    font-weight: 700;
}

.section-label :deep(.el-icon) {
    color: #70d2d1;
    font-size: 14px;
}

.movement-layout {
    display: grid;
    width: 88px;
    grid-template-columns: repeat(3, 26px);
    grid-template-rows: repeat(2, 26px);
    gap: 4px;
    margin: 0 auto 7px;
}

.movement-layout .keycap {
    display: flex;
    align-items: center;
    justify-content: center;
}

.keycap-w {
    grid-column: 2;
    grid-row: 1;
}

.keycap-a {
    grid-column: 1;
    grid-row: 2;
}

.keycap-s {
    grid-column: 2;
    grid-row: 2;
}

.keycap-d {
    grid-column: 3;
    grid-row: 2;
}

.keycap {
    display: inline-flex;
    width: 26px;
    height: 26px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border: 1px solid rgba(149, 215, 226, 0.4);
    border-bottom-color: rgba(70, 130, 151, 0.9);
    border-radius: 5px;
    background: linear-gradient(180deg, rgba(52, 126, 234, 0.5), rgba(17, 67, 105, 0.78));
    box-shadow:
        0 2px 0 rgba(5, 24, 41, 0.7),
        0 0 9px rgba(52, 126, 234, 0.15);
    color: #f2fcff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
}

.keycap-wide {
    width: 56px;
    padding: 0 5px;
    font-size: 9px;
}

.keycap-space {
    width: 66px;
    padding: 0 5px;
    font-size: 9px;
}

.section-hint {
    margin: 0;
    color: #9bb7c5;
    font-size: 10px;
    text-align: center;
}

.help-divider {
    height: 1px;
    margin: 14px;
    background: linear-gradient(90deg, transparent, rgba(126, 221, 224, 0.25), transparent);
}

.control-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.control-row {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) auto;
    min-height: 26px;
    align-items: center;
    gap: 7px;
    color: #d8edf2;
    font-size: 10px;
}

.control-row small {
    color: #82a5b6;
    font-size: 9px;
}

.mouse-icon {
    display: inline-flex;
    width: 26px;
    height: 26px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(149, 215, 226, 0.3);
    border-radius: 5px;
    background: rgba(69, 196, 176, 0.13);
    color: #7dd8d0;
}

.mouse-icon :deep(svg) {
    width: 14px;
    height: 14px;
}

.mouse-scroll-icon {
    position: relative;
    overflow: hidden;
}

.mouse-scroll-icon :deep(svg) {
    color: #8adfd8;
}

.scroll-wheel-mark {
    position: absolute;
    top: 8px;
    left: 50%;
    width: 3px;
    height: 6px;
    border-radius: 3px;
    background: #d8fffa;
    box-shadow:
        0 -4px 0 -1px rgba(216, 255, 250, 0.7),
        0 4px 0 -1px rgba(216, 255, 250, 0.7);
    transform: translateX(-50%);
}

.help-shortcuts {
    display: flex;
    gap: 8px;
    margin: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(126, 221, 224, 0.16);
}

.shortcut-item {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 6px;
    color: #b9d4df;
    font-size: 9px;
}

.help-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    border-top: 1px solid rgba(126, 221, 224, 0.16);
    background: rgba(2, 18, 32, 0.24);
    color: #89b5c3;
    font-size: 9px;
}

.help-footer :deep(.el-icon) {
    flex: 0 0 auto;
    color: #70d2d1;
}

@media (max-width: 700px) {
    .roaming-help {
        top: 12px;
        left: 12px;
        width: 250px;
    }

    .roaming-help.is-collapsed {
        width: 44px;
    }

    .control-row {
        grid-template-columns: 26px 1fr;
    }

    .control-row small {
        display: none;
    }
}
</style>
