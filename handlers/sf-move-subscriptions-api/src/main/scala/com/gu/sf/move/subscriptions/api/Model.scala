package com.gu.sf.move.subscriptions.api

import io.circe.Encoder
import io.circe.generic.semiauto.deriveEncoder

import java.time.LocalDate

final case class MoveSubscriptionReqBody(
    zuoraSubscriptionId: String,
    sfAccountId: String,
    sfFullContactId: String,
    identityId: String,
)

final case class MoveSubscriptionApiConfig(
    zuoraBaseUrl: String,
    zuoraClientId: String,
    zuoraSecret: String,
)

final case class MoveSubscriptionApiRoot(
    description: String,
    exampleRequests: List[ExampleReqDoc],
)

final case class ExampleReqDoc(
    method: String,
    path: String,
    body: MoveSubscriptionReqBody,
)

final case class SupporterRatePlanItem(
    subscriptionName: String,
    identityId: String,
    productRatePlanId: String,
    productRatePlanName: String,
    termEndDate: LocalDate,
    contractEffectiveDate: LocalDate,
)

object SupporterRatePlanItem {
  implicit val encoder: Encoder[SupporterRatePlanItem] = deriveEncoder[SupporterRatePlanItem]
}
