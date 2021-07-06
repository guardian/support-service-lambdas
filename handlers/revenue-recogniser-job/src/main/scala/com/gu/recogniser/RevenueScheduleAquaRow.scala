package com.gu.recogniser

import kantan.csv.HeaderDecoder

case class RevenueScheduleAquaRow(
  number: String,
  undistributedAmountInPence: Int,
  subscriptionNumber: String,
)

object RevenueScheduleAquaRow {

  val csvFields = List(
    "RevenueSchedule.Number",
    "RevenueSchedule.UndistributedAmount",
    "Subscription.Name",
  )

  implicit val decoder: HeaderDecoder[RevenueScheduleAquaRow] = csvFields match {
    case a1 :: a2 :: a3 :: Nil =>
      HeaderDecoder.decoder(a1, a2, a3) {
        (
        number: String,
        amount: Double,
        subscriptionNumber: String,
      ) =>
          RevenueScheduleAquaRow(
            number,
            (amount * 100).toInt,
            subscriptionNumber,
          )
      }
    case _ => throw new RuntimeException("coding error - number of fields doesn't match the decoder")
  }

}
