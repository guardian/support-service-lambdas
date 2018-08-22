package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToContact, _}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.productcatalog.{PaymentPlan, Plan, PlanDescription}
import com.gu.newproduct.api.productcatalog.PlanId.VoucherEveryDayPlus
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class VoucherEmailDataTest extends FlatSpec with Matchers {
  it should "generate json payload " in {

    val billto = BillToContact(
      None,
      FirstName("FirstBill"),
      LastName("lastBill"),
      Some(Email("bill@contact.com")),
      BillToAddress(
        Some(Address1("billToAddress1")),
        Some(Address2("billToAddress2")),
        Some(City("billToCity")),
        Some(State("billToState")),
        Some(Country.UK),
        Some(Postcode("billToPostcode"))
      )
    )

    val soldto = SoldToContact(
      Some(Title("SoldToTitle")),
      FirstName("FirstSold"),
      LastName("lastSold"),
      Some(Email("sold@contact.com")),
      SoldToAddress(
        Some(Address1("soldToAddress1")),
        Some(Address2("soldToAddress2")),
        Some(City("soldToCity")),
        Some(State("soldToState")),
        Country.US,
        Some(Postcode("soldToPostcode"))
      )
    )
    val contacts = Contacts(billto, soldto)

    val data = VoucherEmailData(
      plan = Plan(
        id = VoucherEveryDayPlus,
        description = PlanDescription("Everyday+"),
        paymentPlan = Some(PaymentPlan("GBP 12.25 every month"))
      ),
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

    val actualJson = Json.toJson(data)

    val expected =
      """
        |{
        |  "ZuoraSubscriberId" : "A-S000SubId",
        |  "SubscriberKey" : "sold@contact.com",
        |  "subscriber_id" : "A-S000SubId",
        |  "IncludesDigipack" : "true",
        |  "date_of_first_paper" : "1 November 2018",
        |  "date_of_first_payment" : "1 December 2018",
        |  "package" : "Everyday+",
        |  "subscription_rate" : "GBP 12.25 every month",
        |  "bank_account_no" : "*****mask",
        |  "bank_sort_code" : "12-34-56",
        |  "account_holder" : "someAccountName",
        |  "mandate_id" : "MandateId",
        |  "payment_method" : "Direct Debit",
        |  "title" : "SoldToTitle",
        |  "first_name" : "FirstSold",
        |  "last_name" : "lastSold",
        |  "EmailAddress" : "sold@contact.com",
        |  
        |  "billing_address_line_1" : "billToAddress1",
        |  "billing_address_line_2" : "billToAddress2",
        |  "billing_address_town" : "billToCity",
        |  "billing_county" : "billToState",
        |  "billing_postcode" : "billToPostcode",
        |  "billing_country" : "United Kingdom",
        |  
        |  "delivery_address_line_1" : "soldToAddress1",
        |  "delivery_address_line_2" : "soldToAddress2",
        |  "delivery_address_town" : "soldToCity",
        |  "delivery_county" : "soldToState",
        |  "delivery_postcode" : "soldToPostcode",
        |  "delivery_country" : "United States"
        |}
      """.stripMargin

    actualJson shouldBe Json.parse(expected)
  }
}