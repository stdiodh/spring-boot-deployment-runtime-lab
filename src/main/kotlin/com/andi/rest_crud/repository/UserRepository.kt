package com.andi.rest_crud.repository

import com.andi.rest_crud.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): Optional<User>
    fun existsByEmail(email: String): Boolean
    fun findByAuthProviderAndProviderId(authProvider: String, providerId: String): Optional<User>
}
