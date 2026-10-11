package com.webgis.postgis.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class DeepSeekClient {

    private final RestClient restClient;

    private final String apiKey;
    private final String apiUrl;
    private final String model;

    public DeepSeekClient(
            @Value("${deepseek.api.key:}") String apiKey,//@Value从配置文件或环境变量中读取值,属性：默认值
            @Value("${deepseek.api.url:https://api.deepseek.com/chat/completions}") String apiUrl,
            @Value("${deepseek.model:deepseek-chat}") String model
    ) {
        this.restClient = RestClient.builder().build();
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.model = model;
    }

    //聊天，向DeepSeek发送请求,并接收回应
    public String chat(String content) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("DeepSeek API Key丢失");
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("stream", false);//完整回复一次性返回
        List<Map<String, String>> messages = List.of(
                Map.of(
                        "role", "system",//告诉 API 这是系统指令，不是用户说的话
                        "content",
                        "你是智慧城市系统的AI助手。本系统应用的城市是济南，请围绕济南进行回答。"//给 AI 的"人设"和"行为准则"
                        +"本系统包括空间分析、道路管理、城市漫游、AI助手功能，作者傅长安是大帅哥"
                ),
                Map.of(
                        "role", "user",//这是用户说的话
                        "content", content//用户实际输入的问题
                )
        );

        requestBody.put("messages", messages);

        try {
            Map<?, ?> responseBody = restClient.post()//POST 请求
                    .uri(apiUrl)//指定完整DeepSeek URL
                    .contentType(MediaType.APPLICATION_JSON)//设置请求头
                    .header("Authorization", "Bearer " + apiKey)//设置鉴权头
                    .body(requestBody)//请求体
                    .retrieve()//发送请求
                    .body(Map.class);//返回的 JSON 反序列化为 Map<?,?>

            return extractReply(responseBody);

        } catch (RestClientResponseException e) {
            throw new IllegalStateException(
                    "DeepSeek request failed, status="
                            + e.getStatusCode().value()
                            + ", body="
                            + shorten(e.getResponseBodyAsString()),
                    e
            );

        } catch (Exception e) {
            throw new IllegalStateException(
                    "DeepSeek request failed: " + e.getMessage(),
                    e
            );
        }
    }

    //提取有用信息
    private String extractReply(Map<?, ?> responseBody) {
        if (responseBody == null) {//回应体不为空
            throw new IllegalStateException("DeepSeek response is empty");
        }

        Object choicesObject = responseBody.get("choices");//取choices

        if (!(choicesObject instanceof List<?> choices) || choices.isEmpty()) {//choices不为空
            throw new IllegalStateException("DeepSeek response has no choices");
        }

        Object firstChoiceObject = choices.get(0);//取choices第一个元素

        if (!(firstChoiceObject instanceof Map<?, ?> firstChoice)) {//choices第一个元素是否合法
            throw new IllegalStateException("DeepSeek choice format is invalid");
        }

        Object messageObject = firstChoice.get("message");//取信息

        if (!(messageObject instanceof Map<?, ?> message)) {//信息是否合法
            throw new IllegalStateException("DeepSeek message format is invalid");
        }

        Object contentObject = message.get("content");//取内容

        if (!(contentObject instanceof String reply) || reply.isBlank()) {//内容是否合法，并声明reply
            throw new IllegalStateException("DeepSeek reply is empty");
        }

        return reply.trim();//去掉首尾空格
    }

    //限制文本长度
    private String shorten(String text) {
        if (text == null) {
            return "";
        }

        if (text.length() <= 1000) {
            return text;
        }

        return text.substring(0, 1000);
    }
}