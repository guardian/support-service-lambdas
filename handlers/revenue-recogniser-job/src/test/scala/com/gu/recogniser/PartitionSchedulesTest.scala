package com.gu.recogniser

import com.gu.recogniser.GetSubscription.GetSubscriptionResponse
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class PartitionSchedulesTest extends AnyFlatSpec with Matchers {

  it should "partition one sub into each group, and drop an unredeemed unexpired one" in {
    val redeemed = (
      RevenueScheduleAquaRow("RS-redeemed", -15909, "A-S01234"),
      GetSubscriptionResponse(Some(LocalDate.of(2020, 11, 26)), true, LocalDate.of(2020, 11, 26), 92, "Day"),
    )
    val expiredUnredeemed = (
      RevenueScheduleAquaRow("RS-expiredUnredeemed", 9000, "A-S05432"),
      GetSubscriptionResponse(None, false, LocalDate.of(2020, 6, 28), 13, "Months"),
    )
    val unexpiredUnredeemed = (
      RevenueScheduleAquaRow("RS-unexpiredUnredeemed", -15909, "A-S01234"),
      GetSubscriptionResponse(None, false, LocalDate.of(2020, 6, 29), 13, "Months"),
    )

    val data = List(
      redeemed,
      expiredUnredeemed,
      unexpiredUnredeemed,
    )

    val sut = new PartitionSchedules(() => LocalDate.of(2021, 6, 29), println, println)

    val result = sut.partition(data)

    withClue(s"actual: $result") {
      result._1.map(_.expiredCodeSchedule) should be(List("RS-expiredUnredeemed"))
      result._2.map(_.refundSchedule) should be(List("RS-redeemed"))
    }
  }

}
