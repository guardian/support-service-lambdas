package com.gu.delivery_records_api

import cats.effect.IO
import com.gu.salesforce.SalesforceClientCredentials
import com.gu.util.config.Stage
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import scala.collection.mutable.ListBuffer
import scala.util.{Failure, Success}

class SalesforceCredentialsTest extends AnyFlatSpec with Matchers with EitherValues {

  "SalesforceCredentials" should "load the shared PrintFulfilment secret for the stage" in {
    val requestedSecrets = ListBuffer.empty[String]
    val result = SalesforceCredentials
      .load[IO](
        Stage("CODE"),
        secretName => {
          requestedSecrets += secretName
          Success(
            """{
              |  "authUrl": "https://example.salesforce.com/services/oauth2/token",
              |  "clientId": "client-id",
              |  "clientSecret": "client-secret"
              |}""".stripMargin,
          )
        },
      )
      .value
      .unsafeRunSync()

    requestedSecrets.toList shouldBe List("CODE/Salesforce/ConnectedApp/PrintFulfilment")
    result.value shouldBe SalesforceClientCredentials(
      authUrl = "https://example.salesforce.com/services/oauth2/token",
      clientId = "client-id",
      clientSecret = "client-secret",
    )
  }

  it should "reject empty credential fields" in {
    val result = SalesforceCredentials
      .load[IO](
        Stage("PROD"),
        _ => Success("""{"authUrl":" ","clientId":"client-id","clientSecret":"client-secret"}"""),
      )
      .value
      .unsafeRunSync()

    result.left.value.message shouldBe "Salesforce secret has empty fields: authUrl"
  }

  it should "reject a secret with missing fields" in {
    val result = SalesforceCredentials
      .load[IO](
        Stage("CODE"),
        _ => Success("""{"authUrl":"https://example.salesforce.com/services/oauth2/token"}"""),
      )
      .value
      .unsafeRunSync()

    result.left.value.message shouldBe "Salesforce secret has invalid JSON or missing fields"
  }

  it should "return a safe error when the secret cannot be read" in {
    val result = SalesforceCredentials
      .load[IO](Stage("CODE"), _ => Failure(new RuntimeException("sensitive details")))
      .value
      .unsafeRunSync()

    result.left.value.message shouldBe "Failed to read Salesforce secret (RuntimeException)"
  }
}
