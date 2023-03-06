package com.gu.newproduct.api.addsubscription.email.guardianweekly

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.{GuardianWeeklyEmailData, PaperEmailData}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToContact, _}
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
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GuardianWeeklyEmailDataTest extends AnyFlatSpec with Matchers {

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
  val contacts = Contacts(billto, soldto)

  val directDebitEmailData = GuardianWeeklyEmailData(
    plan = Plan(
      id = VoucherEveryDayPlus,
      description = PlanDescription("GW Oct 18 - 1 Year - Domestic"),
      testStartDateRules,
      paymentPlans = Map(GBP -> PaymentPlan(GBP, AmountMinorUnits(1225), Monthly, "GBP 12.25 every month")),
    ),
    firstPaymentDate = LocalDate.of(2018, 12, 1),
    subscriptionName = SubscriptionName("A-S000SubId"),
    contacts = contacts,
    paymentMethod = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someAccountName"),
      BankAccountNumberMask("*****mask"),
      SortCode("123456"),
      MandateId("MandateId"),
    ),
    currency = GBP,
  )
  it should "generate email fields with direct debit fields" in {
    GuardianWeeklyFields(directDebitEmailData) should equal(
      Map(
        "EmailAddress" -> "bill@contact.com",
        "ZuoraSubscriberId" -> "A-S000SubId",
        "subscriber_id" -> "A-S000SubId",
        "first_name" -> "FirstSold",
        "last_name" -> "lastSold",
        "date_of_first_paper" -> "Saturday, 1 December 2018",
        "date_of_first_payment" -> "Saturday, 1 December 2018",
        "subscription_rate" -> "GBP 12.25 every month",
        "payment_method" -> "Direct Debit",
        "bank_sort_code" -> "12-34-56",
        "mandate_id" -> "MandateId",
        "bank_account_no" -> "*****mask",
        "account_holder" -> "someAccountName",
        "delivery_address_line_1" -> "soldToAddress1",
        "delivery_address_line_2" -> "soldToAddress2",
        "delivery_address_town" -> "soldToCity",
        "delivery_postcode" -> "soldToPostcode",
        "delivery_country" -> "United States",
      ),
    )
  }

  it should "not include direct debit fields if payment method is not direct debit" in {
    val cardVoucherData =
      directDebitEmailData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))
    val directDebitFieldNames = List("bank_account_no", "bank_sort_code", "account_holder", "mandate_id")
    GuardianWeeklyFields(cardVoucherData).keySet.filter(directDebitFieldNames.contains(_)) shouldBe Set.empty
  }
}
