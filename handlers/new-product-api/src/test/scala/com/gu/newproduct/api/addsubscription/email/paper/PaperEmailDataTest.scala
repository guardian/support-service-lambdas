package com.gu.newproduct.api.addsubscription.email.paper

import java.time.LocalDate
import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.{DeliveryAgentDetails, PaperEmailData}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.productcatalog._
import com.gu.newproduct.api.productcatalog.PlanId._
import play.api.libs.json.Json
import com.gu.newproduct.api.addsubscription.email.serialisers.PaperEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.serialisers.PaperEmailFields
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
class PaperEmailDataTest extends AnyFlatSpec with Matchers {

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

  val directDebitVoucherData = PaperEmailData(
    plan = Plan(
      id = VoucherEveryDayPlus,
      description = PlanDescription("Everyday+"),
      testStartDateRules,
      paymentPlans = Map(GBP -> PaymentPlan(GBP, AmountMinorUnits(1225), Monthly, "GBP 12.25 every month")),
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
      MandateId("MandateId"),
    ),
    currency = GBP,
    deliveryAgentDetails = None,
  )
  it should "generate json payload for voucher data with direct debit fields" in {

    val actualJson = Json.toJson(directDebitVoucherData)

    val expected =
      """
        |{
        |  "ZuoraSubscriberId" : "A-S000SubId",
        |  "SubscriberKey" : "bill@contact.com",
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
        |  "EmailAddress" : "bill@contact.com",
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

  it should "not include direct debit fields if payment method is not direct debit" in {

    val cardVoucherData =
      directDebitVoucherData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))

    val directDebitFieldNames = List("bank_account_no", "bank_sort_code", "account_holder", "mandate_id")

    PaperEmailFields.serialise(cardVoucherData).keySet.filter(directDebitFieldNames.contains(_)) shouldBe Set.empty
  }

  def fieldsForPlanIds(ids: List[PlanId]): List[Map[String, String]] = {
    val allPlansVoucherData = ids.map(planId =>
      directDebitVoucherData.copy(plan = Plan(planId, PlanDescription("test plan"), testStartDateRules)),
    )
    allPlansVoucherData.map(PaperEmailFields.serialise)
  }

  it should "IncludesDigipack should be false for non plus plans " in {

    val nonDigipackPlans = List(VoucherEveryDay, VoucherWeekend, VoucherSixDay, VoucherSaturday, VoucherSunday)

    val allNonDigipackPlanFields: List[Map[String, String]] = fieldsForPlanIds(nonDigipackPlans)

    allNonDigipackPlanFields.forall(_.get("IncludesDigipack").contains("false"))

  }

  it should "IncludesDigipack should be true for plus plans " in {

    val digipackPlans =
      List(VoucherEveryDayPlus, VoucherWeekendPlus, VoucherSixDayPlus, VoucherSaturdayPlus, VoucherSundayPlus)

    val allDigipackPlanFields: List[Map[String, String]] = fieldsForPlanIds(digipackPlans)

    allDigipackPlanFields.forall(_.get("IncludesDigipack").contains("true"))
  }

  it should "include the delivery agent details where supplied" in {
    val deliveryAgentDetails = DeliveryAgentDetails(
      "my name",
      "my telephone",
      "my email",
      "my address1",
      "my address2",
      "my town",
      "my county",
      "my postcode",
    )
    val testData = directDebitVoucherData.copy(deliveryAgentDetails = Some(deliveryAgentDetails))

    val actual = PaperEmailFields.serialise(testData)

    val filtered = actual.collect({
      case (key, value) if key.startsWith("delivery_agent_") =>
        (key.replaceFirst("delivery_agent_", ""), value)
    })

    val expected = Seq(
      "name" -> "my name",
      "telephone" -> "my telephone",
      "email" -> "my email",
      "address1" -> "my address1",
      "address2" -> "my address2",
      "town" -> "my town",
      "county" -> "my county",
      "postcode" -> "my postcode",
    )

    filtered.toList.sorted should be(expected.toList.sorted)
  }

}
