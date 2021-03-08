package com.gu.recogniser

import kantan.csv.HeaderDecoder

case class RevenueScheduleAquaRow(
  number: String,
  undistributedAmountInPence: Int,
  chargeId: String,
  isRedeemed: Boolean
)

object RevenueScheduleAquaRow {

  val csvFields = List(
    "RevenueSchedule.Number",
    "RevenueSchedule.UndistributedAmount",
    "RatePlanCharge.Id",
    "Subscription.GifteeIdentityId__c"
  )

  implicit val decoder: HeaderDecoder[RevenueScheduleAquaRow] = csvFields match {
    case a1 :: a2 :: a3 :: a4 :: Nil =>
      HeaderDecoder.decoder(a1, a2, a3, a4) {
        (
        number: String,
        amount: Double,
        chargeId: String,
        gifteeIdentityId: String
      ) =>
          RevenueScheduleAquaRow(
            number,
            (amount * 100).toInt,
            chargeId,
            gifteeIdentityId.nonEmpty
          )
      }
    case _ => throw new RuntimeException("coding error - number of fields doesn't match the decoder")
  }

}
