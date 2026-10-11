package com.webgis.postgis.dto;

import com.webgis.postgis.domain.Road;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor// Lombok生成无参构造方法，给JSON反序列化用
public class RoadPageCache {

    private List<Road> records;

    private long total;

    private long size;

    private long current;

    public RoadPageCache(
            List<Road> records,   // 这一页的道路数据列表
            long total,           // 数据库里总共多少条
            long size,            // 每页显示多少条
            long current          // 当前是第几页
    ) {
        this.records = records;
        this.total = total;
        this.size = size;
        this.current = current;
    }
}