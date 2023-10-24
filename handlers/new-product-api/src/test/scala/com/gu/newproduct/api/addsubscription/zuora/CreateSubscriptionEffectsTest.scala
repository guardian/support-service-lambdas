package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel._
import com.gu.newproduct.api.addsubscription._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker.RequestsPost
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CreateSubscriptionEffectsTest extends AnyFlatSpec with Matchers {

  import ZuoraCodeContributions._

  def currentDate = () => LocalDate.of(2018, 2, 10)
  it should "create subscription in account" taggedAs EffectsTest in {
    val validCaseIdToAvoidCausingSFErrors = CaseId("5006E000005b5cf")
    val request = CreateSubscription.ZuoraCreateSubRequest(
      ZuoraAccountId(
        "8ad095dd82f7aaa50182f96de24d3ddb",
      ), // code https://apisandbox.zuora.com/apps/CustomerAccount.do?method=view&id=8ad095dd82f7aaa50182f96de24d3ddb
      currentDate().plusDays(2),
      validCaseIdToAvoidCausingSFErrors,
      AcquisitionSource("sourcesource"),
      CreatedByCSR("csrcsr"),
      None,
      List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = monthlyContribution.productRatePlanId,
          maybeChargeOverride = Some(
            ChargeOverride(
              amountMinorUnits = Some(AmountMinorUnits(100)),
              productRatePlanChargeId = monthlyContribution.productRatePlanChargeId,
              triggerDate = None,
            ),
          ),
        ),
      ),
    )
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      post: RequestsPost[WireCreateRequest, WireSubscription] = zuoraDeps.post[WireCreateRequest, WireSubscription]
      res <- CreateSubscription(post, currentDate)(request).toDisjunction
    } yield res
    withClue(actual) {
      actual.map(_.value.substring(0, 3)) shouldBe Right("A-S")
    }
    // ideally should check that it was really created with the right fields
  }
}

object ZuoraCodeContributions {

  val monthlyContribution = PlanAndCharge(
    productRatePlanId = ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855"),
    productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85a6b1352015a7fcf35ab397c"),
  )
}
