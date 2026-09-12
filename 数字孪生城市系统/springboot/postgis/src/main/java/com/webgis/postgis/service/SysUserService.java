package com.webgis.postgis.service;

import com.baomidou.mybatisplus.spring.service.IService;
import com.webgis.postgis.domain.SysUser;

public interface SysUserService extends IService<SysUser> {
    SysUser getByUsername(String username);
}
