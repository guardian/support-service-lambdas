package com.gu.deliveryproblemcreditprocessor

import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.zuora.subscription.{AffectedPublicationDate, CreditRequest, RatePlanChargeCode, SubscriptionName}
import play.api.libs.json.{Format, Json}

case class DeliveryCreditRequest(
  subscriptionName: SubscriptionName,
  publicationDate: AffectedPublicationDate,
  chargeCode: Option[RatePlanChargeCode],
  productRatePlanChargeName: String
) extends CreditRequest {

}

object DeliveryCreditRequest {
  implicit val format: Format[DeliveryCreditRequest] = Json.format[DeliveryCreditRequest]
  implicit val format2: Format[RecordsWrapperCaseClass[DeliveryCreditRequest]] = Json.format[RecordsWrapperCaseClass[DeliveryCreditRequest]]
}
