package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.{config, mkSubscription}
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues {

  private val subscription = mkSubscription(
    LocalDate.of(2019, 1, 1),
    75.5,
    "Quarter",
    LocalDate.of(2020, 1, 1)
  )

  private val amendment = Amendment("A1")

  private val holidayStop = HolidayStop("", LocalDate.of(2019, 1, 1))

  private def getSubscription(subscriptionGet: Either[String, Subscription]) = {
    _: String =>
      subscriptionGet
  }
  private def updateSubscription(
    subscriptionUpdate: Either[String, Unit]
  ): (Subscription, SubscriptionUpdate) => Either[String, Unit] = {
    case (_, _) => subscriptionUpdate
  }
  private def getLastAmendment(amendmentGet: Either[String, Amendment]) = {
    _: Subscription =>
      amendmentGet
  }

  "HolidayStopProcess" should "give correct amendment" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Right(Unit)),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
      code = "A1",
      price = -5.81
    )
  }

  it should "give an exception message if update fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Left("update went wrong")),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.left.value shouldBe "update went wrong"
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Left("get went wrong")),
      updateSubscription(Right(Unit)),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.left.value shouldBe "get went wrong"
  }

  it should "give an exception message if getting amendment code fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Right(Unit)),
      getLastAmendment(Left("amendment gone bad"))
    )(holidayStop)
    response.left.value shouldBe "amendment gone bad"
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription.copy(autoRenew = false))),
      updateSubscription(Right(Unit)),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.left.value shouldBe "Cannot currently process non-auto-renewing subscription"
  }
}
