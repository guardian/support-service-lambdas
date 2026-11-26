package com.gu.deliveryproblemcreditprocessor

import com.gu.salesforce.SalesforceClientCredentials
import com.gu.util.config.Stage
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.util.Try

case class SalesforceCredentialsError(message: String)

object SalesforceCredentials {

  private val connectedAppSecretPath = "Salesforce/ConnectedApp/PrintFulfilment"

  def load(
      stage: Stage,
      fetchSecret: String => Try[String],
  ): Either[SalesforceCredentialsError, SalesforceClientCredentials] =
    for {
      secret <- fetchSecret(secretName(stage)).toEither.left.map(error =>
        SalesforceCredentialsError(s"Failed to read Salesforce secret (${error.getClass.getSimpleName})"),
      )
      credentials <- decode[SalesforceClientCredentials](secret).left.map(_ =>
        SalesforceCredentialsError("Salesforce secret has invalid JSON or missing fields"),
      )
      validated <- validate(credentials)
    } yield validated

  private[deliveryproblemcreditprocessor] def secretName(stage: Stage): String =
    s"${stage.value}/$connectedAppSecretPath"

  private def validate(
      credentials: SalesforceClientCredentials,
  ): Either[SalesforceCredentialsError, SalesforceClientCredentials] = {
    val emptyFields = List(
      "authUrl" -> credentials.authUrl,
      "clientId" -> credentials.clientId,
      "clientSecret" -> credentials.clientSecret,
    ).collect { case (name, value) if value.trim.isEmpty => name }

    Either.cond(
      emptyFields.isEmpty,
      credentials,
      SalesforceCredentialsError(s"Salesforce secret has empty fields: ${emptyFields.mkString(", ")}"),
    )
  }
}
