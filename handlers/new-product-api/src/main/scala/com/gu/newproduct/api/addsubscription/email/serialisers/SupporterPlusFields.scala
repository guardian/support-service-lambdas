package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.EmailData._
import com.gu.newproduct.api.addsubscription.email.SupporterPlusEmailData
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import play.api.libs.json.{Json, Writes}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object SupporterPlusEmailDataSerialiser {
  implicit val writes: Writes[SupporterPlusEmailData] = (data: SupporterPlusEmailData) => {
    val fields: Map[String, String] = SupporterPlusFields.serialise(data)
    Json.toJson(fields)
  }
}

object SupporterPlusFields {

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def productId(plan: Plan) = plan.id match {
    case AnnualSupporterPlus => "annual-supporter-plus"
    case MonthlySupporterPlus => "monthly-supporter-plus"
    case other => other.name
  }

  def serialise(data: SupporterPlusEmailData): Map[String, String] = Map(
    "subscriber_id" -> data.subscriptionName.value,
    "amount" -> data.amountMinorUnits.formatted,
    "currency" -> data.currency.glyph,
    "name" -> data.contacts.billTo.firstName.value,
    "subscription_rate" -> data.discountMessage.map(_.value).getOrElse(""),
    "first_payment_date" -> data.firstPaymentDate.format(firstPaymentDateFormat),
  ) ++ paymentMethodFields(data.paymentMethod)

}
