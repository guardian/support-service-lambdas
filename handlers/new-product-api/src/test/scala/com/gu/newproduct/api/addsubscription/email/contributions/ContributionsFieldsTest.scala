package com.gu.newproduct.api.addsubscription.email.contributions

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.email.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.contributions.ContributionEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
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
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

import java.time.LocalDate
class ContributionsFieldsTest extends AnyFlatSpec with Matchers {

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

  val directDebitContributionsData = ContributionsEmailData(
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
    firstPaymentDate = LocalDate.of(2018, 12, 1),
    plan = Plan(id = MonthlyContribution, description = PlanDescription("monthly"), testStartDateRules),
    contacts = testContacts,
    created = LocalDate.of(2018, 11, 1),
  )

  it should "serialise  direct debit contributions Email to json" in {

    val expected =
      """
        |{
        | "EmailAddress": "bill@contact.com",
        | "created": "2018-11-01",
        | "amount": "12.12",
        | "currency": "£",
        | "edition": "GB",
        | "name": "firstBill",
        | "product": "monthly-contribution",
        | "account name": "someAccountName",
        | "account number": "*****mask",
        | "sort code": "12-34-56",
        | "Mandate ID": "mandateId",
        | "first payment date": "Saturday, 1 December 2018",
        | "payment method" : "Direct Debit"
        |}
      """.stripMargin
    Json.toJson(directDebitContributionsData) shouldBe Json.parse(expected)

  }

  it should "serialise non direct debit contributions Email to json" in {

    val nonDirectDebitData =
      directDebitContributionsData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))

    val expected =
      """
          |{
          | "EmailAddress": "bill@contact.com",
          | "created": "2018-11-01",
          | "amount": "12.12",
          | "currency": "£",
          | "edition": "GB",
          | "name": "firstBill",
          | "product": "monthly-contribution"
          |}
        """.stripMargin
    Json.toJson(nonDirectDebitData) shouldBe Json.parse(expected)

  }

}
