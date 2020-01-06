package com.gu.holidaystopprocessor

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import cats.implicits._
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher, FulfilmentDatesFetcherError}
import com.gu.holiday_stops.Fixtures.mkGuardianWeeklySubscription
import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription.{HolidayCreditUpdate, MutableCalendar, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import org.scalatest.{EitherValues, FlatSpec, Matchers, OptionValues}

class HolidayStopProcessTest extends FlatSpec with Matchers with EitherValues with OptionValues {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-07-12")))
  val effectiveStartDate = LocalDate.of(2019, 5, 11)

  private val subscription = mkGuardianWeeklySubscription(
    termStartDate = LocalDate.of(2018, 1, 1),
    termEndDate = LocalDate.of(2019, 1, 1),
    price = 75.5,
    billingPeriod = "Quarter",
    effectiveStartDate = effectiveStartDate
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

  val today = LocalDate.now()

  val targetProcessingDate = today `with` TemporalAdjusters.next(DayOfWeek.FRIDAY)

  private val fulfilmentDatesFetcher = new FulfilmentDatesFetcher {
    override def getFulfilmentDates(zuoraProductType: ZuoraProductType, date: LocalDate): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]] = {
      Map(DayOfWeek.FRIDAY -> FulfilmentDates(today, today, Some(targetProcessingDate))).asRight
    }
  }

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

  /*
   * Non-auto-renewing holiday stops are blocked at the point of creation,
   * but there is no harm in processing them nonetheless
   * if they were created before the block was put in place.
   */
  it should "not give an exception message if subscription isn't auto-renewing" in {
    val response = Processor.writeHolidayStopToZuora(
      Fixtures.config,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops().copy(autoRenew = false)),
      updateSubscription(Right(()))
    )(holidayStop)
    response.isRight shouldBe true
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
      (_, _) => Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C1"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C3"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C4")
      )),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
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
  it should "get target dates from fulfilment dates" in {
    Processor.processProduct(
      Fixtures.config,
      (productType, targetDates) => {
        productType should ===(ZuoraProductTypes.GuardianWeekly)
        targetDates should ===(List(targetProcessingDate))
        Right(List())
      },
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
  }
  it should "get target date from overridedate" in {
    val overrideDate = LocalDate.now().plusWeeks(1)
    Processor.processProduct(
      Fixtures.config,
      (productType, targetDates) => {
        productType should ===(ZuoraProductTypes.GuardianWeekly)
        targetDates should ===(List(overrideDate))
        Right(List())
      },
      fulfilmentDatesFetcher,
      Some(overrideDate),
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      updateSubscription(Right(())),
      exportAmendments(Right(()))
    )
  }

  it should "only export results that haven't already been exported" in {
    val responses = Processor.processProduct(
      Fixtures.config,
      (_, _) => Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)), "C2"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)), "C5"),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)), "C6")
      )),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
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
      (_, _) => Right(List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r1"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r2"), ""),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r3"), "")
      )),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(subscription),
      updateSubscription(Right(())),
      exportAmendments(Left(SalesforceHolidayError("Export failed")))
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
