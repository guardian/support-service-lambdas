package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsFailureResponse, ContactUsSuccessfulResponse}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class ContactUsTests extends AnyFlatSpec with should.Matchers {
  val errorMsg = "error"

  // TODO: Turn ContactUs.buildResponse back to protected/private and test processRequest instead

  "ContactUs.buildResponse" should "return a ContactUsSuccessfulResponse on Success" in {
    ContactUs.buildResponse(Right(())) shouldBe ContactUsSuccessfulResponse()
  }

  it  should "return a ContactUsFailureResponse on Throwable" in {
    ContactUs.buildResponse(Left(new Throwable(errorMsg))) shouldBe ContactUsFailureResponse(errorMsg)
  }
}
