package manualTest

import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.exacttarget._
import com.gu.util.reader.Types._

import scala.io.Source
import scala.util.Try

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
  val emailResult = configAttempt.flatMap {
    config =>
      HandlerDeps().parseConfig(config).map { config =>
        ConfigHttpGen(RawEffects.response, "CODE", config)
      }
  }.map {
    service =>
      EmailSend()(EmailRequest(1, message = message)).run.run(service)
  }

  println(s"result was:::::: $emailResult")

}
