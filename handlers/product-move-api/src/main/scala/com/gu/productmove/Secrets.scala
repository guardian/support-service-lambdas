package com.gu.productmove

import software.amazon.awssdk.services.secretsmanager.*
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

import zio.{ZIO, ZLayer, ULayer}

/*
  In Secrets Store we have the following JSON objects:

  ${Stage}/InvoicingApi
  {
      "InvoicingApiUrl":"REMOVED",
      "InvoicingApiKey":"REMOVED"
  }

  ${Stage}/Zuora/User/ZuoraApiUser
  {
      "baseUrl":"REMOVED"
      "username":"REMOVED",
      "password":"REMOVED",
  }
 */

case class InvoicingAPISecrets(invoicingApiUrl: String, invoicingApiKey: String)
case class ZuoraApiUserSecrets(baseUrl: String, username: String, password: String)

case class Secrets(invoicing: InvoicingAPISecrets, zuora: ZuoraApiUserSecrets)

object Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW
  implicit val reader2: Reader[ZuoraApiUserSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  def getInvoicingAPISecrets: Option[InvoicingAPISecrets] = {
    for {
      stg <- stage
      secretId: String = s"${stg}/InvoicingApi"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[InvoicingAPISecrets](secretJsonString)).toOption
    } yield secrets
  }

  def getZuoraApiUserSecrets: Option[ZuoraApiUserSecrets] = {
    for {
      stg <- stage
      secretId: String = s"${stg}/Zuora/User/ZuoraApiUser"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[ZuoraApiUserSecrets](secretJsonString)).toOption
    } yield secrets
  }

  val layer: ULayer[Secrets] = ZLayer.succeed(
    Secrets(
      InvoicingAPISecrets("invoicingApiUrl", "invoicingApiKey"),
      ZuoraApiUserSecrets("baseUrl", "username", "password"),
    ),
  )

  // for {
  //  invoicing <- getInvoicingAPISecrets
  //  zuora <- getZuoraApiUserSecrets
  // } yield Secrets(invoicing, zuora)
}
