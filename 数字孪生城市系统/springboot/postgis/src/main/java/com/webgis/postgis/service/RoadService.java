package com.webgis.postgis.service;

import com.webgis.postgis.domain.Road;
import com.webgis.postgis.dto.PostRoadRequest;
import com.baomidou.mybatisplus.core.metadata.IPage;


public interface RoadService {
    IPage<Road> listPage(Integer pageNum, Integer pageSize,String keyword,String fclass);
    boolean postRoad(PostRoadRequest road);
    boolean putRoad(Road road);
    boolean deleteByOsmId(String osmId);

}