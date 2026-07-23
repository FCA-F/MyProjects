<template>
    <InundationAnalysis1 v-if="threeMenu=='InundationAnalysis1'"/>
    <InundationAnalysis2 v-else-if="threeMenu=='InundationAnalysis2'"/>
    <InundationAnalysis3 v-else-if="threeMenu=='InundationAnalysis3'"/>
</template>
<script setup lang="ts">

import InundationAnalysis1 from './InundationAnalysis/InundationAnalysis1.vue'
import InundationAnalysis2 from './InundationAnalysis/InundationAnalysis2.vue'
import InundationAnalysis3 from './InundationAnalysis/InundationAnalysis3.vue'

const {threeMenu}=defineProps<{threeMenu:string}>();

</script>
<style scoped>
</style>