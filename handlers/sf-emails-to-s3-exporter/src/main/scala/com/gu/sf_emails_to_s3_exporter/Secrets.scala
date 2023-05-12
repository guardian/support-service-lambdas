package com.gu.sf_emails_to_s3_exporter

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

/*
  In Secrets Store we have the following JSON object:

  ${Stage}/Salesforce/ConnectedApp/${AppName}
  {
      "authUrl"     : "REMOVED"
      "clientId"    : "REMOVED"
      "clientSecret": "REMOVED"
  }

  ${Stage}/Salesforce/User/${SalesforceUsername}
  {
      "sfPassword" : "REMOVED"
      "sfToken"    : "REMOVED"
      "sfUsername" : "REMOVED"
  }
 */

case class SalesforceConnectedAppSecrets(authUrl: String, clientId: String, clientSecret: String)
case class SalesforceUserSecrets(sfPassword: String, sfToken: String, sfUsername: String)

object Secrets {

  implicit val reader2: Reader[SalesforceConnectedAppSecrets] = macroRW
  implicit val reader3: Reader[SalesforceUserSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  val stageToConnectedApp: Map[String, String] = Map(
    "DEV" -> "AwsConnectorSandbox",
    "PROD" -> "SFEmailsToS3",
  )

  val stageToSalesforceUser: Map[String, String] = Map(
    "DEV" -> "EmailsToS3APIUser",
    "PROD" -> "EmailsToS3APIUser",
  )

  def salesforceConnectedAppSecretsId(stage: String, connectedApp: String) =
    s"${stage}/Salesforce/ConnectedApp/${connectedApp}"
  def salesforceUserSecretsId(stage: String, salesforceUser: String) = s"${stage}/Salesforce/User/${salesforceUser}"

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  def getSalesforceConnectedAppSecrets: Option[SalesforceConnectedAppSecrets] = {
    for {
      stg <- stage
      connectedApp <- stageToConnectedApp.get(stg)
      secretId = salesforceConnectedAppSecretsId(stg, connectedApp)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceConnectedAppSecrets](secretJsonString)).toOption
    } yield secrets
  }

  def getSalesforceUserSecrets: Option[SalesforceUserSecrets] = {
    for {
      stg <- stage
      salesforceUser <- stageToSalesforceUser.get(stg)
      secretId = salesforceUserSecretsId(stg, salesforceUser)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceUserSecrets](secretJsonString)).toOption
    } yield secrets
  }
}
