package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.Sync
import com.gu.salesforce.SalesforceClientCredentials
import com.gu.util.config.Stage
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.util.Try

object SalesforceCredentials {

  private val connectedAppSecretPath = "Salesforce/ConnectedApp/PrintFulfilment"

  def load[F[_]: Sync](
      stage: Stage,
      fetchSecret: String => Try[String],
  ): EitherT[F, DeliveryRecordsApiError, SalesforceClientCredentials] =
    EitherT(Sync[F].delay(loadSync(stage, fetchSecret)))

  private[delivery_records_api] def secretName(stage: Stage): String =
    s"${stage.value}/$connectedAppSecretPath"

  private def loadSync(
      stage: Stage,
      fetchSecret: String => Try[String],
  ): Either[DeliveryRecordsApiError, SalesforceClientCredentials] =
    for {
      secret <- fetchSecret(secretName(stage)).toEither.left.map(error =>
        DeliveryRecordsApiError(s"Failed to read Salesforce secret (${error.getClass.getSimpleName})"),
      )
      credentials <- decode[SalesforceClientCredentials](secret).left.map(_ =>
        DeliveryRecordsApiError("Salesforce secret has invalid JSON or missing fields"),
      )
      validated <- validate(credentials)
    } yield validated

  private def validate(
      credentials: SalesforceClientCredentials,
  ): Either[DeliveryRecordsApiError, SalesforceClientCredentials] = {
    val emptyFields = List(
      "authUrl" -> credentials.authUrl,
      "clientId" -> credentials.clientId,
      "clientSecret" -> credentials.clientSecret,
    ).collect { case (name, value) if value.trim.isEmpty => name }

    Either.cond(
      emptyFields.isEmpty,
      credentials,
      DeliveryRecordsApiError(s"Salesforce secret has empty fields: ${emptyFields.mkString(", ")}"),
    )
  }
}
