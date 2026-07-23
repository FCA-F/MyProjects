<template>
    <div class="right-toolbar">
        <ScreenShot/>
        <SetView/>
        <Remove/>
        <RemoveEntities/>
    </div>
</template>
<script setup lang="ts">
    import ScreenShot from './RightToolbar/ScreenShot.vue'
    import SetView from './RightToolbar/SetView.vue'
    import RemoveEntities from './RightToolbar/RemoveAll.vue'
    import Remove from './RightToolbar/Remove.vue'
</script>
<style scoped> 
    .right-toolbar{
        position: absolute;top:90px;right:-120px;
        padding:10px;
        display:flex;/*纵向弹性布局，子元素自动从上到下排列*/
        flex-direction:column;
        gap:15px;/* 模块之间的间距，自动分配*/
        min-width:220px;
    }
    :deep(.toolbar){display:flex;flex-direction:column;color:white;gap:5px}
    :deep(.functionBtn){width:70px;}

</style>
