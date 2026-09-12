package com.webgis.postgis.domain;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_user")
public class SysUser {
    @TableId(value="id")
    private Long id;
    private String username;
    @TableField("password_hash")
    private String passwordHash;
    private String nickname;
    private String role;
    private Integer status;
    @TableField("last_login_at")
    private LocalDateTime lastLoginAt;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
