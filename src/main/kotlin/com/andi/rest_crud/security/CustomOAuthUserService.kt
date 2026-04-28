package com.andi.rest_crud.security

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Service

@Service
class CustomOAuthUserService : OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private val delegate = DefaultOAuth2UserService()

    override fun loadUser(userRequest: OAuth2UserRequest): OAuth2User {
        val oauthUser = delegate.loadUser(userRequest)
        val provider = userRequest.clientRegistration.registrationId.uppercase()
        val email = oauthUser.getAttribute<String>("email")
            ?: throw IllegalStateException("OAuth 응답에서 email을 찾을 수 없습니다.")
        val providerId = oauthUser.getAttribute<String>("sub")
            ?: throw IllegalStateException("OAuth 응답에서 provider id를 찾을 수 없습니다.")

        val attributes = oauthUser.attributes.toMutableMap().apply {
            put("provider", provider)
            put("providerId", providerId)
            put("email", email)
        }

        return DefaultOAuth2User(
            oauthUser.authorities,
            attributes,
            "email"
        )
    }
}
