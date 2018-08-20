package com.gu.newproduct.api

import com.gu.effects.GetFromS3
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanWithPrice, PricesFromZuoraCatalog, ZuoraIds}
import com.gu.test.EffectsTest
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Matchers}
import scalaz.Scalaz._
import scalaz._

class PricesFromZuoraCatalogEffectsTest extends FlatSpec with Matchers {

  it should "load catalog" taggedAs EffectsTest in {

    val actual = for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("DEV")).toDisjunction
      zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
      response <- PricesFromZuoraCatalog(Stage("DEV"), GetFromS3.fetchString, zuoraToPlanId).toDisjunction
    } yield response
    actual shouldBe \/-(
      List(
        PlanWithPrice(VoucherSaturdayPlus, Some(AmountMinorUnits(2161))),
        PlanWithPrice(VoucherSundayPlus, Some(AmountMinorUnits(2206))),
        PlanWithPrice(VoucherWeekendPlus, Some(AmountMinorUnits(1256))),
        PlanWithPrice(VoucherSixDayPlus, Some(AmountMinorUnits(2736))),
        PlanWithPrice(VoucherEveryDayPlus, Some(AmountMinorUnits(2920))),
        PlanWithPrice(VoucherSunday, Some(AmountMinorUnits(1079))),
        PlanWithPrice(VoucherWeekend, Some(AmountMinorUnits(390))),
        PlanWithPrice(VoucherSixDay, Some(AmountMinorUnits(2386))),
        PlanWithPrice(VoucherEveryDay, Some(AmountMinorUnits(2486))),
        PlanWithPrice(VoucherSaturday, Some(AmountMinorUnits(1036)))
      )
    )
  }
}
