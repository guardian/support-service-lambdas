package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestRequestMaker}
import org.joda.time.DateTime
import play.api.libs.functional.syntax._
import play.api.libs.json._

object GetSubscription {

  case class SubscriptionId(get: String) extends AnyVal
  case class SubscriptionName(get: String) extends AnyVal
  case class RatePlan(ratePlanName: String)
  case class RatePlans(ratePlans: List[RatePlan])

  case class SubscriptionResult(
    id: SubscriptionId,
    name: SubscriptionName,
    accountId: AccountId,
    casActivationDate: Option[DateTime],
    customerAcceptanceDate: Option[DateTime],
    startDate: Option[DateTime],
    endDate: Option[DateTime],
    ratePlans: List[RatePlan]
  )

  implicit val lenientDateTimeReader: Reads[DateTime] =
    JodaReads.DefaultJodaDateTimeReads orElse Reads.IsoDateReads.map(new DateTime(_))

  implicit val subscriptionIdReads = Json.reads[SubscriptionId]
  implicit val subscriptionNameReads = Json.reads[SubscriptionName]
  implicit val ratePlanChargeReader = Json.reads[RatePlan]

  implicit val reads: Reads[SubscriptionResult] =
    (
      (__ \ "subscriptionNumber").read[String].map(SubscriptionId.apply) and
      (__ \ "id").read[String].map(SubscriptionName.apply) and
      (__ \ "accountId").read[String].map(AccountId.apply) and
      (__ \ "ActivationDate__c").readNullable[DateTime](lenientDateTimeReader) and
      (__ \ "customerAcceptanceDate").readNullable[DateTime](lenientDateTimeReader) and
      (__ \ "termStartDate").readNullable[DateTime](lenientDateTimeReader) and
      (__ \ "termEndDate").readNullable[DateTime](lenientDateTimeReader) and
      (__ \ "ratePlans").read[List[RatePlan]]
    )(SubscriptionResult.apply _)

  def apply(zuoraDeps: ZuoraDeps)(request: SubscriptionId): FailableOp[SubscriptionResult] =
    ZuoraRestRequestMaker(zuoraDeps).get[SubscriptionResult](s"subscriptions/${request.get}").leftMap(clientFail => ApiGatewayResponse.internalServerError(s"zuora client fail: ${clientFail.message}"))

}
