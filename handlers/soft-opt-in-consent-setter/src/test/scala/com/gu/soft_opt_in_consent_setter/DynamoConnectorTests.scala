package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.Switch
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest, QueryRequest, QueryResponse}

import scala.jdk.CollectionConverters._
import scala.util.{Success, Try}

class DynamoConnectorTests extends AnyFunSuite with Matchers with MockFactory {
  val mockDbClient = mock[DynamoDbClient]
  val dynamoConnector = new DynamoConnector(mockDbClient, "DEV")

  val identityId = "someIdentityId"
  val subscriptionId = "A-S12345678"

  val switchLogMessage = "Soft opt-ins processed for product-switch"

  val itemValues1 = Map(
    "identityId" -> AttributeValue.builder().s(identityId).build(),
    "subscriptionId" -> AttributeValue.builder().s(subscriptionId).build(),
    "timestamp" -> AttributeValue.builder().n("timestamp not tested").build(),
    "logMessage" -> AttributeValue.builder().s(switchLogMessage).build(),
  )

  test(testName = "updateLoggingTable builds request correctly") {
    val putReq = PutItemRequest
      .builder()
      .tableName("soft-opt-in-consent-setter-DEV-logging")
      .item(itemValues1.asJava)
      .build()

    val mockPutItem: PutItemRequest => Try[Unit] = (req: PutItemRequest) => {
      // Check if the items in the request match the expected items (ignoring timestamp)
      assert(
        req.tableName() == putReq.tableName() &&
          req.item().get("identityId") == itemValues1("identityId") &&
          req.item().get("subscriptionId") == itemValues1("subscriptionId") &&
          req.item().get("logMessage") == itemValues1("logMessage"),
      )
      Success(())
    }

    val dynamoConnector = new DynamoConnector(mockDbClient, "DEV")
    dynamoConnector.updateLoggingTable(subscriptionId, identityId, Switch, mockPutItem)
  }

  test(testName = "hasActiveSecondaryUserAccess queries SPPD consistently and recognises an active secondary record") {
    val secondaryRecord = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("2099-01-01").build(),
    ).asJava
    val response = QueryResponse.builder().items(Seq(secondaryRecord).asJava).build()
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).onCall { (request: QueryRequest) =>
      request.tableName() shouldBe "SupporterProductData-CODE"
      request.consistentRead() shouldBe true
      request.keyConditionExpression() shouldBe "identityId = :identityId"
      request.expressionAttributeValues().get(":identityId").s() shouldBe identityId
      response
    }

    new DynamoConnector(client, "CODE").hasActiveSecondaryUserAccess(identityId) shouldBe Right(true)
  }

  test(testName = "hasActiveSecondaryUserAccess ignores expired secondary and primary records") {
    val expiredSecondary = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("2000-01-01").build(),
    ).asJava
    val primary = Map(
      "termEndDate" -> AttributeValue.builder().s("2099-01-01").build(),
    ).asJava
    val response = QueryResponse.builder().items(Seq(expiredSecondary, primary).asJava).build()
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).returning(response)

    new DynamoConnector(client, "CODE").hasActiveSecondaryUserAccess(identityId) shouldBe Right(false)
  }

  test(testName = "hasActiveSecondaryUserAccess checks subsequent query pages") {
    val nextKey = Map("identityId" -> AttributeValue.builder().s(identityId).build())
    val firstPage = QueryResponse.builder().lastEvaluatedKey(nextKey.asJava).build()
    val secondaryRecord = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("2099-01-01").build(),
    ).asJava
    val secondPage = QueryResponse.builder().items(Seq(secondaryRecord).asJava).build()
    val client = mock[DynamoDbClient]

    inSequence {
      (client.query(_: QueryRequest)).expects(*).returning(firstPage)
      (client.query(_: QueryRequest)).expects(*).onCall { (request: QueryRequest) =>
        request.exclusiveStartKey() shouldBe nextKey.asJava
        secondPage
      }
    }

    new DynamoConnector(client, "CODE").hasActiveSecondaryUserAccess(identityId) shouldBe Right(true)
  }

  test(testName = "hasActiveSecondaryUserAccess fails when a secondary record has no end date") {
    val secondaryRecord = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
    ).asJava
    val response = QueryResponse.builder().items(Seq(secondaryRecord).asJava).build()
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).returning(response)

    val result = new DynamoConnector(client, "CODE").hasActiveSecondaryUserAccess(identityId)
    result.left.toOption.map(_.getMessage) shouldBe Some(
      s"Secondary SupporterProductData item for identityId $identityId, primarySubscriptionName A-primary has no termEndDate",
    )
  }

  test(testName = "hasActiveSecondaryUserAccess fails when a secondary record has an invalid end date") {
    val secondaryRecord = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("invalid-date").build(),
    ).asJava
    val response = QueryResponse.builder().items(Seq(secondaryRecord).asJava).build()
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).returning(response)

    val result = new DynamoConnector(client, "CODE").hasActiveSecondaryUserAccess(identityId)
    result.left.toOption.map(_.getMessage) shouldBe Some(
      s"Secondary SupporterProductData item for identityId $identityId, primarySubscriptionName A-primary has invalid termEndDate",
    )
  }

  test(testName = "secondary access lookups continue after a query failure for one identity") {
    val otherIdentityId = "otherIdentityId"
    val activeSecondary = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("2099-01-01").build(),
    ).asJava
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).twice().onCall { (request: QueryRequest) =>
      request.expressionAttributeValues().get(":identityId").s() match {
        case `identityId` => throw new RuntimeException("query failed")
        case `otherIdentityId` => QueryResponse.builder().items(Seq(activeSecondary).asJava).build()
        case unexpected => throw new AssertionError(s"Unexpected identityId $unexpected")
      }
    }

    val result =
      new DynamoConnector(client, "CODE").getSecondaryUserAccessByIdentityId(Seq(identityId, otherIdentityId))
    result(identityId).left.toOption.map(_.getMessage) shouldBe Some(
      s"Failed to query SupporterProductData for secondary user access for identityId $identityId",
    )
    result(otherIdentityId) shouldBe Right(true)
  }

  test(testName = "secondary access lookups continue after a malformed item for one identity") {
    val otherIdentityId = "otherIdentityId"
    val malformedSecondary = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-malformed").build(),
    ).asJava
    val activeSecondary = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-active").build(),
      "termEndDate" -> AttributeValue.builder().s("2099-01-01").build(),
    ).asJava
    val client = mock[DynamoDbClient]
    (client.query(_: QueryRequest)).expects(*).twice().onCall { (request: QueryRequest) =>
      request.expressionAttributeValues().get(":identityId").s() match {
        case `identityId` => QueryResponse.builder().items(Seq(malformedSecondary).asJava).build()
        case `otherIdentityId` => QueryResponse.builder().items(Seq(activeSecondary).asJava).build()
        case unexpected => throw new AssertionError(s"Unexpected identityId $unexpected")
      }
    }

    val result =
      new DynamoConnector(client, "CODE").getSecondaryUserAccessByIdentityId(Seq(identityId, otherIdentityId))
    result(identityId).left.toOption.map(_.getMessage) shouldBe Some(
      s"Secondary SupporterProductData item for identityId $identityId, primarySubscriptionName A-malformed has no termEndDate",
    )
    result(otherIdentityId) shouldBe Right(true)
  }
}
