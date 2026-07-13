package com.andi.rest_crud.service

import com.andi.rest_crud.domain.User
import com.andi.rest_crud.exception.OAuthAccountLinkRequiredException
import com.andi.rest_crud.repository.UserRepository
import com.andi.rest_crud.security.JwtTokenProvider
import com.andi.rest_crud.security.OAuthUserProfile
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.Optional

class OAuthAccountServiceTest {
    private val userRepository = mock(UserRepository::class.java)
    private val jwtTokenProvider = mock(JwtTokenProvider::class.java)
    private val passwordEncoder = mock(PasswordEncoder::class.java)
    private val service = OAuthAccountService(userRepository, jwtTokenProvider, passwordEncoder)

    @Test
    fun `검증되지 않은 email은 OAuth 로그인에 사용하지 않는다`() {
        val profile = OAuthUserProfile("GOOGLE", "provider-id", "user@example.com", false)

        assertThrows(IllegalArgumentException::class.java) {
            service.handleOAuthLogin(profile)
        }
    }

    @Test
    fun `기존 로컬 계정은 명시적 확인 없이 자동 연결하지 않는다`() {
        val profile = OAuthUserProfile("GOOGLE", "provider-id", "user@example.com", true)
        val localUser = User(email = profile.email, password = "encoded")
        `when`(userRepository.findByAuthProviderAndProviderId("GOOGLE", "provider-id"))
            .thenReturn(Optional.empty())
        `when`(userRepository.findByEmail(profile.email)).thenReturn(Optional.of(localUser))

        assertThrows(OAuthAccountLinkRequiredException::class.java) {
            service.handleOAuthLogin(profile)
        }
    }
}
