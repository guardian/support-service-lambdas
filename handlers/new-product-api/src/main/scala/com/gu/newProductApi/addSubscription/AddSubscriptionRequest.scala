package com.gu.newProductApi.addSubscription

import java.time.LocalDate

import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.{Failure, Success, Try}

case class AddSubscriptionRequest(
                                   accountKey: String,
                                   contractEffectiveDate: LocalDate,
                                   productRatePlanId: String,
                                   productRatePlanChargeId: String,
                                   acquisitionSource: String,
                                   createdByCSR: String,
                                   priceInCents: Int,
                                 )


object AddSubscriptionRequest {

  case class AddSubscriptionRequestWire(
                                         accountKey: String,
                                         contractEffectiveDate: String,
                                         productRatePlanId: String,
                                         productRatePlanChargeId: String,
                                         acquisitionSource: String,
                                         createdByCSR: String,
                                         price: Int,
                                       ) {
    def toAddSubscriptionRequest = {


      val maybeParsedRequest = Try(LocalDate.parse(contractEffectiveDate)).map { parsedEffectiveDate =>
        AddSubscriptionRequest(
          accountKey = this.accountKey,
          contractEffectiveDate = parsedEffectiveDate,
          productRatePlanChargeId = this.productRatePlanChargeId,
          productRatePlanId = this.productRatePlanId,
          acquisitionSource = this.acquisitionSource,
          createdByCSR = this.createdByCSR,
          priceInCents = this.price
        )
      }

      maybeParsedRequest match {
        case  Success(req) => JsSuccess(req)
        case Failure(req) => JsError("invalid date format")
      }
    }
  }
  val wireReads = Json.reads[AddSubscriptionRequestWire]
  implicit val reads: Reads[AddSubscriptionRequest] = json => wireReads.reads(json).flatMap(_.toAddSubscriptionRequest)

}