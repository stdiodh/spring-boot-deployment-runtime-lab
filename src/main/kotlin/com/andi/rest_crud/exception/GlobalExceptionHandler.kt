package com.andi.rest_crud.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleValidationException(exception: MethodArgumentNotValidException): ErrorResponse {
        val errors = exception.bindingResult.fieldErrors
            .associate { fieldError -> fieldError.field to (fieldError.defaultMessage ?: "잘못된 요청입니다.") }

        return ErrorResponse(
            code = "VALIDATION_ERROR",
            message = "입력값 검증에 실패했습니다.",
            errors = errors
        )
    }

    @ExceptionHandler(PostNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handlePostNotFoundException(exception: PostNotFoundException): ErrorResponse {
        return ErrorResponse(
            code = "POST_NOT_FOUND",
            message = exception.message ?: "게시글을 찾을 수 없습니다."
        )
    }

    @ExceptionHandler(UserAlreadyExistsException::class)
    @ResponseStatus(HttpStatus.CONFLICT)
    fun handleUserAlreadyExistsException(exception: UserAlreadyExistsException): ErrorResponse {
        return ErrorResponse(
            code = "USER_ALREADY_EXISTS",
            message = exception.message ?: "이미 가입된 사용자입니다."
        )
    }

    @ExceptionHandler(InvalidCredentialsException::class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    fun handleInvalidCredentialsException(exception: InvalidCredentialsException): ErrorResponse {
        return ErrorResponse(
            code = "INVALID_CREDENTIALS",
            message = exception.message ?: "인증에 실패했습니다."
        )
    }

}
