package com.webgis.postgis.service.impl;

import com.webgis.postgis.client.DeepSeekClient;
import com.webgis.postgis.service.AiChatService;
import org.springframework.stereotype.Service;

@Service
public class AiChatServiceImpl implements AiChatService {

    private final DeepSeekClient deepSeekClient;

    public AiChatServiceImpl(DeepSeekClient deepSeekClient) {
        this.deepSeekClient = deepSeekClient;
    }

    @Override
    public String chat(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("问题内容不能为空");
        }

        String normalizedContent = content.trim();

        if (normalizedContent.length() > 4000) {
            throw new IllegalArgumentException(
                    "问题内容不能超过 4000 个字符"
            );
        }

        return deepSeekClient.chat(normalizedContent);
    }
}