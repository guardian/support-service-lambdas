package com.gu.holiday_stops

import com.gu.zuora.subscription.ZuoraApiFailure
import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

/*
  In Secrets Store we have the following JSON object:

  ${Stage}/InvoicingApi
  {
      "InvoicingApiUrl": "REMOVED"
      "InvoicingApiKey": "REMOVED"
  }
 */

case class InvoicingAPISecrets(invoicingApiUrl: String, invoicingApiKey: String)

object Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  def getInvoicingAPISecrets: Either[ZuoraApiFailure, InvoicingAPISecrets] = {
    (for {
      stg <- stage
      secretId: String = s"${stg}/InvoicingApi"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[InvoicingAPISecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ZuoraApiFailure("Could not retrieve InvoicingAPI secrets")))
  }
}
