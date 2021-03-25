package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{IdentityConfig, SoftOptInError}
import scalaj.http.Http
import scala.util.Try

//TODO: To make this more testable a (http: HttpRequest): Either[Throwable, HttpResponse[String]] function should
// be passed into the class. This function should take care of the Try(http.asString).toEither
// or it can be Either[SoftOptInError, HttpResponse[String]] and take care of the .left.map(SoftOptInError(...)) as well

class IdentityConnector(config: IdentityConfig) {

  def sendConsentsReq(identityId: String, body: String): Either[SoftOptInError, Unit] = {
    //returns 204 No Content if successful
    //returns 404 Not Found if user not found
    //returns 400 Bad Request if body is malformed
    Try(
      Http(s"${config.identityUrl}/users/$identityId/consents")
        .header("Content-Type", "application/json")
        .header("Authorization", s"Bearer ${config.identityToken}")
        .postData(body)
        .method("PATCH")
        .asString
    ).toEither.left
      .map(i => SoftOptInError("IdentityConnector", s"Identity request failed: $i"))
      .flatMap(response =>
        if (response.isSuccess)
          Right(())
        else
          Left(SoftOptInError("IdentityConnector", s"Identity request failed while processing $identityId with body $body. Status code: ${response.code}"))
      )
  }
}
