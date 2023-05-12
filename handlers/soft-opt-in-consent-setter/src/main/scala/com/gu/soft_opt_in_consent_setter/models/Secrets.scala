package com.gu.soft_opt_in_consent_setter.models

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

/*
  In Secrets Store we have the following JSON object:

  ${SalesforceStage}/Salesforce/ConnectedApp/${AppName}
  {
      "authUrl"     : "REMOVED"
      "clientId"    : "REMOVED"
      "clientSecret": "REMOVED"
  }

  ${SalesforceStage}/Salesforce/User/${SalesforceUsername}
  {
      "sfPassword": "REMOVED"
      "sfToken"   : "REMOVED"
      "sfUsername": "REMOVED"
  }

  ${IdentityStage}/Identity/SoftOptInConsentAPI
  {
      "identityUrl"  : "REMOVED"
      "identityToken": "REMOVED"
  }

  ${MpapiStage}/MobilePurchasesAPI/User/GetSubscriptions
  {
      "mpapiUrl"  : "REMOVED"
      "mpapiToken": "REMOVED"
  }
 */

case class SalesforceConnectedAppSecrets(authUrl: String, clientId: String, clientSecret: String)
case class SalesforceUserSecrets(sfPassword: String, sfToken: String, sfUsername: String)
case class IdentitySoftOptInConsentAPISecrets(identityUrl: String, identityToken: String)
case class MobilePurchasesAPIUserGetSubscriptionsSecrets(mpapiUrl: String, mpapiToken: String)

object Secrets {

  implicit val reader1: Reader[SalesforceConnectedAppSecrets] = macroRW
  implicit val reader2: Reader[SalesforceUserSecrets] = macroRW
  implicit val reader3: Reader[IdentitySoftOptInConsentAPISecrets] = macroRW
  implicit val reader4: Reader[MobilePurchasesAPIUserGetSubscriptionsSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  val stageToSalesforceStage: Map[String, String] = Map(
    "DEV" -> "DEV",
    "CODE" -> "CODE",
    "PROD" -> "PROD",
  )

  val stageToAppname: Map[String, String] = Map(
    "DEV" -> "AwsConnectorSandbox",
    "CODE" -> "AwsConnectorSandbox",
    "PROD" -> "TouchpointUpdate",
  )

  val stageToSalesforceUsername: Map[String, String] = Map(
    "DEV" -> "SoftOptInConsentSetterAPIUser",
    "CODE" -> "SoftOptInConsentSetterAPIUser",
    "PROD" -> "SoftOptInConsentSetterAPIUser",
  )

  val stageToIdentityStage: Map[String, String] = Map(
    "DEV" -> "CODE",
    "CODE" -> "CODE",
    "PROD" -> "PROD",
  )

  val stageMpapiStage: Map[String, String] = Map(
    "DEV" -> "CODE",
    "CODE" -> "CODE",
    "PROD" -> "PROD",
  )

  /*
    In Secrets Store we have the following JSON object:

    ${SalesforceStage}/Salesforce/ConnectedApp/${AppName}
    {
        "authUrl"     : "REMOVED"
        "clientId"    : "REMOVED"
        "clientSecret": "REMOVED"
    }

    ${SalesforceStage}/Salesforce/User/${SalesforceUsername}
    {
        "sfPassword": "REMOVED"
        "sfToken"   : "REMOVED"
        "sfUsername": "REMOVED"
    }

    ${IdentityStage}/Identity/SoftOptInConsentAPI
    {
        "identityUrl"  : "REMOVED"
        "identityToken": "REMOVED"
    }

    ${MpapiStage}/MobilePurchasesAPI/User/GetSubscriptions
    {
        "mpapiUrl"  : "REMOVED"
        "mpapiToken": "REMOVED"
    }
   */

  def salesforceStageSecretsId(salesforceStage: String, appName: String) =
    s"${salesforceStage}/Salesforce/ConnectedApp/${appName}"
  def salesforceUserSecretsId(salesforceStage: String, salesforceUsername: String) =
    s"${salesforceStage}/Salesforce/User/${salesforceUsername}"
  def identitySoftOptInConsentAPISecretsSecretsId(identityStage: String) =
    s"${identityStage}/Identity/SoftOptInConsentAPI"
  def mobilePurchasesAPIUserGetSubscriptionsSecretsSecretsId(mpapiStage: String) =
    s"${mpapiStage}/MobilePurchasesAPI/User/GetSubscriptions"

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  def getSalesforceConnectedAppSecrets: Option[SalesforceConnectedAppSecrets] = {
    for {
      stg <- stage
      salesforceStage <- stageToSalesforceStage.get(stg)
      appName <- stageToAppname.get(stg)
      secretId = salesforceStageSecretsId(salesforceStage, appName)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceConnectedAppSecrets](secretJsonString)).toOption
    } yield secrets
  }

  def getSalesforceUserSecrets: Option[SalesforceUserSecrets] = {
    for {
      stg <- stage
      salesforceStage <- stageToSalesforceStage.get(stg)
      stageToSalesforceUsername <- stageToSalesforceUsername.get(stg)
      secretId = salesforceUserSecretsId(salesforceStage, stageToSalesforceUsername)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceUserSecrets](secretJsonString)).toOption
    } yield secrets
  }

  def getIdentitySoftOptInConsentAPISecrets: Option[IdentitySoftOptInConsentAPISecrets] = {
    for {
      stg <- stage
      identityStage <- stageToIdentityStage.get(stg)
      secretId = identitySoftOptInConsentAPISecretsSecretsId(identityStage)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[IdentitySoftOptInConsentAPISecrets](secretJsonString)).toOption
    } yield secrets
  }

  def getMobilePurchasesAPIUserGetSubscriptionsSecrets: Option[MobilePurchasesAPIUserGetSubscriptionsSecrets] = {
    for {
      stg <- stage
      mpapiStage <- stageMpapiStage.get(stg)
      secretId = mobilePurchasesAPIUserGetSubscriptionsSecretsSecretsId(mpapiStage)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[MobilePurchasesAPIUserGetSubscriptionsSecrets](secretJsonString)).toOption
    } yield secrets
  }
}
