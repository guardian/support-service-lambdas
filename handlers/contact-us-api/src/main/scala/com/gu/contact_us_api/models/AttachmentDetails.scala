package com.gu.contact_us_api.models

case class AttachmentDetails(name: String, contents: String) {
  val asSFRequestItem: SFRequestItem = SFAttachmentRequest(name, contents)
}