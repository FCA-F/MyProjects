<template>
    <CoordinateMeasurement v-if="twoMenu=='CoordinateMeasurement'"/>
    <DistanceMeasurement v-else-if="twoMenu=='DistanceMeasurement'"/>
    <AreaMeasurement v-else-if="twoMenu=='AreaMeasurement'"/>
</template>

<script setup lang="ts">
    import CoordinateMeasurement from './Measurement/CoordinateMeasurement.vue'
    import DistanceMeasurement from './Measurement/DistanceMeasurement.vue'
    import AreaMeasurement from './Measurement/AreaMeasurement.vue'
    
    const {twoMenu}=defineProps<{twoMenu:string}>();
</script>