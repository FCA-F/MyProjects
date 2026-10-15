<template>
    <header class="top-nav">
        <div class="brand" aria-label="智慧城市">
            <div class="brand-mark" aria-hidden="true">
                <el-icon class="brand-icon">
                    <OfficeBuilding />
                </el-icon>
                <span class="brand-status"></span>
            </div>
            <div class="brand-copy">
                <div class="brand-title-line">
                    <strong>智慧城市</strong>
                    <span class="brand-badge">CITY OS</span>
                </div>
                <span>urban intelligence platform</span>
            </div>
        </div>

        <el-menu class="nav-menu" mode="horizontal" router :default-active="activePath" :ellipsis="false">
            <el-menu-item index="/app/home">
                <el-icon>
                    <HomeFilled />
                </el-icon>
                <span>首页</span>
            </el-menu-item>

            <el-menu-item index="/app/spatial-analysis">
                <el-icon>
                    <MapLocation />
                </el-icon>
                <span>空间分析</span>
            </el-menu-item>

            <el-menu-item index="/app/road-management">
                <el-icon>
                    <Guide />
                </el-icon>
                <span>路网管理</span>
            </el-menu-item>

            <el-menu-item index="/app/city-roaming">
                <el-icon>
                    <VideoCamera />
                </el-icon>
                <span>城市漫游</span>
            </el-menu-item>

            <el-menu-item index="/app/ai-assistant">
                <el-icon>
                    <ChatDotRound />
                </el-icon>
                <span>AI 助手</span>
            </el-menu-item>
            <el-sub-menu v-if="isAdmin" index="admin">
                <template #title>
                    <el-icon>
                        <Setting />
                    </el-icon>
                    <span>管理</span>
                </template>

                <el-menu-item index="/app/operation-logs">
                    <el-icon>
                        <Document />
                    </el-icon>
                    <span>日志管理</span>
                </el-menu-item>
            </el-sub-menu>
        </el-menu>

        <el-dropdown class="user-menu" trigger="click" @command="handleCommand">
            <button class="user-trigger" type="button">
                <el-avatar :size="34">
                    <el-icon>
                        <UserFilled />
                    </el-icon>
                </el-avatar>
                <span class="user-name">
                    {{ store.user?.nickname || store.user?.username || '用户' }}
                </span>
                <el-icon class="user-arrow">
                    <ArrowDown />
                </el-icon>
            </button>

            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item command="logout">
                        <el-icon>
                            <SwitchButton />
                        </el-icon>
                        退出登录
                    </el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    ArrowDown,
    ChatDotRound,
    HomeFilled,
    MapLocation,
    OfficeBuilding,
    SwitchButton,
    UserFilled,
    VideoCamera,
    Guide,
    Document,
    Setting,
} from '@element-plus/icons-vue'
import { useStore } from '@/stores/store'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isAdmin = computed(() => store.user?.role === 'admin')

const activePath = computed(() => {
    if (route.path.startsWith('/app/spatial-analysis')) {
        return '/app/spatial-analysis'
    }

    if (route.path.startsWith('/app/city-roaming')) {
        return '/app/city-roaming'
    }

    if (route.path.startsWith('/app/ai-assistant')) {
        return '/app/ai-assistant'
    }

    if (route.path.startsWith('/app/road-management')) {
        return '/app/road-management'
    }
    if (route.path.startsWith('/app/operation-logs')) {
        return 'admin'
    }
    return '/app/home'
})

const handleCommand = (command: string) => {
    if (command !== 'logout') {
        return
    }

    store.logout()
    router.replace('/login')
}
</script>

<style scoped>
.top-nav {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    min-height: 68px;
    padding: 0 28px;
    background: #102a43;
    box-sizing: border-box;
    box-shadow: 0 2px 12px rgba(16, 42, 67, 0.18);
}

.brand {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 11px;
    min-width: 220px;
    color: #f7fbff;
}

.brand-mark {
    position: relative;
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(128, 224, 218, 0.55);
    border-radius: 10px;
    background: #173e59;
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.08),
        0 0 16px rgba(69, 196, 176, 0.12);
}

.brand-mark::before {
    position: absolute;
    inset: 5px;
    border: 1px solid rgba(159, 233, 229, 0.2);
    border-radius: 6px;
    content: '';
}

.brand-mark::after {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 5px;
    height: 5px;
    border: 2px solid #173e59;
    border-radius: 50%;
    background: #7ce6d4;
    box-shadow: 0 0 9px rgba(124, 230, 212, 0.9);
    content: '';
}

.brand-icon {
    position: relative;
    z-index: 1;
    color: #d7fffb;
    font-size: 22px;
    filter: drop-shadow(0 0 5px rgba(124, 230, 212, 0.28));
}

.brand-status {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #9be9df;
    box-shadow: 0 0 7px rgba(155, 233, 223, 0.9);
}

.brand-copy,
.brand-title-line,
.brand strong,
.brand span {
    display: block;
}

.brand-title-line {
    display: flex;
    align-items: center;
    gap: 7px;
}

.brand strong {
    font-size: 16px;
    line-height: 1.2;
}

.brand-copy>span {
    margin-top: 3px;
    color: #9fb6c9;
    font-size: 10px;
    letter-spacing: 0;
    text-transform: uppercase;
}

.brand-badge {
    padding: 2px 5px;
    border: 1px solid rgba(124, 230, 212, 0.28);
    border-radius: 3px;
    color: #81d9d0;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.6px;
    line-height: 1;
}

.nav-menu {
    flex: 1;
    min-width: 0;
    border-bottom: 0;
    background: transparent;
}

.nav-menu :deep(.el-menu-item) {
    height: 68px;
    padding: 0 18px;
    border-bottom: 3px solid transparent;
    color: #c5d5e2;
    font-size: 14px;
}

.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
}

.nav-menu :deep(.el-menu-item.is-active) {
    border-bottom-color: #45c4b0;
}

.nav-menu :deep(.el-icon) {
    margin-right: 7px;
}

.nav-menu :deep(.el-sub-menu__title) {
    height: 68px;
    padding: 0 18px;
    border-bottom: 3px solid transparent;
    color: #c5d5e2;
    font-size: 14px;
}

.nav-menu :deep(.el-sub-menu:hover > .el-sub-menu__title),
.nav-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title),
.nav-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
}

.nav-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    border-bottom-color: #45c4b0;
}

.nav-menu :deep(.el-sub-menu__icon-arrow) {
    color: #9fb6c9;
}

.user-menu {
    flex: 0 0 auto;
    margin-left: 20px;
}

.user-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: #f7fbff;
    cursor: pointer;
    font: inherit;
}

.user-trigger:focus-visible {
    outline: 2px solid #45c4b0;
    outline-offset: 4px;
}

.user-name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-arrow {
    color: #9fb6c9;
}

@media (max-width: 900px) {
    .top-nav {
        padding: 0 14px;
    }

    .brand {
        min-width: auto;
    }

    .brand-copy,
    .user-name {
        display: none;
    }

    .nav-menu :deep(.el-menu-item) {
        padding: 0 10px;
    }

    .nav-menu :deep(.el-menu-item span) {
        display: none;
    }
}
</style>
