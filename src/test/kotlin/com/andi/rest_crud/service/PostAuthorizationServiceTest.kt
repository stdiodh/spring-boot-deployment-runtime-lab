package com.andi.rest_crud.service

import com.andi.rest_crud.domain.PostEntity
import com.andi.rest_crud.dto.PostCreateRequest
import com.andi.rest_crud.dto.PostUpdateRequest
import com.andi.rest_crud.exception.ForbiddenPostAccessException
import com.andi.rest_crud.repository.PostRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import java.util.Optional

class PostAuthorizationServiceTest {
    private val postRepository = mock(PostRepository::class.java)
    private val postService = PostService(postRepository)

    @Test
    fun `create는 인증된 사용자를 작성자로 저장한다`() {
        val request = PostCreateRequest("제목", "내용")
        `when`(postRepository.save(any(PostEntity::class.java))).thenAnswer { invocation ->
            invocation.getArgument<PostEntity>(0)
        }

        val result = postService.create(request, "owner@example.com")

        assertEquals("owner@example.com", result.author)
    }

    @Test
    fun `update는 작성자가 아니면 거부한다`() {
        val post = PostEntity(1L, "제목", "내용", "owner@example.com")
        `when`(postRepository.findById(1L)).thenReturn(Optional.of(post))

        assertThrows(ForbiddenPostAccessException::class.java) {
            postService.update(1L, PostUpdateRequest("수정", "수정 내용"), "other@example.com")
        }
    }
}
