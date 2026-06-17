<template>
    <div class="left-toolbar">
        <Layer/>
        <BuildingRender/>
    </div>
    
</template>
<script setup lang="ts">
    import BuildingRender from './LeftToolbar/BuildingRender.vue'
    import Layer from './LeftToolbar/Layer.vue'
    
</script>
<style scoped>
    .left-toolbar{
    position: absolute;
    top:100px;
    left:10px;
    background-color:#ffffff;
    padding:16px;/* 加大内边距，内部组件不贴边 */
    display:flex;
    flex-direction:column;
    color:black;
    gap:18px;/* 模块间距微调，更舒展 */
    border-radius: 8px;/* 圆角边角，告别直角生硬 */
    border: 1px solid #E4E7ED;/* 浅灰细边框，低调精致 */
}
</style>