package com.gu.paymentFailure

import java.text.DecimalFormat

import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.util.exacttarget._
import org.joda.time.LocalDate

import scala.math.BigDecimal.decimal

object ToMessage {

  def apply(paymentFailureCallout: PaymentFailureCallout, paymentFailureInformation: PaymentFailureInformation) = EmailRequest(
    attempt = paymentFailureCallout.failureNumber,
    Message(
      DataExtensionName = dataExtensionNameForAttempt(paymentFailureCallout.failureNumber),
      To = ToDef(
        Address = paymentFailureCallout.email,
        SubscriberKey = paymentFailureCallout.email,
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = paymentFailureCallout.email,
            EmailAddress = paymentFailureCallout.email,
            subscriber_id = paymentFailureInformation.subscriptionName,
            product = paymentFailureInformation.product,
            payment_method = paymentFailureCallout.paymentMethodType,
            card_type = paymentFailureCallout.creditCardType,
            card_expiry_date = paymentFailureCallout.creditCardExpirationMonth + "/" + paymentFailureCallout.creditCardExpirationYear,
            first_name = paymentFailureCallout.firstName,
            last_name = paymentFailureCallout.lastName,
            paymentId = paymentFailureCallout.paymentId,
            price = price(paymentFailureInformation.amount, paymentFailureCallout.currency),
            serviceStartDate = serviceDateFormat(paymentFailureInformation.serviceStartDate),
            serviceEndDate = serviceDateFormat(paymentFailureInformation.serviceEndDate)
          )
        )
      )
    )
  )

  val currencySymbol = Map("GBP" -> "£", "AUD" -> "$", "EUR" -> "€", "USD" -> "$", "CAD" -> "$", "NZD" -> "$")

  val decimalFormat = new DecimalFormat("###,###.00")

  def price(amount: Double, currency: String): String = {
    val formattedAmount: String = decimalFormat.format(decimal(amount))
    val upperCaseCurrency = currency.toUpperCase
    val symbol: String = currencySymbol.get(upperCaseCurrency).getOrElse(upperCaseCurrency)
    symbol + formattedAmount
  }

  def serviceDateFormat(d: LocalDate) = d.toString("dd MMMM yyyy")

  //  //todo see if we need to parse the payment number as an int
  def dataExtensionNameForAttempt: Map[Int, String] = Map(
    1 -> "first-failed-payment-email",
    2 -> "second-failed-payment-email",
    3 -> "third-failed-payment-email"
  )
}
