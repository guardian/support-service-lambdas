package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{GenericError, NotFound}
import play.api.libs.functional.syntax._
import play.api.libs.json._

object GetSubscription {

  case class SubscriptionId(value: String) extends AnyVal
  case class SubscriptionName(value: String) extends AnyVal
  case class RatePlan(productName: String, ratePlanCharges: List[RatePlanCharge])
  case class RatePlanCharge(name: String, effectiveStartDate: LocalDate, effectiveEndDate: LocalDate)
  case class RatePlans(ratePlans: List[RatePlan])

  case class SubscriptionResult(
      id: SubscriptionId,
      name: SubscriptionName,
      accountId: AccountId,
      casActivationDate: Option[String],
      customerAcceptanceDate: LocalDate,
      startDate: LocalDate,
      endDate: LocalDate,
      ratePlans: List[RatePlan],
  )

  implicit val subscriptionIdReads = Json.reads[SubscriptionId]
  implicit val subscriptionNameReads = Json.reads[SubscriptionName]
  implicit val ratePlanChargeReader = Json.reads[RatePlanCharge]
  implicit val ratePlanReader = Json.reads[RatePlan]

  implicit val reads: Reads[SubscriptionResult] =
    (
      (__ \ "subscriptionNumber").read[String].map(SubscriptionId.apply) and
        (__ \ "id").read[String].map(SubscriptionName.apply) and
        (__ \ "accountId").read[String].map(AccountId.apply) and
        (__ \ "ActivationDate__c").readNullable[String] and
        (__ \ "customerAcceptanceDate").read[LocalDate] and
        (__ \ "termStartDate").read[LocalDate] and
        (__ \ "termEndDate").read[LocalDate] and
        (__ \ "ratePlans").read[List[RatePlan]]
    )(SubscriptionResult.apply _)

  def apply(requests: Requests)(subscriptionId: SubscriptionId): ApiGatewayOp[SubscriptionResult] =
    requests
      .get[SubscriptionResult](s"subscriptions/${subscriptionId.value}")
      .toDisjunction
      .left
      .map {
        case genericError: GenericError =>
          ApiGatewayResponse.internalServerError(s"zuora client fail: ${genericError.message}")
        case notFound: NotFound => notFoundResponse
      }
      .toApiGatewayOp

}
