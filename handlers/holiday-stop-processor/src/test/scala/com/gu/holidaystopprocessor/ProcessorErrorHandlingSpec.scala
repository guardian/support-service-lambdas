package com.gu.holidaystopprocessor

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import cats.syntax.all._
import com.gu.creditprocessor.Processor
import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher, FulfilmentDatesFetcherError}
import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail
import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import com.gu.zuora.subscription._
import org.scalatest.OptionValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

/** Make sure short-circuiting does not happen.
  */
class ProcessorErrorHandlingSpec extends AnyFlatSpec with Matchers with OptionValues {

  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-01")))

  val holidayStopRequestsFromSalesforce
      : (ZuoraProductType, List[LocalDate]) => SalesforceApiResponse[List[HolidayStopRequestsDetail]] = { (_, _) =>
    Right(
      List(
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
          Fixtures.mkHolidayStopRequest("R1", LocalDate.of(2019, 8, 2), SubscriptionName("A-S1")),
          "C1",
        ),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
          Fixtures.mkHolidayStopRequest("R2", LocalDate.of(2019, 9, 6), SubscriptionName("A-S2")),
          "C3",
        ),
        Fixtures.mkHolidayStopRequestDetailsFromHolidayStopRequest(
          Fixtures.mkHolidayStopRequest("R3", LocalDate.of(2019, 8, 9), SubscriptionName("A-S3")),
          "C4",
        ),
      ),
    )
  }

  val subscription: Subscription = Fixtures.mkSubscriptionWithHolidayStops()

  val updateSubscription: (Subscription, SubscriptionUpdate) => Either[ZuoraApiFailure, Unit] = (_, _) => Right(())

  private def getAccount(
      getAccountResult: Either[ZuoraApiFailure, ZuoraAccount],
  ): String => Either[ZuoraApiFailure, ZuoraAccount] = { _ =>
    getAccountResult
  }

  val today = LocalDate.now()

  val processingDate = today `with` TemporalAdjusters.next(DayOfWeek.FRIDAY)

  private val fulfilmentDatesFetcher = new FulfilmentDatesFetcher {
    override def getFulfilmentDates(
        zuoraProductType: ZuoraProductType,
        date: LocalDate,
    ): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]] = {
      Map(DayOfWeek.FRIDAY -> FulfilmentDates(today, today, Some(processingDate), today)).asRight
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

  "Error handling" should "not short-circuit if some writes to Zuora fail (but others succeed), and Salesforce write succeeds" in {
    val getSubscription: SubscriptionName => Either[ZuoraApiFailure, Subscription] = {
      case subName if subName.value == "A-S1" => Right(subscription)
      case subName if subName.value == "A-S2" =>
        Left(ZuoraApiFailure("zuora boom")) // NOTE: this line is key to the test
      case subName if subName.value == "A-S3" => Right(subscription)
    }

    val writeHolidayStopsToSalesforce: List[ZuoraHolidayCreditAddResult] => Either[SalesforceApiFailure, Unit] =
      _ => Right(())

    val result = Processor.processProduct(
      creditProduct,
      holidayStopRequestsFromSalesforce,
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      getSubscription,
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription,
      ZuoraHolidayCreditAddResult.apply,
      writeHolidayStopsToSalesforce,
    )

    val (failedZuoraResponses, successfulZuoraResponses) = result.creditResults.separate
    failedZuoraResponses.size shouldBe 1
    successfulZuoraResponses.size shouldBe 2
    (failedZuoraResponses.size + successfulZuoraResponses.size) shouldBe 3
    result.overallFailure.value shouldBe OverallFailure("zuora boom")
  }

  it should "not short-circuit if all Zuora writes succeed, and Salesforce write fails" in {
    val getSubscription: SubscriptionName => Either[ZuoraApiFailure, Subscription] = {
      case subName if subName.value == "A-S1" => Right(subscription)
      case subName if subName.value == "A-S2" => Right(subscription)
      case subName if subName.value == "A-S3" => Right(subscription)
    }

    val writeHolidayStopsToSalesforce: List[ZuoraHolidayCreditAddResult] => Either[SalesforceApiFailure, Unit] =
      _ => Left(SalesforceApiFailure("salesforce boom"))

    val result = Processor.processProduct(
      creditProduct,
      holidayStopRequestsFromSalesforce,
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      getSubscription,
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription,
      ZuoraHolidayCreditAddResult.apply,
      writeHolidayStopsToSalesforce,
    )

    val (failedZuoraResponses, successfulZuoraResponses) = result.creditResults.separate
    failedZuoraResponses.size shouldBe 0
    successfulZuoraResponses.size shouldBe 3
    (failedZuoraResponses.size + successfulZuoraResponses.size) shouldBe 3
    result.overallFailure.value shouldBe OverallFailure("salesforce boom")

  }

  it should "collect all Zuora failures" in {
    val getSubscription: SubscriptionName => Either[ZuoraApiFailure, Subscription] = {
      case subName if subName.value == "A-S1" => Left(ZuoraApiFailure("zuora boom 1"))
      case subName if subName.value == "A-S2" => Left(ZuoraApiFailure("zuora boom 2"))
      case subName if subName.value == "A-S3" => Left(ZuoraApiFailure("zuora boom 3"))
    }

    val writeHolidayStopsToSalesforce: List[ZuoraHolidayCreditAddResult] => Either[SalesforceApiFailure, Unit] =
      _ => Right(())

    val result = Processor.processProduct(
      creditProduct,
      holidayStopRequestsFromSalesforce,
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      getSubscription,
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription,
      ZuoraHolidayCreditAddResult.apply,
      writeHolidayStopsToSalesforce,
    )

    val (failedZuoraResponses, successfulZuoraResponses) = result.creditResults.separate
    failedZuoraResponses.size shouldBe 3
    successfulZuoraResponses.size shouldBe 0
    (failedZuoraResponses.size + successfulZuoraResponses.size) shouldBe 3
    result.overallFailure.value shouldBe OverallFailure("zuora boom 1")
  }

  it should "be None if all Zuora writes succeed and Salesforce write succeeds" in {
    val getSubscription: SubscriptionName => Either[ZuoraApiFailure, Subscription] = {
      case subName if subName.value == "A-S1" => Right(subscription)
      case subName if subName.value == "A-S2" => Right(subscription)
      case subName if subName.value == "A-S3" => Right(subscription)
    }

    val writeHolidayStopsToSalesforce: List[ZuoraHolidayCreditAddResult] => Either[SalesforceApiFailure, Unit] =
      _ => Right(())

    val result = Processor.processProduct(
      creditProduct,
      holidayStopRequestsFromSalesforce,
      fulfilmentDatesFetcher,
      None,
      ZuoraProductTypes.GuardianWeekly,
      getSubscription,
      getAccount(Fixtures.mkAccount().asRight),
      updateToApply,
      updateSubscription,
      ZuoraHolidayCreditAddResult.apply,
      writeHolidayStopsToSalesforce,
    )

    val (failedZuoraResponses, successfulZuoraResponses) = result.creditResults.separate
    failedZuoraResponses.size shouldBe 0
    successfulZuoraResponses.size shouldBe 3
    (failedZuoraResponses.size + successfulZuoraResponses.size) shouldBe 3
    result.overallFailure should be(None)
  }
}
