package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, Cancellation, EventType, Switch}
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest}

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

class DynamoConnector private (dynamoDbClient: DynamoDbClient) extends LazyLogging {
  private val app = "membership"
  private val stage = sys.env.getOrElse("Stage", "DEV")
  private val tableName = s"$app-$stage-soft-opt-ins-logging"

  def updateLoggingTable(subscriptionNumber: String, identityId: String, eventType: EventType): Unit = {
    val timestamp = System.currentTimeMillis()
    val logMessage = eventType match {
      case Acquisition => "Soft opt-ins processed for acquisition"
      case Cancellation => "Soft opt-ins processed for cancellation"
      case Switch => "Soft opt-ins processed for switch"
    }

    val itemValues = Map(
      "identityId" -> AttributeValue.builder().s(identityId).build(),
      "subscriptionId" -> AttributeValue.builder().s(subscriptionNumber).build(),
      "timestamp" -> AttributeValue.builder().n(timestamp.toString).build(),
      "logMessage" -> AttributeValue.builder().s(logMessage).build(),
    )

    val putReq = PutItemRequest
      .builder()
      .tableName(tableName)
      .item(itemValues.asJava)
      .build()

    Try(dynamoDbClient.putItem(putReq)) match {
      case Success(_) =>
        logger.info("Logged soft opt-in setting to Dynamo")
      case Failure(exception) =>
        logger.error(s"Dynamo write failed for identityId: $identityId")
        logger.error(s"Exception: $exception")
        Metrics.put("failed_dynamo_update")
    }
  }
}

object DynamoConnector extends LazyLogging {
  def apply(): Either[SoftOptInError, DynamoConnector] =
    AwsCredentialsBuilder.buildCredentials.flatMap { credentialsProvider =>
      Try(
        DynamoDbClient
          .builder()
          .region(Region.EU_WEST_1)
          .credentialsProvider(credentialsProvider)
          .build(),
      ) match {
        case Success(dynamoDbClient) => Right(new DynamoConnector(dynamoDbClient))
        case Failure(e) =>
          logger.error("Failed to build DynamoDB client", e)
          Left(SoftOptInError("Failed to build DynamoDB client"))
      }
    }
}
