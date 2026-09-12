<template>
    <div class="right-toolbar">
        <ScreenShot />
        <SetView />
        <Remove />
        <RemoveEntities />
    </div>
</template>
<script setup lang="ts">
import ScreenShot from './functions/ScreenShot.vue'
import SetView from './functions/SetView.vue'
import RemoveEntities from './functions/RemoveAll.vue'
import Remove from './functions/Remove.vue'
</script>
<style scoped>
.right-toolbar {
    position: absolute;
    top: 90px;
    right: -120px;
    padding: 10px;
    display: flex;
    /*纵向弹性布局，子元素自动从上到下排列*/
    flex-direction: column;
    gap: 15px;
    /* 模块之间的间距，自动分配*/
    min-width: 220px;
}

:deep(.toolbar) {
    display: flex;
    flex-direction: column;
    color: white;
    gap: 5px
}

:deep(.functionBtn) {
    width: 70px;
}
</style>
