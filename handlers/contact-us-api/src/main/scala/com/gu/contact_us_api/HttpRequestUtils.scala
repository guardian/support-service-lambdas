package com.gu.contact_us_api

import com.gu.contact_us_api.models.ContactUsError
import scalaj.http.{HttpRequest, HttpResponse}

import scala.util.Try

object HttpRequestUtils {
  def runSafeRequest(http: HttpRequest): Either[ContactUsError, HttpResponse[String]] = {
    Try(http.asString).toEither.left
      .map(i => ContactUsError("Fatal", s"Salesforce request failed: $i"))
  }
}
