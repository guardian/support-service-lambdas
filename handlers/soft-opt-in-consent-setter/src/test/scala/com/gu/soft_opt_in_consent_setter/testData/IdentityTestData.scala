package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.IdentityConfig
import com.gu.soft_opt_in_consent_setter.HttpResponse

object IdentityTestData {
  val fakeIdentityConfig = IdentityConfig("url", "token")

  val successfulResponse: Either[Throwable, HttpResponse] = Right(
    HttpResponse("", 200),
  )
  val thrownResponse: Either[Throwable, HttpResponse] = Left(new Throwable())
  val failedResponse: Either[Throwable, HttpResponse] = Right(
    HttpResponse("", 400),
  )
}
