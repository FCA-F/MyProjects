package com.webgis.postgis.controller;

import com.webgis.postgis.annotation.OperationLog;
import com.webgis.postgis.common.Result;
import com.webgis.postgis.dto.ChatRequest;
import com.webgis.postgis.service.AiChatService;
import com.webgis.postgis.vo.ChatReplyVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
public class AiChatController {

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @OperationLog("AI对话")
    @PostMapping("/chat")
    public Result<ChatReplyVO> chat(
            @RequestBody ChatRequest request
    ) {
        if (request == null
                || request.getContent() == null
                || request.getContent().isBlank()) {
            return Result.error(400, "问题内容不能为空");
        }

        try {
            String reply = aiChatService.chat(
                    request.getContent()
            );

            return Result.success(
                    new ChatReplyVO(reply)
            );

        } catch (IllegalArgumentException e) {//参数不合法
            return Result.error(
                    400,
                    e.getMessage()
            );

        } catch (Exception e) {
            return Result.error(
                    502,
                    "DeepSeek 调用失败：" + e.getMessage()
            );
        }
    }
}