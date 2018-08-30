package manualTest

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.Steps.emailQueuesFor
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.voucher.{SendConfirmationEmailVoucher, VoucherEmailData}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.productcatalog.PlanId.VoucherEveryDayPlus
import com.gu.newproduct.api.productcatalog.{PaymentPlan, Plan, PlanDescription, StartDateRules}
import com.gu.util.config.Stage

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.util.Random

object SendVoucherEmailsManualTest {

  def fakeVoucherEmailData(soldToEmail: Email) = {

    val contacts = Contacts(
      billTo = BillToContact(
        Some(Title("billToTitle")),
        FirstName("billToFirstName"),
        LastName("billToLastName"),
        Some(Email("billto@email.com")),
        BillToAddress(
          Some(Address1("billToAddress1")),
          Some(Address2("billToAddress2")),
          Some(City("billToCity")),
          Some(State("billToState")),
          Some(Country.UK),
          Some(Postcode("billToPostcode"))
        )
      ),
      soldTo = SoldToContact(
        Some(Title("soldToTitle")),
        FirstName("soldToFirstName"),
        LastName("soldToLastName"),
        Some(soldToEmail),
        SoldToAddress(
          Some(Address1("soldToAddress1")),
          Some(Address2("soldToAddress2")),
          Some(City("soldToCity")),
          Some(State("soldToState")),
          Country.US,
          Some(Postcode("soldToPostcode"))
        )
      )
    )

    val randomSubName = "T-" + Random.alphanumeric.take(10).mkString

    VoucherEmailData(
      plan = Plan(VoucherEveryDayPlus, PlanDescription("Everyday+"), StartDateRules(), Some(PaymentPlan("GBP 32.12 every month"))),
      firstPaymentDate = LocalDate.of(2018, 12, 12),
      firstPaperDate = LocalDate.of(2018, 11, 12),
      subscriptionName = SubscriptionName(randomSubName),
      contacts = contacts,
      paymentMethod = DirectDebit(
        ActivePaymentMethod,
        BankAccountName("bankAccountName"),
        BankAccountNumberMask("********1234"),
        SortCode("123456"),
        MandateId("MandateId")
      )
    )
  }

  val fakeDate = LocalDate.of(2018, 8, 10)

  def main(args: Array[String]): Unit = {
    val result = for {
      email <- args.headOption.map(Email.apply)
      queueName = emailQueuesFor(Stage("PROD")).voucher
      sqsSend = AwsSQSSend(queueName) _
      voucherSqsSend = EtSqsSend[VoucherEmailData](sqsSend) _
      sendConfirmationEmail = SendConfirmationEmailVoucher(voucherSqsSend, () => fakeDate) _
      data = fakeVoucherEmailData(email)
      sendResult = sendConfirmationEmail(fakeVoucherEmailData(email))
    } yield sendResult
    result match {
      case None =>
        println("please input a parameter which is your email address for SES emails to be sent")
      case Some(op) =>
        val opresult = Await.result(op.underlying, Duration.Inf)
        println(s"op result: $opresult")
    }
  }

}
