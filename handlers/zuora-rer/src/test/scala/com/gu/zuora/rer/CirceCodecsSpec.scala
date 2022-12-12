package com.gu.zuora.rer

import BatonModels.{Completed, Failed, Pending, PerformRerRequest, RerInitiateRequest, RerInitiateResponse, RerRequest, RerResponse, RerStatusRequest, RerStatusResponse}
import io.circe.parser._
import io.circe.syntax._
import circeCodecs._
import com.gu.zuora.rer.BatonModels.{Completed, Failed, Pending, RerRequest, RerResponse}
import io.circe.Printer
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class CirceCodecsSpec extends AnyFreeSpec with Matchers {
  val jsonPrinter: Printer = Printer.noSpaces.copy(dropNullValues = true)

  "BatonModels" - {
    "should decode valid RerInitiateRequest" in {
      val expectedRequest = RerInitiateRequest(subjectEmail = "testSubjectEmail")

      val jsonRequest =
        """{
          |"subjectId": "",
          |"subjectEmail" : "testSubjectEmail",
          |"dataProvider" : "zuora",
          |"requestType": "RER",
          |"action" : "initiate"
          |}
          |""".stripMargin

      decode[RerRequest](jsonRequest) shouldBe Right(expectedRequest)

    }

    "should not accept an invalid dataProvider" in {

      val jsonRequest =
        """{
          |"subjectId": "",
          |"subjectEmail" : "testSubjectEmail",
          |"dataProvider" : "eventbrite",
          |"requestType": "RER",
          |"action" : "initiate"
          |}
          |""".stripMargin

      assertThrows[AssertionError](decode[RerRequest](jsonRequest))
    }

    "should decode valid RerStatusRequest" in {
      val expectedRequest = RerStatusRequest(initiationReference = "someRequestId")

      val jsonRequest =
        """{
          |"initiationReference": "someRequestId",
          |"dataProvider" : "zuora",
          |"requestType": "RER",
          |"action" : "status"
          |}
          |""".stripMargin

      decode[RerRequest](jsonRequest) shouldBe Right(expectedRequest)

    }

    "should decode valid PerformRerRequest" in {
      val expectedRequest = PerformRerRequest(initiationReference = "someRequestId", subjectEmail = "testSubjectEmail")

      val jsonRequest =
        """{
          |"initiationReference": "someRequestId",
          |"subjectEmail": "testSubjectEmail",
          |"dataProvider" : "zuora",
          |"requestType" : "RER",
          |"action" : "perform"
          |}
          |""".stripMargin

      decode[RerRequest](jsonRequest) shouldBe Right(expectedRequest)
    }

    "should encode RerInitiateResponse correctly" in {
      val response: RerResponse = RerInitiateResponse("someRequestId")
      response.asJson.pretty(jsonPrinter) shouldBe """{"initiationReference":"someRequestId","action":"initiate","requestType":"RER","dataProvider":"zuora"}"""
    }

    "should encode completed RerStatusResponse correctly" in {
      val response: RerResponse = RerStatusResponse(
        status = Completed,
        resultLocations = Some(List("locationValue"))
      )
      response.asJson.pretty(jsonPrinter) shouldBe """{"status":"completed","resultLocations":["locationValue"],"action":"status","requestType":"RER","dataProvider":"zuora"}"""
    }

    "should encode pending RerStatusResponse correctly" in {
      val response: RerResponse = RerStatusResponse(status = Pending)
      response.asJson.pretty(jsonPrinter) shouldBe """{"status":"pending","action":"status","requestType":"RER","dataProvider":"zuora"}"""
    }

    "should encode failed RerStatusResponse correctly" in {
      val response: RerResponse = RerStatusResponse(status = Failed, None, Some("error making request"))
      response.asJson.pretty(jsonPrinter) shouldBe """{"status":"failed","message":"error making request","action":"status","requestType":"RER","dataProvider":"zuora"}"""
    }
  }
}
