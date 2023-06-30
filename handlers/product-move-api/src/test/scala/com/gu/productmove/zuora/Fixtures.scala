package com.gu.productmove.zuora

import com.gu.productmove.zuora.SubscriptionUpdateSpec.test

import java.time.LocalDate

object Fixtures {
  val supporterPlusRatePlanChargeId = "8ad08cbd8586721c01858804e3715378"
  val contributionRatePlanChargeId = "2c92c0f85a6b1352015a7fcf35ab397c"

  val invoiceWithMultipleInvoiceItems = SubscriptionUpdateInvoice(
    amount = 42,
    amountWithoutTax = 42,
    taxAmount = 0,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2022-11-19"),
        16,
        0,
        contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2022-12-19"),
        16,
        0,
        contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem( // Supporter plus
        LocalDate.parse("2023-01-19"),
        10,
        0,
        supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem( // Supporter plus
        LocalDate.parse("2023-02-19"),
        10,
        0,
        supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem( // Supporter plus
        LocalDate.parse("2023-03-19"),
        10,
        0,
        supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem( // Supporter plus
        LocalDate.parse("2023-04-19"),
        10,
        0,
        supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-01-19"),
        -16,
        0,
        contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        LocalDate.parse("2023-01-19"),
        16,
        0,
        contributionRatePlanChargeId,
      ),
    ),
  )

  val invoiceWithTax = SubscriptionUpdateInvoice(
    amount = -10,
    amountWithoutTax = -10.91,
    taxAmount = 0.91,
    invoiceItems = List(
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = -20,
        taxAmount = -0,
        productRatePlanChargeId = contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-03-06"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = 9.09,
        taxAmount = 0.91,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
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
        productRatePlanChargeId = contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-03-06"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2023-02-06"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
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
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-02-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
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
        productRatePlanChargeId = contributionRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-03-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
      ),
      SubscriptionUpdateInvoiceItem(
        serviceStartDate = LocalDate.parse("2021-04-15"),
        chargeAmount = 20,
        taxAmount = 0,
        productRatePlanChargeId = supporterPlusRatePlanChargeId,
      ),
    ),
  )

}
