package com.gu.deliveryproblemcreditprocessor

import ai.x.play.json.Jsonx
import play.api.libs.json.{Format, Json}

case class DeliveryId(value: String) extends AnyVal

object DeliveryId {
  implicit val format: Format[DeliveryId] = Jsonx.formatInline[DeliveryId]
}
