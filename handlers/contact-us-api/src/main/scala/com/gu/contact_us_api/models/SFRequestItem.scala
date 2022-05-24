package com.gu.contact_us_api.models

import com.gu.contact_us_api.models.ContactUsConfig.salesforceApiVersion
import io.circe.{Encoder, Json}

trait SFRequestItem

case class SFCaseRequest(topic: String, subtopic: Option[String], subsubtopic: Option[String], name: String, email: String, subject: String, message: String) extends SFRequestItem

case class SFAttachmentRequest(name: String, contents: String) extends SFRequestItem

object SFRequestItem {
  implicit val encodeSFRequestItem: Encoder[SFRequestItem] = new Encoder[SFRequestItem] {
    final def apply(a: SFRequestItem): Json =
      a match {
        case a: SFCaseRequest => SFCaseRequest.encodeSFCaseRequest(a)
        case a: SFAttachmentRequest => SFAttachmentRequest.encodeSFAttachmentRequest(a)
      }
  }
}

object SFCaseRequest {

  val method = "POST"
  val url = s"/services/data/v$salesforceApiVersion/sobjects/Case/"
  val referenceId = "newCase"

  implicit val encodeSFCaseRequest: Encoder[SFCaseRequest] = new Encoder[SFCaseRequest] {
    final def apply(a: SFCaseRequest): Json = {
      val itemList: List[(String, Json)] = (List(
        ("Origin", "Web"),
        ("Origin_Channel__c", "Contact Us form"),
        ("SuppliedName", a.name),
        ("SuppliedEmail", a.email),
        ("Subject", a.subject),
        ("Description", a.message),
        ("Form_Topic__c", a.topic)
      ) ++
        a.subtopic.map(i => ("Form_Subtopic__c", i)) ++
        a.subsubtopic.map(i => ("Form_subsubtopic__c", i))).
        map(i => (i._1, Json.fromString(i._2)))

      Json.obj(
        ("method", Json.fromString(method)),
        ("url", Json.fromString(url)),
        ("referenceId", Json.fromString(referenceId)),
        ("body", Json.obj(
          itemList: _*
        ))
      )
    }
  }
}

object SFAttachmentRequest {

  val method = "POST"
  val url = s"/services/data/v$salesforceApiVersion/sobjects/Attachment/"
  val referenceId = "newAttachment"

  implicit val encodeSFAttachmentRequest: Encoder[SFAttachmentRequest] = new Encoder[SFAttachmentRequest] {
    final def apply(a: SFAttachmentRequest): Json = Json.obj(
      ("method", Json.fromString(method)),
      ("url", Json.fromString(url)),
      ("referenceId", Json.fromString(referenceId)),
      ("body", Json.obj(
        ("ParentId", Json.fromString(s"@{${SFCaseRequest.referenceId}.id}")),
        ("name", Json.fromString(a.name)),
        ("body", Json.fromString(a.contents))
      ))
    )
  }
}
