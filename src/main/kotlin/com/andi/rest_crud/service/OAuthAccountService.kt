package com.andi.rest_crud.service

import com.andi.rest_crud.domain.User
import com.andi.rest_crud.dto.OAuthLoginResponse
import com.andi.rest_crud.exception.OAuthAccountLinkRequiredException
import com.andi.rest_crud.repository.UserRepository
import com.andi.rest_crud.security.JwtTokenProvider
import com.andi.rest_crud.security.OAuthUserProfile
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class OAuthAccountService(
    private val userRepository: UserRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val passwordEncoder: PasswordEncoder
) {

    fun handleOAuthLogin(profile: OAuthUserProfile): OAuthLoginResponse {
        require(profile.emailVerified) { "검증된 OAuth email만 사용할 수 있습니다." }
        val linkResult = linkOrCreateUser(profile)
        return createSuccessResponse(linkResult.user, linkResult.isNewUser)
    }

    private fun linkOrCreateUser(profile: OAuthUserProfile): OAuthLinkResult {
        val provider = profile.provider.uppercase()

        val existingOAuthUser = userRepository.findByAuthProviderAndProviderId(provider, profile.providerId)
            .orElse(null)

        if (existingOAuthUser != null) {
            if (existingOAuthUser.email != profile.email && userRepository.existsByEmail(profile.email)) {
                throw OAuthAccountLinkRequiredException()
            }
            existingOAuthUser.email = profile.email
            val savedUser = userRepository.save(existingOAuthUser)
            return OAuthLinkResult(savedUser, false)
        }

        val existingEmailUser = userRepository.findByEmail(profile.email)
            .orElse(null)

        if (existingEmailUser != null) {
            throw OAuthAccountLinkRequiredException()
        }

        val newUser = userRepository.save(
            User(
                email = profile.email,
                password = requireNotNull(passwordEncoder.encode(UUID.randomUUID().toString())),
                authProvider = provider,
                providerId = profile.providerId
            )
        )

        return OAuthLinkResult(newUser, true)
    }

    private fun createSuccessResponse(user: User, isNewUser: Boolean): OAuthLoginResponse {
        val email = requireNotNull(user.email)

        return OAuthLoginResponse(
            email = email,
            accessToken = jwtTokenProvider.createToken(email),
            provider = requireNotNull(user.authProvider),
            isNewUser = isNewUser
        )
    }

    private data class OAuthLinkResult(
        val user: User,
        val isNewUser: Boolean
    )
}
