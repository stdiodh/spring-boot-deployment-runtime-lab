package com.andi.rest_crud.exception

data class ErrorResponse(
    val code: String,
    val message: String,
    val errors: Map<String, String> = emptyMap()
)
