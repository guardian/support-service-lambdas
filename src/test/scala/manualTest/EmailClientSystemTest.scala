package manualTest

import com.gu.effects.RawEffects
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util.exacttarget.EmailSendSteps.EmailSendStepsDeps
import com.gu.util.exacttarget._
import com.gu.util.{ Config, Stage }

import scala.io.Source
import scala.util.{ Random, Try }

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailClientSystemTest extends App {

  private val recipient = "john.duffell@guardian.co.uk"
  private def unique = "pi123" + Random.nextInt

  def message(hint: String, key: PrimaryKey, product: String) = Message(
    To = ToDef(
      Address = recipient,
      SubscriberKey = recipient,
      ContactAttributes = ContactAttributesDef(
        SubscriberAttributes = SubscriberAttributesDef(
          subscriber_id = "subIdValue",
          product = product,
          payment_method = "paymentMethodValue",
          card_type = "cardTypeValue",
          card_expiry_date = "cardExpiryValue",
          first_name = s"$hint-firstNameValue",
          last_name = "lastNameValue",
          primaryKey = key, // must be unique otherwise the email won't arrive
          price = "49.0 GBP",
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017"
        )
      )
    )
  )

  def five(a: ETSendIds, product: String) = {
    val p = product.replaceAll(" ", "-")
    Seq(
      a.pf1 -> message(s"${p}-pf1", PaymentId(s"paymentId$unique"), product),
      a.pf2 -> message(s"${p}-pf2", PaymentId(s"paymentId$unique"), product),
      a.pf3 -> message(s"${p}-pf3", PaymentId(s"paymentId$unique"), product),
      a.pf4 -> message(s"${p}-pf4", PaymentId(s"paymentId$unique"), product),
      a.cancelled -> message(s"${p}-overdue", InvoiceId(s"invoiceId$unique"), product)
    )
  }

  for {
    configAttempt <- Try {
      Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString
    }
    config <- Config.parseConfig(configAttempt)
    deps = EmailSendStepsDeps.default(Stage("CODE"), RawEffects.createDefault.response, config.etConfig)
    a = config.etConfig.etSendIDs
  } yield Seq(
    "Supporter",
    "Digital Pack",
    "Guardian Weekly Zone A",
    "Guardian Weekly Zone B",
    "Guardian Weekly Zone C",
    "Contributor",
    "Newspaper Voucher",
    "Newspaper Delivery"
  ).flatMap(xxx => five(a, xxx)).foreach {
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
