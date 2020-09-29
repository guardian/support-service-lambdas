package com.gu.contact_us_api.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import com.gu.contact_us_api.models.ContactUsTestVars._

class AttachmentDetailsTests extends AnyFlatSpec with should.Matchers {
  val baseReqObj = SFAttachmentRequest(testFileName, testFileContents)

  "AttachmentDetails.asSFRequestItem" should "return the correct object" in {
    AttachmentDetails(testFileName, testFileContents).asSFRequestItem shouldBe baseReqObj
  }
}
