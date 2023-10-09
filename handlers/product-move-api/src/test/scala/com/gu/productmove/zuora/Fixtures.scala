package com.gu.productmove.zuora

import com.gu.productmove.zuora.SubscriptionUpdateSpec.test

import java.time.LocalDate

object Fixtures {
  val supporterPlusProductRatePlanId = "8ad08cbd8586721c01858804e3275376"
  val supporterPlusSubscriptionRatePlanChargeId = "8ad08cbd8586721c01858804e3715378"
  val supporterPlusContributionRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c"
  val recurringContributionRatePlanChargeId = "2c92c0f85a6b1352015a7fcf35ab397c"

  val invoiceWithMultipleInvoiceItems = SubscriptionUpdateInvoice(
    amount = 42,
    amountWithoutTax = 42,
    taxAmount = 0,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2022-11-19"),
        16,
        0,
        recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2022-12-19"),
        16,
        0,
        recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-01-19"),
        -16,
        0,
        recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-01-19"),
        10,
        0,
        supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-01-19"),
        6,
        0,
        supporterPlusContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-02-19"),
        10,
        0,
        supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-02-19"),
        6,
        0,
        supporterPlusContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-03-19"),
        10,
        0,
        supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-03-19"),
        6,
        0,
        supporterPlusContributionRatePlanChargeId,
      ), SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-04-19"),
        10,
        0,
        supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-04-19"),
        6,
        0,
        supporterPlusContributionRatePlanChargeId,
      ),
    ),
  )



  val invoiceWithTax = SubscriptionUpdateInvoice(
    amount = 202,
    amountWithoutTax = -192.90,
    taxAmount = 9.10,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-03-06"),
        chargeAmount = 9.35,
        taxAmount = 0.65,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-03-06"),
        chargeAmount = 5,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = -8,
        taxAmount = -0,
        productRatePlanChargeId = recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = 9.35,
        taxAmount = 0.65,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = 5,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusContributionRatePlanChargeId,
      ),
    ),
  )

  val subscriptionsPreviewResponse = SubscriptionUpdateInvoice(
    amount = 20,
    amountWithoutTax = 18,
    taxAmount = 2,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = -20,
        taxAmount = -0,
        productRatePlanChargeId = recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-03-06"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
    ),
  )

  val subscriptionsPreviewResponse2 = SubscriptionUpdateInvoice(
    amount = 20,
    amountWithoutTax = 18,
    taxAmount = 2,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-03-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-02-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
    ),
  )

  val subscriptionsPreviewResponse3 = SubscriptionUpdateInvoice(
    amount = 20,
    amountWithoutTax = 18,
    taxAmount = 2,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-02-15"),
        chargeAmount = -19.70,
        taxAmount = -0,
        productRatePlanChargeId = recurringContributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-03-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-04-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusSubscriptionRatePlanChargeId,
      ),
    ),
  )

}
