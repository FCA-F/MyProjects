package com.webgis.postgis.service.impl;

import com.webgis.postgis.domain.Road;
import com.webgis.postgis.dto.PostRoadRequest;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.webgis.postgis.mapper.RoadMapper;
import com.webgis.postgis.service.RoadService;
import com.webgis.postgis.service.GeoServerCacheService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.util.StringUtils;

import java.util.stream.Collectors;

@Service
public class RoadServiceImpl implements RoadService {

    private final RoadMapper roadMapper;
    private final GeoServerCacheService geoServerCacheService;

    public RoadServiceImpl(RoadMapper roadMapper, GeoServerCacheService geoServerCacheService) {
        this.roadMapper = roadMapper;
        this.geoServerCacheService = geoServerCacheService;
    }

    @Override
    public IPage<Road> listPage(Integer pageNum, Integer pageSize,String keyword,String fclass) {
        LambdaQueryWrapper<Road> lambdaQueryWrapper=new LambdaQueryWrapper<>();
        if(StringUtils.hasText(keyword)){
            lambdaQueryWrapper.and(item->item
                    .like(Road::getOsmId,keyword)
                    .or()
                    .like(Road::getName,keyword)
                    .or()
                    .like(Road::getFclass,keyword));
        }
        if(StringUtils.hasText(fclass)){
            lambdaQueryWrapper.eq(Road::getFclass,fclass);
        }
        lambdaQueryWrapper.orderByAsc(Road::getOsmId);

        Page<Road> page = new Page<>(pageNum, pageSize);
        return roadMapper.selectPage(
                page,
                lambdaQueryWrapper
        );
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
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }

    @Override
    public  boolean putRoad(Road road){
        boolean ok=roadMapper.updateById(road)>0;
        if(ok){
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }

    @Override
    public boolean deleteByOsmId(String osmId) {
        boolean ok= roadMapper.deleteById(osmId) > 0;
        if(ok){
            geoServerCacheService.truncateRoadCache();
        }
        return ok;
    }
}