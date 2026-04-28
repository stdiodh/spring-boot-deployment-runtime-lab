package com.andi.rest_crud.service

import com.andi.rest_crud.dto.PostResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class PostQueryService(
    private val postService: PostService,
    private val postCacheService: PostCacheService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun getPost(id: Long): PostResponse {
        val cached = postCacheService.get(id)
        if (cached != null) {
            logger.info("cache hit for post {}", id)
            return cached
        }

        logger.info("cache miss for post {}", id)
        val response = postService.getById(id)
        postCacheService.set(id, response)
        return response
    }
}
