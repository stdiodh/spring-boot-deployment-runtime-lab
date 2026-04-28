package com.andi.rest_crud.controller

import com.andi.rest_crud.dto.ChatMessage
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.stereotype.Controller

@Controller
class WebSocketController {

    @MessageMapping("/chat.send")
    @SendTo("/topic/chat")
    fun send(message: ChatMessage): ChatMessage {
        return message
    }
}
