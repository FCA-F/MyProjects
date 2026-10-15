package com.webgis.postgis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.webgis.postgis.domain.OperationLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OperationLogMapper extends BaseMapper<OperationLog> {
}