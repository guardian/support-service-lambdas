package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{IdentityConfig, SoftOptInError}

class IdentityConnector(config: IdentityConfig) {

  def sendConsentsReq(identityId: String, body: String): Either[SoftOptInError, Unit] = {
    handleConsentsResp(
      sendReq(url = s"${config.identityUrl}/users/$identityId/consents", body),
      errorDesc = s"Identity request failed while processing $identityId with body $body",
    )
  }

  def sendReq(url: String, body: String): Either[Throwable, HttpResponse] =
    HttpClient.patch(
      url,
      body,
      headers = Seq(
        "Content-Type" -> "application/json",
        "Authorization" -> s"Bearer ${config.identityToken}",
      ),
    )

  def handleConsentsResp(
      response: Either[Throwable, HttpResponse],
      errorDesc: String = "",
  ): Either[SoftOptInError, Unit] = {
    response.left
      .map(i => SoftOptInError(s"IdentityConnector: Identity request failed: $i", i))
      .flatMap { response =>
        if (response.isSuccess)
          Right(())
        else
          Left(
            SoftOptInError(
              s"IdentityConnector $errorDesc. Status code: ${response.code}",
              cause = new Exception(response.body),
              statusCode = Some(response.code),
            ),
          )
      }
  }

}
