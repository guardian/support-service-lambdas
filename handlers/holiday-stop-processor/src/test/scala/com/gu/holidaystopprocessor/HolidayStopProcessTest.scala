package com.gu.holidaystopprocessor

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import cats.syntax.all._
import com.gu.creditprocessor.Processor
import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher, FulfilmentDatesFetcherError}
import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import com.gu.zuora.subscription.Fixtures.mkGuardianWeeklySubscription
import com.gu.zuora.subscription._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.scalatest.{EitherValues, OptionValues}

class HolidayStopProcessTest extends AnyFlatSpec with Matchers with EitherValues with OptionValues {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-07-12")))
  val effectiveStartDate = LocalDate.of(2019, 5, 11)

  private val subscription = mkGuardianWeeklySubscription(
    termStartDate = LocalDate.of(2018, 1, 1),
    termEndDate = LocalDate.of(2019, 1, 1),
    price = 75.5,
    billingPeriod = "Quarter",
    effectiveStartDate = effectiveStartDate,
  )

  private val request = HolidayStopRequestsDetail(
    Id = HolidayStopRequestsDetailId("HSR1"),
    Subscription_Name__c = SubscriptionName("S1"),
    Product_Name__c = ProductName("Gu Weekly"),
    Stopped_Publication_Date__c = AffectedPublicationDate(LocalDate.of(2019, 8, 9)),
    Estimated_Price__c = None,
    Charge_Code__c = None,
    Is_Actioned__c = false,
    Actual_Price__c = None,
    Expected_Invoice_Date__c = None,
  )

  private def updateSubscription(
      subscriptionUpdate: Either[ZuoraApiFailure, Unit],
  ): (Subscription, SubscriptionUpdate) => Either[ZuoraApiFailure, Unit] = { case (_, _) =>
    subscriptionUpdate
  }

  private def getAccount(
      getAccountResult: Either[ZuoraApiFailure, ZuoraAccount],
  ): String => Either[ZuoraApiFailure, ZuoraAccount] = { _ =>
    getAccountResult
  }

  private def exportAmendments(
      amendmentExport: Either[SalesforceApiFailure, Unit],
  ): List[ZuoraHolidayCreditAddResult] => Either[SalesforceApiFailure, Unit] =
    _ => amendmentExport

  val today = LocalDate.now()

  val targetProcessingDate = today `with` TemporalAdjusters.next(DayOfWeek.FRIDAY)

  private val fulfilmentDatesFetcher = new FulfilmentDatesFetcher {
    override def getFulfilmentDates(
        zuoraProductType: ZuoraProductType,
        date: LocalDate,
    ): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]] = {
      Map(DayOfWeek.FRIDAY -> FulfilmentDates(today, today, Some(targetProcessingDate), today)).asRight
    }
  }

  private val creditProduct: CreditProductForSubscription = _ => HolidayCreditProduct.Dev.GuardianWeekly

  private def updateToApply(
      creditProduct: CreditProductForSubscription,
      subscription: Subscription,
      account: ZuoraAccount,
      request: HolidayStopRequestsDetail,
  ) =
    SubscriptionUpdate(
      creditProduct(subscription),
      subscription,
      account,
      request.Stopped_Publication_Date__c,
      None,
    )

  "HolidayStopProcess" should "give correct added charge" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
    )(request)

    response.right.value shouldBe ZuoraHolidayCreditAddResult(
      requestId = HolidayStopRequestsDetailId("HSR1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = RatePlanChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = Price(-3.27),
      pubDate = AffectedPublicationDate(LocalDate.of(2019, 8, 9)),
    )
  }

  it should "give an exception message if update fails" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(subscription),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Left(ZuoraApiFailure("update went wrong"))),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.left.value shouldBe ZuoraApiFailure("update went wrong")
  }

  it should "give an exception message if getting subscription details fails" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Left(ZuoraApiFailure("get went wrong")),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.left.value shouldBe ZuoraApiFailure("get went wrong")
  }

  /*
   * Non-auto-renewing holiday stops are blocked at the point of creation,
   * but there is no harm in processing them nonetheless
   * if they were created before the block was put in place.
   */
  it should "not give an exception message if subscription isn't auto-renewing" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops().copy(autoRenew = false)),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.isRight shouldBe true
  }

  it should "fail if subscription is cancelled" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(subscription.copy(status = "Cancelled")),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Left(ZuoraApiFailure("shouldn't need to apply an update"))),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.left.value.reason should include("Apply manual refund")
  }

  it should "just give charge added without applying an update if holiday stop has already been applied" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Left(ZuoraApiFailure("shouldn't need to apply an update"))),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.right.value shouldBe ZuoraHolidayCreditAddResult(
      requestId = HolidayStopRequestsDetailId("HSR1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = RatePlanChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = Price(-3.27),
      pubDate = AffectedPublicationDate(LocalDate.of(2019, 8, 9)),
    )
  }

  it should "give a failure if subscription has no added charge" in {
    val response = Processor.addCreditToSubscription(
      creditProduct,
      _ => Right(subscription),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Left(ZuoraApiFailure("shouldn't need to apply an update"))),
      ZuoraHolidayCreditAddResult.apply,
    )(request)
    response.left.value shouldBe ZuoraApiFailure("shouldn't need to apply an update")
  }

  "processHolidayStops" should "give correct charges added" in {
    val responses = Processor.processProduct(
      creditProduct,
      (_, _) =>
        Right(
          List(
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)),
              "C1",
            ),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)),
              "C3",
            ),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)),
              "C4",
            ),
          ),
        ),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
      exportAmendments(Right(())),
    )
    responses.creditResults.headOption.value.right.value shouldBe ZuoraHolidayCreditAddResult(
      requestId = HolidayStopRequestsDetailId("R1"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = RatePlanChargeCode("C3"),
      estimatedPrice = None,
      actualPrice = Price(-5.81),
      pubDate = AffectedPublicationDate(LocalDate.of(2019, 8, 2)),
    )
    responses.creditResults.lastOption.value.right.value shouldBe ZuoraHolidayCreditAddResult(
      requestId = HolidayStopRequestsDetailId("R3"),
      subscriptionName = SubscriptionName("S1"),
      productName = ProductName("Gu Weekly"),
      chargeCode = RatePlanChargeCode("C2"),
      estimatedPrice = None,
      actualPrice = Price(-3.27),
      pubDate = AffectedPublicationDate(LocalDate.of(2019, 8, 9)),
    )
  }
  it should "get target dates from fulfilment dates" in {
    Processor.processProduct(
      creditProduct,
      (productType, targetDates) => {
        productType should ===(ZuoraProductTypes.GuardianWeekly)
        targetDates should ===(List(targetProcessingDate))
        Right(List())
      },
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
      exportAmendments(Right(())),
    )
  }
  it should "get target date from overridedate" in {
    val overrideDate = LocalDate.now().plusWeeks(1)
    Processor.processProduct(
      creditProduct,
      (productType, targetDates) => {
        productType should ===(ZuoraProductTypes.GuardianWeekly)
        targetDates should ===(List(overrideDate))
        Right(List())
      },
      fulfilmentDatesFetcher,
      Some(overrideDate),
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
      exportAmendments(Right(())),
    )
  }

  it should "only export results that haven't already been exported" in {
    val responses = Processor.processProduct(
      creditProduct,
      (_, _) =>
        Right(
          List(
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2)),
              "C2",
            ),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 1)),
              "C5",
            ),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
              Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9)),
              "C6",
            ),
          ),
        ),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(Fixtures.mkSubscriptionWithHolidayStops()),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
      exportAmendments(Right(())),
    )
    responses.resultsToExport shouldBe List(
      ZuoraHolidayCreditAddResult(
        HolidayStopRequestsDetailId("R1"),
        subscriptionName = SubscriptionName("S1"),
        productName = ProductName("Gu Weekly"),
        RatePlanChargeCode("C3"),
        None,
        Price(-5.81),
        AffectedPublicationDate(LocalDate.of(2019, 8, 2)),
      ),
    )
  }

  it should "give an exception message if exporting results fails" in {
    val responses = Processor.processProduct(
      creditProduct,
      (_, _) =>
        Right(
          List(
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r1"), ""),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r2"), ""),
            Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(Fixtures.mkHolidayStopRequest("r3"), ""),
          ),
        ),
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      _ => Right(subscription),
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription(Right(())),
      ZuoraHolidayCreditAddResult.apply,
      exportAmendments(Left(SalesforceApiFailure("Export failed"))),
    )
    responses.overallFailure.value shouldBe OverallFailure("Export failed")
  }
}
