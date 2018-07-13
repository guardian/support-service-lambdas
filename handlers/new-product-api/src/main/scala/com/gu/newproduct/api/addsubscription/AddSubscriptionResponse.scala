package com.gu.newproduct.api.addsubscription

import play.api.libs.json.{Json, Writes}

sealed trait AddSubscriptionResponse
case class Error(message: String) extends AddSubscriptionResponse
case class AddedSubscription(subscriptionNumber: String) extends AddSubscriptionResponse

object Error {
  implicit val writes = Json.writes[Error]
}

object AddedSubscription {
  implicit val writes = Json.writes[AddedSubscription]
}

object AddSubscriptionResponse {
  implicit val writes: Writes[AddSubscriptionResponse] = { response =>
    response match {
      case e: Error => Error.writes.writes(e)
      case s: AddedSubscription => AddedSubscription.writes.writes(s)
    }

  }
}
