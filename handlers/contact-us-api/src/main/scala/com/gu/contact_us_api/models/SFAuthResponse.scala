package com.gu.contact_us_api.models

trait SFAuthResponse

case class SFAuthSuccess(access_token: String) extends SFAuthResponse

case class SFAuthFailure(error: String, error_description: String) extends SFAuthResponse
