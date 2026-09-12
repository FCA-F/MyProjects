package com.webgis.postgis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@MapperScan("com.webgis.postgis.mapper")//自动把mapper下的类编译成mapper
@SpringBootApplication
public class PostgisApplication {

    public static void main(String[] args) {
        SpringApplication.run(PostgisApplication.class, args);
    }

}
