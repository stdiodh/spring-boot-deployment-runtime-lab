package com.andi.rest_crud.exception

class ForbiddenPostAccessException(id: Long) : RuntimeException("id=$id 게시글을 수정하거나 삭제할 권한이 없습니다.")
