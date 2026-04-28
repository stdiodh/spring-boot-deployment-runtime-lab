package com.andi.rest_crud.controller

import com.andi.rest_crud.dto.PasswordResetMailRequest
import com.andi.rest_crud.service.AccountRecoveryService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/account-recovery")
class AccountRecoveryController(
    private val accountRecoveryService: AccountRecoveryService
) {

    @PostMapping("/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun requestPasswordReset(@Valid @RequestBody request: PasswordResetMailRequest) {
        accountRecoveryService.requestPasswordReset(request.email)
    }
}
