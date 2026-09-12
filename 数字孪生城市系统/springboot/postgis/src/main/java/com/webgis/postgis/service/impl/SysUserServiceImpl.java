package com.webgis.postgis.service.impl;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.webgis.postgis.domain.SysUser;
import com.webgis.postgis.mapper.SysUserMapper;
import com.webgis.postgis.service.SysUserService;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl
        extends ServiceImpl<SysUserMapper, SysUser>
        implements SysUserService {

    @Override
    public SysUser getByUsername(String username){
        return lambdaQuery()
                .eq(SysUser::getUsername,username)
                .one();
    }
}
