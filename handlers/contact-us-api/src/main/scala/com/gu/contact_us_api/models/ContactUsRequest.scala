package com.gu.contact_us_api.models

case class ContactUsRequest(
    topic: String,
    subtopic: Option[String],
    subsubtopic: Option[String],
    name: String,
    email: String,
    subject: String,
    message: String,
    attachment: Option[AttachmentDetails],
) {
  val isValid: Boolean = true

  val asSFCompositeRequest: SFCompositeRequest = {
    val requestList = List(
      SFCaseRequest(topic, subtopic, subsubtopic, name, email, subject, message),
    ) ++ attachment.map(i => i.asSFRequestItem)

    SFCompositeRequest(requestList)
  }
}
