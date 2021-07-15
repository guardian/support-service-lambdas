package com.gu.recogniser

import cats.syntax.all._
import com.gu.recogniser.RevenueScheduleAquaRow.csvFields

class RevenueSchedulesQuerier(
  log: String => Unit,
  blockingAquaQuery: BlockingAquaQuery,
  getSubscription: GetSubscription,
) {

  def execute(): Either[String, List[(RevenueScheduleAquaRow, GetSubscription.GetSubscriptionResponse)]] = {
    val expiredGiftsAndRefunds =
      s"""select ${csvFields.mkString(", ")}
         |from RevenueSchedule
         |where
         |     Rule = 'Digital Subscription Gift Rule'
         | AND UndistributedAmount != 0
         |""".stripMargin
    for {
      undistributedRevenue <- blockingAquaQuery.executeQuery[RevenueScheduleAquaRow](
        expiredGiftsAndRefunds
      ).toDisjunction.leftMap(_.toString)
      undistributedSchedules <- undistributedRevenue.toList.sequence.leftMap(_.toString)
      subsToFetch = undistributedSchedules.map(_.subscriptionNumber).distinct
      numberToFetch = subsToFetch.length
      fetchedSubs <- subsToFetch.zipWithIndex.traverse({ case (subNo, index) =>
        log(s"$index/${numberToFetch}: fetching subscription $subNo")
        getSubscription.execute(subNo).toDisjunction.map(sub => (subNo, sub))
      }).map(_.toMap).leftMap(_.toString)
    } yield undistributedSchedules.map(sch => (sch, fetchedSubs(sch.subscriptionNumber)))
  }

}
