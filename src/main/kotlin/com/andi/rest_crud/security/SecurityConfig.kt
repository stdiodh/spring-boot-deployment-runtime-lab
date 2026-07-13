package com.andi.rest_crud.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
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
                    .requestMatchers(HttpMethod.GET, "/posts", "/posts/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/posts").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/posts/**").authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/posts/**").authenticated()
                    .requestMatchers("/auth/me").authenticated()
                    .anyRequest().authenticated()
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
