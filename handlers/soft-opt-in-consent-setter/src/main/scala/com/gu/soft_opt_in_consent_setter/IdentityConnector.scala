package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import scalaj.http.Http
import scala.util.Try

//TODO: To make this more testable a (http: HttpRequest): Either[Throwable, HttpResponse[String]] function should
// be passed into the class. This function should take care of the Try(http.asString).toEither
// or it can be Either[SoftOptInError, HttpResponse[String]] and take care of the .left.map(SoftOptInError(...)) as well
class IdentityConnector(IdentityHost: String, authToken: String) {
  def sendConsentsReq(identityId: String, body: String): Either[SoftOptInError, Unit] = {
    Try(Http(s"$IdentityHost/users/$identityId/consents")
      .header("Content-Type", "application/json")
      .header("Authorization", s"Bearer $authToken")
      .postData(body)
      .method("PATCH")
      .asString)
      .toEither
      .left
      .map(i => SoftOptInError("IdentityConnector", s"Identity request failed: $i"))
      .flatMap(response =>
        if (response.isSuccess)
          Right()
        else
          Left(SoftOptInError("IdentityConnector", s"Identity request failed while processing $identityId with body $body. Status code: ${response.code}"))

      )
  }
}
