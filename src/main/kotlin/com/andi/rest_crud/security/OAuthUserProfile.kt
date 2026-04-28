package com.andi.rest_crud.security

data class OAuthUserProfile(
    val provider: String,
    val providerId: String,
    val email: String
)
