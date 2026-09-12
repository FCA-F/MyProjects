package com.webgis.postgis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.webgis.postgis.domain.SysUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}

