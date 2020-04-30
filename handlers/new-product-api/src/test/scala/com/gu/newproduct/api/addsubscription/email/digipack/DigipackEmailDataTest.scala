package com.gu.newproduct.api.addsubscription.email.digipack

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.{DigipackEmailData, TrialPeriod}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToContact, _}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json
import DigipackEmailDataSerialiser._
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
class DigipackEmailDataTest extends FlatSpec with Matchers {

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

  val directDebitData = DigipackEmailData(
    plan = Plan(
      id = VoucherEveryDayPlus,
      description = PlanDescription("Everyday+"),
      startDateRules = testStartDateRules,
      paymentPlans = Map(GBP -> PaymentPlan(GBP, AmountMinorUnits(1225), Monthly, "GBP 12.25 every month"))
    ),
    firstPaymentDate = LocalDate.of(2018, 12, 1),
    subscriptionName = SubscriptionName("A-S000SubId"),
    contacts = contacts,
    paymentMethod = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someAccountName"),
      BankAccountNumberMask("*****mask"),
      SortCode("123456"),
      MandateId("MandateId")
    ),
    currency = GBP,
    trialPeriod = TrialPeriod(18)
  )
  it should "generate json payload for digipack data with direct debit fields" in {

    val actualJson = Json.toJson(directDebitData)

    val expected =
      """
        |{
        |  "ZuoraSubscriberId": "A-S000SubId",
        |  "Date of first payment": "1 December 2018",
        |  "Address 2": "billToAddress2",
        |  "Trial period": "18",
        |  "First Name": "FirstBill",
        |  "Last Name": "lastBill",
        |  "Country": "United Kingdom",
        |  "Account number": "*****mask",
        |  "SubscriberKey": "bill@contact.com",
        |  "Account Name": "someAccountName",
        |  "Default payment method": "Direct Debit",
        |  "Currency" : "£",
        |  "Post Code": "billToPostcode",
        |  "Subscription term" : "month",
        |  "City": "billToCity",
        |  "Subscription details": "GBP 12.25 every month",
        |  "MandateID": "MandateId",
        |  "EmailAddress": "bill@contact.com",
        |  "Payment amount" : "12.25",
        |  "Address 1": "billToAddress1",
        |  "Sort Code": "12-34-56"
        |}
      """.stripMargin

    actualJson shouldBe Json.parse(expected)
  }

  it should "not include direct debit fields if payment method is not direct debit" in {

    val cardVoucherData = directDebitData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))

    val directDebitFieldNames = List("bank_account_no", "bank_sort_code", "account_holder", "mandate_id")

    DigipackEmailFields(cardVoucherData).keySet.filter(directDebitFieldNames.contains(_)) shouldBe Set.empty
  }

  def fieldsForPlanIds(ids: List[PlanId]): List[Map[String, String]] = {
    val allPlansVoucherData = ids.map(
      planId => directDebitData.copy(plan = Plan(planId, PlanDescription("test plan"), testStartDateRules))
    )
    allPlansVoucherData.map(DigipackEmailFields(_))
  }

}
