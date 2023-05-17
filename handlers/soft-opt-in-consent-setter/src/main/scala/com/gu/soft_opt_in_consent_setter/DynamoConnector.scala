package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest}

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

case class SoftOptInLog(userId: String, subscriptionId: String, timestamp: Long, logMessage: String)

object SoftOptInLog {
  val app = "mobile"

  def tableName(app: String, stage: String): String = s"${app}-${stage}-soft-opt-ins-logging-v2"
}

class DynamoConnector private (dynamoDbClient: DynamoDbClient) extends LazyLogging {
  val app = "mobile"
  private val stage = sys.env.getOrElse("Stage", "DEV")

  def updateLoggingTable(subscriptionId: String, identityId: String): Unit = {
    val timestamp = System.currentTimeMillis()
    val record = SoftOptInLog(identityId, subscriptionId, timestamp, "Soft opt-ins processed for acquisition")

    val itemValues = Map(
      "userId" -> AttributeValue.builder().s(record.userId).build(),
      "subscriptionId" -> AttributeValue.builder().s(record.subscriptionId).build(),
      "timestamp" -> AttributeValue.builder().n(record.timestamp.toString).build(),
      "logMessage" -> AttributeValue.builder().s(record.logMessage).build(),
    )

    val putReq = PutItemRequest
      .builder()
      .tableName(SoftOptInLog.tableName(app, stage))
      .item(itemValues.asJava)
      .build()

    Try(dynamoDbClient.putItem(putReq)) match {
      case Success(_) =>
        logger.info("Logged soft opt-in setting to Dynamo")
      case Failure(exception) =>
        logger.error(s"Dynamo write failed for record: $record")
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
