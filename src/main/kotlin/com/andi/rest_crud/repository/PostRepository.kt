package com.andi.rest_crud.repository

import com.andi.rest_crud.domain.PostEntity
import org.springframework.data.jpa.repository.JpaRepository

interface PostRepository : JpaRepository<PostEntity, Long>
