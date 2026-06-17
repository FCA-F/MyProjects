<template>
  <!-- 全屏背景容器 -->
   
  <div class="login-page">
    <!-- 登录卡片（居中显示） -->

    <!--仅限作者开发快速登录-->
    <button @click="router.push({name:'Cesium'})">跳过</button>

    <div class="login-card">
      <h2 class="login-title">三维智慧城市系统</h2>
      <!-- 登录表单（带验证规则） -->
      <el-form 
        ref="loginFormRef" 
        :model="loginForm" 
        :rules="loginRules" 
        class="login-form"
        label-width="80px"
      >
        <!-- 用户名输入框 -->
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入用户名"
            prefix-icon="User"
            clearable
          />
        </el-form-item>

        <!-- 密码输入框 -->
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>

        <!-- 登录按钮 -->
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-btn" 
            :loading="loading" 
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import {useStore} from '../stores/store'

const router = useRouter()
const store=useStore()
const loading = ref(false) // 按钮加载状态
const loginFormRef = ref<FormInstance>() // 表单实例

// 表单数据
const loginForm = ref({
  username: '',
  password: ''
})

// 表单验证规则
const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 16, message: '用户名长度需在 3-16 个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需在 6-20 个字符之间', trigger: 'blur' }
  ]
}

// 登录逻辑
const handleLogin = async () => {
  // 1. 表单校验
  if (!loginFormRef.value) return
  const valid = await loginFormRef.value.validate()
  if (!valid) return

  // 2. 模拟登录请求
  loading.value = true
  setTimeout(() => {
    // 这里可以加真实的账号密码校验逻辑
    if (loginForm.value.username && loginForm.value.password) {
      // 校验通过，跳转到Cesium页面
      store.setUserName(loginForm.value.username);
      router.push({ name: 'Cesium' })
    } else {
      alert('用户名或密码错误')
    }
    loading.value = false
  }, 800)
}
</script>

<style scoped>
/* 全屏背景 */
.login-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;

  background-image:url('/data/登录界面背景.png');
  /*图片适配：让图片按比例铺满全屏，不变形 */
  background-size:cover;
  /*图片居中：保证图片中心始终在屏幕中心 */
  background-position: center center;
  /*不重复：图片只显示一次，不会平铺 */
  background-repeat: no-repeat;
  /*兜底背景色：如果图片加载失败，会显示这个颜色，不会空白*/
  background-color: #1890ff;

  display: flex;
  align-items: center;
  justify-content: center;
}

/* 登录卡片 */
.login-card {
  width: 400px;
  padding: 40px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

/* 标题 */
.login-title {
  text-align: center;
  margin: 0 0 30px;
  font-size: 24px;
  color: #333;
}

/* 表单 */
.login-form {
  width: 100%;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 6px;
}
</style>