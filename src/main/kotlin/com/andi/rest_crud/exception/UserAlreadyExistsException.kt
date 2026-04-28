package com.andi.rest_crud.exception

class UserAlreadyExistsException(email: String) : RuntimeException("이미 가입된 이메일입니다. email=$email")
