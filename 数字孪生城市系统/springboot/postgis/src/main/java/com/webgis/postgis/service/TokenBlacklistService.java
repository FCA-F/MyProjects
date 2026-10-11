package com.webgis.postgis.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    private static final String KEY_PREFIX="auth:blacklist";
    private final StringRedisTemplate stringRedisTemplate;
    public TokenBlacklistService(StringRedisTemplate stringRedisTemplate){
        this.stringRedisTemplate=stringRedisTemplate;
    }

    public void blacklist(String token){
        String key=KEY_PREFIX+token;

        stringRedisTemplate.opsForValue().set(
                key,"1",2, TimeUnit.HOURS
        );
    }

    public boolean isBlacklist(String token){
        String key=KEY_PREFIX+token;

        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
    }
}
