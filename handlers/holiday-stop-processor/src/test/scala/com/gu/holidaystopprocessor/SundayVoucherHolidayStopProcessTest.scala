package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription.{Add, ChargeOverride, HolidayCreditUpdate, RatePlan, RatePlanCharge, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import org.scalatest.{FlatSpec, Matchers}
import scala.collection.mutable

class SundayVoucherHolidayStopProcessTest extends FlatSpec with Matchers {

  val holidayStopRequestsFromSalesforce = List(
    HolidayStopRequestsDetail(
      HolidayStopRequestsDetailId("a2j3E000002Vl3OQAS"),
      SubscriptionName("A-S00051832"),
      ProductName("Newspaper Voucher"),
      StoppedPublicationDate(LocalDate.parse("2019-10-20")),
      Some(HolidayStopRequestsDetailChargePrice(-2.7)), // Estimated_Price__c: Option[HolidayStopRequestsDetailChargePrice],
      Some(HolidayStopRequestsDetailChargeCode("C-00057516")), // Charge_Code__c: Option[HolidayStopRequestsDetailChargeCode],
      None, // Actual_Price__c: Option[HolidayStopRequestsDetailChargePrice]
    )
  )


  val holidayStops = List(
    HolidayStop(
      HolidayStopRequestsDetailId("a2j3E000002Vl3OQAS"),
      SubscriptionName("A-S00051832"),
      ProductName("Newspaper Voucher"),
      LocalDate.parse("2019-10-20"),
      Some(HolidayStopRequestsDetailChargePrice(-2.7))
    )
  )

  val alreadyActionedHolidayStops = Nil

  // writeHolidayStopToZuora
  val subscription =
    Subscription(
      "A-S00051832",
      LocalDate.parse("2019-09-24"),
      LocalDate.parse("2020-09-24"),
      12,
      "Month",
      true,
      List(RatePlan(
        "Newspaper Voucher",
        List(RatePlanCharge(
          "Sunday",
          "C-00057516",
          10.79,
          Some("Month"),
          LocalDate.parse("2019-10-20"),
          Some(LocalDate.parse("2019-11-20")),
          None,
          None,
          Some(LocalDate.parse("2019-10-20")),
          "2c92c0f95aff3b56015b1045fba832d4")),
        "2c92c0f95aff3b56015b1045fb9332d2",
        "2c92c0f86d6263c0016d6271c6750a35")
      )
    )

  val updatedSubscription =
    Subscription(
      "A-S00051832",
      LocalDate.parse("2019-09-24"),
      LocalDate.parse("2020-09-24"),
      12,
      "Month",
      true,
      List(
        RatePlan("Discounts",
          List(
            RatePlanCharge(
              "Holiday Credit",
              "C-00057517",
              -2.7,
              None,
              LocalDate.parse("2019-11-20"),
              None,
              Some(LocalDate.parse("2019-10-20")),
              Some(LocalDate.parse("2019-10-20")),
              None,
              "2c92c0f96b03800b016b081fc0f41bb4"
            )
          ),
          "2c92c0f96b03800b016b081fc04f1ba2",
          "2c92c0fb6d627309016d628f3f6231cc"
        ),
        RatePlan("Newspaper Voucher",
          List(
            RatePlanCharge(
              "Sunday",
              "C-00057516",
              10.79,
              Some("Month"),
              LocalDate.parse("2019-10-20"),
              Some(LocalDate.parse("2019-11-20")),
              None,
              None,
              Some(LocalDate.parse("2019-10-20")),
              "2c92c0f95aff3b56015b1045fba832d4"
            )
          ),
          "2c92c0f95aff3b56015b1045fb9332d2",
          "2c92c0fb6d627309016d628f3fda31d7"
        )
      )
    )

  val zuoraGetSubscriptionResponsesStack = mutable.Stack[Subscription](
    subscription,
    updatedSubscription
  )

  def getSubscriptionMock(): Subscription = zuoraGetSubscriptionResponsesStack.pop

  val allZuoraHolidayStopResponses = List(
    Right(
      HolidayStopResponse(
        HolidayStopRequestsDetailId("a2j3E000002Vl3OQAS"),
        SubscriptionName("A-S00051832"),
        ProductName("Newspaper Voucher"),
        HolidayStopRequestsDetailChargeCode("C-00057517"),
        Some(HolidayStopRequestsDetailChargePrice(-2.7)),
        HolidayStopRequestsDetailChargePrice(-2.7),
        StoppedPublicationDate(LocalDate.parse("2019-10-20"))
      )
    )
  )

  val failedZuoraResponses = Nil
  val successfulZuoraResponses =
    Right(
      HolidayStopResponse(
        HolidayStopRequestsDetailId("a2j3E000002Vl3OQAS"),
        SubscriptionName("A-S00051832"),
        ProductName("Newspaper Voucher"),
        HolidayStopRequestsDetailChargeCode("C-00057517"),
        Some(HolidayStopRequestsDetailChargePrice(-2.7)),
        HolidayStopRequestsDetailChargePrice(-2.7),
        StoppedPublicationDate(LocalDate.parse("2019-10-20"))
      )
    )

  val notAlreadyActionedHolidays = List(
    HolidayStopResponse(
      HolidayStopRequestsDetailId("a2j3E000002Vl3OQAS"),
      SubscriptionName("A-S00051832"),
      ProductName("Newspaper Voucher"),
      HolidayStopRequestsDetailChargeCode("C-00057517"),
      Some(HolidayStopRequestsDetailChargePrice(-2.7)),
      HolidayStopRequestsDetailChargePrice(-2.7),
      StoppedPublicationDate(LocalDate.parse("2019-10-20"))
    )
  )

  val salesforceExportResult = Right(())

  val processResult = ProcessResult(
    holidayStops,
    allZuoraHolidayStopResponses,
    notAlreadyActionedHolidays,
    OverallFailure(failedZuoraResponses, salesforceExportResult)
  )



  "SundayVoucherHolidayStopProcess" should "pass in correct HolidayCreditUpdate request to zuora updateSubscription call" in {
    val exptedStoppedPublicationDate = LocalDate.parse("2019-10-20")
    val expectedCustomerAcceptanceDateForHolidayStop = LocalDate.parse("2019-11-20")
    val expectedCredit = -2.7
    val ExpectedHolidayCreditUpdate = HolidayCreditUpdate(
      None,
      None,
      List(
        Add(
          Fixtures.config.holidayCreditProduct.productRatePlanId,
          expectedCustomerAcceptanceDateForHolidayStop,
          expectedCustomerAcceptanceDateForHolidayStop,
          expectedCustomerAcceptanceDateForHolidayStop,
          List(
            ChargeOverride(
              Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
              exptedStoppedPublicationDate,
              exptedStoppedPublicationDate,
              expectedCredit
            )
          )
        )
      )
    )

    val SubscriptionMock = subscription

    Processor.processProduct(
      Fixtures.config,
      Right(holidayStopRequestsFromSalesforce),
      getSubscription = _ => Right(getSubscriptionMock()),
      updateSubscription = { case (SubscriptionMock, ExpectedHolidayCreditUpdate) => Right(()) }, // here is main logic of test
      _ => Right(())
    ) should equal(processResult)
  }
}
