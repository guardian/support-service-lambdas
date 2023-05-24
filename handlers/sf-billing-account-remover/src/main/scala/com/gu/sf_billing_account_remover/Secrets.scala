package com.gu.sf_billing_account_remover

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

/*
  In Secrets Store we have the following JSON object:

  ${Stage}/Zuora/${Account}
  {
      "apiAccessKeyId"    : "REMOVED"
      "apiSecretAccessKey": "REMOVED"
  }

  ${Stage}/Salesforce/ConnectedApp/${ConnectedApp}
  {
      "clientId"    : "REMOVED"
      "clientSecret": "REMOVED"
  }

  ${Stage}/Salesforce/User/${User}
  {
      "password": "REMOVED"
      "token"   : "REMOVED"
      "username": "REMOVED"
  }
 */

case class ZuoraSecrets(apiAccessKeyId: String, apiSecretAccessKey: String)
case class SalesforceConnectedAppSecrets(clientId: String, clientSecret: String)
case class SalesforceUserSecrets(password: String, token: String, username: String)

object Secrets {

  implicit val reader1: Reader[ZuoraSecrets] = macroRW
  implicit val reader2: Reader[SalesforceConnectedAppSecrets] = macroRW
  implicit val reader3: Reader[SalesforceUserSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  val stageToConnectedApp: Map[String, String] = Map(
    "CODE" -> "AwsConnectorSandbox",
    "PROD" -> "BillingAccountRemover",
  )

  val stageToSalesforceUser: Map[String, String] = Map(
    "CODE" -> "MembersDataAPI",
    "PROD" -> "BillingAccountRemoverAPIUser",
  )

  val stageToZuoraAccount: Map[String, String] = Map(
    "CODE" -> "SubscriptionsZuoraApi",
    "PROD" -> "SupportServiceLambdas",
  )

  def zuoraSecretsId(stage: String, account: String) = s"${stage}/Zuora/${account}"
  def salesforceConnectedAppSecretsId(stage: String, connectedApp: String) =
    s"${stage}/Salesforce/ConnectedApp/${connectedApp}"
  def salesforceUserSecretsId(stage: String, salesforceUser: String) = s"${stage}/Salesforce/User/${salesforceUser}"

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("Stage")

  def getZuoraSecrets: Option[ZuoraSecrets] = {
    for {
      stg <- stage
      account <- stageToZuoraAccount.get(stg)
      secretId = zuoraSecretsId(stg, account)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[ZuoraSecrets](secretJsonString)).toOption
    } yield secrets
  }

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
