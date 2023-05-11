package com.gu.sfapiusercredentialsetter

import software.amazon.awssdk.services.secretsmanager._
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import upickle.default._
import scala.util.Try

/*
  In Secrets Store we have the following JSON object:

  ${Stage}/Salesforce/User/AwsCredentialsSetter
  {
      "authUrl"     : "REMOVED"
      "clientId"    : "REMOVED"
      "clientSecret": "REMOVED"
      "password"    : "REMOVED"
      "token"       : "REMOVED"
      "username"    : "REMOVED"
      "stageName"   : "REMOVED"
  }
 */

case class AwsCredentialsSetterSecrets(
    authUrl: String,
    clientId: String,
    clientSecret: String,
    password: String,
    token: String,
    username: String,
    stageName: String,
)

object Secrets {

  implicit val reader1: Reader[AwsCredentialsSetterSecrets] = macroRW

  private lazy val secretsClient = SecretsManagerClient.create()

  def getJSONString(secretId: String): String = {
    secretsClient.getSecretValue(GetSecretValueRequest.builder().secretId(secretId).build()).secretString()
  }

  lazy val stage: Option[String] = sys.env.get("stage")

  def getAwsCredentialsSetterSecrets: Option[AwsCredentialsSetterSecrets] = {
    for {
      stg <- stage
      secretId: String = s"${stg}/InvoicingApi"
      secretJsonString = getJSONString(secretId)
      secrets <- Try(read[AwsCredentialsSetterSecrets](secretJsonString)).toOption
    } yield secrets
  }
}
