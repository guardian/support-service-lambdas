package com.gu.soft_opt_in_consent_setter.testData

import scalaj.http.{HttpRequest, HttpResponse}

object HTTP {

  def getRunRequest(body: String, forceThrow: Boolean = false, statusCode: Int = 200): HttpRequest => Either[Throwable, HttpResponse[String]] = {
    def mockedRunRequest(http: HttpRequest): Either[Throwable, HttpResponse[String]] = {
      if (forceThrow)
        Left(new Throwable())
      else
        Right(HttpResponse(body, statusCode, Map.empty[String, IndexedSeq[String]]))
    }

    mockedRunRequest
  }
}
