package manualTest

import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.effects.sqs.SqsAsync
import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.serialisers.GuardianWeeklyEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.{DeliveryAgentDetails, EtSqsSend, GuardianWeeklyEmailData, PaperEmailData, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.productcatalog.PlanId.{GuardianWeeklyROWMonthly, NationalDeliveryWeekend}
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate
import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.util.Random

object SendGWEmailsManualTest {

  def fakeEmailData(email: Email) = {

    val contacts = Contacts(
      billTo = BillToContact(
        Some(Title("billToTitle")),
        FirstName("billToFirstName"),
        LastName("billToLastName"),
        Some(email),
        BillToAddress(
          Some(Address1("billToAddress1")),
          Some(Address2("billToAddress2")),
          Some(City("billToCity")),
          Some(State("billToState")),
          Some(Country.UK),
          Some(Postcode("billToPostcode")),
        ),
      ),
      soldTo = SoldToContact(
        Some(Title("soldToTitle")),
        FirstName("soldToFirstName"),
        LastName("soldToLastName"),
        Some(email),
        SoldToAddress(
          Some(Address1("soldToAddress1")),
          Some(Address2("soldToAddress2")),
          Some(City("soldToCity")),
          Some(State("soldToState")),
          Country.US,
          Some(Postcode("soldToPostcode")),
        ),
      ),
    )

    val randomSubName = "T-" + Random.alphanumeric.take(10).mkString

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

    GuardianWeeklyEmailData(
      plan = Plan(
        GuardianWeeklyROWMonthly,
        PlanDescription("Monthly"),
        testStartDateRules,
        Map(GBP -> PaymentPlan(GBP, AmountMinorUnits(3112), Monthly, "GBP 32.12 every month")),
      ),
      firstPaymentDate = LocalDate.of(2018, 12, 12),
      subscriptionName = SubscriptionName(randomSubName),
      contacts = contacts,
      paymentMethod = DirectDebit(
        ActivePaymentMethod,
        BankAccountName("bankAccountName"),
        BankAccountNumberMask("********1234"),
        SortCode("123456"),
        MandateId("MandateId"),
      ),
      currency = GBP,
      discountMessage= None,
    )
  }

  def main(args: Array[String]): Unit = {
    args.headOption match {
      case None =>
        println("please input a parameter which is your email address for SES emails to be sent")
      case Some(rawEmail) =>
        val sqsSend = SqsAsync.send(SqsAsync.buildClient)(EmailQueueName) _
        val voucherSqsSend = EtSqsSend[GuardianWeeklyEmailData](sqsSend) _
        val sendConfirmationEmail = SendConfirmationEmail(voucherSqsSend) _
        val data = fakeEmailData(Email(rawEmail))
        val devContactId = SfContactId("0039E00001pSvOHQA0")
        val sendResult = sendConfirmationEmail(Some(devContactId), data)
        val opresult = Await.result(sendResult.underlying, Duration.Inf)
        println(s"op result: $opresult")
    }
  }

}
