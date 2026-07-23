<template>
    <SunlightAnalysis v-if="twoMenu=='SunlightAnalysis'" />
    <InundationAnalysis v-else-if="twoMenu=='InundationAnalysis'" :threeMenu="threeMenu"/>
    <VisibilityAnalysis v-else-if="twoMenu=='VisibilityAnalysis'"/>
    <BufferAnalysis v-else-if="twoMenu=='BufferAnalysis'"/>
    <Mask v-else-if="twoMenu=='Mask'"/>
</template>
<script setup lang="ts">

import SunlightAnalysis from './SpatialAnalysis/SunlightAnalysis.vue'
import InundationAnalysis from './SpatialAnalysis/InundationAnalysis.vue'
import VisibilityAnalysis from './SpatialAnalysis/VisibilityAnalysis.vue'
import BufferAnalysis from './SpatialAnalysis/BufferAnalysis.vue'
import Mask from './SpatialAnalysis/Mask.vue'

const {twoMenu,threeMenu}=defineProps<{twoMenu:string,threeMenu:string}>();

</script>
<style scoped>
</style>