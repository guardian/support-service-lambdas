package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, Cancellation, EventType, Switch}
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest, QueryRequest}

import java.time.{LocalDate, ZoneOffset}
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

class DynamoConnector(dynamoDbClient: DynamoDbClient, stage: String) extends LazyLogging {
  private val tableName = s"soft-opt-in-consent-setter-$stage-logging"
  private val supporterProductDataTableName = s"SupporterProductData-$stage"

  def putItem(putReq: PutItemRequest): Try[Unit] = Try(dynamoDbClient.putItem(putReq)).map(_ => ())

  def hasActiveSecondaryUserAccess(identityId: String): Either[SoftOptInError, Boolean] = {
    def queryPage(startKey: java.util.Map[String, AttributeValue]): Either[SoftOptInError, Boolean] = {
      val requestBuilder = QueryRequest
        .builder()
        .tableName(supporterProductDataTableName)
        .keyConditionExpression("identityId = :identityId")
        .expressionAttributeValues(
          Map(
            ":identityId" -> AttributeValue.builder().s(identityId).build(),
          ).asJava,
        )
        .consistentRead(true)

      if (startKey != null && !startKey.isEmpty) requestBuilder.exclusiveStartKey(startKey)

      Try(dynamoDbClient.query(requestBuilder.build())) match {
        case Failure(error) =>
          logger.error("Failed to query SupporterProductData for secondary user access", error)
          Left(SoftOptInError("Failed to query SupporterProductData for secondary user access", error))
        case Success(response) =>
          val activeSecondary = response.items().asScala.foldLeft[Either[SoftOptInError, Boolean]](Right(false)) {
            case (Right(true), _) => Right(true)
            case (Right(false), item) if !item.containsKey("primarySubscriptionName") => Right(false)
            case (Right(false), item) =>
              Option(item.get("termEndDate")).flatMap(value => Option(value.s())) match {
                case None => Left(SoftOptInError("Secondary SupporterProductData item has no termEndDate"))
                case Some(termEndDate) =>
                  Try(LocalDate.parse(termEndDate)) match {
                    case Success(date) => Right(!date.isBefore(LocalDate.now(ZoneOffset.UTC)))
                    case Failure(error) =>
                      Left(SoftOptInError("Secondary SupporterProductData item has invalid termEndDate", error))
                  }
              }
            case (left @ Left(_), _) => left
          }

          activeSecondary.flatMap {
            case true => Right(true)
            case false if response.lastEvaluatedKey() == null || response.lastEvaluatedKey().isEmpty => Right(false)
            case false => queryPage(response.lastEvaluatedKey())
          }
      }
    }

    queryPage(null)
  }

  def getActiveSecondaryUserIdentityIds(identityIds: Seq[String]): Either[SoftOptInError, Set[String]] =
    identityIds.distinct.foldLeft[Either[SoftOptInError, Set[String]]](Right(Set.empty)) {
      case (Right(activeIds), identityId) =>
        hasActiveSecondaryUserAccess(identityId).map(isActive => if (isActive) activeIds + identityId else activeIds)
      case (left @ Left(_), _) => left
    }

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
