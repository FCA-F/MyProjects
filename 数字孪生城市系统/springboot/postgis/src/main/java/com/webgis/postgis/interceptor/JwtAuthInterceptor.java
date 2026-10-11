package com.webgis.postgis.interceptor;

import com.webgis.postgis.annotation.RequireRole;
import com.webgis.postgis.common.util.JwtUtil;
import com.webgis.postgis.service.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtAuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;

    public JwtAuthInterceptor(JwtUtil jwtUtil,TokenBlacklistService tokenBlacklistService) {
        this.jwtUtil = jwtUtil;
        this.tokenBlacklistService=tokenBlacklistService;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {

        // 放行跨域预检请求
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String authorization = request.getHeader("Authorization");

        if (authorization == null
                || !authorization.startsWith("Bearer ")) {
            writeError(response, 401, "请先登录");
            return false;
        }

        String token = authorization.substring(7);

        //token是否在Redis黑名单
        if(tokenBlacklistService.isBlacklist(token)){
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Token已退出登录\"}");
            return false;
        }

        // 验证 Token 签名和过期时间
        if (!jwtUtil.isValid(token)) {
            writeError(response, 401, "登录已过期，请重新登录");
            return false;
        }

        // 获取当前用户信息，放入请求对象
        request.setAttribute("userId", jwtUtil.getUserId(token));
        request.setAttribute("username", jwtUtil.getUsername(token));
        request.setAttribute("role", jwtUtil.getRole(token));

        // 检查接口是否要求特定（管理员）角色
        if (handler instanceof HandlerMethod handlerMethod) {
            RequireRole requireRole =
                    handlerMethod.getMethodAnnotation(RequireRole.class);

            if (requireRole != null) {
                String currentRole = jwtUtil.getRole(token);//从token解析出role

                if (!requireRole.value().equals(currentRole)) {
                    writeError(response, 403, "没有权限执行此操作");
                    return false;
                }
            }
        }

        return true;
    }

    private void writeError(
            HttpServletResponse response,
            int code,
            String message
    ) throws Exception {
        response.setStatus(code);
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");

        response.getWriter().write(
                "{\"code\":" + code
                        + ",\"message\":\"" + message
                        + "\",\"data\":null}"
        );
    }
}