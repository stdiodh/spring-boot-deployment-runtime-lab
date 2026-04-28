package com.andi.rest_crud.service

import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Component

@Component
class SmtpRecoveryMailSender(
    private val mailSender: JavaMailSender
) : RecoveryMailSender {

    override fun sendPasswordResetMail(email: String, resetLink: String) {
        val message = SimpleMailMessage().apply {
            setTo(email)
            subject = "[A&I] 비밀번호 재설정 링크"
            text = """
                비밀번호 재설정 요청이 접수되었습니다.

                아래 링크로 이동해 다음 단계를 진행하세요.
                $resetLink
            """.trimIndent()
        }

        mailSender.send(message)
    }
}
