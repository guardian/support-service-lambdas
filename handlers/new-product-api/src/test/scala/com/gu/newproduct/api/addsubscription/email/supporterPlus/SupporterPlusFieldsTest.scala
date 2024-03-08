package com.gu.newproduct.api.addsubscription.email.supporterPlus

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.{ZuoraAccountId,DiscountMessage}
import com.gu.newproduct.api.addsubscription.email.SupporterPlusEmailData
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.email.serialisers.SupporterPlusEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Address1, Address2, BillToAddress, BillToContact, City, Contacts, Email, FirstName, LastName, Postcode, SoldToAddress, SoldToContact, State, Title}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanDescription}
import com.gu.newproduct.api.productcatalog.PlanId.{MonthlyContribution, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
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
    firstPaymentDate = LocalDate.of(2024, 03, 1),
    plan = Plan(id = MonthlySupporterPlus, description = PlanDescription("monthly"), testStartDateRules),
    contacts = testContacts,
    created = LocalDate.of(2024, 03, 1),
    subscriptionName = SubscriptionName("A-S000SubId"),
    discountMessage = None,
  )

  it should "serialise  direct debit supporterPlus Email to json" in {


    val actualJson = Json.toJson(directDebitSupporterPlusData)
    val expected =
      """
        |{
        | "ZuoraSubscriberId":"A-S000SubId",
        | "name":"firstBill",
        | "account name":"someAccountName",
        | "Mandate ID":"mandateId",
        | "sort code":"12-34-56",
        | "payment method":"Direct Debit",
        | "first payment date":"Friday, 1 March 2024",
        | "edition":"GB","amount":"12.12",
        | "currency":"£",
        | "account number":"*****mask",
        | "EmailAddress":"bill@contact.com",
        | "created":"2024-03-01",
        | "product":"monthly-supporter-plus"
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
        | "ZuoraSubscriberId":"A-S000SubId",
        | "EmailAddress":"bill@contact.com",
        | "created":"2024-03-01",
        | "amount":"12.12",
        | "currency":"£",
        | "edition":"GB",
        | "name":"firstBill",
        | "product":"monthly-supporter-plus"}
        |
        """.stripMargin
    Json.toJson(nonDirectDebitData) shouldBe Json.parse(expected)

  }

}
