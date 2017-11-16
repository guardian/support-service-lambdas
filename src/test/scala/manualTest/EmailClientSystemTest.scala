package manualTest

import com.gu.effects.{ Http, RawEffects }
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.exacttarget.EmailSend.ETS
import com.gu.util.exacttarget._

import scala.io.Source
import scala.util.Try

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailClientSystemTest extends App {

  private val recipient = "john.duffell@guardian.co.uk"

  def message(number: Int) = Message(
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
          first_name = s"firstNameValue message $number",
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
  configAttempt.flatMap {
    config =>
      HandlerDeps().parseConfig(config).map { config =>
        ETS(Http.response, "CODE", config.etConfig)
      }
  }.map {
    service =>
      Seq(1 /*, 2, 3, 4, 5*/ ).map { num =>
        val emailResult = EmailSend()(EmailRequest(num, message = message(num))).run.run(service)
        println(s"result for $num:::::: $emailResult")
      }
  }

}
