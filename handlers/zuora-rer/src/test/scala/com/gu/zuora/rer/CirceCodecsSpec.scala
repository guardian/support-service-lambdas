package com.gu.zuora.rer

import BatonModels.{
  Completed,
  Failed,
  Pending,
  PerformRerRequest,
  RerInitiateRequest,
  RerInitiateResponse,
  RerRequest,
  RerResponse,
  RerStatusRequest,
  RerStatusResponse,
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
    "should decode valid RerInitiateRequest" in {
      val expectedRequest = RerInitiateRequest(subjectEmail = "testSubjectEmail")

      val jsonRequest =
        """{
          |"subjectId": "",
          |"subjectEmail" : "testSubjectEmail",
          |"dataProvider" : "zuorarer",
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
          |"dataProvider" : "zuorarer",
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
          |"dataProvider" : "zuorarer",
          |"requestType" : "RER",
          |"action" : "perform"
          |}
          |""".stripMargin

      decode[RerRequest](jsonRequest) shouldBe Right(expectedRequest)
    }

    "should encode RerInitiateResponse correctly" in {
      val response: RerResponse = RerInitiateResponse("someRequestId", "the request is pending", Pending)
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"initiationReference":"someRequestId","message":"the request is pending","status":"pending","action":"initiate","requestType":"RER","dataProvider":"zuorarer"}"""
    }

    "should encode completed RerStatusResponse correctly" in {
      val response: RerResponse = RerStatusResponse(
        initiationReference = "someRequestId",
        message = "test message",
        status = Completed,
        resultLocations = Some(List("locationValue")),
      )
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"initiationReference":"someRequestId","message":"test message","status":"completed","resultLocations":["locationValue"],"action":"status","requestType":"RER","dataProvider":"zuorarer"}"""
    }

    "should encode pending RerStatusResponse correctly" in {
      val response: RerResponse =
        RerStatusResponse(initiationReference = "someRequestId", message = "test message", status = Pending)
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"initiationReference":"someRequestId","message":"test message","status":"pending","action":"status","requestType":"RER","dataProvider":"zuorarer"}"""
    }

    "should encode failed RerStatusResponse correctly" in {
      val response: RerResponse = RerStatusResponse(
        initiationReference = "someRequestId",
        message = "error making request",
        status = Failed,
        None,
      )
      response.asJson.printWith(
        jsonPrinter,
      ) shouldBe """{"initiationReference":"someRequestId","message":"error making request","status":"failed","action":"status","requestType":"RER","dataProvider":"zuorarer"}"""
    }
  }
}
