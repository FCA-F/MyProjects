## 功能位置
src/views/cesium-function

##  功能演示图片位置
src/assets/images/cesium-function

RuoYi-Vue3                          ("!"表示有更改，跟功能有关)
├── public/                         # 静态资源
├── src/
│   ├── api/                        # 后端接口模块
│   ├── assets/                     # 图片、图标、全局样式  !!
│   ├── components/                 # 通用组件
│   │   ├── CesiumMap/              # Cesium Viewer 容器组件  !
│   │   └── Common/                 # 通用弹窗等业务组件  !
│   ├── directives/                 # 自定义指令
│   ├── layout/                     # RuoYi 主布局
│   ├── plugins/                    # 插件注册
│   ├── router/                     # 路由配置
│   ├── store/                      # RuoYi 状态模块
│   ├── types/                      # TypeScript 类型声明
│   ├── utils/                      # 工具方法
│   │   └── cesium.ts               # Cesium 场景初始化工具  !
│   └── views/
│       ├── cesium-function/        # Cesium 功能主页和业务页面  !!!
│       │   ├── cards.ts            # 功能卡片配置  !
│       │   ├── index.vue           # Cesium 功能主页  !
│       ├── system/                 # 系统管理
│       ├── monitor/                # 系统监控
│       └── tool/                   # 系统工具
├── vite.config.ts                  # Vite 配置
├── package.json                    # 依赖与脚本
└── README.md














