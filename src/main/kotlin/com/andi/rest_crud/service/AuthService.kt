package com.andi.rest_crud.service

import com.andi.rest_crud.domain.User
import com.andi.rest_crud.dto.CurrentUserResponse
import com.andi.rest_crud.dto.LoginRequest
import com.andi.rest_crud.dto.TokenResponse
import com.andi.rest_crud.dto.UserSignUpRequest
import com.andi.rest_crud.exception.InvalidCredentialsException
import com.andi.rest_crud.exception.UserAlreadyExistsException
import com.andi.rest_crud.repository.UserRepository
import com.andi.rest_crud.security.JwtTokenProvider
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider
) {

    fun signUp(request: UserSignUpRequest) {
        val email = requireNotNull(request.email)
        val rawPassword = requireNotNull(request.password)
        val encodedPassword = requireNotNull(passwordEncoder.encode(rawPassword))

        if (userRepository.existsByEmail(email)) {
            throw UserAlreadyExistsException(email)
        }

        userRepository.save(
            User(
                email = email,
                password = encodedPassword
            )
        )
    }

    fun login(request: LoginRequest): TokenResponse {
        val email = requireNotNull(request.email)
        val rawPassword = requireNotNull(request.password)
        val user = userRepository.findByEmail(email)
            .orElseThrow { InvalidCredentialsException() }

        if (!passwordEncoder.matches(rawPassword, requireNotNull(user.password))) {
            throw InvalidCredentialsException()
        }

        return TokenResponse(
            accessToken = jwtTokenProvider.createToken(requireNotNull(user.email))
        )
    }

    fun getCurrentUser(email: String): CurrentUserResponse {
        val user = userRepository.findByEmail(email)
            .orElseThrow { InvalidCredentialsException() }

        return CurrentUserResponse(email = requireNotNull(user.email))
    }
}
