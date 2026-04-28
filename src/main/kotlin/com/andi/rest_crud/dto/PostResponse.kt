package com.andi.rest_crud.dto

import com.andi.rest_crud.domain.PostEntity

data class PostResponse(
    val id: Long,
    val title: String,
    val content: String,
    val author: String
) {
    companion object {
        fun from(entity: PostEntity): PostResponse = PostResponse(
            id = entity.id,
            title = entity.title,
            content = entity.content,
            author = entity.author
        )
    }
}
