package com.gu.soft_opt_in_consent_setter

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import scalaj.http.HttpResponse
import software.amazon.awssdk.services.cloudformation.model.StackResourceSummary

class MultipleAccountApiConnectorTests extends AnyFunSuite with Matchers {
  private def response(body: String, status: Int = 200) =
    HttpResponse(body, status, Map.empty[String, IndexedSeq[String]])

  test("returns active secondary subscription names") {
    val connector = new MultipleAccountApiConnector(
      "https://multiple-account-api-code.support.guardianapis.com",
      "test-api-key",
      (url, key) => {
        url shouldBe "https://multiple-account-api-code.support.guardianapis.com/secondary-user/12345"
        key shouldBe "test-api-key"
        Right(
          response(
            """{"subscriptions":[{"subscriptionName":"A-S123","firstName":"Jane","lastName":"Smith","workEmail":"jane@example.com"}]}""",
          ),
        )
      },
    )

    connector.activeSecondarySubscriptionNames("12345") shouldBe Right(Set("A-S123"))
  }

  test("an empty subscription list means no secondary access") {
    val connector = new MultipleAccountApiConnector(
      "https://example.com",
      "key",
      (_, _) => Right(response("""{"subscriptions":[]}""")),
    )

    connector.activeSecondarySubscriptionNames("12345") shouldBe Right(Set.empty)
  }

  test("HTTP failures never count as no secondary access") {
    val connector =
      new MultipleAccountApiConnector("https://example.com", "key", (_, _) => Right(response("Forbidden", 403)))

    val error = connector.activeSecondarySubscriptionNames("12345").left.toOption.get
    error.statusCode shouldBe Some(403)
    error.getMessage should include("12345")
    error.getMessage should not include "key"
  }

  test("a 404 is an API error, not an indication of no secondary access") {
    val connector =
      new MultipleAccountApiConnector("https://example.com", "key", (_, _) => Right(response("Not found", 404)))

    connector.activeSecondarySubscriptionNames("12345").left.toOption.get.statusCode shouldBe Some(404)
  }

  test("malformed responses never count as no secondary access") {
    val invalidJson =
      new MultipleAccountApiConnector("https://example.com", "key", (_, _) => Right(response("not JSON")))
    val missingSubscriptions =
      new MultipleAccountApiConnector("https://example.com", "key", (_, _) => Right(response("{}")))
    val invalidSubscription = new MultipleAccountApiConnector(
      "https://example.com",
      "key",
      (_, _) => Right(response("""{"subscriptions":[null]}""")),
    )
    val missingSubscriptionName = new MultipleAccountApiConnector(
      "https://example.com",
      "key",
      (_, _) => Right(response("""{"subscriptions":[{}]}""")),
    )

    invalidJson.activeSecondarySubscriptionNames("12345").isLeft shouldBe true
    missingSubscriptions.activeSecondarySubscriptionNames("12345").isLeft shouldBe true
    invalidSubscription.activeSecondarySubscriptionNames("12345").isLeft shouldBe true
    missingSubscriptionName.activeSecondarySubscriptionNames("12345").isLeft shouldBe true
  }

  test("request failures never count as no secondary access") {
    val connector = new MultipleAccountApiConnector(
      "https://example.com",
      "key",
      (_, _) => Left(new RuntimeException("connection failed")),
    )

    connector.activeSecondarySubscriptionNames("12345").isLeft shouldBe true
  }

  test("API key discovery requires exactly one CloudFormation API key") {
    def resource(resourceType: String, id: String) = StackResourceSummary
      .builder()
      .resourceType(resourceType)
      .physicalResourceId(id)
      .build()

    val restApi = resource("AWS::ApiGateway::RestApi", "rest-api-id")
    val apiKey = resource("AWS::ApiGateway::ApiKey", "api-key-id")
    val stackName = "support-CODE-multiple-account-api"

    MultipleAccountApiConnector.findApiKeyId(List(restApi, apiKey), stackName) shouldBe "api-key-id"
    intercept[IllegalStateException](MultipleAccountApiConnector.findApiKeyId(List(restApi), stackName))
    intercept[IllegalStateException](MultipleAccountApiConnector.findApiKeyId(List(apiKey, apiKey), stackName))
  }
}
