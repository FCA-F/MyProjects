package com.webgis.postgis.service;


import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

@Service
public class GeoServerCacheService {

    private final RestTemplate restTemplate = new RestTemplate();//REST请求

    @Value("${geoserver.base-url}")//从配置文件读环境变量
    private String baseUrl;

    @Value("${geoserver.username}")
    private String username;

    @Value("${geoserver.password}")
    private String password;

    @Value("${geoserver.gwc.layer}")
    private String layer;

    @Value("${geoserver.gwc.format}")
    private String format;

    @Value("${geoserver.gwc.grid-set-id}")
    private String gridSetId;

    @Value("${geoserver.gwc.zoom-start}")
    private Integer zoomStart;

    @Value("${geoserver.gwc.zoom-stop}")
    private Integer zoomStop;

    public void truncateRoadCache() {
        String url = baseUrl + "/gwc/rest/seed/" + layer + ".xml";

        String body = """
            <seedRequest>
              <name>%s</name>
              <gridSetId>%s</gridSetId>
              <zoomStart>%d</zoomStart>
              <zoomStop>%d</zoomStop>
              <format>%s</format>
              <type>truncate</type>//只删切片文件，不要删图层配置
              <threadCount>1</threadCount>//用几个线程去删
            </seedRequest>
            """.formatted(layer, gridSetId, zoomStart, zoomStop, format);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_XML);//xml格式
        headers.setBasicAuth(username, password);

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> resp = restTemplate.exchange(
                url,           // 往哪发
                HttpMethod.POST, // 用什么方法（GET/POST/PUT/DELETE）
                entity,        // 刚才打包的包裹（body + headers）
                String.class   // 期望服务器返回什么类型（这里用 String 接收）
        );

        if (!resp.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("GeoWebCache truncate failed: " + resp.getStatusCode());
        }
    }
}