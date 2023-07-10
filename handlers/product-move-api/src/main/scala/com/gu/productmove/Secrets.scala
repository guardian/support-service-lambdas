package com.gu.productmove

import software.amazon.awssdk.services.secretsmanager.*
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default.*

import scala.util.{Try, Success, Failure}
import zio.{ZIO, ULayer, ZLayer}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{SecretsError, ErrorResponse}
import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  ProfileCredentialsProvider,
  EnvironmentVariableCredentialsProvider,
}

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

  ${Stage}/Salesforce/User/SupportServiceLambdas
  {
      "url":
      "client_id":
      "client_secret":
      "username":
      "password":
      "token":
  }
 */

case class InvoicingAPISecrets(invoicingApiUrl: String, invoicingApiKey: String)
case class ZuoraApiUserSecrets(baseUrl: String, username: String, password: String)
case class SalesforceSSLSecrets(
    url: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
    token: String,
)

trait Secrets {
  def getInvoicingAPISecrets: ZIO[Any, ErrorResponse, InvoicingAPISecrets]
  def getZuoraApiUserSecrets: ZIO[Any, ErrorResponse, ZuoraApiUserSecrets]
  def getSalesforceSSLSecrets: ZIO[Any, ErrorResponse, SalesforceSSLSecrets]
}

object Secrets {
  def getInvoicingAPISecrets: ZIO[Secrets, ErrorResponse, InvoicingAPISecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getInvoicingAPISecrets)
  def getZuoraApiUserSecrets: ZIO[Secrets, ErrorResponse, ZuoraApiUserSecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getZuoraApiUserSecrets)

  def getSalesforceSSLSecrets: ZIO[Secrets, ErrorResponse, SalesforceSSLSecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getSalesforceSSLSecrets)
}
object SecretsLive extends Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW
  implicit val reader2: Reader[ZuoraApiUserSecrets] = macroRW
  implicit val reader3: Reader[SalesforceSSLSecrets] = macroRW

  private val ProfileName = "membership"

  val credentialsProvider = AwsCredentialsProviderChain
    .builder()
    .credentialsProviders(
      ProfileCredentialsProvider.create(ProfileName),
      EnvironmentVariableCredentialsProvider.create(),
    )
    .build()
  private lazy val secretsClient = SecretsManagerClient.builder().credentialsProvider(credentialsProvider).build()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  def getStage: ZIO[Any, ErrorResponse, String] =
    ZIO.fromOption(sys.env.get("Stage")).mapError(_ => SecretsError("Failure while extracting stage from environment"))

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

  def parseSalesforceSSLSecretsJSONString(str: String): ZIO[Any, ErrorResponse, SalesforceSSLSecrets] = {
    Try(read[SalesforceSSLSecrets](str)) match {
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

  def getSalesforceSSLSecrets: ZIO[Any, ErrorResponse, SalesforceSSLSecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Salesforce/User/SupportServiceLambdas"
      secretJsonString = getJSONString(secretId)
      secrets <- parseSalesforceSSLSecretsJSONString(secretJsonString)
    } yield secrets
  }

  val layer: ZLayer[Any, ErrorResponse, Secrets] = ZLayer.succeed(SecretsLive)
}
