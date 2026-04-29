package com.gu.identityBackfill.supporterProductData

import io.circe.Encoder
import io.circe.generic.semiauto.deriveEncoder

import java.time.LocalDate

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

final case class ZuoraRatePlan(
    productRatePlanId: String,
    ratePlanName: String,
)

final case class ZuoraSubscription(
    subscriptionName: String,
    termEndDate: LocalDate,
    contractEffectiveDate: LocalDate,
    ratePlans: List[ZuoraRatePlan],
)
