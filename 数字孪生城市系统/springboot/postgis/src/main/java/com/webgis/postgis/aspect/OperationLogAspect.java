package com.webgis.postgis.aspect;

import com.webgis.postgis.annotation.OperationLog;
import com.webgis.postgis.common.Result;
import com.webgis.postgis.common.util.JwtUtil;
import com.webgis.postgis.mapper.OperationLogMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OperationLogAspect {

    private final OperationLogMapper operationLogMapper;

    private final JwtUtil jwtUtil;

    @Around("@annotation(operationLog)")
    public Object recordLog(
            ProceedingJoinPoint joinPoint,
            OperationLog operationLog
    ) throws Throwable {

        long startTime = System.currentTimeMillis();

        com.webgis.postgis.domain.OperationLog logEntity =
                new com.webgis.postgis.domain.OperationLog();

        logEntity.setOperation(operationLog.value());
        logEntity.setCreateTime(LocalDateTime.now());

        HttpServletRequest request = getRequest();

        if (request != null) {
            logEntity.setRequestMethod(request.getMethod());
            logEntity.setRequestUri(request.getRequestURI());
            logEntity.setIp(getClientIp(request));

            String username =
                    (String) request.getAttribute("username");

            String role =
                    (String) request.getAttribute("role");

            logEntity.setUsername(username);
            logEntity.setRole(role);

            // 登录、注册接口没有经过 JWT 拦截器，所以再尝试从请求头解析
            if (username == null) {
                String token = request.getHeader("Authorization");

                if (token != null && token.startsWith("Bearer ")) {
                    token = token.substring(7);

                    logEntity.setUsername(jwtUtil.getUsername(token));
                    logEntity.setRole(jwtUtil.getRole(token));
                }
            }
        }

        try {
            Object result = joinPoint.proceed();

            logEntity.setSuccess(1);
            logEntity.setStatusCode(200);

            if (result instanceof Result<?> resultData) {
                logEntity.setStatusCode(resultData.getCode());

                if (resultData.getCode() == null
                        || resultData.getCode() < 200
                        || resultData.getCode() >= 300) {

                    logEntity.setSuccess(0);
                    logEntity.setErrorMessage(resultData.getMessage());
                }
            }

            if (result instanceof ResponseEntity<?> responseEntity) {
                int statusCode =
                        responseEntity.getStatusCode().value();

                logEntity.setStatusCode(statusCode);
                logEntity.setSuccess(
                        statusCode >= 200 && statusCode < 300
                                ? 1
                                : 0
                );
            }

            return result;

        } catch (Throwable e) {
            logEntity.setSuccess(0);
            logEntity.setStatusCode(500);
            logEntity.setErrorMessage(e.getMessage());
            throw e;

        } finally {
            logEntity.setCostTime(
                    System.currentTimeMillis() - startTime
            );

            try {
                operationLogMapper.insert(logEntity);
            } catch (Exception e) {
                // 日志写入失败不能覆盖原接口的返回结果
                log.warn("操作日志写入失败", e);
            }
        }
    }

    private HttpServletRequest getRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes)
                        RequestContextHolder.getRequestAttributes();

        if (attributes == null) {
            return null;
        }

        return attributes.getRequest();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");

        if (ip != null && !ip.isBlank()) {
            return ip.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");

        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }

        return request.getRemoteAddr();
    }
}