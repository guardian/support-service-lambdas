package com.gu.soft_opt_in_consent_setter.models

import com.gu.soft_opt_in_consent_setter.AwsCredentialsBuilder
import software.amazon.awssdk.auth.credentials.AwsCredentialsProviderChain
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

  def apply(stg: String): Either[SoftOptInError, Secrets] = {
    AwsCredentialsBuilder.buildCredentials
      .map(SecretsManagerClient.builder().credentialsProvider(_).build())
      .map(new Secrets(stg, _))
  }

  implicit val reader1: Reader[SalesforceConnectedAppSecrets] = macroRW
  implicit val reader2: Reader[SalesforceUserSecrets] = macroRW
  implicit val reader3: Reader[IdentitySoftOptInConsentAPISecrets] = macroRW
  implicit val reader4: Reader[MobilePurchasesAPIUserGetSubscriptionsSecrets] = macroRW

  val stageToSalesforceStage: Map[String, String] = Map(
    "CODE" -> "CODE",
    "PROD" -> "PROD",
  )

  val stageToAppname: Map[String, String] = Map(
    "CODE" -> "AwsConnectorSandbox",
    "PROD" -> "TouchpointUpdate",
  )

  val stageToSalesforceUsername: Map[String, String] = Map(
    "CODE" -> "SoftOptInConsentSetterAPIUser",
    "PROD" -> "SoftOptInConsentSetterAPIUser",
  )

  val stageToIdentityStage: Map[String, String] = Map(
    "CODE" -> "CODE",
    "PROD" -> "PROD",
  )

  val stageMpapiStage: Map[String, String] = Map(
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

}
class Secrets(stg: String, secretsClient: SecretsManagerClient) {

  import Secrets._

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  def getSalesforceConnectedAppSecrets: Either[String, SalesforceConnectedAppSecrets] = {
    for {
      salesforceStage <- stageToSalesforceStage.get(stg).toRight("salesforceStage is missing")
      appName <- stageToAppname.get(stg).toRight("appName is missing")
      secretId = salesforceStageSecretsId(salesforceStage, appName)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceConnectedAppSecrets](secretJsonString)).toEither.left.map(_.toString)
    } yield secrets
  }

  def getSalesforceUserSecrets: Either[String, SalesforceUserSecrets] = {
    for {
      salesforceStage <- stageToSalesforceStage.get(stg).toRight("salesforceStage is missing")
      stageToSalesforceUsername <- stageToSalesforceUsername.get(stg).toRight("stageToSalesforceUsername is missing")
      secretId = salesforceUserSecretsId(salesforceStage, stageToSalesforceUsername)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[SalesforceUserSecrets](secretJsonString)).toEither.left.map(_.toString)
    } yield secrets
  }

  def getIdentitySoftOptInConsentAPISecrets: Either[String, IdentitySoftOptInConsentAPISecrets] = {
    for {
      identityStage <- stageToIdentityStage.get(stg).toRight("identityStage is missing")
      secretId = identitySoftOptInConsentAPISecretsSecretsId(identityStage)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[IdentitySoftOptInConsentAPISecrets](secretJsonString)).toEither.left.map(_.toString)
    } yield secrets
  }

  def getMobilePurchasesAPIUserGetSubscriptionsSecrets
      : Either[String, MobilePurchasesAPIUserGetSubscriptionsSecrets] = {
    for {
      mpapiStage <- stageMpapiStage.get(stg).toRight("mpapiStage is missing")
      secretId = mobilePurchasesAPIUserGetSubscriptionsSecretsSecretsId(mpapiStage)
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[MobilePurchasesAPIUserGetSubscriptionsSecrets](secretJsonString)).toEither.left
        .map(_.toString)
    } yield secrets
  }
}
