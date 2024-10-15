package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.email.EmailData.paymentMethodFields
import com.gu.newproduct.api.addsubscription.email.{GuardianWeeklyEmailData, TierThreeEmailData}
import play.api.libs.json.{Json, Writes}

import java.time.format.DateTimeFormatter

object TierThreeEmailDataSerialiser {
  implicit val writes: Writes[TierThreeEmailData] = (data: TierThreeEmailData) => {
    val fields: Map[String, String] = TierThreeFields.serialise(data)
    Json.toJson(fields)
  }
}

object TierThreeFields {
  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def serialise(data: TierThreeEmailData): Map[String, String] = Map(
    "EmailAddress" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
    "first_name" -> data.contacts.soldTo.firstName.value,
    "last_name" -> data.contacts.soldTo.lastName.value,
    "delivery_address_line_1" -> data.contacts.soldTo.address.address1.map(_.value).getOrElse(""),
    "delivery_address_line_2" -> data.contacts.soldTo.address.address2.map(_.value).getOrElse(""),
    "delivery_address_town" -> data.contacts.soldTo.address.city.map(_.value).getOrElse(""),
    "delivery_postcode" -> data.contacts.soldTo.address.postcode.map(_.value).getOrElse(""),
    "delivery_country" -> data.contacts.soldTo.address.country.name,
    "ZuoraSubscriberId" -> data.subscriptionName.value,
    "subscriber_id" -> data.subscriptionName.value,
    "date_of_first_paper" -> data.firstPaymentDate.format(firstPaymentDateFormat),
    "date_of_first_payment" -> data.firstPaymentDate.format(firstPaymentDateFormat),
    "subscription_rate" -> data.discountMessage
      .map(_.value)
      .getOrElse(data.plan.paymentPlans.get(data.currency).map(_.description).getOrElse("")),
  ) ++ paymentMethodFields(data.paymentMethod)

}
