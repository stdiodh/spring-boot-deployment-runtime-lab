package com.andi.rest_crud.dto

import jakarta.validation.constraints.NotBlank

data class PostUpdateRequest(
    @field:NotBlank(message = "title은 비어 있을 수 없습니다.")
    val title: String,
    @field:NotBlank(message = "content는 비어 있을 수 없습니다.")
    val content: String,
    @field:NotBlank(message = "author는 비어 있을 수 없습니다.")
    val author: String
)
