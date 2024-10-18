package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProvider,
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
}
import software.amazon.awssdk.regions.Region
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
  def getZuoraApiUserSecrets: Try[ZuoraApiUserSecrets]
  def getSalesforceSSLSecrets: Task[SalesforceSSLSecrets]
}

class SecretsLive(secretsClient: SecretsManagerClient, stage: Stage) extends Secrets {

  implicit val reader1: Reader[InvoicingAPISecrets] = macroRW
  implicit val reader2: Reader[ZuoraApiUserSecrets] = macroRW
  implicit val reader3: Reader[SalesforceSSLSecrets] = macroRW

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  def parseInvoicingAPISecretsJSONString(str: String): Task[InvoicingAPISecrets] = {
    Try(read[InvoicingAPISecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(new Throwable(s"Failure while parsing json string: ${s}"))
    }
  }

  def parseZuoraApiUserSecretsJSONString(str: String): Try[ZuoraApiUserSecrets] =
    Try(read[ZuoraApiUserSecrets](str)).toEither.left.map { s =>
      new Throwable(s"Failure while parsing json string: $s", s)
    }.toTry

  def parseSalesforceSSLSecretsJSONString(str: String): Task[SalesforceSSLSecrets] = {
    Try(read[SalesforceSSLSecrets](str)) match {
      case Success(x) => ZIO.succeed(x)
      case Failure(s) => ZIO.fail(new Throwable(s"Failure while parsing json string: ${s}"))
    }
  }

  def getInvoicingAPISecrets: Task[InvoicingAPISecrets] = {
    val secretId: String = s"$stage/InvoicingApi"
    val secretJsonString = getJSONString(secretId)
    parseInvoicingAPISecretsJSONString(secretJsonString)
  }

  def getZuoraApiUserSecrets: Try[ZuoraApiUserSecrets] = {
    val secretId: String = s"$stage/Zuora/User/ZuoraApiUser"
    val secretJsonString = getJSONString(secretId)
    parseZuoraApiUserSecretsJSONString(secretJsonString)
  }

  def getSalesforceSSLSecrets: Task[SalesforceSSLSecrets] = {
    val secretId: String = s"$stage/Salesforce/User/SupportServiceLambdas"
    val secretJsonString = getJSONString(secretId)
    parseSalesforceSSLSecretsJSONString(secretJsonString)
  }

}

object SecretsLive {

  val layer: ZLayer[AwsCredentialsProvider with Stage, Throwable, Secrets] =
    ZLayer.scoped {
      for {
        creds <- ZIO.service[AwsCredentialsProvider]
        stage <- ZIO.service[Stage]
        s3Client <- ZIO.fromAutoCloseable(ZIO.attempt(impl2(creds)))
      } yield SecretsLive(s3Client, stage)
    }

  def impl(creds: AwsCredentialsProvider, stage: Stage): SecretsLive = SecretsLive(impl2(creds), stage)

  private def impl2(creds: AwsCredentialsProvider): SecretsManagerClient =
    SecretsManagerClient
      .builder()
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()

}
