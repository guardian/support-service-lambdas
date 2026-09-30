package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SecondarySubscription, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, QueryRequest}

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

class SupporterProductDataConnector(dynamoDbClient: DynamoDbClient, stage: String) extends LazyLogging {
  private val tableName = s"SupporterProductData-$stage"

  def getSecondarySubscriptions(identityId: String): Either[SoftOptInError, List[SecondarySubscription]] =
    for {
      items <- fetchAllItems(identityId)
      subscriptions <- sequence(items.flatMap(item => SecondarySubscription.from(identityId, item)))
    } yield subscriptions

  private def fetchAllItems(identityId: String): Either[SoftOptInError, List[java.util.Map[String, AttributeValue]]] = {
    def queryPage(
        startKey: java.util.Map[String, AttributeValue],
    ): Either[SoftOptInError, List[java.util.Map[String, AttributeValue]]] = {
      val requestBuilder = QueryRequest
        .builder()
        .tableName(tableName)
        .keyConditionExpression("identityId = :identityId")
        .expressionAttributeValues(Map(":identityId" -> AttributeValue.builder().s(identityId).build()).asJava)
        /* A stale read could clear consents for someone just granted secondary access. */
        .consistentRead(true)

      if (startKey != null && !startKey.isEmpty) requestBuilder.exclusiveStartKey(startKey)

      Try(dynamoDbClient.query(requestBuilder.build())) match {
        case Failure(error) =>
          val message = s"Failed to query SupporterProductData for secondary user access for identityId $identityId"
          logger.error(message, error)
          Left(SoftOptInError(message, error))
        case Success(response) =>
          val items = response.items().asScala.toList
          Option(response.lastEvaluatedKey()).filterNot(_.isEmpty) match {
            case None => Right(items)
            case Some(nextKey) => queryPage(nextKey).map(items ++ _)
          }
      }
    }

    queryPage(null)
  }

  private def sequence[A](values: List[Either[SoftOptInError, A]]): Either[SoftOptInError, List[A]] =
    values.foldRight[Either[SoftOptInError, List[A]]](Right(Nil)) { (value, rest) =>
      for {
        item <- value
        items <- rest
      } yield item :: items
    }
}
