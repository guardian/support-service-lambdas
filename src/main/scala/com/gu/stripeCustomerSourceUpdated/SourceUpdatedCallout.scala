package com.gu.stripeCustomerSourceUpdated

import play.api.libs.json.{ JsPath, Reads }

case class SourceUpdatedCallout( // add here based on the format stripe sends us TODO
  id: StripeId
)
case class StripeId(value: String) extends AnyVal

object SourceUpdatedCallout {

  implicit val jf: Reads[SourceUpdatedCallout] = {
    (
      (JsPath \ "id").read[String].map(StripeId.apply)
    ).map(SourceUpdatedCallout.apply _)
  }
}
