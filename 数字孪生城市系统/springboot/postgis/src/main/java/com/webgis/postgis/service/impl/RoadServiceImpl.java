package com.webgis.postgis.service.impl;

import com.webgis.postgis.domain.Road;
import com.webgis.postgis.dto.PostRoadRequest;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.webgis.postgis.dto.RoadPageCache;
import com.webgis.postgis.mapper.RoadMapper;
import com.webgis.postgis.service.RoadService;
import com.webgis.postgis.service.GeoServerCacheService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class RoadServiceImpl implements RoadService {

    private static final String ROAD_LIST_CACHE_PREFIX="roads:list:";
    private static final String ROAD_LIST_CACHE_VERSION="roads:list:version";

    private final RoadMapper roadMapper;
    private final GeoServerCacheService geoServerCacheService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;//JSON转换

    public RoadServiceImpl(
            RoadMapper roadMapper,
            GeoServerCacheService geoServerCacheService,
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper
    ) {
        this.roadMapper = roadMapper;
        this.geoServerCacheService = geoServerCacheService;
        this.stringRedisTemplate=stringRedisTemplate;
        this.objectMapper=objectMapper;
    }

    @Override
    public IPage<Road> listPage(
            Integer pageNum,
            Integer pageSize,
            String keyword) {

        //先查redis
        String redisCacheKey=buildRedisCacheKey(pageNum,pageSize,keyword);
        String redisCacheJson=stringRedisTemplate.opsForValue().get(redisCacheKey);
        if(redisCacheJson!=null){//有
            try{
                //解压JSON
                RoadPageCache roadPageCache=objectMapper.readValue(redisCacheJson,RoadPageCache.class);
                Page<Road> cachePage=new Page<Road>(
                        roadPageCache.getCurrent(),
                        roadPageCache.getSize(),
                        roadPageCache.getTotal()
                );
                cachePage.setRecords(roadPageCache.getRecords());
                System.out.println("Redis Key：" + redisCacheKey);//查看redis是否生效
                return cachePage;
            }catch (Exception e){
                stringRedisTemplate.delete(redisCacheKey);
            }
        }

        //redis没有，开始搜库
        LambdaQueryWrapper<Road> lambdaQueryWrapper=new LambdaQueryWrapper<>();
        if(StringUtils.hasText(keyword)){
            lambdaQueryWrapper.and(item->item
                    .like(Road::getOsmId,keyword)
                    .or()
                    .like(Road::getName,keyword)
                    .or()
                    .like(Road::getFclass,keyword));
        }

        lambdaQueryWrapper.orderByAsc(Road::getOsmId);

        Page<Road> page = new Page<>(pageNum, pageSize);
        //分页结果
        IPage<Road> result= roadMapper.selectPage(
                page,
                lambdaQueryWrapper
        );
        //写入redis，5分钟过期
        RoadPageCache roadPageCache=new RoadPageCache(
                result.getRecords(),
                result.getTotal(),
                result.getSize(),
                result.getCurrent()
        );
        try {
            String json = objectMapper.writeValueAsString(roadPageCache);
            stringRedisTemplate.opsForValue().set(
                    redisCacheKey,
                    json,
                    5,
                    TimeUnit.MINUTES
            );
        }catch (Exception e){
            throw new IllegalStateException("道路列表缓存失败", e);
        }
        return result;
    }

    //构造redis缓存key
    private String buildRedisCacheKey(
            Integer pageNum,
            Integer pageSize,
            String keyword
    ){
        String version=stringRedisTemplate.opsForValue().get(ROAD_LIST_CACHE_VERSION);
        if(!StringUtils.hasText(version)){
            version="1";
            stringRedisTemplate.opsForValue().set(ROAD_LIST_CACHE_VERSION,version);
        }

        return ROAD_LIST_CACHE_PREFIX
                +"v"+version
                + ":page=" + pageNum
                + ":size=" + pageSize
                + ":keyword=" + safeKeyPart(keyword);
    }
    //确保key有内容
    private String safeKeyPart(String value){
        return StringUtils.hasText(value)?value.trim():"_";
    }
    //清除缓存，通过版本号加1
    private void clearRedisCache(){
        stringRedisTemplate.opsForValue().increment(ROAD_LIST_CACHE_VERSION);//value+1
    }

    @Override
    @Transactional//回滚
    public  boolean postRoad(PostRoadRequest road){
        if(road.getCoordinates()==null||road.getCoordinates().size()<2){
            return false;
        }
        //WKT是一种用纯文本字符串来表示几何形状（点、线、面等）的国际标准格式
        String wkt="LINESTRING("+road.getCoordinates().stream()
                .map(p->p.get(0)+" "+p.get(1))
                .collect(Collectors.joining(","))+")";

        boolean ok=roadMapper.insertRoad(
                road.getOsmId(),
                road.getCode(),
                road.getFclass(),
                road.getName(),
                road.getRef(),
                road.getOneway(),
                road.getMaxspeed(),
                road.getLayer(),
                road.getBridge(),
                road.getTunnel(),
                wkt,
                4326
        );
        if(ok){
            clearRedisCache();
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }

    @Override
    public  boolean putRoad(Road road){
        boolean ok=roadMapper.updateById(road)>0;
        if(ok){
            clearRedisCache();
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }

    @Override
    public boolean deleteByOsmId(String osmId) {
        boolean ok= roadMapper.deleteById(osmId) > 0;
        if(ok){
            clearRedisCache();
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }


}