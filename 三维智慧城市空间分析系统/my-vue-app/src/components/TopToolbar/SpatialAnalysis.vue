<template>
    <SunlightAnalysis v-if="twoMenu=='SunlightAnalysis'" />
    <InundationAnalysis v-else-if="twoMenu=='InundationAnalysis'"/>
    <VisibilityAnalysis v-else-if="twoMenu=='VisibilityAnalysis'"/>
    <BufferAnalysis v-else-if="twoMenu=='BufferAnalysis'"/>
</template>
<script setup lang="ts">

import SunlightAnalysis from './SpatialAnalysis/SunlightAnalysis.vue'
import InundationAnalysis from './SpatialAnalysis/InundationAnalysis.vue'
import VisibilityAnalysis from './SpatialAnalysis/VisibilityAnalysis.vue'
import BufferAnalysis from './SpatialAnalysis/BufferAnalysis.vue'

const {twoMenu}=defineProps<{twoMenu:string}>();

</script>
<style scoped>
</style>