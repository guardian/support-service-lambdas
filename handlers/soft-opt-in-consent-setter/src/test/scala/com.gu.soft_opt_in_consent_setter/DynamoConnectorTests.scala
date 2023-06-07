package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.Switch
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest}

import scala.jdk.CollectionConverters._
import scala.util.{Success, Try}

class DynamoConnectorTests extends AnyFunSuite with Matchers with MockFactory {
  val mockDbClient = mock[DynamoDbClient]
  val dynamoConnector = new DynamoConnector(mockDbClient)

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

    val dynamoConnector = new DynamoConnector(mockDbClient)
    dynamoConnector.updateLoggingTable(subscriptionId, identityId, Switch, mockPutItem)
  }
}
