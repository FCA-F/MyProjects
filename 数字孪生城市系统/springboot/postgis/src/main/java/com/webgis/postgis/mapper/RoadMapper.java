package com.webgis.postgis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.webgis.postgis.domain.Road;
import org.apache.ibatis.annotations.*;

@Mapper
public interface RoadMapper extends BaseMapper<Road> {

    //SQL查看信息
    //SELECT f_table_schema, f_table_name, f_geometry_column, type, srid, coord_dimension
    //FROM geometry_columns
    //WHERE f_table_name = 'jinan_road';
    @Insert("""
        INSERT INTO public.jinan_road
        (osm_id, code, fclass, name, ref, oneway, maxspeed, layer, bridge, tunnel, geom)
        VALUES
        (#{osmId}, #{code}, #{fclass}, #{name}, #{ref}, #{oneway}, #{maxspeed}, #{layer}, #{bridge}, #{tunnel},
         ST_Multi(ST_GeomFromText(#{wkt}, #{srid})))
        """)
    boolean insertRoad(@Param("osmId") String osmId,
                   @Param("code") Integer code,
                   @Param("fclass") String fclass,
                   @Param("name") String name,
                   @Param("ref") String ref,
                   @Param("oneway") String oneway,
                   @Param("maxspeed") Integer maxspeed,
                   @Param("layer") Integer layer,
                   @Param("bridge") String bridge,
                   @Param("tunnel") String tunnel,
                   @Param("wkt") String wkt,
                   @Param("srid") Integer srid);
}