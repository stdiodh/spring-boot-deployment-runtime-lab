package com.andi.rest_crud.support

import com.andi.rest_crud.domain.PostEntity
import com.andi.rest_crud.domain.User
import com.andi.rest_crud.dto.LoginRequest
import com.andi.rest_crud.dto.PostCreateRequest

object TestFixtureFactory {

    fun postCreateRequest(
        title: String = "테스트 제목",
        content: String = "테스트 내용",
        author: String = "tester"
    ): PostCreateRequest = PostCreateRequest(
        title = title,
        content = content,
        author = author
    )

    fun postEntity(
        id: Long = 1L,
        title: String = "테스트 제목",
        content: String = "테스트 내용",
        author: String = "tester"
    ): PostEntity = PostEntity(
        id = id,
        title = title,
        content = content,
        author = author
    )

    fun loginRequest(
        email: String = "tester@example.com",
        password: String = "password123"
    ): LoginRequest = LoginRequest(
        email = email,
        password = password
    )

    fun user(
        id: Long = 1L,
        email: String = "tester@example.com",
        password: String = "encoded-password",
        authProvider: String = "LOCAL",
        providerId: String? = null
    ): User = User(
        id = id,
        email = email,
        password = password,
        authProvider = authProvider,
        providerId = providerId
    )
}
