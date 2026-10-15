package com.webgis.postgis.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.webgis.postgis.annotation.RequireRole;
import com.webgis.postgis.common.Result;
import com.webgis.postgis.domain.OperationLog;
import com.webgis.postgis.mapper.OperationLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class OperationLogController {

    private final OperationLogMapper operationLogMapper;

    @RequireRole("admin")
    @GetMapping("/operation-logs/page")
    public Result<IPage<OperationLog>> page(
            @RequestParam(defaultValue = "1") Long page,
            @RequestParam(defaultValue = "10") Long size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) Integer success
    ) {
        LambdaQueryWrapper<OperationLog> wrapper =
                new LambdaQueryWrapper<>();

        wrapper.like(
                username != null && !username.isBlank(),
                OperationLog::getUsername,
                username
        );

        wrapper.like(
                operation != null && !operation.isBlank(),
                OperationLog::getOperation,
                operation
        );

        wrapper.eq(
                success != null,
                OperationLog::getSuccess,
                success
        );

        wrapper.orderByDesc(OperationLog::getCreateTime);

        IPage<OperationLog> result = operationLogMapper.selectPage(
                new Page<>(page, size),
                wrapper
        );

        return Result.success(result);
    }
}