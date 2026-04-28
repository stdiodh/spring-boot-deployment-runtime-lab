package com.andi.rest_crud.service

import com.andi.rest_crud.dto.PostResponse
import tools.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration

@Service
class PostCacheService(
    private val stringRedisTemplate: StringRedisTemplate,
    @Value("\${cache.post-ttl-seconds}") private val postTtlSeconds: Long
) {
    private val objectMapper = jacksonObjectMapper()


    fun get(postId: Long): PostResponse? {
        val value = stringRedisTemplate.opsForValue().get(key(postId)) ?: return null
        return objectMapper.readValue(value, PostResponse::class.java)
    }

    fun set(postId: Long, response: PostResponse) {
        val value = objectMapper.writeValueAsString(response)
        stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
    }

    fun key(postId: Long): String = "post:$postId"

    fun ttl(): Duration = Duration.ofSeconds(postTtlSeconds)
}
