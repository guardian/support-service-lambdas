package manualTest

import java.util.UUID

import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.sqs.SqsSync
import com.gu.util.Logging
import com.gu.util.email._

// run this to send a one off email to yourself.  the email will take a few mins to arrive, but it proves the ET logic works
object EmailSendTest extends App with Logging {

  private val recipient = args.headOption.getOrElse(throw new IllegalArgumentException("Expected recipient parameter"))

  def createMessage(product: String, dataExtensionName: String) = EmailMessage(
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
          first_name = s"firstNameValue",
          last_name = "lastNameValue",
          primaryKey = InvoiceId(UUID.randomUUID().toString),
          serviceStartDate = "31 January 2016",
          serviceEndDate = "31 January 2017",
        ),
      ),
    ),
    DataExtensionName = dataExtensionName,
    SfContactId = "18328400",
  )

  val emailNames: Seq[EmailId] = Seq(EmailId.cancelledId)

  val products = Seq(
    "Supporter",
    "Digital Pack",
    "Guardian Weekly Zone A",
    "Guardian Weekly Zone B",
    "Guardian Weekly Zone C",
    "Contributor",
    "Newspaper Voucher",
    "Newspaper Delivery",
  )

  for {
    emailName <- emailNames
    product <- products
  } {
    val result = new EmailSendSteps(SqsSync.send(SqsSync.buildClient)(QueueName("braze-emails-PROD")))
      .send(createMessage(product, emailName.id))
    println(s"result for $emailName $product is $result")
  }

}
