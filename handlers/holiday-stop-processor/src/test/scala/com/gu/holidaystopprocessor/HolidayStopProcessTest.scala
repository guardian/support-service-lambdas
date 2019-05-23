package com.gu.holidaystopprocessor

import java.time.LocalDate

import org.scalatest.{EitherValues, FlatSpec, Matchers}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues {

  private val subscription = Fixtures.mkSubscription(
    LocalDate.of(2019, 1, 1),
    75.5,
    "Quarter",
    LocalDate.of(2020, 1, 1)
  )

  private val amendment = Amendment("A1")

  private val holidayStop = HolidayStop("", LocalDate.of(2019, 1, 1))

  private def mkConfig(
    subscriptionGet: Either[String, Subscription],
    subscriptionUpdate: Either[String, Unit],
    amendmentGet: Either[String, Amendment]
  ) = Config(
    getSubscription = { _ =>
      subscriptionGet
    },
    updateSubscription = { case (_, _) => subscriptionUpdate },
    getLastAmendment = { _ =>
      amendmentGet
    },
    holidayCreditProductRatePlanId = "",
    holidayCreditProductRatePlanChargeId = ""
  )

  "HolidayStopProcess" should "give correct amendment" in {
    val config = mkConfig(Right(subscription), Right(Unit), Right(amendment))
    val response = HolidayStopProcess(config, holidayStop)
    response.right.value shouldBe HolidayStopResponse(
      code = "A1",
      price = -5.81
    )
  }

  it should "give an exception message if update fails" in {
    val config =
      mkConfig(Right(subscription), Left("update went wrong"), Right(amendment))
    val response = HolidayStopProcess(config, holidayStop)
    response.left.value shouldBe "update went wrong"
  }

  it should "give an exception message if getting subscription details fails" in {
    val config = mkConfig(Left("get went wrong"), Right(Unit), Right(amendment))
    val response = HolidayStopProcess(config, holidayStop)
    response.left.value shouldBe "get went wrong"
  }

  it should "give an exception message if getting amendment code fails" in {
    val config =
      mkConfig(Right(subscription), Right(Unit), Left("amendment gone bad"))
    val response = HolidayStopProcess(config, holidayStop)
    response.left.value shouldBe "amendment gone bad"
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val config =
      mkConfig(Right(subscription.copy(autoRenew = false)), Right(Unit), Right(amendment))
    val response = HolidayStopProcess(config, holidayStop)
    response.left.value shouldBe "Cannot currently process non-auto-renewing subscription"
  }
}
