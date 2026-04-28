package com.andi.rest_crud.security

import com.andi.rest_crud.service.OAuthAccountService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class OAuthLoginSuccessHandler(
    @Value("\${app.frontend-url}") private val frontendUrl: String,
    private val oAuthAccountService: OAuthAccountService
) : AuthenticationSuccessHandler {

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication
    ) {
        val oauthAuthentication = authentication as OAuth2AuthenticationToken
        val oauthUser = oauthAuthentication.principal as OAuth2User

        val profile = OAuthUserProfile(
            provider = oauthAuthentication.authorizedClientRegistrationId.uppercase(),
            providerId = oauthUser.getAttribute<String>("providerId")
                ?: throw IllegalStateException("OAuth provider id를 읽을 수 없습니다."),
            email = oauthUser.getAttribute<String>("email")
                ?: throw IllegalStateException("OAuth email을 읽을 수 없습니다.")
        )

        val loginResponse = oAuthAccountService.handleOAuthLogin(profile)
        val redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("oauth", "success")
            .queryParam("provider", loginResponse.provider)
            .queryParam("email", loginResponse.email)
            .queryParam("isNewUser", loginResponse.isNewUser)
            .queryParam("token", loginResponse.accessToken)
            .build()
            .toUriString()

        response.sendRedirect(redirectUrl)
    }
}
