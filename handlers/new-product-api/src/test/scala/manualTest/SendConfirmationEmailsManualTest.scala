package manualTest

import java.time.LocalDate

import com.gu.effects.sqs.SqsAsync
import com.gu.i18n.{Country, Currency}
import com.gu.newproduct.api.EmailQueueNames.emailQueueFor
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.email.contributions.ContributionEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.{ContributionsEmailData, EtSqsSend, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.NonDirectDebitMethod
import com.gu.newproduct.api.addsubscription.zuora.{PaymentMethodStatus, PaymentMethodType}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanDescription}
import com.gu.util.config.Stage

import scala.concurrent.Await
import scala.concurrent.duration.Duration

object SendConfirmationEmailsManualTest {

  def fakeContacts(billToEmail: Email) = {
    val soldTo = SoldToContact(
      title = None,
      firstName = FirstName("john1"),
      lastName = LastName("bloggs1"),
      email = Some(Email("sellto@email.com")),
      address = SoldToAddress(
        address1 = None,
        address2 = None,
        city = None,
        state = None,
        country = Country.US,
        postcode = None,
      ),
    )

    val billto = BillToContact(
      title = None,
      firstName = FirstName("john"),
      lastName = LastName("bloggs"),
      email = Some(billToEmail),
      address = BillToAddress(
        address1 = None,
        address2 = None,
        city = None,
        state = None,
        country = Some(Country.UK),
        postcode = None,
      ),
    )
    Contacts(billto, soldTo)
  }

  def contributionsEmailData(contacts: Contacts) = ContributionsEmailData(
    ZuoraAccountId("oops"),
    Currency.GBP,
    NonDirectDebitMethod(PaymentMethodStatus.ActivePaymentMethod, PaymentMethodType.PayPal),
    AmountMinorUnits(123),
    LocalDate.of(2018, 9, 1),
    Plan(MonthlyContribution, PlanDescription("some plan"), testStartDateRules),
    contacts,
    LocalDate.of(2018, 8, 1),
  )

  val fakeDate = LocalDate.of(2018, 8, 10)

  def main(args: Array[String]): Unit = {
    val result = for {
      email <- args.headOption.map(Email.apply)
      queueName = emailQueueFor(Stage("DEV"))
      sqsSend = SqsAsync.send(SqsAsync.buildClient)(queueName) _
      contributionsSqsSend = EtSqsSend[ContributionsEmailData](sqsSend) _
      sendConfirmationEmail = SendConfirmationEmail[ContributionsEmailData](contributionsSqsSend) _
      sendResult = sendConfirmationEmail(Some(SfContactId("sfContactId")), contributionsEmailData(fakeContacts(email)))
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
