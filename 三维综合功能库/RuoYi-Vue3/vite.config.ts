import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import createVitePlugins from './vite/plugins'
import cesium from 'vite-plugin-cesium'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const baseUrl = 'http://localhost:8080'

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd())
    const { VITE_APP_ENV } = env
    return {
        base: VITE_APP_ENV === 'production' ? '/' : '/',

        // ↓↓↓ 加了 wasm() 和 topLevelAwait() ↓↓↓
        plugins: [
            ...createVitePlugins(env, command === 'build'),
            cesium(),
            wasm(),              // ← 加这行
            topLevelAwait()     // ← 加这行
        ],

        resolve: {
            alias: {
                '~': path.resolve(__dirname, './'),
                '@': path.resolve(__dirname, './src')
            },
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
        },

        // ↓↓↓ 加 optimizeDeps，防止 Vite 预打包把 wasm 搞坏 ↓↓↓
        optimizeDeps: {
            exclude: ['@dimforge/rapier3d']  // ← 加这段
        },

        build: {
            sourcemap: command === 'build' ? false : 'inline',
            outDir: 'dist',
            assetsDir: 'assets',
            chunkSizeWarningLimit: 2000,
            rollupOptions: {
                output: {
                    chunkFileNames: 'static/js/[name]-[hash].js',
                    entryFileNames: 'static/js/[name]-[hash].js',
                    assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
                    // ↓↓↓ 可选：把 rapier 拆成独立 chunk，避免主包过大 ↓↓↓
                    manualChunks: {
                        cesium: ['cesium'],
                        rapier: ['@dimforge/rapier3d'],
                        three: ['three']
                    }
                }
            }
        },

        server: {
            port: 8081,
            host: true,
            open: true,
            proxy: {
                '/dev-api': {
                    target: baseUrl,
                    changeOrigin: true,
                    rewrite: (p) => p.replace(/^\/dev-api/, '')
                },
                '^/v3/api-docs/(.*)': {
                    target: baseUrl,
                    changeOrigin: true,
                }
            }
        },

        css: {
            postcss: {
                plugins: [
                    {
                        postcssPlugin: 'internal:charset-removal',
                        AtRule: {
                            charset: (atRule: any) => {
                                if (atRule.name === 'charset') {
                                    atRule.remove()
                                }
                            }
                        }
                    }
                ]
            }
        }
    }
})