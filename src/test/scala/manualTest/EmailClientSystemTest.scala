package manualTest

import com.gu.effects.RawEffects
import com.gu.util.ETConfig.ETSendIds
import com.gu.util.exacttarget.EmailSendSteps.EmailSendStepsDeps
import com.gu.util.exacttarget._
import com.gu.util.zuora.ZuoraRestConfig
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
          first_name = s"${hint.replaceAll(" ", "-")}-firstNameValue",
          last_name = "lastNameValue",
          primaryKey = key, // must be unique otherwise the email won't arrive
          price = "49.0 GBP",
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017"))))

  def five(etSendIds: ETSendIds, product: String) =
    Seq(
      etSendIds.pf1 -> message(s"$product-pf1", PaymentId(s"paymentId$unique"), product),
      etSendIds.pf2 -> message(s"$product-pf2", PaymentId(s"paymentId$unique"), product),
      etSendIds.pf3 -> message(s"$product-pf3", PaymentId(s"paymentId$unique"), product),
      etSendIds.pf4 -> message(s"$product-pf4", PaymentId(s"paymentId$unique"), product),
      etSendIds.cancelled -> message(s"$product-overdue", InvoiceId(s"invoiceId$unique"), product))

  for {
    configAttempt <- Try {
      Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString
    }
    config <- Config.parseConfig[ZuoraRestConfig](configAttempt)
    deps = EmailSendStepsDeps.default(Stage("CODE"), RawEffects.createDefault.response, config.etConfig)
    etSendIds = config.etConfig.etSendIDs
  } yield Seq(
    "Supporter",
    "Digital Pack",
    "Guardian Weekly Zone A",
    "Guardian Weekly Zone B",
    "Guardian Weekly Zone C",
    "Contributor",
    "Newspaper Voucher",
    "Newspaper Delivery").flatMap(product => five(etSendIds, product)).foreach {
      case (etSendId, index) =>
        val emailResult = EmailSendSteps(
          deps)(EmailRequest(
          etSendId = etSendId,
          message = index))
        println(s"result for $etSendId:::::: $emailResult")
    }

}
