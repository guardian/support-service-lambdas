package com.gu.autoCancel

import com.gu.autoCancel.GetPaymentData.PaymentFailureInformation
import com.gu.util.email._

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object ToMessage {

  def apply(
      callout: AutoCancelCallout,
      paymentFailureInformation: PaymentFailureInformation,
      sendId: EmailId,
  ): Either[String, EmailMessage] =
    callout.email match {
      case Some(emailAddress) =>
        Right(
          EmailMessage(
            To = ToDef(
              Address = emailAddress,
              SubscriberKey = emailAddress,
              ContactAttributes = ContactAttributesDef(
                SubscriberAttributes = SubscriberAttributesDef(
                  subscriber_id = paymentFailureInformation.subscriptionName,
                  product = paymentFailureInformation.product,
                  payment_method = callout.paymentMethodType,
                  card_type = callout.creditCardType,
                  card_expiry_date = callout.creditCardExpirationMonth + "/" + callout.creditCardExpirationYear,
                  first_name = callout.firstName,
                  last_name = callout.lastName,
                  primaryKey = InvoiceId(callout.invoiceId),
                  serviceStartDate = serviceDateFormat(paymentFailureInformation.serviceStartDate),
                  serviceEndDate = serviceDateFormat(paymentFailureInformation.serviceEndDate),
                ),
              ),
            ),
            DataExtensionName = sendId.id,
            SfContactId = callout.sfContactId,
          ),
        )
      case None =>
        Left(
          s"Cannot create email message: no email address associated with accountId: ${callout.accountId} and sfContactId: ${callout.sfContactId}",
        )
    }

  def serviceDateFormat(d: LocalDate) = d.format(DateTimeFormatter.ofPattern("dd MMMM yyyy"))

}
