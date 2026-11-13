package com.gu.effects

import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest

import scala.util.Try

object GetFromSecretsManager {
  private lazy val client = SecretsManagerClient
    .builder()
    .credentialsProvider(aws.CredentialsProvider)
    .region(EU_WEST_1)
    .build()

  def fetchString(secretId: String): Try[String] = Try {
    val request = GetSecretValueRequest.builder().secretId(secretId).build()
    Option(client.getSecretValue(request).secretString())
      .getOrElse(throw new IllegalStateException(s"Secret $secretId does not contain a SecretString"))
  }
}
