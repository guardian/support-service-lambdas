package com.gu.singleContributionSalesforceWrites.services

import io.circe.Decoder
import com.gu.singleContributionSalesforceWrites.models.{AwsSecretsManagerError, HandlerError}
import com.gu.singleContributionSalesforceWrites.services.jsonDecoder.DecodeJson
import scala.util.{Try, Success, Failure}
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient

object SecretsManager {

  def getSecretValue[T: Decoder](secretId: String): Either[HandlerError, T] = {
    Try {
      val secretsClient = SecretsManagerClient.create()
      val jsonString = getJsonString(secretId, secretsClient)
      DecodeJson[T](jsonString)
    } match {
      case Success(Right(data)) => Right(data)
      case Success(Left(jsonError)) => Left(jsonError)
      case Failure(exception) => Left(AwsSecretsManagerError(exception.getMessage()))
    }
  }

  private def getJsonString(secretId: String, secretsClient: SecretsManagerClient): String = {
    val request = GetSecretValueRequest.builder().secretId(secretId).build()
    secretsClient.getSecretValue(request).secretString()
  }
}
