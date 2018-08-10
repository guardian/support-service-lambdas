package manualTest

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.i18n.{Country, Currency}
import com.gu.newproduct.api.addsubscription.Steps.emailQueueFor
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.contributions.{ContributionFields, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.{Contact, Email, FirstName, LastName}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.NonDirectDebitMethod
import com.gu.newproduct.api.addsubscription.zuora.{PaymentMethodStatus, PaymentMethodType}
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientSuccess

import scala.concurrent.Await
import scala.concurrent.duration.Duration

object SendConfirmationEmailContributionsManualTest {

  def fakeContact(email: Email) = Contact(
    FirstName("john"),
    LastName("bloggs"),
    email = Some(email),
    country = Some(Country.UK)
  )
  val contributionsEmailData = ContributionsEmailData(
    ZuoraAccountId("oops"),
    Currency.GBP,
    NonDirectDebitMethod(PaymentMethodStatus.ActivePaymentMethod, PaymentMethodType.PayPal),
    AmountMinorUnits(123),
    LocalDate.of(2018, 9, 1)
  )

  val fakeDate = LocalDate.of(2018, 8, 10)

  def main(args: Array[String]): Unit = {
    val result = for {
      email <- args.headOption.map(Email.apply)
      sqsSend = AwsSQSSend(emailQueueFor(Stage("PROD"))) _
      contributionsSqsSend = EtSqsSend[ContributionFields](sqsSend) _
      sendConfirmationEmail = SendConfirmationEmail(contributionsSqsSend, () => fakeDate, _ => ClientSuccess(fakeContact(email))) _
      sendResult = sendConfirmationEmail(contributionsEmailData)
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
