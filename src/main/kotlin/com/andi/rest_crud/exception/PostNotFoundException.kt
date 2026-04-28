package com.andi.rest_crud.exception

class PostNotFoundException(id: Long) : RuntimeException("id=$id 에 해당하는 게시글이 없습니다.")
