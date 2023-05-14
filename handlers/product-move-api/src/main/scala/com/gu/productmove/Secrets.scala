package com.gu.productmove

import software.amazon.awssdk.services.secretsmanager.*
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

import zio.{ZIO, ZLayer, ULayer}

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, SecretsError}

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

trait Secrets {
  def getInvoicingAPISecrets: ZIO[Any, ErrorResponse, InvoicingAPISecrets]
  def getZuoraApiUserSecrets: ZIO[Any, ErrorResponse, ZuoraApiUserSecrets]
}

object Secrets {
  def getInvoicingAPISecrets: ZIO[Secrets, ErrorResponse, InvoicingAPISecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getInvoicingAPISecrets)
  def getZuoraApiUserSecrets: ZIO[Secrets, ErrorResponse, ZuoraApiUserSecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getZuoraApiUserSecrets)
}
object SecretsLive extends Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW
  implicit val reader2: Reader[ZuoraApiUserSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  def getStage: ZIO[Any, ErrorResponse, String] =
    sys.env.get("stage") match {
      case None => ZIO.fail(SecretsError("Not"))
      case Some(str) => ZIO.succeed(str)
    }

  def getInvoicingAPISecrets: ZIO[Any, ErrorResponse, InvoicingAPISecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Zuora/User/ZuoraApiUser"
      secretJsonString = getJSONString(secretId)
      secrets <- ZIO.succeed(read[InvoicingAPISecrets](secretJsonString))
    } yield secrets
  }

  def getZuoraApiUserSecrets: ZIO[Any, ErrorResponse, ZuoraApiUserSecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Zuora/User/ZuoraApiUser"
      secretJsonString = getJSONString(secretId)
      secrets <- ZIO.succeed(read[ZuoraApiUserSecrets](secretJsonString))
    } yield secrets
  }

  val layer: ZLayer[Any, ErrorResponse, Secrets] = ZLayer.succeed(SecretsLive)
}
