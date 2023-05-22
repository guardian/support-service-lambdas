package com.gu.digitalvouchersuspensionprocessor

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._

import scala.util.Try

/*
  In Secrets Store we have the following JSON objects:

  ${SalesforceStage}/Salesforce/ConnectedApp/${AppName}
  // SalesforceStage is the standard GU stage
  {
      "name"         : "REMOVED",
      "clientId"     : "REMOVED",
      "clientSecret" : "REMOVED",
      "authUrl"      : "REMOVED"
  }

  ${SalesforceStage}/Salesforce/User/MembersDataAPI
  // SalesforceStage is the standard GU stage
  {
      "username" : "REMOVED",
      "password" : "REMOVED",
      "token"    : "REMOVED"
  }

  ${Stage}/Imovo
  {
      "apiKey" : "REMOVED"
  }
 */

case class SalesforceSecrets(clientId: String, clientSecret: String)
case class MembersDataAPISecrets(username: String, password: String, token: String)
case class ImovoSecrets(apiKey: String)

object Secrets {

  implicit val reader1: Reader[SalesforceSecrets] = macroRW
  implicit val reader2: Reader[MembersDataAPISecrets] = macroRW
  implicit val reader3: Reader[ImovoSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  lazy val appNameMapping: Map[String, String] = Map(
    "PROD" -> "TouchpointUpdate",
    "CODE" -> "AwsConnectorSandbox",
  )

  def getSalesforceSecrets: Either[ConfigFailure, SalesforceSecrets] = {
    (for {
      stg <- stage
      app <- appNameMapping.get(stg)
      secretId: String = s"${stg}/Salesforce/ConnectedApp/${app}"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceSecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ConfigFailure("Could not retrieve Salesforce secrets")))
  }

  def getMembersDataAPISecrets: Either[ConfigFailure, MembersDataAPISecrets] = {
    (for {
      stg <- stage
      secretId: String = s"${stg}/Salesforce/User/MembersDataAPI"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[MembersDataAPISecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ConfigFailure("Could not retrieve MembersDataAPI secrets")))
  }

  def getImovoSecrets: Either[ConfigFailure, ImovoSecrets] = {
    (for {
      stg <- stage
      secretId: String = s"${stg}/Imovo"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[ImovoSecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ConfigFailure("Could not retrieve Imovo secrets")))
  }
}
