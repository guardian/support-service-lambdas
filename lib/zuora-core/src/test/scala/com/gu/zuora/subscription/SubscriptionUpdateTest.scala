package com.gu.zuora.subscription

import java.time.LocalDate

import com.softwaremill.diffx.scalatest.DiffMatcher
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SubscriptionUpdateTest
  extends AnyFlatSpec
  with Matchers
  with DiffMatcher
  with EitherValues {

  it should "extend term of sub if invoice date is later than term end" in {
    val invoiceDate = InvoiceDate(LocalDate.parse("2020-06-14"))
    val publicationDate = AffectedPublicationDate(LocalDate.parse("2020-03-06"))
    val update = SubscriptionUpdate(
      creditProduct = CreditProduct(
        productRatePlanId = "prp1",
        productRatePlanChargeId = "prpc3",
        productRatePlanChargeName = ""
      ),
      subscription =
        Fixtures.subscriptionFromJson("GWTermEndsBeforeInvoiceDate.json"),
      account = Fixtures.mkAccount(),
      affectedDate = publicationDate,
      maybeInvoiceDate = Some(invoiceDate)
    )

    update.right.value should matchTo(
      SubscriptionUpdate(
        currentTerm = Some(418),
        currentTermPeriodType = Some("Day"),
        add = List(
          Add(
            productRatePlanId = "prp1",
            contractEffectiveDate = invoiceDate.value,
            customerAcceptanceDate = invoiceDate.value,
            serviceActivationDate = invoiceDate.value,
            chargeOverrides = List(
              ChargeOverride(
                productRatePlanChargeId = "prpc3",
                HolidayStart__c = publicationDate.value,
                HolidayEnd__c = publicationDate.value,
                price = -4.72
              )
            )
          )
        )
      )
    )
  }
}
