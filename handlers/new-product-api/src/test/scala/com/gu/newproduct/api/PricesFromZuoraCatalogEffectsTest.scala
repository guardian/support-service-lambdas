package com.gu.newproduct.api

import com.gu.effects.GetFromS3
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.{PricesFromZuoraCatalog, ZuoraIds}
import com.gu.test.EffectsTest
import com.gu.util.config.{Stage, ZuoraEnvironment}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PricesFromZuoraCatalogEffectsTest extends AnyFlatSpec with Matchers {

  it should "load catalog" taggedAs EffectsTest in {

    import ProductsData._
    val expectedProducts = digital ++ voucher ++ hd ++ subsCard ++ gw

    val actual = for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("DEV"))
      response <- PricesFromZuoraCatalog(ZuoraEnvironment("DEV"), GetFromS3.fetchString, zuoraIds.rateplanIdToApiId.get).toDisjunction.left.map(_.toString)
    } yield response
    //the prices might change but at least we can assert that we got some price for each product
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
    VoucherSunday,
    VoucherWeekend,
    VoucherSixDay,
    VoucherEveryDay,
    VoucherSaturday,
  )
  val hd = Set(
    HomeDeliveryWeekend,
    HomeDeliverySunday,
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
    DigitalVoucherSunday,
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
    GuardianWeeklyDomestic6for6,
    GuardianWeeklyROW6for6,
    GuardianWeeklyROWAnnual,
    GuardianWeeklyDomesticQuarterly,
    GuardianWeeklyDomesticAnnual,
  )
}
