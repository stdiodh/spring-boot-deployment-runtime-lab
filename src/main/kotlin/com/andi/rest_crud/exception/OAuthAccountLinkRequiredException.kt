package com.andi.rest_crud.exception

class OAuthAccountLinkRequiredException : RuntimeException("기존 계정 연결에는 사용자의 명시적인 확인이 필요합니다.")
