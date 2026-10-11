<template>
    <section class="drone-page">
        <div class="drone-shell">
            <div class="drone-mark">
                <el-icon>
                    <Position />
                </el-icon>
            </div>

            <span class="eyebrow">AERIAL INTELLIGENCE</span>
            <h1>无人机飞行</h1>
            <p>飞行任务、巡检轨迹与空中影像能力正在接入城市运行平台。</p>

            <div class="status-line">
                <span class="status-dot"></span>
                <span>模块接入中</span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { Position } from '@element-plus/icons-vue'
</script>

<style scoped>
.drone-page {
    display: grid;
    width: 100%;
    height: 100%;
    min-height: 0;
    place-items: center;
    overflow: auto;
    background: #edf3f6;
}

.drone-shell {
    width: min(520px, calc(100% - 40px));
    padding: 42px 38px;
    border: 1px solid #d9e6ec;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 18px 42px rgba(16, 42, 67, 0.1);
    text-align: center;
}

.drone-mark {
    display: inline-flex;
    width: 64px;
    height: 64px;
    align-items: center;
    justify-content: center;
    border: 1px solid #acd9e1;
    border-radius: 14px;
    background: #e8f6f7;
    color: #347eea;
    font-size: 30px;
}

.eyebrow {
    margin: 24px 0 8px;
    color: #5d9ca4;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
}

h1 {
    margin: 0;
    color: #183b5b;
    font-size: 28px;
}

p {
    margin: 12px auto 0;
    color: #71879a;
    font-size: 13px;
    line-height: 1.8;
}

.status-line {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 24px;
    padding: 7px 12px;
    border: 1px solid #eadfc8;
    border-radius: 5px;
    background: #fffaf0;
    color: #a17f42;
    font-size: 12px;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #e3a34d;
    box-shadow: 0 0 8px rgba(227, 163, 77, 0.68);
}
</style>
