package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BilltoContact, _}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, PaymentMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.VoucherEveryDayPlus
import org.scalatest.{FlatSpec, Matchers}

class VoucherEmailFieldsTest extends FlatSpec with Matchers {
  it should "generate fields" in {
    val billto = BilltoContact(FirstName("FirstBill"), LastName("lastBill"), Some(Email("bill@contact.com")), Some(Country.US))
    val soldto = SoldToContact(FirstName("FirstSold"), LastName("lastSold"), Some(Email("sold@contact.com")), Country.UK)
    val contacts = Contacts(billto, soldto)

    val actual = VoucherEmailFields(
      planId = VoucherEveryDayPlus,
      firstPaymentDate = LocalDate.of(2018, 12, 1),
      firstPaperDate = LocalDate.of(2018, 11, 1),
      subscriptionName = SubscriptionName("A-S000SubId"),
      contacts = contacts,
      paymentMethod = DirectDebit(
        ActivePaymentMethod,
        BankAccountName("someAccountName"),
        BankAccountNumberMask("*****mask"),
        SortCode("123456"),
        MandateId("MandateId")
      )
    )

    actual shouldBe Map(
      "ZuoraSubscriberId" -> "A-S000SubId",
      "SubscriberKey" -> "sold@contact.com",
      "subscriber_id" -> "A-S000SubId",
      "IncludesDigipack" -> "true",
      "date_of_first_paper" -> "1 November 2018",
      "date_of_first_payment" -> "1 December 2018",
      "package" -> "",
      "subscription_rate" -> "",
      "bank_account_no" -> "*****mask",
      "bank_sort_code" -> "12-34-56",
      "account_holder" -> "someAccountName",
      "mandate_id" -> "MandateId",
      "payment_method" -> "Direct Debit",
      "title" -> "",
      "first_name" -> "FirstSold",
      "last_name" -> "lastSold",
      "EmailAddress" -> "sold@contact.com",

      "billing_address_line_1" -> "",
      "billing_address_line_2" -> "",
      "billing_address_town" -> "",
      "billing_county" -> "",
      "billing_postcode" -> "",
      "billing_country" -> "United States",

      "delivery_address_line_1" -> "",
      "delivery_address_line_2" -> "",
      "delivery_address_town" -> "",
      "delivery_county" -> "",
      "delivery_postcode" -> "",
      "delivery_country" -> "United Kingdom"
    )
  }
}
