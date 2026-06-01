package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.email.EmailData.paymentMethodFields
import com.gu.newproduct.api.addsubscription.DiscountMessage
import com.gu.newproduct.api.addsubscription.email.GuardianWeeklyEmailData
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import play.api.libs.json.{Json, Writes}

import java.time.format.DateTimeFormatter

object GuardianWeeklyEmailDataSerialiser {
  implicit val writes: Writes[GuardianWeeklyEmailData] = (data: GuardianWeeklyEmailData) => {
    val fields: Map[String, String] = GuardianWeeklyFields.serialise(data)
    Json.toJson(fields)
  }
}

object GuardianWeeklyFields {
  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def serialise(data: GuardianWeeklyEmailData): Map[String, String] = Map(
    "first_name" -> data.contacts.soldTo.firstName.value,
    "last_name" -> data.contacts.soldTo.lastName.value,
    "delivery_address_line_1" -> data.contacts.soldTo.address.address1.map(_.value).getOrElse(""),
    "delivery_address_line_2" -> data.contacts.soldTo.address.address2.map(_.value).getOrElse(""),
    "delivery_address_town" -> data.contacts.soldTo.address.city.map(_.value).getOrElse(""),
    "delivery_postcode" -> data.contacts.soldTo.address.postcode.map(_.value).getOrElse(""),
    "delivery_country" -> data.contacts.soldTo.address.country.name,
    "subscriber_id" -> data.subscriptionName.value,
    "first_payment_date" -> data.firstPaymentDate.format(firstPaymentDateFormat),
    // TODO: should have a second payment date as well
    "subscription_rate" -> data.discountMessage
      .map(_.value)
      .getOrElse(data.plan.paymentPlans.get(data.currency).map(_.description).getOrElse("")),
  ) ++ paymentMethodFields(data.paymentMethod)

}
