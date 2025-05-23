package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, Cancellation, EventType, Switch}
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest}

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

class DynamoConnector(dynamoDbClient: DynamoDbClient, stage: String) extends LazyLogging {
  private val tableName = s"soft-opt-in-consent-setter-$stage-logging"

  def putItem(putReq: PutItemRequest): Try[Unit] = Try(dynamoDbClient.putItem(putReq)).map(_ => ())

  def updateLoggingTable(
      subscriptionId: String,
      identityId: String,
      eventType: EventType,
      putItem: PutItemRequest => Try[Unit] = putItem,
  ): Try[Unit] = {
    val timestamp = System.currentTimeMillis()
    val logMessage = eventType match {
      case Acquisition => "soft opt-ins processed for acquisition"
      case Cancellation => "Soft opt-ins processed for expired subscription"
      case Switch => "Soft opt-ins processed for product-switch"
    }

    val itemValues = Map(
      "identityId" -> AttributeValue.builder().s(identityId).build(),
      "subscriptionId" -> AttributeValue.builder().s(subscriptionId).build(),
      "timestamp" -> AttributeValue.builder().n(timestamp.toString).build(),
      "logMessage" -> AttributeValue.builder().s(logMessage).build(),
    )

    val putReq = PutItemRequest
      .builder()
      .tableName(tableName)
      .item(itemValues.asJava)
      .build()

    putItem(putReq)
  }
}

object DynamoConnector extends LazyLogging {
  def apply(stage: String): Either[SoftOptInError, DynamoConnector] =
    AwsCredentialsBuilder.buildCredentials.flatMap { credentialsProvider =>
      Try(
        DynamoDbClient
          .builder()
          .region(Region.EU_WEST_1)
          .credentialsProvider(credentialsProvider)
          .build(),
      ) match {
        case Success(dynamoDbClient) => Right(new DynamoConnector(dynamoDbClient, stage))
        case Failure(e) =>
          logger.error("Failed to build DynamoDB client", e)
          Left(SoftOptInError("Failed to build DynamoDB client", e))
      }
    }
}
