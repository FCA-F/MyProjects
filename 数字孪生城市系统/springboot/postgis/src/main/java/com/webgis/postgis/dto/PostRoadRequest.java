package com.webgis.postgis.dto;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;
import java.util.List;

@Data
public class PostRoadRequest {//DTO传输对象
    @TableId(value = "osm_id", type = IdType.INPUT)//IdType.INPUT：主键自行输入
    private String osmId;

    private Integer code;
    private String fclass;
    private String name;
    private String ref;
    private String oneway;
    private Integer maxspeed;
    private Integer layer;
    private String bridge;
    private String tunnel;
    private List<List<Double>> coordinates;
}