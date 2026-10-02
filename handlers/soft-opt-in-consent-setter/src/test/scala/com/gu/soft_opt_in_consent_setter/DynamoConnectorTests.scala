package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.Switch
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.{AttributeValue, PutItemRequest}

import scala.util.{Success, Try}

class DynamoConnectorTests extends AnyFunSuite with Matchers with MockFactory {
  test(testName = "updateLoggingTable builds request correctly") {
    val identityId = "someIdentityId"
    val subscriptionId = "A-S12345678"
    val connector = new DynamoConnector(mock[DynamoDbClient], "DEV")
    val expectedValues = Map(
      "identityId" -> AttributeValue.builder().s(identityId).build(),
      "subscriptionId" -> AttributeValue.builder().s(subscriptionId).build(),
      "logMessage" -> AttributeValue.builder().s("Soft opt-ins processed for product-switch").build(),
    )

    val putItem: PutItemRequest => Try[Unit] = request => {
      request.tableName() shouldBe "soft-opt-in-consent-setter-DEV-logging"
      expectedValues.foreach { case (key, value) => request.item().get(key) shouldBe value }
      Success(())
    }

    connector.updateLoggingTable(subscriptionId, identityId, Switch, putItem) shouldBe Success(())
  }
}
