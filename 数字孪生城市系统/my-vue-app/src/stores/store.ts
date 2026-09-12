import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CurrentUser {
    id: number
    username: string
    nickname: string
    role: string
}

export const useStore = defineStore('store', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref<CurrentUser | null>(
        JSON.parse(localStorage.getItem('user') || 'null') as CurrentUser | null
    )

    const isLoggedIn = computed(() => Boolean(token.value))

    function login(newToken: string, newUser: CurrentUser) {
        token.value = newToken
        user.value = newUser
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
    }

    function logout() {
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    return { token, user, isLoggedIn, login, logout }
})