package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.IdentityConnector
import com.gu.soft_opt_in_consent_setter.models.IdentityConfig
import com.gu.soft_opt_in_consent_setter.testData.HTTP.getRunRequest
import scalaj.http.HttpResponse

object IdentityConnector {
  val fakeIdentityConfig = IdentityConfig("url", "token")

  val successfulResponse: Either[Throwable, HttpResponse[String]] = Right(HttpResponse("", 200, Map.empty[String, IndexedSeq[String]]))
  val thrownResponse: Either[Throwable, HttpResponse[String]] = Left(new Throwable())
  val failedResponse: Either[Throwable, HttpResponse[String]] = Right(HttpResponse("", 400, Map.empty[String, IndexedSeq[String]]))
}
