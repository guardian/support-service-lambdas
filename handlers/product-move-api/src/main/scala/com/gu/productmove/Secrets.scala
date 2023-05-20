package com.gu.productmove

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._

import scala.util.{Success, Failure, Try}
import zio.{ULayer, ZIO, ZLayer}
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
    ZIO.fromOption(sys.env.get("stage")).mapError(_ => SecretsError("Failure while extracting stage from environmnt"))

  def parseInvoicingAPISecretsJSONString(str: String): ZIO[Any, ErrorResponse, InvoicingAPISecrets] = {
    Try(read[InvoicingAPISecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(SecretsError(s"Failure while parsing json string: ${s}"))
    }
  }

  def parseZuoraApiUserSecretsJSONString(str: String): ZIO[Any, ErrorResponse, ZuoraApiUserSecrets] = {
    Try(read[ZuoraApiUserSecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(SecretsError(s"Failure while parsing json string: ${s}"))
    }
  }

  def getInvoicingAPISecrets: ZIO[Any, ErrorResponse, InvoicingAPISecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/InvoicingApi"
      secretJsonString = getJSONString(secretId)
      secrets <- parseInvoicingAPISecretsJSONString(secretJsonString)
    } yield secrets
  }

  def getZuoraApiUserSecrets: ZIO[Any, ErrorResponse, ZuoraApiUserSecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Zuora/User/ZuoraApiUser"
      secretJsonString = getJSONString(secretId)
      secrets <- parseZuoraApiUserSecretsJSONString(secretJsonString)
    } yield secrets
  }

  val layer: ZLayer[Any, ErrorResponse, Secrets] = ZLayer.succeed(SecretsLive)
}
