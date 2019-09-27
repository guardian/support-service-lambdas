package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator.GuardianWeeklyIssueSuspensionConstants
import com.gu.holiday_stops.Fixtures.{guardianWeeklyConfig, mkSubscription}
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

  private def getHolidayStopRequestsFromSalesforce(requestsGet: Either[OverallFailure, List[HolidayStopRequestsDetail]]): (ProductName, LocalDate) => Either[OverallFailure, List[HolidayStopRequestsDetail]] =
    (_, _) => requestsGet

  private def getSubscription(subscriptionGet: Either[ZuoraHolidayWriteError, Subscription]): SubscriptionName => Either[ZuoraHolidayWriteError, Subscription] = {
    _ => subscriptionGet
  }

  private def updateSubscription(
    subscriptionUpdate: Either[ZuoraHolidayWriteError, Unit]
  ): (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit] = {
    case (_, _) => subscriptionUpdate
  }

  private def exportAmendments(amendmentExport: Either[SalesforceHolidayWriteError, Unit]): List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit] =
    _ => amendmentExport

  "HolidayStopProcess" should "give correct added charge" in {
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
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
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
      getSubscription(Right(subscription)),
      updateSubscription(Left(ZuoraHolidayWriteError("update went wrong")))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayWriteError("update went wrong")
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
      getSubscription(Left(ZuoraHolidayWriteError("get went wrong"))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayWriteError("get went wrong")
  }

  it should "give an exception message if subscription isn't auto-renewing" in {
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
      getSubscription(Right(subscription.copy(autoRenew = false))),
      updateSubscription(Right(()))
    )(holidayStop)
    response.left.value shouldBe
      ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription")
  }

  it should "just give charge added without applying an update if holiday stop has already been applied" in {
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Left(ZuoraHolidayWriteError("shouldn't need to apply an update")))
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
    val response = GuardianWeeklyHolidayStopProcess.writeHolidayStopToZuora(
      guardianWeeklyConfig.holidayCreditProduct,
      guardianWeeklyConfig.productRatePlanIds,
      Nil,
      getSubscription(Right(subscription)),
      updateSubscription(Left(ZuoraHolidayWriteError("shouldn't need to apply an update")))
    )(holidayStop)
    response.left.value shouldBe ZuoraHolidayWriteError("shouldn't need to apply an update")
  }

  "processHolidayStops" should "give correct charges added" in {
    val responses = GuardianWeeklyHolidayStopProcess.processHolidayStops(
      guardianWeeklyConfig,
      getHolidayStopRequestsFromSalesforce(Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C1"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C3"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C4")
      ))),
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(())),
      exportAmendments(Right(())),
      None
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
    val responses = GuardianWeeklyHolidayStopProcess.processHolidayStops(
      guardianWeeklyConfig,
      getHolidayStopRequestsFromSalesforce(Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C2"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C5"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C6")
      ))),
      getSubscription(Right(Fixtures.mkSubscriptionWithHolidayStops())),
      updateSubscription(Right(())),
      exportAmendments(Right(())),
      None
    )
    responses.resultsToExport shouldBe List(
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
    val responses = GuardianWeeklyHolidayStopProcess.processHolidayStops(
      guardianWeeklyConfig,
      getHolidayStopRequestsFromSalesforce(Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r1"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r2"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r3"), "")
      ))),
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      exportAmendments(Left(SalesforceHolidayWriteError("Export failed"))),
      None
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
  it should "calculate process date correctly" in {
    def verifyProcessDate(productName: ProductName, processDate: LocalDate): Either[OverallFailure, List[HolidayStopRequestsDetail]] = {
      processDate should equal(LocalDate.now().plusDays(GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays))
      Right(Nil)
    }

    val responses = GuardianWeeklyHolidayStopProcess.processHolidayStops(
      guardianWeeklyConfig,
      verifyProcessDate,
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      exportAmendments(Left(SalesforceHolidayWriteError("Export failed"))),
      None
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
  it should "use process date override" in {
    val processOverrideDate = LocalDate.now().plusDays(123)
    def verifyProcessDate(productName: ProductName, processDate: LocalDate): Either[OverallFailure, List[HolidayStopRequestsDetail]] = {
      processDate should equal(processOverrideDate)
      Right(Nil)
    }

    val responses = GuardianWeeklyHolidayStopProcess.processHolidayStops(
      guardianWeeklyConfig,
      verifyProcessDate,
      getSubscription(Right(subscription)),
      updateSubscription(Right(())),
      exportAmendments(Left(SalesforceHolidayWriteError("Export failed"))),
      Some(processOverrideDate)
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
