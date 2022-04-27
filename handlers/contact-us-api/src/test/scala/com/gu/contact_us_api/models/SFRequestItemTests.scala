package com.gu.contact_us_api.models

import com.gu.contact_us_api.models.ContactUsTestVars._
import io.circe.Json
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SFRequestItemTests extends AnyFlatSpec with should.Matchers {
  private val method = "POST"
  private val caseUrl = "/services/data/v20.0/sobjects/Case/"
  private val caseReferenceId = "newCase"

  private val attachmentUrl = "/services/data/v20.0/sobjects/Attachment/"
  private val attachmentReferenceId = "newAttachment"

  private val caseReqBaseJson = Json.obj(
    ("method", Json.fromString(method)),
    ("url", Json.fromString(caseUrl)),
    ("referenceId", Json.fromString(caseReferenceId)),
    ("body", Json.obj(
      ("Origin", Json.fromString("Web")),
      ("Origin_Channel__c", Json.fromString("Contact Us form")),
      ("SuppliedName", Json.fromString(testName)),
      ("SuppliedEmail", Json.fromString(testEmail)),
      ("Subject", Json.fromString(testSubject)),
      ("Description", Json.fromString(testMessage)),
      ("Form_Topic__c", Json.fromString(testTopic))
    ))
  )

  private val caseReqWithSubtopicJson = Json.obj(
    ("method", Json.fromString(method)),
    ("url", Json.fromString(caseUrl)),
    ("referenceId", Json.fromString(caseReferenceId)),
    ("body", Json.obj(
      ("Origin", Json.fromString("Web")),
      ("Origin_Channel__c", Json.fromString("Contact Us form")),
      ("SuppliedName", Json.fromString(testName)),
      ("SuppliedEmail", Json.fromString(testEmail)),
      ("Subject", Json.fromString(testSubject)),
      ("Description", Json.fromString(testMessage)),
      ("Form_Topic__c", Json.fromString(testTopic)),
      ("Form_Subtopic__c", Json.fromString(testSubtopic))
    ))
  )

  private val caseReqWithSubsubtopicJson = Json.obj(
    ("method", Json.fromString(method)),
    ("url", Json.fromString(caseUrl)),
    ("referenceId", Json.fromString(caseReferenceId)),
    ("body", Json.obj(
      ("Origin", Json.fromString("Web")),
      ("Origin_Channel__c", Json.fromString("Contact Us form")),
      ("SuppliedName", Json.fromString(testName)),
      ("SuppliedEmail", Json.fromString(testEmail)),
      ("Subject", Json.fromString(testSubject)),
      ("Description", Json.fromString(testMessage)),
      ("Form_Topic__c", Json.fromString(testTopic)),
      ("Form_Subtopic__c", Json.fromString(testSubtopic)),
      ("Form_subsubtopic__c", Json.fromString(testSubsubtopic))
    ))
  )

  private val attachmentReqJson = Json.obj(
    ("method", Json.fromString(method)),
    ("url", Json.fromString(attachmentUrl)),
    ("referenceId", Json.fromString(attachmentReferenceId)),
    ("body", Json.obj(
      ("ParentId", Json.fromString(s"@{$caseReferenceId.id}")),
      ("name", Json.fromString(testFileName)),
      ("body", Json.fromString(testFileContents))
    ))
  )

  "SFCaseRequest" should "encode into expected json object when no optional fields are present" in {
    SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage).asInstanceOf[SFRequestItem].asJson shouldBe caseReqBaseJson
  }

  it should "encode into expected json object when a subtopic is present" in {
    SFCaseRequest(testTopic, Some(testSubtopic), None, testName, testEmail, testSubject, testMessage).asInstanceOf[SFRequestItem].asJson shouldBe caseReqWithSubtopicJson
  }

  it should "encode into expected json object when a subsubtopic is present" in {
    SFCaseRequest(testTopic, Some(testSubtopic), Some(testSubsubtopic), testName, testEmail, testSubject, testMessage).asInstanceOf[SFRequestItem].asJson shouldBe caseReqWithSubsubtopicJson
  }

  "SFAttachmentRequest" should "encode into expected json object when no optional fields are present" in {
    SFAttachmentRequest(testFileName, testFileContents).asInstanceOf[SFRequestItem].asJson shouldBe attachmentReqJson
  }
}
