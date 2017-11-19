package manualTest

import com.gu.effects.{ Http, RawEffects }
import com.gu.util.ETConfig.ETSendId
import com.gu.util.{ Config, Stage }
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.exacttarget.ETClient.ETClientDeps
import com.gu.util.exacttarget.EmailSendSteps.EmailSendStepsDeps
import com.gu.util.exacttarget._

import scala.io.Source
import scala.util.Try

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailClientSystemTest extends App {

  private val recipient = "john.duffell@guardian.co.uk"

  def message(number: ETSendId) = Message(
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

  for {
    configAttempt <- Try {
      Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString
    }
    config <- Config.parseConfig(configAttempt)
    deps = EmailSendStepsDeps.default(Stage("CODE"), RawEffects.createDefault.response, config.etConfig)
    a = config.etConfig.etSendIDs
  } yield Seq( /*a.pf1, a.pf2, a.pf3,*/ a.pf4 /*, a.cancelled*/ ).map { etSendId =>
    val emailResult = EmailSendSteps(
      deps
    )(EmailRequest(
      etSendId = etSendId,
      message = message(etSendId)
    ))
    println(s"result for $etSendId:::::: $emailResult")
  }

}
