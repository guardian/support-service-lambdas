package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.newproduct.api.addsubscription.Handler.PlanAndCharge
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.zuora.RestRequestMaker._
import play.api.libs.json.{Json, Reads}

object CreateSubscription {

  object WireModel {

    case class WireSubscription(subscriptionNumber: String)
    implicit val readsResponse: Reads[WireSubscription] = Json.reads[WireSubscription]

    case class ChargeOverrides(
      price: Double,
      productRatePlanChargeId: String
    )
    implicit val writesCharge = Json.writes[ChargeOverrides]
    case class SubscribeToRatePlans(
      productRatePlanId: String,
      chargeOverrides: List[ChargeOverrides]
    )
    implicit val writesSubscribe = Json.writes[SubscribeToRatePlans]
    case class WireCreateRequest(
      accountKey: String,
      autoRenew: Boolean = true,
      contractEffectiveDate: String,
      termType: String = "TERMED",
      renewalTerm: Int = 12,
      initialTerm: Int = 12,
      subscribeToRatePlans: List[SubscribeToRatePlans],
      AcquisitionCase__c: String
    )
    implicit val writesRequest = Json.writes[WireCreateRequest]
  }

  import WireModel._

  def createRequest(createSubscription: CreateReq, planAndCharge: PlanAndCharge): WireCreateRequest = {
    import createSubscription._
    WireCreateRequest(
      accountKey = accountId.value,
      contractEffectiveDate = start.format(DateTimeFormatter.ISO_LOCAL_DATE),
      AcquisitionCase__c = acquisitionCase.value,
      subscribeToRatePlans = List(
        SubscribeToRatePlans(
          productRatePlanId = planAndCharge.productRatePlanId.value,
          chargeOverrides = List(
            ChargeOverrides(
              price = amountMinorUnits.toDouble / 100,
              productRatePlanChargeId = planAndCharge.productRatePlanChargeId.value
            )
          )
        )
      )
    )
  }

  case class CaseId(value: String) extends AnyVal

  case class CreateReq(
    accountId: ZuoraAccountId,
    amountMinorUnits: Int,
    start: LocalDate,
    acquisitionCase: CaseId
  )

  case class SubscriptionName(value: String) extends AnyVal

  def apply(
    planAndCharge: PlanAndCharge,
    post: RequestsPost[WireCreateRequest, WireSubscription]
  )(createSubscription: CreateReq): ClientFailableOp[SubscriptionName] =
    post(createRequest(createSubscription, planAndCharge), s"subscriptions", WithCheck).map(id => SubscriptionName(id.subscriptionNumber))

}
