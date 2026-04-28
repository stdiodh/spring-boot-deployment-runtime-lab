package com.andi.rest_crud.dto

data class OAuthLoginResponse(
    val email: String,
    val accessToken: String,
    val provider: String,
    val isNewUser: Boolean
)
