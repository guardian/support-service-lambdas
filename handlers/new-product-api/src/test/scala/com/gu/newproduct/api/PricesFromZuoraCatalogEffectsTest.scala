package com.gu.newproduct.api

import com.gu.effects.GetFromS3
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PricesFromZuoraCatalog, ZuoraIds}
import com.gu.test.EffectsTest
import com.gu.util.config.{Stage, ZuoraEnvironment}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PricesFromZuoraCatalogEffectsTest extends AnyFlatSpec with Matchers {

  it should "load catalog" taggedAs EffectsTest in {

    import ProductsData._
    val expectedProducts = digital ++ voucher ++ hd ++ subsCard ++ gw ++ supporterPlus ++ nationalDelivery ++ tierThree

    val actual = for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("CODE"))
      response <- PricesFromZuoraCatalog(
        ZuoraEnvironment("CODE"),
        GetFromS3.fetchString,
        zuoraIds.rateplanIdToApiId.get,
      ).toEither.left.map(_.toString)
    } yield response
    actual.map(result => result(MonthlySupporterPlus).get(GBP)) shouldBe Right(Some(AmountMinorUnits(1200)))
    // the prices might change but at least we can assert that we got some price for each product
    actual.map(_.keySet) shouldBe Right(expectedProducts)
  }
}

object ProductsData {

  val digital = Set(
    AnnualSupporterPlus,
    MonthlySupporterPlus,
    MonthlyContribution,
    AnnualContribution,
    DigipackAnnual,
    DigipackMonthly,
  )

  val voucher = Set(
    VoucherSaturdayPlus,
    VoucherSundayPlus,
    VoucherWeekendPlus,
    VoucherSixDayPlus,
    VoucherEveryDayPlus,
    VoucherWeekend,
    VoucherSixDay,
    VoucherEveryDay,
    VoucherSaturday,
  )
  val hd = Set(
    HomeDeliveryWeekend,
    HomeDeliveryEveryDay,
    HomeDeliverySixDay,
    HomeDeliveryWeekendPlus,
    HomeDeliverySundayPlus,
    HomeDeliveryEveryDayPlus,
    HomeDeliverySixDayPlus,
    HomeDeliverySaturday,
    HomeDeliverySaturdayPlus,
  )
  val subsCard = Set(
    DigitalVoucherWeekendPlus,
    DigitalVoucherSaturdayPlus,
    DigitalVoucherSixdayPlus,
    DigitalVoucherWeekend,
    DigitalVoucherSundayPlus,
    DigitalVoucherEverydayPlus,
    DigitalVoucherSixday,
    DigitalVoucherEveryday,
    DigitalVoucherSaturday,
  )
  val gw = Set(
    GuardianWeeklyROWQuarterly,
    GuardianWeeklyDomesticMonthly,
    GuardianWeeklyROWMonthly,
    GuardianWeeklyROWAnnual,
    GuardianWeeklyDomesticQuarterly,
    GuardianWeeklyDomesticAnnual,
  )
  val supporterPlus = Set(
    AnnualSupporterPlus,
    MonthlySupporterPlus,
  )
  val nationalDelivery = Set(
    NationalDeliveryEveryday,
    NationalDeliverySixday,
    NationalDeliveryWeekend,
  )

  val tierThree = Set(
    TierThreeDomesticMonthly,
    TierThreeDomesticAnnual,
    TierThreeROWMonthly,
    TierThreeROWAnnual,
  )
}
