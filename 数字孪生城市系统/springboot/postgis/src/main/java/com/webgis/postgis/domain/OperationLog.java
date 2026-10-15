package com.webgis.postgis.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("operation_log")
public class OperationLog {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private String username;

    private String role;

    private String operation;

    @TableField("request_method")
    private String requestMethod;

    @TableField("request_uri")
    private String requestUri;

    @TableField("status_code")
    private Integer statusCode;

    private Integer success;

    @TableField("error_message")
    private String errorMessage;

    @TableField("cost_time")
    private Long costTime;

    private String ip;

    @TableField("create_time")
    private LocalDateTime createTime;
}