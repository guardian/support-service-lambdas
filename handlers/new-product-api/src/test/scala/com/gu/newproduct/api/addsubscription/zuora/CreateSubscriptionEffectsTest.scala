package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel._
import com.gu.newproduct.api.addsubscription._
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker.RequestsPost
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class CreateSubscriptionEffectsTest extends FlatSpec with Matchers {

  import ZuoraDevContributions._

  it should "create subscription in account" taggedAs EffectsTest in {
    val validCaseIdToAvoidCausingSFErrors = CaseId("5006E000005b5cf")
    val request = CreateSubscription.ZuoraCreateSubRequest(
      monthlyIds,
      ZuoraAccountId("2c92c0f864a214c30164a8b5accb650b"),
      Some(AmountMinorUnits(100)),
      LocalDate.now,
      LocalDate.now.plusDays(2),
      validCaseIdToAvoidCausingSFErrors,
      AcquisitionSource("sourcesource"),
      CreatedByCSR("csrcsr")
    )
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      post: RequestsPost[WireCreateRequest, WireSubscription] = zuoraDeps.post[WireCreateRequest, WireSubscription]
      res <- CreateSubscription(post)(request).toDisjunction
    } yield res
    withClue(actual) {
      actual.map(_.value.substring(0, 3)) shouldBe \/-("A-S")
    }
    // ideally should check that it was really created with the right fields
  }
}

object ZuoraDevContributions {

  val monthlyIds = PlanAndCharge(
    productRatePlanId = ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855"),
    productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85a6b1352015a7fcf35ab397c")
  )
}
