<template>
  <div class="cesium-home">
    <section v-for="section in sections" :key="section.name" class="section-block">
      <div class="section-title">{{ section.title }}</div>
      <div class="section-line"></div>

      <div class="feature-grid">
        <article
          v-for="item in section.items"
          :key="item.name"
          class="feature-card"
          tabindex="0"
          @click="handleClick(item)"
        >
          <div class="card-head">
            <span>{{ item.title }}</span>
            <span class="card-arrow"></span>
          </div>

          <div class="card-body">
            <img v-if="item.image" class="card-image" :src="item.image" :alt="item.title" />
            <div v-else class="card-fallback">
              <div class="card-orb orb-1"></div>
              <div class="card-orb orb-2"></div>
              <div class="card-bar"></div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { sections, type FeatureCard } from './cards'

const router = useRouter()


function handleClick(item: FeatureCard) {
  if (!item.path) {
    ElMessage.info(`${item.title} 还没接入`)
    return
  }
  router.push(item.path)
}
</script>

<style scoped>
.cesium-home {
  min-height: calc(100vh - 84px);
  padding: 24px 28px 40px;
  color: #1c2433;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 12%, rgba(64, 150, 255, 0.03), transparent 26%),  /* 0.16 → 0.08 */
    radial-gradient(circle at 92% 4%, rgba(90, 115, 255, 0.03), transparent 18%),  /* 0.12 → 0.06 */
    radial-gradient(circle at 88% 92%, rgba(34, 211, 238, 0.03), transparent 20%),  /* 0.12 → 0.06 */
    linear-gradient(180deg, #fafcff 0%, #f0f7ff 100%);
}

.cesium-home::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(71, 108, 198, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(71, 108, 198, 0.05) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0));
  opacity: 0.75;
}

.section-block {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #182235;
  margin-bottom: 10px;
  letter-spacing: 0;
}

.section-title::before {
  content: '';
  width: 6px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4e88ff, #2bd2ff);
  box-shadow: 0 0 12px rgba(78, 136, 255, 0.45);
}

.section-line {
  height: 2px;
  width: 100%;
  margin: 4px 0 24px;
  background: linear-gradient(90deg, #4e88ff 0%, #31d6ff 50%, #8b6dff 100%);
  box-shadow: 0 0 16px rgba(49, 214, 255, 0.2);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 22px;
}

.feature-card {
  position: relative;
  min-width: 0;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid rgba(71, 108, 198, 0.18);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 12px 26px rgba(25, 40, 77, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  overflow: hidden;
  backdrop-filter: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  outline: none;
  isolation: isolate;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 10px;
  background: conic-gradient(
    from 180deg,
    rgba(59, 214, 255, 0.3),
    rgba(93, 126, 255, 0.3),
    rgba(184, 92, 255, 0.3),
    rgba(63, 229, 175, 0.3),
    rgba(255, 120, 170, 0.3),
    rgba(59, 214, 255, 0.3)
  );
  filter: blur(3px);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
  z-index: 0;
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 0;
}

.feature-card:hover,
.feature-card:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(78, 136, 255, 0.34);
  box-shadow:
    0 6px 10px rgba(25, 40, 77, 0.14),
    0 0 0 1px rgba(78, 136, 255, 0.12) inset,
    0 0 10px rgba(59, 214, 255, 0.2),
    0 0 10px rgba(93, 126, 255, 0.16),
    0 0 10px rgba(184, 92, 255, 0.13);
}

.feature-card:hover::before,
.feature-card:focus-visible::before {
  opacity: 0.8;
}

.card-head {
  position: relative;
  z-index: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  color: #1f2b40;
  border-bottom: 1px solid rgba(136, 152, 182, 0.14);
  background: #ffffff;
  letter-spacing: 0;
}

.card-arrow {
  color: #8a93a8;
  font-size: 18px;
  line-height: 1;
}

.card-body {
  position: relative;
  z-index: 1;
  height: calc(100% - 50px);
  overflow: hidden;
  background: linear-gradient(180deg, #d9ecff 0%, #a8c9f2 44%, #7fa9da 100%);
}

.card-body::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 1;
  filter: brightness(1.12) saturate(1.06);
  transition: transform 0.28s ease;
}

.card-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(130, 190, 245, 0.96) 0 34%, rgba(138, 156, 103, 0.98) 34% 100%);
}

.card-fallback::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.18) 0 14%, transparent 14% 100%),
    radial-gradient(circle at 35% 65%, rgba(36, 61, 27, 0.34) 0 16%, transparent 17%);
}

.card-orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.75;
}

.orb-1 {
  width: 54%;
  height: 54%;
  left: 18%;
  top: 18%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.28) 0 26%, rgba(97, 126, 255, 0.16) 27%, transparent 60%);
}

.orb-2 {
  width: 24%;
  height: 24%;
  left: 30%;
  top: 42%;
  background: rgba(58, 84, 43, 0.34);
}

.card-bar {
  position: absolute;
  left: 24%;
  right: 20%;
  bottom: 14%;
  height: 14%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  transform: rotate(4deg);
}

@media (max-width: 1400px) {
  .feature-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .feature-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cesium-home {
    padding: 18px 16px 32px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
