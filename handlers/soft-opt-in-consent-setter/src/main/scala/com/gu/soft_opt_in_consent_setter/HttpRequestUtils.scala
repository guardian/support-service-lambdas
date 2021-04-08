package com.gu.soft_opt_in_consent_setter

import scalaj.http.{HttpRequest, HttpResponse}
import scala.util.Try

object HttpRequestUtils {
  def tryRequest(http: HttpRequest): Either[Throwable, HttpResponse[String]] = {
    Try(http.asString)
      .toEither
  }
}
