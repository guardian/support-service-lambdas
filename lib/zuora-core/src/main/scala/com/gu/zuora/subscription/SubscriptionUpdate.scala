package com.gu.zuora.subscription

import java.time.LocalDate

case class SubscriptionUpdate(
    extendedTermEndDate: Option[LocalDate],
    productAddition: CreditProductAddition,
)

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
        extendedTermEndDate = maybeExtendedTerm.map(_ => invoiceDate),
        productAddition = CreditProductAddition(
          productRatePlanId = creditProduct.productRatePlanId,
          contractEffectiveDate = invoiceDate,
          customerAcceptanceDate = invoiceDate,
          serviceActivationDate = invoiceDate,
          chargeOverride = CreditChargeOverride(
            productRatePlanChargeId = creditProduct.productRatePlanChargeId,
            HolidayStart__c = affectedDate.value,
            HolidayEnd__c = affectedDate.value,
            price = credit.amount,
          ),
        ),
      )
    }
}

case class CreditProductAddition(
    productRatePlanId: String,
    contractEffectiveDate: LocalDate,
    customerAcceptanceDate: LocalDate,
    serviceActivationDate: LocalDate,
    chargeOverride: CreditChargeOverride,
)

case class CreditChargeOverride(
    productRatePlanChargeId: String,
    HolidayStart__c: LocalDate,
    HolidayEnd__c: LocalDate,
    price: Double,
)
