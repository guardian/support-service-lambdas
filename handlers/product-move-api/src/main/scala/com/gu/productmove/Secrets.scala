package com.gu.productmove

import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
}
import software.amazon.awssdk.services.secretsmanager.*
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default.*
import zio.{RIO, Task, ULayer, ZIO, ZLayer}

import scala.util.{Failure, Success, Try}

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

case class InvoicingAPISecrets(InvoicingApiUrl: String, InvoicingApiKey: String)
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
  def getInvoicingAPISecrets: Task[InvoicingAPISecrets]
  def getZuoraApiUserSecrets: Task[ZuoraApiUserSecrets]
  def getSalesforceSSLSecrets: Task[SalesforceSSLSecrets]
}

object Secrets {
  def getInvoicingAPISecrets: RIO[Secrets, InvoicingAPISecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getInvoicingAPISecrets)
  def getZuoraApiUserSecrets: RIO[Secrets, ZuoraApiUserSecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getZuoraApiUserSecrets)

  def getSalesforceSSLSecrets: RIO[Secrets, SalesforceSSLSecrets] =
    ZIO.environmentWithZIO[Secrets](_.get.getSalesforceSSLSecrets)
}
object SecretsLive extends Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW
  implicit val reader2: Reader[ZuoraApiUserSecrets] = macroRW
  implicit val reader3: Reader[SalesforceSSLSecrets] = macroRW
  private lazy val secretsClient = SecretsManagerClient.builder().credentialsProvider(credentialsProvider).build()
  lazy val credentialsProvider = AwsCredentialsProviderChain
    .builder()
    .credentialsProviders(
      ProfileCredentialsProvider.create(ProfileName),
      EnvironmentVariableCredentialsProvider.create(),
    )
    .build()
  val layer: ULayer[Secrets] = ZLayer.succeed(SecretsLive)
  private val ProfileName = "membership"

  def getInvoicingAPISecrets: Task[InvoicingAPISecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/InvoicingApi"
      secretJsonString = getJSONString(secretId)
      secrets <- parseInvoicingAPISecretsJSONString(secretJsonString)
    } yield secrets
  }

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  def getStage: Task[String] =
    ZIO.succeed(sys.env.getOrElse("Stage", "CODE"))

  def parseInvoicingAPISecretsJSONString(str: String): Task[InvoicingAPISecrets] = {
    Try(read[InvoicingAPISecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(new Throwable(s"Failure while parsing json string: ${s}"))
    }
  }

  def getZuoraApiUserSecrets: Task[ZuoraApiUserSecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Zuora/User/ZuoraApiUser"
      secretJsonString = getJSONString(secretId)
      secrets <- parseZuoraApiUserSecretsJSONString(secretJsonString)
    } yield secrets
  }

  def parseZuoraApiUserSecretsJSONString(str: String): Task[ZuoraApiUserSecrets] = {
    Try(read[ZuoraApiUserSecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(new Throwable(s"Failure while parsing json string: ${s}"))
    }
  }

  def getSalesforceSSLSecrets: Task[SalesforceSSLSecrets] = {
    for {
      stg <- getStage
      secretId: String = s"${stg}/Salesforce/User/SupportServiceLambdas"
      secretJsonString = getJSONString(secretId)
      secrets <- parseSalesforceSSLSecretsJSONString(secretJsonString)
    } yield secrets
  }

  def parseSalesforceSSLSecretsJSONString(str: String): Task[SalesforceSSLSecrets] = {
    Try(read[SalesforceSSLSecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(new Throwable(s"Failure while parsing json string: ${s}"))
    }
  }
}
