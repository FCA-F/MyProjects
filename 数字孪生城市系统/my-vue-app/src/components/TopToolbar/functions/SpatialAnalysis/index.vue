<template>
    <SunlightAnalysis v-if="twoMenu == 'SunlightAnalysis'" />
    <InundationAnalysis v-else-if="twoMenu == 'InundationAnalysis'" />
    <VisibilityAnalysis v-else-if="twoMenu == 'VisibilityAnalysis'" />
    <BufferAnalysis v-else-if="twoMenu == 'BufferAnalysis'" />
    <Mask v-else-if="twoMenu == 'Mask'" />
    <ViewshedAnalysis v-else-if="twoMenu == 'ViewshedAnalysis'" />
</template>
<script setup lang="ts">

import SunlightAnalysis from './SunlightAnalysis.vue'
import VisibilityAnalysis from './VisibilityAnalysis.vue'
import InundationAnalysis from './InundationAnalysis.vue'
import BufferAnalysis from './BufferAnalysis.vue'
import Mask from './Mask.vue'
import ViewshedAnalysis from './ViewshedAnalysis.vue'

const { twoMenu } = defineProps<{ twoMenu: string }>();

</script>
<style scoped></style>