package com.andi.rest_crud.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
    private val customAuthenticationEntryPoint: CustomAuthenticationEntryPoint,
    private val customOAuthUserService: CustomOAuthUserService,
    private val oAuthLoginSuccessHandler: OAuthLoginSuccessHandler
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling { it.authenticationEntryPoint(customAuthenticationEntryPoint) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(
                        "/",
                        "/index.html",
                        "/auth-demo.html",
                        "/swagger/**",
                        "/v3/api-docs/**",
                        "/auth/signup",
                        "/auth/login",
                        "/account-recovery/password-reset",
                        "/oauth2/**",
                        "/login/oauth2/**"
                    ).permitAll()
                    .requestMatchers("/auth/me").authenticated()
                    .anyRequest().permitAll()
            }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .oauth2Login { oauth ->
                oauth
                    .loginPage("/auth-demo.html")
                    .successHandler(oAuthLoginSuccessHandler)
                    .userInfoEndpoint { userInfo ->
                        userInfo.userService(customOAuthUserService)
                    }
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}
