package manualTest

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.i18n.{Country, Currency}
import com.gu.newproduct.api.addsubscription.Steps.emailQueueFor
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmailContributions.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.contributions.{ContributionFields, SendConfirmationEmailContributions}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.NonDirectDebitMethod
import com.gu.newproduct.api.addsubscription.zuora.{PaymentMethodStatus, PaymentMethodType}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.util.config.Stage

import scala.concurrent.Await
import scala.concurrent.duration.Duration

object SendConfirmationEmailsManualTest {

  def fakeContact(email: Email) = BillToContact(
    title = None,
    firstName = FirstName("john"),
    lastName = LastName("bloggs"),
    email = Some(email),
    address = BillToAddress(
      address1 = None,
      address2 = None,
      city = None,
      state = None,
      country = Some(Country.UK),
      postcode = None
    )
  )

  def contributionsEmailData(billtoContact: BillToContact) = ContributionsEmailData(
    ZuoraAccountId("oops"),
    Currency.GBP,
    NonDirectDebitMethod(PaymentMethodStatus.ActivePaymentMethod, PaymentMethodType.PayPal),
    AmountMinorUnits(123),
    LocalDate.of(2018, 9, 1),
    billtoContact
  )

  val fakeDate = LocalDate.of(2018, 8, 10)

  def main(args: Array[String]): Unit = {
    val result = for {
      email <- args.headOption.map(Email.apply)
      sqsSend = AwsSQSSend(emailQueueFor(Stage("PROD"))) _
      contributionsSqsSend = EtSqsSend[ContributionFields](sqsSend) _
      sendConfirmationEmail = SendConfirmationEmailContributions(contributionsSqsSend, () => fakeDate) _
      sendResult = sendConfirmationEmail(contributionsEmailData(fakeContact(email)))
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
