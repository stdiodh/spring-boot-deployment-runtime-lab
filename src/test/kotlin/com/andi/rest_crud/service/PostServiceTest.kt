package com.andi.rest_crud.service

import com.andi.rest_crud.domain.PostEntity
import com.andi.rest_crud.exception.PostNotFoundException
import com.andi.rest_crud.repository.PostRepository
import com.andi.rest_crud.support.TestFixtureFactory
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import java.util.Optional

class PostServiceTest {

    private val postRepository: PostRepository = mock(PostRepository::class.java)
    private val postService = PostService(postRepository)

    @Test
    fun `create는 요청 값을 저장하고 응답으로 돌려준다`() {
        val request = TestFixtureFactory.postCreateRequest()
        val savedPost = TestFixtureFactory.postEntity(
            id = 1L,
            title = request.title,
            content = request.content,
            author = request.author
        )
        `when`(postRepository.save(any(PostEntity::class.java))).thenReturn(savedPost)

        val result = postService.create(request)

        assertEquals(1L, result.id)
        assertEquals(request.title, result.title)
        assertEquals(request.content, result.content)
        assertEquals(request.author, result.author)
    }

    @Test
    fun `getById는 없는 게시글 id면 예외 흐름을 확인한다`() {
        `when`(postRepository.findById(999L)).thenReturn(Optional.empty())

        assertThrows(PostNotFoundException::class.java) {
            postService.getById(999L)
        }
    }
}
