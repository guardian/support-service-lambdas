package com.gu.contact_us_api.models

import io.circe.Json
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import com.gu.contact_us_api.models.ContactUsTestVars._

class SFCompositeRequestTests extends AnyFlatSpec with should.Matchers {
  private val singleReq =
    List[SFRequestItem](SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage))
  private val multipleReq = List[SFRequestItem](
    SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage),
    SFAttachmentRequest(testFileName, testFileContents),
  )

  private val singleReqJson = Json.obj(
    ("allOrNone", Json.fromBoolean(true)),
    ("compositeRequest", Json.arr(singleReq.map(i => i.asJson): _*)),
  )

  private val multipleReqJson = Json.obj(
    ("allOrNone", Json.fromBoolean(true)),
    ("compositeRequest", Json.arr(multipleReq.map(i => i.asJson): _*)),
  )

  "SFCompositeRequest" should "encode into expected json object when only one item is supplied" in {
    SFCompositeRequest(singleReq).asJson shouldBe singleReqJson
  }

  it should "encode into expected json object when multiple items are supplied" in {
    SFCompositeRequest(multipleReq).asJson shouldBe multipleReqJson
  }
}
