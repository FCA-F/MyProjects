package com.webgis.postgis.controller;

import com.webgis.postgis.common.Result;
import com.webgis.postgis.common.util.JwtUtil;
import com.webgis.postgis.domain.SysUser;
import com.webgis.postgis.dto.LoginRequest;
import com.webgis.postgis.dto.RegisterRequest;
import com.webgis.postgis.service.SysUserService;
import com.webgis.postgis.vo.LoginVO;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
public class AuthController {

    private final SysUserService sysUserService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(
            SysUserService sysUserService,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil
    ) {
        this.sysUserService = sysUserService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public Result<LoginVO> login(
            @Valid @RequestBody LoginRequest request
    ) {
        SysUser user = sysUserService.getByUsername(
                request.getUsername()
        );

        if (user == null) {
            return Result.error(400, "用户不存在");
        }

        if (user.getStatus() == null || user.getStatus() != 1) {
            return Result.error(403, "用户已被禁用");
        }

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        )) {
            return Result.error(400, "密码错误");
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        sysUserService.updateById(user);

        LoginVO loginVO = new LoginVO();
        loginVO.setId(user.getId());
        loginVO.setUsername(user.getUsername());
        loginVO.setNickname(user.getNickname());
        loginVO.setRole(user.getRole());
        loginVO.setToken(jwtUtil.generateToken(user));

        return Result.success(loginVO);
    }

    @PostMapping("/register")
    public Result<Void> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            return Result.error(400, "两次密码不一致");
        }

        SysUser existsUser = sysUserService.getByUsername(
                request.getUsername()
        );

        if (existsUser != null) {
            return Result.error(400, "用户名已存在");
        }

        SysUser user = new SysUser();
        user.setUsername(request.getUsername());
        user.setPasswordHash(
                passwordEncoder.encode(request.getPassword())
        );

        if (request.getNickname() == null
                || request.getNickname().isBlank()) {
            user.setNickname(request.getUsername());
        } else {
            user.setNickname(request.getNickname());
        }

        // 注册用户默认是普通用户
        user.setRole("user");
        user.setStatus(1);

        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        boolean saved = sysUserService.save(user);

        if (!saved) {
            return Result.error(500, "注册失败");
        }

        return Result.success();
    }
}
//1. SysUser.java
//2. SysUserMapper.java
//3. SysUserService.java
//4. SysUserServiceImpl.java
//5. PasswordConfig.java
//6. LoginRequest.java
//7. LoginVO.java
//8. JwtUtil.java
//9. AuthController.java
//10. JwtAuthInterceptor.java
//11. WebMvcConfig 或 CorsConfig