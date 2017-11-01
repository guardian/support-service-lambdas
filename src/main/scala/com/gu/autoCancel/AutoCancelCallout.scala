package com.gu.autoCancel

import play.api.libs.json.Json

case class AutoCancelCallout(
    accountId: String,
    autoPay: String
) {
  def isAutoPay = autoPay == "true"
}

object AutoCancelCallout {
  implicit val jf = Json.reads[AutoCancelCallout]
}
