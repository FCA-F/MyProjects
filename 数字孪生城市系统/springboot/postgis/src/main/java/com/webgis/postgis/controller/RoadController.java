package com.webgis.postgis.controller;

import com.webgis.postgis.annotation.RequireRole;
import com.webgis.postgis.domain.Road;
import com.webgis.postgis.dto.PostRoadRequest;

import com.webgis.postgis.service.RoadService;//回应控制
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.baomidou.mybatisplus.core.metadata.IPage;


@RestController
@RequestMapping("/roads")
@CrossOrigin//允许跨域
public class RoadController {

    private final RoadService RoadService;

    public RoadController(RoadService RoadService) {
        this.RoadService = RoadService;
    }

    @GetMapping("/list")
    public ResponseEntity<IPage<Road>> list(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String fclass) {
        return ResponseEntity.ok(RoadService.listPage(pageNum, pageSize,keyword,fclass));
    }

    @PostMapping("/post")
    @RequireRole("admin")
    public  ResponseEntity<Void> post(@RequestBody PostRoadRequest road){
        return RoadService.postRoad(road)
                ?ResponseEntity.noContent().build()
                :ResponseEntity.notFound().build();
    }

    @PutMapping("/put")
    @RequireRole("admin")
    public ResponseEntity<Void> put(@RequestBody Road road){
        return RoadService.putRoad(road)
                ?ResponseEntity.noContent().build()
                :ResponseEntity.notFound().build();
    }


    @DeleteMapping("/delete/{osmId}")
    @RequireRole("admin")
    public ResponseEntity<Void> delete(@PathVariable String osmId) {
        return RoadService.deleteByOsmId(osmId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}