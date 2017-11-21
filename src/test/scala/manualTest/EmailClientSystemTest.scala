package manualTest

import com.gu.effects.RawEffects
import com.gu.util.ETConfig.ETSendId
import com.gu.util.exacttarget.EmailSendSteps.EmailSendStepsDeps
import com.gu.util.exacttarget._
import com.gu.util.{ Config, Stage }

import scala.io.Source
import scala.util.{ Random, Try }

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailClientSystemTest extends App {

  private val recipient = "john.duffell@guardian.co.uk"
  private def unique = "pi123" + Random.nextInt

  def message(number: Int) = Message(
    To = ToDef(
      Address = recipient,
      SubscriberKey = recipient,
      ContactAttributes = ContactAttributesDef(
        SubscriberAttributes = SubscriberAttributesDef(
          subscriber_id = "subIdValue",
          product = "Supporter",
          payment_method = "paymentMethodValue",
          card_type = "cardTypeValue",
          card_expiry_date = "cardExpiryValue",
          first_name = s"firstNameValue$number",
          last_name = "lastNameValue",
          primaryKey = PaymentId(s"paymentId$unique"), // must be unique otherwise the email won't arrive
          price = "49.0 GBP",
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017"
        )
      )
    )
  )

  def overdueMessage = Message(
    To = ToDef(
      Address = recipient,
      SubscriberKey = recipient,
      ContactAttributes = ContactAttributesDef(
        SubscriberAttributes = SubscriberAttributesDef(
          subscriber_id = "subIdValue",
          product = "Supporter",
          payment_method = "paymentMethodValue",
          card_type = "cardTypeValue",
          card_expiry_date = "cardExpiryValue",
          first_name = s"firstNameValue overdue",
          last_name = "lastNameValue",
          primaryKey = InvoiceId(s"invoiceId$unique"), // must be unique otherwise the email won't arrive
          price = "49.0 GBP",
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017"
        )
      )
    )
  )

  for {
    configAttempt <- Try {
      Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString
    }
    config <- Config.parseConfig(configAttempt)
    deps = EmailSendStepsDeps.default(Stage("CODE"), RawEffects.createDefault.response, config.etConfig)
    a = config.etConfig.etSendIDs
  } yield Seq(a.pf1 -> message(1), a.pf2 -> message(2), a.pf3 -> message(3), a.pf4 -> message(4), a.cancelled -> overdueMessage).map {
    case (etSendId, index) =>
      val emailResult = EmailSendSteps(
        deps
      )(EmailRequest(
        etSendId = etSendId,
        message = index
      ))
      println(s"result for $etSendId:::::: $emailResult")
  }

}
