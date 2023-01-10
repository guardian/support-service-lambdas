package com.gu.contact_us_api.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import com.gu.contact_us_api.models.ContactUsTestVars._

class ContactUsRequestTests extends AnyFlatSpec with should.Matchers {
  private val baseReqObj = SFCompositeRequest(
    List(SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage)),
  )
  private val baseReqWithSubtopicObj = SFCompositeRequest(
    List(SFCaseRequest(testTopic, Some(testSubtopic), None, testName, testEmail, testSubject, testMessage)),
  )
  private val baseReqWithSubsubtopicObj = SFCompositeRequest(
    List(
      SFCaseRequest(testTopic, Some(testSubtopic), Some(testSubsubtopic), testName, testEmail, testSubject, testMessage),
    ),
  )
  private val baseReqWithAttachmentObj = SFCompositeRequest(
    List(
      SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage),
      SFAttachmentRequest(testFileName, testFileContents),
    ),
  )

  "ContactUsRequest.asSFCompositeRequest" should "return the correct object when no optional fields are present" in {
    ContactUsRequest(
      testTopic,
      None,
      None,
      testName,
      testEmail,
      testSubject,
      testMessage,
      None,
    ).asSFCompositeRequest shouldBe baseReqObj
  }

  it should "return the correct object when a subtopic is present" in {
    ContactUsRequest(
      testTopic,
      Some(testSubtopic),
      None,
      testName,
      testEmail,
      testSubject,
      testMessage,
      None,
    ).asSFCompositeRequest shouldBe baseReqWithSubtopicObj
  }

  it should "return the correct object when a subsubtopic is present" in {
    ContactUsRequest(
      testTopic,
      Some(testSubtopic),
      Some(testSubsubtopic),
      testName,
      testEmail,
      testSubject,
      testMessage,
      None,
    ).asSFCompositeRequest shouldBe baseReqWithSubsubtopicObj
  }

  it should "returns the correct object when an attachment is present" in {
    ContactUsRequest(
      testTopic,
      None,
      None,
      testName,
      testEmail,
      testSubject,
      testMessage,
      Some(AttachmentDetails(testFileName, testFileContents)),
    ).asSFCompositeRequest shouldBe baseReqWithAttachmentObj
  }
}
