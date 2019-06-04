package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.{config, mkSubscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestId}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraAmendmentCode, HolidayStopRequestActionedZuoraAmendmentPrice}
import org.scalatest.{EitherValues, FlatSpec, Matchers, OptionValues}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues with OptionValues {

  private val subscription = mkSubscription(
    LocalDate.of(2019, 1, 1),
    75.5,
    "Quarter",
    LocalDate.of(2020, 1, 1)
  )

  private val amendment = Amendment("A1")

  private val holidayStop = HolidayStop(
    HolidayStopRequestId(""),
    "subscriptionName",
    LocalDate.of(2019, 1, 1)
  )

  private def getRequests(requestsGet: Either[String, Seq[HolidayStopRequest]]) = {
    _: String => requestsGet
  }
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
  private def exportAmendments(amendmentExport: Either[String, Unit]) = { _: Seq[HolidayStopResponse] => amendmentExport }

  "HolidayStopProcess" should "give correct amendment" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId(""),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("A1"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-5.81)
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
      updateSubscription(Right(())),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.left.value shouldBe "get went wrong"
  }

  it should "give an exception message if getting amendment code fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      getLastAmendment(Left("amendment gone bad"))
    )(holidayStop)
    response.left.value shouldBe "amendment gone bad"
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription.copy(autoRenew = false))),
      updateSubscription(Right(())),
      getLastAmendment(Right(amendment))
    )(holidayStop)
    response.left.value shouldBe "Cannot currently process non-auto-renewing subscription"
  }

  "processHolidayStops" should "give correct amendments" in {
    val responses = HolidayStopProcess.processHolidayStops(
      config,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequest("r1"),
        Fixtures.mkHolidayStopRequest("r2"),
        Fixtures.mkHolidayStopRequest("r3")
      ))),
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      getLastAmendment(Right(amendment)),
      exportAmendments(Right(()))
    )
    responses.headOption.value.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("r1"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("A1"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-5.81)
    )
    responses.lastOption.value.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("r3"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("A1"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-5.81)
    )
  }

  it should "give an exception message if exporting results fails" in {
    val responses = HolidayStopProcess.processHolidayStops(
      config,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequest("r1"),
        Fixtures.mkHolidayStopRequest("r2"),
        Fixtures.mkHolidayStopRequest("r3")
      ))),
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      getLastAmendment(Right(amendment)),
      exportAmendments(Left("Export failed"))
    )
    responses.headOption.value.left.value shouldBe "Export failed"
  }
}
