package com.gu.zuora.sar

import com.gu.zuora.sar.BatonModels.{
  Completed,
  Failed,
  Pending,
  PerformSarRequest,
  SarInitiateRequest,
  SarInitiateResponse,
  SarRequest,
  SarResponse,
  SarStatusRequest,
  SarStatusResponse,
}
import io.circe.parser._
import io.circe.syntax._
import circeCodecs._
import io.circe.Printer
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class CirceCodecsSpec extends AnyFreeSpec with Matchers {
  val jsonPrinter: Printer = Printer.noSpaces.copy(dropNullValues = true)

  "BatonModels" - {
    "should decode valid SarInitiateRequest" in {
      val expectedRequest = SarInitiateRequest(subjectEmail = "testSubjectEmail")

      val jsonRequest =
        """{
          |"subjectId": "",
          |"subjectEmail" : "testSubjectEmail",
          |"dataProvider" : "zuora",
          |"requestType": "SAR",
          |"action" : "initiate"
          |}
          |""".stripMargin

      decode[SarRequest](jsonRequest) shouldBe Right(expectedRequest)

    }

    "should not accept an invalid dataProvider" in {

      val jsonRequest =
        """{
          |"subjectId": "",
          |"subjectEmail" : "testSubjectEmail",
          |"dataProvider" : "eventbrite",
          |"requestType": "SAR",
          |"action" : "initiate"
          |}
          |""".stripMargin

      assertThrows[AssertionError](decode[SarRequest](jsonRequest))
    }

    "should decode valid SarStatusRequest" in {
      val expectedRequest = SarStatusRequest(initiationReference = "someRequestId")

      val jsonRequest =
        """{
          |"initiationReference": "someRequestId",
          |"dataProvider" : "zuora",
          |"requestType": "SAR",
          |"action" : "status"
          |}
          |""".stripMargin

      decode[SarRequest](jsonRequest) shouldBe Right(expectedRequest)

    }

    "should decode valid PerformSarRequest" in {
      val expectedRequest = PerformSarRequest(initiationReference = "someRequestId", subjectEmail = "testSubjectEmail")

      val jsonRequest =
        """{
          |"initiationReference": "someRequestId",
          |"subjectEmail": "testSubjectEmail",
          |"dataProvider" : "zuora",
          |"requestType" : "SAR",
          |"action" : "perform"
          |}
          |""".stripMargin

      decode[SarRequest](jsonRequest) shouldBe Right(expectedRequest)
    }

    "should encode SarInitiateResponse correctly" in {
      val response: SarResponse = SarInitiateResponse("someRequestId")
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"initiationReference":"someRequestId","action":"initiate","requestType":"SAR","dataProvider":"zuora"}"""
    }

    "should encode completed SarStatusResponse correctly" in {
      val response: SarResponse = SarStatusResponse(
        status = Completed,
        resultLocations = Some(List("locationValue")),
      )
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"status":"completed","resultLocations":["locationValue"],"action":"status","requestType":"SAR","dataProvider":"zuora"}"""
    }

    "should encode pending SarStatusResponse correctly" in {
      val response: SarResponse = SarStatusResponse(status = Pending)
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"status":"pending","action":"status","requestType":"SAR","dataProvider":"zuora"}"""
    }

    "should encode failed SarStatusResponse correctly" in {
      val response: SarResponse = SarStatusResponse(status = Failed, None, Some("error making request"))
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"status":"failed","message":"error making request","action":"status","requestType":"SAR","dataProvider":"zuora"}"""
    }
  }
}
