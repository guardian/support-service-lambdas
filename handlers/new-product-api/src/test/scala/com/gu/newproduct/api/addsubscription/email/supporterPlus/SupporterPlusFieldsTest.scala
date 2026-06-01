package com.gu.newproduct.api.addsubscription.email.supporterPlus

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.{DiscountMessage, ZuoraAccountId}
import com.gu.newproduct.api.addsubscription.email.SupporterPlusEmailData
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.email.serialisers.SupporterPlusEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{
  Address1,
  Address2,
  BillToAddress,
  BillToContact,
  City,
  Contacts,
  Email,
  FirstName,
  LastName,
  Postcode,
  SoldToAddress,
  SoldToContact,
  State,
  Title,
}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{
  BankAccountName,
  BankAccountNumberMask,
  DirectDebit,
  MandateId,
  NonDirectDebitMethod,
  SortCode,
}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanDescription}
import com.gu.newproduct.api.productcatalog.PlanId.{MonthlyContribution, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

import java.time.LocalDate

class SupporterPlusFieldsTest extends AnyFlatSpec with Matchers {

  val billto = BillToContact(
    None,
    FirstName("firstBill"),
    LastName("lastBill"),
    Some(Email("bill@contact.com")),
    BillToAddress(
      Some(Address1("billToAddress1")),
      Some(Address2("billToAddress2")),
      Some(City("billToCity")),
      Some(State("billToState")),
      Some(Country.UK),
      Some(Postcode("billToPostcode")),
    ),
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
      Some(Postcode("soldToPostcode")),
    ),
  )
  val testContacts = Contacts(billto, soldto)

  val directDebitSupporterPlusData = SupporterPlusEmailData(
    accountId = ZuoraAccountId("accountId"),
    currency = GBP,
    paymentMethod = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someAccountName"),
      BankAccountNumberMask("*****mask"),
      SortCode("123456"),
      MandateId("mandateId"),
    ),
    amountMinorUnits = AmountMinorUnits(1212),
    firstPaymentDate = LocalDate.of(2024, 3, 1),
    plan = Plan(id = MonthlySupporterPlus, description = PlanDescription("monthly"), testStartDateRules),
    contacts = testContacts,
    created = LocalDate.of(2024, 3, 1),
    subscriptionName = SubscriptionName("A-S000SubId"),
    discountMessage = None,
  )

  val directDebitSupporterPlusDataWithDiscount = SupporterPlusEmailData(
    accountId = ZuoraAccountId("accountId"),
    currency = GBP,
    paymentMethod = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someAccountName"),
      BankAccountNumberMask("*****mask"),
      SortCode("123456"),
      MandateId("mandateId"),
    ),
    amountMinorUnits = AmountMinorUnits(20000),
    firstPaymentDate = LocalDate.of(2024, 3, 1),
    plan = Plan(id = MonthlySupporterPlus, description = PlanDescription("monthly"), testStartDateRules),
    contacts = testContacts,
    created = LocalDate.of(2024, 3, 1),
    subscriptionName = SubscriptionName("A-S000SubId"),
    discountMessage = Some(DiscountMessage("164.76 GBP for the next  12 months. Then 200 GBP per year")),
  )

  it should "serialise  direct debit supporterPlus Email to json" in {

    val actualJson = Json.toJson(directDebitSupporterPlusData)
    val expected =
      """
        |{
        | "subscriber_id":"A-S000SubId",
        | "name":"firstBill",
        | "account_holder":"someAccountName",
        | "mandate_id":"mandateId",
        | "bank_sort_code":"12-34-56",
        | "payment_method": "Direct Debit",
        | "first_payment_date":"Friday, 1 March 2024",
        | "amount":"12.12",
        | "currency":"£",
        | "bank_account_no":"*****mask",
        | "subscription_rate":""
        |}
      """.stripMargin
    actualJson shouldBe Json.parse(expected)

  }

  it should "serialise non direct debit contributions Email to json" in {

    val nonDirectDebitData =
      directDebitSupporterPlusData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))

    val expected =
      """
        |{
        | "subscriber_id":"A-S000SubId",
        | "amount":"12.12",
        | "currency":"£",
        | "name":"firstBill",
        | "payment_method": "Credit/Debit Card",
        | "first_payment_date":"Friday, 1 March 2024",
        | "subscription_rate":""
        | }
        """.stripMargin
    Json.toJson(nonDirectDebitData) shouldBe Json.parse(expected)

  }

  it should "serialise  direct debit supporterPlus Email  with Discount to json" in {

    val actualJson = Json.toJson(directDebitSupporterPlusDataWithDiscount)
    val expected =
      """
        |{
        | "subscriber_id":"A-S000SubId",
        | "name":"firstBill",
        | "account_holder":"someAccountName",
        | "mandate_id":"mandateId",
        | "bank_sort_code":"12-34-56",
        | "payment_method": "Direct Debit",
        | "first_payment_date":"Friday, 1 March 2024",
        | "amount":"200.00",
        | "currency":"£",
        | "bank_account_no":"*****mask",
        | "subscription_rate":"164.76 GBP for the next  12 months. Then 200 GBP per year"
        |}
      """.stripMargin
    actualJson shouldBe Json.parse(expected)

  }

}
