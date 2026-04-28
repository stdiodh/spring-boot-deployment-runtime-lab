package com.andi.rest_crud.service

interface RecoveryMailSender {
    fun sendPasswordResetMail(email: String, resetLink: String)
}
