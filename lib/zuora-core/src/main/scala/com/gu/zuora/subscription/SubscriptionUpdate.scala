package com.gu.zuora.subscription

import java.time.LocalDate

case class SubscriptionUpdate(
    currentTerm: Option[Int],
    currentTermPeriodType: Option[String],
    add: List[Add],
)

/** This builds the request body to add a Credit RatePlanCharge in Zuora. It should not contain business logic. Any
  * business logic should be moved out to the main for-comprehension.
  */
object SubscriptionUpdate {

  def apply(
      creditProduct: CreditProduct,
      subscription: Subscription,
      account: ZuoraAccount,
      affectedDate: AffectedPublicationDate,
      maybeInvoiceDate: Option[InvoiceDate],
  ): ZuoraApiResponse[SubscriptionUpdate] =
    for {
      subscriptionData <- SubscriptionData(subscription, account)
      issueData <- subscriptionData.issueDataForDate(affectedDate.value)
    } yield {
      val invoiceDate = maybeInvoiceDate.map(_.value).getOrElse(issueData.nextBillingPeriodStartDate)
      val maybeExtendedTerm = ExtendedTerm(invoiceDate, subscription)
      val credit = Credit(issueData.credit, invoiceDate)
      SubscriptionUpdate(
        currentTerm = maybeExtendedTerm.map(_.length),
        currentTermPeriodType = maybeExtendedTerm.map(_.unit),
        List(
          Add(
            productRatePlanId = creditProduct.productRatePlanId,
            contractEffectiveDate = invoiceDate,
            customerAcceptanceDate = invoiceDate,
            serviceActivationDate = invoiceDate,
            chargeOverrides = List(
              ChargeOverride(
                productRatePlanChargeId = creditProduct.productRatePlanChargeId,
                HolidayStart__c = affectedDate.value,
                HolidayEnd__c = affectedDate.value,
                price = credit.amount,
              ),
            ),
          ),
        ),
      )
    }
}

case class Add(
    productRatePlanId: String,
    contractEffectiveDate: LocalDate,
    customerAcceptanceDate: LocalDate,
    serviceActivationDate: LocalDate,
    chargeOverrides: List[ChargeOverride],
)

case class ChargeOverride(
    productRatePlanChargeId: String,
    HolidayStart__c: LocalDate,
    HolidayEnd__c: LocalDate,
    price: Double,
)
