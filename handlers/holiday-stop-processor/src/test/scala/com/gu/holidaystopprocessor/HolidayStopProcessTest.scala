package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.{config, mkSubscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestId}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraAmendmentCode, HolidayStopRequestActionedZuoraAmendmentPrice, StoppedPublicationDate}
import org.scalatest.{EitherValues, FlatSpec, Matchers, OptionValues}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues with OptionValues {

  private val subscription = mkSubscription(
    termEndDate = LocalDate.of(2019, 1, 1),
    price = 75.5,
    billingPeriod = "Quarter",
    chargedThroughDate = Some(LocalDate.of(2019, 8, 11))
  )

  private val holidayStop = HolidayStop(
    HolidayStopRequestId("HSR1"),
    "subscriptionName",
    LocalDate.of(2019, 8, 9)
  )

  private def getRequests(requestsGet: Either[OverallFailure, Seq[HolidayStopRequest]]): String => Either[OverallFailure, Seq[HolidayStopRequest]] =
    _ => requestsGet

  private def getSubscription(subscriptionGet: Either[HolidayStopFailure, Subscription]): String => Either[HolidayStopFailure, Subscription] = {
    _ => subscriptionGet
  }

  private def updateSubscription(
    subscriptionUpdate: Either[HolidayStopFailure, Unit]
  ): (Subscription, SubscriptionUpdate) => Either[HolidayStopFailure, Unit] = {
    case (_, _) => subscriptionUpdate
  }

  private def exportAmendments(amendmentExport: Either[OverallFailure, Unit]): Seq[HolidayStopResponse] => Either[OverallFailure, Unit] =
    _ => amendmentExport

  "HolidayStopProcess" should "give correct added charge" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(()))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("HSR1"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("C2"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
    )
  }

  it should "give an exception message if update fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Left(HolidayStopFailure("update went wrong")))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("update went wrong")
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Left(HolidayStopFailure("get went wrong"))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("get went wrong")
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription.copy(autoRenew = false))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe
      HolidayStopFailure("Cannot currently process non-auto-renewing subscription")
  }

  it should "just give charge added without applying an update if holiday stop has already been applied" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Left(HolidayStopFailure("shouldn't need to apply an update")))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("HSR1"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("C2"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
    )
  }

  it should "give a failure if subscription has no added charge" in {
    val response = HolidayStopProcess.processHolidayStop(
      config,
      getSubscription(Right(subscription)),
      updateSubscription(Left(HolidayStopFailure("shouldn't need to apply an update")))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("shouldn't need to apply an update")
  }

  "processHolidayStops" should "give correct charges added" in {
    val responses = HolidayStopProcess.processHolidayStops(
      config,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)),
        Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)),
        Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9))
      ))),
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
    responses.holidayStopResults.headOption.value.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("R1"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("C3"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-5.81),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 2))
    )
    responses.holidayStopResults.lastOption.value.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestId("R3"),
      amendmentCode = HolidayStopRequestActionedZuoraAmendmentCode("C2"),
      price = HolidayStopRequestActionedZuoraAmendmentPrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
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
      exportAmendments(Left(OverallFailure("Export failed")))
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
