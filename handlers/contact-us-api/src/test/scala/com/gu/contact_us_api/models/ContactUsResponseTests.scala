package com.gu.contact_us_api.models

import io.circe.Json
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class ContactUsResponseTests extends AnyFlatSpec with should.Matchers {
  val errorMsg = "error"
  val successJson = Json.obj(("success", Json.fromBoolean(true)))
  val failureJson = Json.obj(("success", Json.fromBoolean(false)), ("error", Json.fromString(errorMsg)))

  "ContactUsSuccessfulResponse" should "encode into expected json object" in {
    ContactUsSuccessfulResponse().asJson shouldBe successJson
  }

  "ContactUsFailureResponse.success" should "encode into expected json object" in {
    ContactUsFailureResponse("error").asJson shouldBe failureJson
  }
}
