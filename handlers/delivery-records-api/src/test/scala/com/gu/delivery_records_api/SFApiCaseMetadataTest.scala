package com.gu.delivery_records_api

import java.util.Base64

import org.scalatest.{FlatSpec, Matchers}

import scala.io.Source
import io.circe.generic.auto._
import io.circe.parser.decode

object SFApiCaseMetadataTest {
  val sfApiCaseMetadata: SFApiCaseMetadata =
    decode[SFApiCaseMetadata](Source.fromResource("sfDescribeCaseResponse.json")("UTF-8").mkString).toOption.get

  val knownDeliveryIssueChoices = List(
    "Damaged Paper",
    "Delivered Despite Holiday",
    "Instructions Not Followed",
    "Late Delivery",
    "Missing Supplements",
    "No Delivery",
    "Wrong Paper Received"
  )
}

class SFApiCaseMetadataTest extends FlatSpec with Matchers {

  it should "extract delivery problem types from the SF Case 'describe' response" in {

    SFApiCaseMetadataTest.sfApiCaseMetadata.extractAvailableProblemTypes should equal(
      SFApiCaseMetadataTest.knownDeliveryIssueChoices
    )

  }

  "PicklistEntry" should "be able to convert a validFor string into a Array of Booleans" in {

    val base64 = Base64.getDecoder

    base64.decode("AAAI").flatMap(PicklistEntry.byteToBooleanArray) should equal(Array(
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, true, false, false, false
    ))

    base64.decode("AAAAAAAAAgAA").flatMap(PicklistEntry.byteToBooleanArray) should equal(Array(
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, true, false,
      false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false
    ))

  }

}
