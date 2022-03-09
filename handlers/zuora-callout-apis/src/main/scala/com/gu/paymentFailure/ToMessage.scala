package com.gu.paymentFailure

import java.text.DecimalFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.autoCancel.AutoCancelCallout
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.util.email._

import scala.math.BigDecimal.decimal

object ToMessage {

  def apply(paymentFailureCallout: PaymentFailureCallout, paymentFailureInformation: PaymentFailureInformation, sendId: EmailId): Either[String, EmailMessage] =
    paymentFailureCallout.email match {
      case None => Left(s"Cannot create email message: no email address associated with accountId: ${paymentFailureCallout.accountId} and sfContactId: ${paymentFailureCallout.sfContactId}")
      case Some(emailAddress) => Right(EmailMessage(
        To = ToDef(
          Address = emailAddress,
          SubscriberKey = emailAddress,
          ContactAttributes = ContactAttributesDef(
            SubscriberAttributes = SubscriberAttributesDef(
              subscriber_id = paymentFailureInformation.subscriptionName,
              product = paymentFailureInformation.product,
              payment_method = paymentFailureCallout.paymentMethodType,
              card_type = paymentFailureCallout.creditCardType,
              card_expiry_date = paymentFailureCallout.creditCardExpirationMonth + "/" + paymentFailureCallout.creditCardExpirationYear,
              first_name = paymentFailureCallout.firstName,
              last_name = paymentFailureCallout.lastName,
              primaryKey = PaymentId(paymentFailureCallout.paymentId),
              serviceStartDate = serviceDateFormat(paymentFailureInformation.serviceStartDate),
              serviceEndDate = serviceDateFormat(paymentFailureInformation.serviceEndDate),
              billing_address1 = paymentFailureCallout.billingDetails.address1,
              billing_address2 = paymentFailureCallout.billingDetails.address2,
              billing_postcode = paymentFailureCallout.billingDetails.postCode,
              billing_city = paymentFailureCallout.billingDetails.city,
              billing_state = paymentFailureCallout.billingDetails.state,
              billing_country = paymentFailureCallout.billingDetails.country,
              title = paymentFailureCallout.title
            )
          )
        ),
        DataExtensionName = sendId.id,
        SfContactId = paymentFailureCallout.sfContactId
      ))
    }

  def apply(callout: AutoCancelCallout, paymentFailureInformation: PaymentFailureInformation, sendId: EmailId): Either[String, EmailMessage] =
    callout.email match {
      case Some(emailAddress) => Right(EmailMessage(
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
              serviceEndDate = serviceDateFormat(paymentFailureInformation.serviceEndDate)
            )
          )
        ),
        DataExtensionName = sendId.id,
        SfContactId = callout.sfContactId
      ))
      case None => Left(s"Cannot create email message: no email address associated with accountId: ${callout.accountId} and sfContactId: ${callout.sfContactId}")
    }

  val currencySymbol = Map("GBP" -> "£", "AUD" -> "$", "EUR" -> "€", "USD" -> "$", "CAD" -> "$", "NZD" -> "$")

  val decimalFormat = new DecimalFormat("###,###.00")

  def serviceDateFormat(d: LocalDate) = d.format(DateTimeFormatter.ofPattern("dd MMMM yyyy"))

}
