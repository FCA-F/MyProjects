## 一、开发时
前端：
cd "E:\study\WEBGIS\图书馆管理系统\vue\library-frontend"
npm run dev
后端：
IDEA 运行 LibraryBackendApplication
## 二、准备发布前端
前端改完后，先确认 src/api/request.ts 是：
baseURL: '/api'
然后打包：
cd "E:\study\WEBGIS\图书馆管理系统\vue\library-frontend"
npm run build
生成：
dist/
然后构建前端镜像：
docker build -t library-frontend:1.0 .
## 三、准备发布后端
后端改完后，先打 jar：
cd "E:\study\WEBGIS\图书馆管理系统\springboot\library-backend"
mvn clean package
生成：
target/library-backend-0.0.1-SNAPSHOT.jar
然后构建后端镜像：
docker build -t library-backend:1.0 .
## 四、启动整套服务
进入后端目录，因为你的 docker-compose.yml 在这里：
cd "E:\study\WEBGIS\图书馆管理系统\springboot\library-backend"
先停掉旧容器：
docker compose down
启动新容器：
docker compose up -d
查看容器：
docker ps
应该看到：
library-frontend
library-backend
library-redis
## 五、访问项目
本机访问：
http://localhost:8081
同一 WiFi 下其他设备访问：
http://你的电脑IP:8081
查 IP：
ipconfig
看无线网卡里的 IPv4 地址。
## 六、代码改了以后怎么重新发布
如果只改前端代码：
cd "E:\study\WEBGIS\图书馆管理系统\vue\library-frontend"
npm run build
docker build -t library-frontend:1.0 .

cd "E:\study\WEBGIS\图书馆管理系统\springboot\library-backend"
docker compose down
docker compose up -d

如果只改后端 Java 代码：
cd "E:\study\WEBGIS\图书馆管理系统\springboot\library-backend"
mvn clean package
docker build -t library-backend:1.0 .
docker compose down
docker compose up -d
如果只改 docker-compose.yml：
docker compose down
docker compose up -d

## 七、目前这个发布方案的结构
浏览器
  -> http://localhost:8081
  -> frontend 容器 Nginx
  -> /api 转发
  -> backend 容器 Spring Boot
  -> Redis 容器
  -> 本机 MySQL

#### 为了 Docker 发布，我们主要加/改了这些配置文件。
## 前端 1：request.ts
位置：
E:\study\WEBGIS\图书馆管理系统\vue\library-frontend\src\api\request.ts
发布前把：
baseURL: 'http://localhost:8080'
改成：
baseURL: '/api'
原因：
开发直连后端：localhost:8080
Docker 发布：前端 Nginx 统一接收请求，再把 /api 转发给后端

## 前端 2：vite.config.ts
位置：
E:\study\WEBGIS\图书馆管理系统\vue\library-frontend\vite.config.ts
为了让开发环境也能继续用 /api，加 Vite 代理：
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/api/, '')
    }
  }
}
作用：
开发环境 localhost:5173/api/login
-> 代理到 localhost:8080/login

## 前端 3：nginx.conf
位置：
E:\study\WEBGIS\图书馆管理系统\vue\library-frontend\nginx.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://host.docker.internal:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
作用：
访问页面：Nginx 返回 Vue dist
访问 /api：Nginx 转发给后端 8080
刷新 /books /login 不 404：try_files 转回 index.html
## 前端 4：Dockerfile
位置：
E:\study\WEBGIS\图书馆管理系统\vue\library-frontend\Dockerfile
FROM nginx:1.27-alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
作用：
把 npm run build 生成的 dist 放进 Nginx 镜像

## 后端 1：Dockerfile
位置：
E:\study\WEBGIS\图书馆管理系统\springboot\library-backend\Dockerfile
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/library-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
作用：
把 mvn clean package 生成的 jar 放进 Java 17 镜像运行

## 后端 2：docker-compose.yml
位置：
E:\study\WEBGIS\图书馆管理系统\springboot\library-backend\docker-compose.yml
services:
  redis:
    image: redis:7
    container_name: library-redis
    ports:
      - "6379:6379"

  backend:
    image: library-backend:1.0
    container_name: library-backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://host.docker.internal:3306/library?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: password
    command:
      - "--spring.data.redis.host=redis"
      - "--spring.data.redis.port=6379"
      - "--spring.data.redis.database=1"
    depends_on:
      - redis

  frontend:
    image: library-frontend:1.0
    container_name: library-frontend
    ports:
      - "8081:80"
    depends_on:
      - backend

作用：
统一启动前端、后端、Redis
后端通过 redis:6379 访问 Redis
后端通过 host.docker.internal:3306 访问本机 MySQL
前端通过 8081 暴露给浏览器

## 后端 3：CorsConfig.java
位置：
E:\study\WEBGIS\图书馆管理系统\springboot\library-backend\src\main\java\com\example\library\config\CorsConfig.java
加 Docker 前端地址：
.allowedOriginPatterns(
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://你的电脑IP:8081"
)
作用：
允许开发前端、Docker 前端、局域网设备访问后端
一句话总结：
request.ts 统一走 /api
vite.config.ts 负责开发代理
nginx.conf 负责发布代理
Dockerfile 负责制作镜像
docker-compose.yml 负责一键启动
CorsConfig 负责放行前端来源