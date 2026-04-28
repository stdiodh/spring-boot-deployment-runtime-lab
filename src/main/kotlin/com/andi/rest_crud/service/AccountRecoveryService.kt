package com.andi.rest_crud.service

import com.andi.rest_crud.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.util.UriComponentsBuilder
import java.util.UUID

@Service
class AccountRecoveryService(
    private val userRepository: UserRepository,
    private val recoveryMailSender: RecoveryMailSender,
    @Value("\${app.password-reset-url}") private val passwordResetUrl: String
) {

    fun requestPasswordReset(email: String) {
        val user = userRepository.findByEmail(email).orElse(null) ?: return
        val resetLink = createResetLink(user.email)
        recoveryMailSender.sendPasswordResetMail(user.email, resetLink)
    }

    fun createResetLink(email: String): String {
        val resetToken = UUID.randomUUID().toString()

        return UriComponentsBuilder.fromUriString(passwordResetUrl)
            .queryParam("recovery", "password-reset")
            .queryParam("email", email)
            .queryParam("token", resetToken)
            .build()
            .toUriString()
    }
}
