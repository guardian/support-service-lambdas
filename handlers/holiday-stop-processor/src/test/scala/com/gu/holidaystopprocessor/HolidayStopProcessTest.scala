package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.{config, mkSubscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, HolidayStopRequestsDetailId, ProductName, StoppedPublicationDate, SubscriptionName}
import org.scalatest.{EitherValues, FlatSpec, Matchers, OptionValues}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues with OptionValues {

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

  private def getRequests(requestsGet: Either[OverallFailure, Seq[HolidayStopRequestsDetail]]): ProductName => Either[OverallFailure, Seq[HolidayStopRequestsDetail]] =
    _ => requestsGet

  private def getSubscription(subscriptionGet: Either[HolidayStopFailure, Subscription]): SubscriptionName => Either[HolidayStopFailure, Subscription] = {
    _ => subscriptionGet
  }

  private def updateSubscription(
    subscriptionUpdate: Either[HolidayStopFailure, Unit]
  ): (Subscription, HolidayCreditUpdate) => Either[HolidayStopFailure, Unit] = {
    case (_, _) => subscriptionUpdate
  }

  private def exportAmendments(amendmentExport: Either[OverallFailure, Unit]): Seq[HolidayStopResponse] => Either[OverallFailure, Unit] =
    _ => amendmentExport

  "HolidayStopProcess" should "give correct added charge" in {
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(()))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
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
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Right(subscription)),
      updateSubscription(Left(HolidayStopFailure("update went wrong")))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("update went wrong")
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Left(HolidayStopFailure("get went wrong"))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("get went wrong")
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Right(subscription.copy(autoRenew = false))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe
      HolidayStopFailure("Cannot currently process non-auto-renewing subscription")
  }

  it should "just give charge added without applying an update if holiday stop has already been applied" in {
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Left(HolidayStopFailure("shouldn't need to apply an update")))
    )(holidayStop)
    response.right.value shouldBe HolidayStopResponse(
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
    val response = HolidayStopProcess.writeHolidayStopToZuora(
      config.holidayCreditProduct,
      getSubscription(Right(subscription)),
      updateSubscription(Left(HolidayStopFailure("shouldn't need to apply an update")))
    )(holidayStop)
    response.left.value shouldBe HolidayStopFailure("shouldn't need to apply an update")
  }

  "processHolidayStops" should "give correct charges added" in {
    val responses = HolidayStopProcess.processHolidayStops(
      config.holidayCreditProduct,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C1"),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C3"),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C4")
      ))),
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
    responses.holidayStopResults.headOption.value.right.value shouldBe HolidayStopResponse(
      requestId = HolidayStopRequestsDetailId("R1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = HolidayStopRequestsDetailChargeCode("C3"),
      estimatedPrice = None,
      actualPrice = HolidayStopRequestsDetailChargePrice(-5.81),
      pubDate = StoppedPublicationDate(LocalDate.of(2019, 8, 2))
    )
    responses.holidayStopResults.lastOption.value.right.value shouldBe HolidayStopResponse(
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
    val responses = HolidayStopProcess.processHolidayStops(
      config.holidayCreditProduct,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C2"),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C5"),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C6")
      ))),
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
    responses.resultsToExport shouldBe Seq(
      HolidayStopResponse(
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
    val responses = HolidayStopProcess.processHolidayStops(
      config.holidayCreditProduct,
      getRequests(Right(Seq(
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("r1"), ""),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("r2"), ""),
        Fixtures.mkHolidayStopRequestDetails(Fixtures.mkHolidayStopRequest("r3"), "")
      ))),
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      exportAmendments(Left(OverallFailure("Export failed")))
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
