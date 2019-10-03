package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures.mkSubscription
import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription.{HolidayCreditUpdate, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import org.scalatest.{EitherValues, FlatSpec, Matchers, OptionValues}

class GuardianWeeklyHolidayStopProcessTest extends FlatSpec with Matchers with EitherValues with OptionValues {

  private val subscription = mkSubscription(
    termStartDate = LocalDate.of(2018, 1, 1),
    termEndDate = LocalDate.of(2019, 1, 1),
    price = 75.5,
    billingPeriod = "Quarter",
    chargedThroughDate = Some(LocalDate.of(2019, 8, 11))
  )

  private val holidayStop = HolidayStop(
    HolidayStopRequestsDetailId("HSR1"),
    SubscriptionName("S1"),
    ProductName("Gu Weekly"),
    LocalDate.of(2019, 8, 9),
    None
  )

  private def updateSubscription(
    subscriptionUpdate: Either[ZuoraHolidayError, Unit]
  ): (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayError, Unit] = {
    case (_, _) => subscriptionUpdate
  }

  private def exportAmendments(amendmentExport: Either[SalesforceHolidayError, Unit]): List[ZuoraHolidayWriteResult] => Either[SalesforceHolidayError, Unit] =
    _ => amendmentExport

  "HolidayStopProcess" should "give correct added charge" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Right(()))
    )(holidayStop)

    response.right.value shouldBe ZuoraHolidayWriteResult(
      requestId = HolidayStopRequestsDetailId("HSR1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = HolidayStopRequestsDetailChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = HolidayStopRequestsDetailChargePrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
    )
  }

  it should "give an exception message if update fails" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(subscription),
      updateSubscription(Left(ZuoraHolidayError("update went wrong")))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayError("update went wrong")
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Left(ZuoraHolidayError("get went wrong")),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayError("get went wrong")
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(subscription.copy(autoRenew = false)),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe
      ZuoraHolidayError("Cannot currently process non-auto-renewing subscription")
  }

  it should "fail if subscription is cancelled" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(subscription.copy(status = "Cancelled")),
      updateSubscription(Left(ZuoraHolidayError("shouldn't need to apply an update")))
    )(holidayStop)
    response.left.value.reason should include("Apply manual refund")
  }

  it should "just give charge added without applying an update if holiday stop has already been applied" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Left(ZuoraHolidayError("shouldn't need to apply an update")))
    )(holidayStop)
    response.right.value shouldBe ZuoraHolidayWriteResult(
      requestId = HolidayStopRequestsDetailId("HSR1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = HolidayStopRequestsDetailChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = HolidayStopRequestsDetailChargePrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
    )
  }

  it should "give a failure if subscription has no added charge" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(subscription),
      updateSubscription(Left(ZuoraHolidayError("shouldn't need to apply an update")))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayError("shouldn't need to apply an update")
  }

  "processHolidayStops" should "give correct charges added" in {
    val responses = Processor.processProduct(
      Fixtures.config,
      Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C1"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C3"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C4")
      )),
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
    responses.holidayStopResults.headOption.value.right.value shouldBe ZuoraHolidayWriteResult(
      requestId = HolidayStopRequestsDetailId("R1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = HolidayStopRequestsDetailChargeCode("C3"),
      estimatedPrice = None,
      actualPrice = HolidayStopRequestsDetailChargePrice(-5.81),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 2))
    )
    responses.holidayStopResults.lastOption.value.right.value shouldBe ZuoraHolidayWriteResult(
      requestId = HolidayStopRequestsDetailId("R3"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = HolidayStopRequestsDetailChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = HolidayStopRequestsDetailChargePrice(-3.27),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 9))
    )
  }

  it should "only export results that haven't already been exported" in {
    val responses = Processor.processProduct(
      Fixtures.config,
      Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C2"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C5"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C6")
      )),
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
    responses.resultsToExport shouldBe List(
      ZuoraHolidayWriteResult(
        HolidayStopRequestsDetailId("R1"),
        subscriptionName = SubscriptionName("S1"),
        productName = ProductName("Gu Weekly"),
        HolidayStopRequestsDetailChargeCode("C3"),
        None,
        HolidayStopRequestsDetailChargePrice(-5.81),
        StoppedPublicationDate(LocalDate.of(2019, 8, 2))
      )
    )
  }

  it should "give an exception message if exporting results fails" in {
    val responses = Processor.processProduct(
      Fixtures.config,
      Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r1"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r2"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r3"), "")
      )),
      _ => Right(subscription),
      updateSubscription(Right(())),
      exportAmendments(Left(SalesforceHolidayError("Export failed")))
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
