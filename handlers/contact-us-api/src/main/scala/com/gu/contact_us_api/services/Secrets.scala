package com.gu.contact_us_api.services

import com.gu.contact_us_api.models.ContactUsError
import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._

import scala.util.Try

/*
  In Secrets Store we have the two following JSON objects:

  ${SalesforceStage}/Salesforce/ConnectedApp/${AppName}
  {
      "name"        :"REMOVED",
      "clientId"    :"REMOVED",
      "clientSecret":"REMOVED",
      "authUrl"     :"REMOVED"
  }

  and

  ${SalesforceStage}/Salesforce/User/MembersDataAPI
  {
      "username" :"REMOVED",
      "password" :"REMOVED",
      "token"    :"REMOVED"
  }
 */

case class SalesforceSecrets(clientId: String, clientSecret: String)
case class MembersDataAPISecrets(username: String, password: String, token: String)

object Secrets {

  implicit val reader1: Reader[SalesforceSecrets] = macroRW
  implicit val reader2: Reader[MembersDataAPISecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  lazy val appNameMapping: Map[String, String] = Map(
    "PROD" -> "TouchpointUpdate",
    "CODE" -> "AwsConnectorSandbox",
    "DEV" -> "AwsConnectorSandbox",
  )

  def getSalesforceSecrets: Either[ContactUsError, SalesforceSecrets] = {
    (for {
      stg <- stage
      app <- appNameMapping.get(stg)
      secretId: String = s"${stg}/Salesforce/ConnectedApp/${app}"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceSecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ContactUsError("Secrets", "Could not retrieve Salesforce secrets")))
  }

  def getMembersDataAPISecrets: Either[ContactUsError, MembersDataAPISecrets] = {
    (for {
      stg <- stage
      secretId: String = s"${stg}/Salesforce/User/MembersDataAPI"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[MembersDataAPISecrets](secretJsonString)).toOption
    } yield {
      Right(secrets)
    }).getOrElse(Left(ContactUsError("Secrets", "Could not retrieve MembersDataAPI secrets")))
  }
}
