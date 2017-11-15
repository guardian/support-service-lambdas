package manualTest

import com.gu.effects.StateHttpWithEffects
import com.gu.effects.StateHttpWithEffects.HandlerDeps
import com.gu.util.Config
import com.gu.util.exacttarget._

import scala.io.Source
import scala.util.Try
import com.gu.util.zuora.Types._

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailClientSystemTest extends App {

  private val recipient = "john.duffell@guardian.co.uk"

  val message = Message(
    DataExtensionName = "first-failed-payment-email",
    To = ToDef(
      Address = recipient,
      SubscriberKey = recipient,
      ContactAttributes = ContactAttributesDef(
        SubscriberAttributes = SubscriberAttributesDef(
          SubscriberKey = recipient,
          EmailAddress = recipient,
          subscriber_id = "subIdValue",
          product = "productValue",
          payment_method = "paymentMethodValue",
          card_type = "cardTypeValue",
          card_expiry_date = "cardExpiryValue",
          first_name = "firstNameValue",
          last_name = "lastNameValue",
          paymentId = "paymentId",
          price = "49.0 GBP",
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017"
        )
      )
    )
  )

  val configAttempt = Try { Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString }
  val emailResult = configAttempt.toFailableOp("config failed").flatMap {
    config => StateHttpWithEffects(HandlerDeps(_ => configAttempt, Config.parseConfig))
  }.map {
    service =>
      EmailClient.sendEmail()(EmailRequest(1, message = message)).run.run(service)
  }

  println(s"result was:::::: $emailResult")

}
