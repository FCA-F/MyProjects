package com.webgis.postgis.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("jinan_road")
public class Road implements Serializable {
    private static final long serialVersionUID = 1L;

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
}