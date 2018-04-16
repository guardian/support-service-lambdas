package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestRequestMaker}
import java.time.{ZonedDateTime, LocalDate}
import play.api.libs.functional.syntax._
import play.api.libs.json._
import com.gu.util.zuora.RestRequestMaker.{GenericError, NotFound}
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
object GetSubscription {

  case class SubscriptionId(get: String) extends AnyVal
  case class SubscriptionName(get: String) extends AnyVal
  case class RatePlan(productName: String, ratePlanCharges: List[RatePlanCharge])
  case class RatePlanCharge(name: String, effectiveStartDate: LocalDate, effectiveEndDate: LocalDate)
  case class RatePlans(ratePlans: List[RatePlan])

  case class SubscriptionResult(
    id: SubscriptionId,
    name: SubscriptionName,
    accountId: AccountId,
    casActivationDate: Option[ZonedDateTime],
    customerAcceptanceDate: LocalDate,
    startDate: LocalDate,
    endDate: LocalDate,
    ratePlans: List[RatePlan]
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
      (__ \ "ActivationDate__c").readNullable[ZonedDateTime] and
      (__ \ "customerAcceptanceDate").read[LocalDate] and
      (__ \ "termStartDate").read[LocalDate] and
      (__ \ "termEndDate").read[LocalDate] and
      (__ \ "ratePlans").read[List[RatePlan]]
    )(SubscriptionResult.apply _)

  def apply(zuoraDeps: ZuoraDeps)(request: SubscriptionId): FailableOp[SubscriptionResult] =
    ZuoraRestRequestMaker(zuoraDeps).get[SubscriptionResult](s"subscriptions/${request.get}").leftMap {
      case genericError: GenericError => ApiGatewayResponse.internalServerError(s"zuora client fail: ${genericError.message}")
      case notFound: NotFound => notFoundResponse
    }

}
