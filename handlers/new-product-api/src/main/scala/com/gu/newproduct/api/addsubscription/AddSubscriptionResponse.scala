package com.gu.newproduct.api.addsubscription

import play.api.libs.json.{Json, OWrites, Writes}

sealed trait AddSubscriptionResponse
case class Error(message: String) extends AddSubscriptionResponse
case class AddedSubscription(subscriptionNumber: String) extends AddSubscriptionResponse

object Error {
  implicit val writes: OWrites[Error] = Json.writes[Error]
}

object AddedSubscription {
  implicit val writes: OWrites[AddedSubscription] = Json.writes[AddedSubscription]
}

object AddSubscriptionResponse {
  implicit val writes: Writes[AddSubscriptionResponse] = {
    case e: Error => Error.writes.writes(e)
    case s: AddedSubscription => AddedSubscription.writes.writes(s)
  }
}
