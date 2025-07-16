package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, UserConsentsOverrides, WireMessageBody}
import com.gu.soft_opt_in_consent_setter.models.SFSubRecordResponse
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData.{subRecord2, subRecord3}
import io.circe.parser.decode
import org.scalatest.Inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

import scala.io.Source
import scala.util.{Failure, Success}

class JsonCodecSpec extends AnyFlatSpec with should.Matchers with Inside {
  it should "JSON Decoding: decodes SF_Subscription__c correctly" in {
    val json = Source.fromResource("sfSubRecords.json").mkString

    val record = decode[SFSubRecordResponse](json)

    record shouldBe Right(SFSubRecordResponse(2, true, records = Seq(subRecord2, subRecord3)))
  }

  it should "JSON Decoding: decodes Mobile Purchases API (MPAPI) response correctly" in {
    val json = Source.fromResource("mobileSubscriptions.json").mkString

    val record = decode[MobileSubscriptions](json)

    record shouldBe Right(MobileSubscriptions(List(MobileSubscription(false, "InAppPurchase"))))
  }

  "queue decoder" should "handle a guardian weekly with no overrides" in {
    val testData =
      """{
        |    "subscriptionId": "A-S000",
        |    "identityId": "1234",
        |    "eventType": "Acquisition",
        |    "productName": "PRINT_SUBSCRIPTION",
        |    "printProduct": "GUARDIAN_WEEKLY",
        |    "previousProductName": null,
        |    "userConsentsOverrides": {
        |        "similarGuardianProducts": null
        |    }
        |}""".stripMargin
    val expected = WireMessageBody(
      subscriptionId = "A-S000",
      identityId = Some("1234"),
      eventType = Acquisition,
      productName = "PRINT_SUBSCRIPTION",
      printProduct = Some("GUARDIAN_WEEKLY"),
      previousProductName = None,
      userConsentsOverrides = Some(UserConsentsOverrides(None)),
    )
    inside(decode[WireMessageBody](testData)) { case Right(actual) =>
      actual should be(expected)
    }
  }

  it should "handle a non print product" in {
    val testData =
      """{
        |    "subscriptionId": "A-S000",
        |    "identityId": "1234",
        |    "eventType": "Acquisition",
        |    "productName": "SUPPORTER_PLUS",
        |    "previousProductName": null,
        |    "userConsentsOverrides": {
        |        "similarGuardianProducts": true
        |    }
        |}""".stripMargin
    val expected = WireMessageBody(
      subscriptionId = "A-S000",
      identityId = Some("1234"),
      eventType = Acquisition,
      productName = "SUPPORTER_PLUS",
      printProduct = None,
      previousProductName = None,
      userConsentsOverrides = Some(UserConsentsOverrides(Some(true))),
    )
    inside(decode[WireMessageBody](testData)) { case Right(actual) =>
      actual should be(expected)
    }
  }

  def makeTestData(identityId: String = "null", productName: String) =
    s"""{
      |    "subscriptionId": "A-S000",
      |    "identityId": $identityId,
      |    "eventType": "Acquisition",
      |    "productName": "$productName",
      |    "previousProductName": null,
      |    "userConsentsOverrides": {
      |        "similarGuardianProducts": true
      |    }
      |}""".stripMargin

  "parseMessages" should "fail on non-single-contribution messages with no identityId" in {
    val testDataNoIdentityId = makeTestData("null", "SUPPORTER_PLUS")
    val expectedError = "identityId is required to set consents"
    inside(HandlerIAP.parseMessages(List(testDataNoIdentityId))) { case List(actual) =>
      inside(actual) { case Failure(t) =>
        t.getMessage should be(expectedError)
      }
    }
  }

  it should "drop single contribution messages with no identityId" in {
    val testDataNoIdentityId = makeTestData("null", "CONTRIBUTION")
    val testDataWithIdentityId = makeTestData(""""1234"""", "CONTRIBUTION")
    val expected = "1234"
    inside(HandlerIAP.parseMessages(List(testDataNoIdentityId, testDataWithIdentityId))) { case List(actual) =>
      inside(actual) { case Success(messageBody) =>
        messageBody.identityId should be(expected)
      }
    }
  }

}
