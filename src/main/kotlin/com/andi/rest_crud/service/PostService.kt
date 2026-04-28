package com.andi.rest_crud.service

import com.andi.rest_crud.domain.PostEntity
import com.andi.rest_crud.dto.PostCreateRequest
import com.andi.rest_crud.dto.PostResponse
import com.andi.rest_crud.dto.PostUpdateRequest
import com.andi.rest_crud.exception.PostNotFoundException
import com.andi.rest_crud.repository.PostRepository
import org.springframework.stereotype.Service

@Service
class PostService(
    private val postRepository: PostRepository
) {

    fun create(request: PostCreateRequest): PostResponse {
        val savedPost = postRepository.save(
            PostEntity(
                title = request.title,
                content = request.content,
                author = request.author
            )
        )

        return PostResponse.from(savedPost)
    }

    fun getAll(): List<PostResponse> {
        return postRepository.findAll()
            .map(PostResponse::from)
    }

    fun getById(id: Long): PostResponse {
        return PostResponse.from(findPostById(id))
    }

    fun update(id: Long, request: PostUpdateRequest): PostResponse {
        val post = findPostById(id)
        post.title = request.title
        post.content = request.content
        post.author = request.author

        val updatedPost = postRepository.save(post)
        return PostResponse.from(updatedPost)
    }

    fun delete(id: Long) {
        val post = findPostById(id)
        postRepository.delete(post)
    }

    private fun findPostById(id: Long): PostEntity {
        return postRepository.findById(id)
            .orElseThrow { PostNotFoundException(id) }
    }
}
