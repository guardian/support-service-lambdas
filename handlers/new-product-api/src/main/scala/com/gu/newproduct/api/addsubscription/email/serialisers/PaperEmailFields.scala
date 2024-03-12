package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.email.EmailData.paymentMethodFields
import com.gu.newproduct.api.addsubscription.email.{DeliveryAgentDetails, PaperEmailData}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.productcatalog.PlanId._
import play.api.libs.json.{Json, Writes}

import java.time.format.DateTimeFormatter

object PaperEmailDataSerialiser {
  implicit val writes: Writes[PaperEmailData] = (data: PaperEmailData) =>
    Json.toJson(PaperEmailFields.serialise(data))
}

object PaperEmailFields {

  private val digipackPlans =
    List(VoucherWeekendPlus, VoucherEveryDayPlus, VoucherSixDayPlus, VoucherSundayPlus, VoucherSaturdayPlus)
  private val dateformat = DateTimeFormatter.ofPattern("d MMMM yyyy")

  def serialise(data: PaperEmailData): Map[String, String] =
    List(
      basicFields(data),
      paymentMethodFields(data.paymentMethod),
      addressFields(data.contacts),
      deliveryAgentFields(data.deliveryAgentDetails)
    ).flatten.toMap

  private def basicFields(data: PaperEmailData) = {
    Map(
      "ZuoraSubscriberId" -> data.subscriptionName.value,
      "SubscriberKey" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
      "subscriber_id" -> data.subscriptionName.value,
      "IncludesDigipack" -> digipackPlans.contains(data.plan.id).toString,
      "date_of_first_paper" -> data.firstPaperDate.format(dateformat),
      "date_of_first_payment" -> data.firstPaymentDate.format(dateformat),
      "package" -> data.plan.description.value,
      "subscription_rate" -> data.discountMessage.map(_.value).getOrElse(data.plan.paymentPlans.get(data.currency).map(_.description).getOrElse("")),
    )
  }

  def deliveryAgentFields(maybeDeliveryAgentDetails: Option[DeliveryAgentDetails]): Map[String, String] =
    maybeDeliveryAgentDetails match {
      case Some(deliveryAgentDetails) => Map(
        "delivery_agent_name" -> deliveryAgentDetails.agentName,
        "delivery_agent_telephone" -> deliveryAgentDetails.telephone,
        "delivery_agent_email" -> deliveryAgentDetails.email,
        "delivery_agent_address1" -> deliveryAgentDetails.address1,
        "delivery_agent_address2" -> deliveryAgentDetails.address2,
        "delivery_agent_town" -> deliveryAgentDetails.town,
        "delivery_agent_county" -> deliveryAgentDetails.county,
        "delivery_agent_postcode" -> deliveryAgentDetails.postcode,
      )
      case None => Map.empty
    }

  def addressFields(contacts: Contacts) = {
    val soldTo = contacts.soldTo
    val billTo = contacts.billTo
    val soldToAddress = soldTo.address
    val billToAddress = billTo.address
    Map(
      "title" -> soldTo.title.map(_.value).getOrElse(""),
      "first_name" -> soldTo.firstName.value,
      "last_name" -> soldTo.lastName.value,
      "EmailAddress" -> billTo.email.map(_.value).getOrElse(""),
      "billing_address_line_1" -> billToAddress.address1.map(_.value).getOrElse(""),
      "billing_address_line_2" -> billToAddress.address2.map(_.value).getOrElse(""),
      "billing_address_town" -> billToAddress.city.map(_.value).getOrElse(""),
      "billing_county" -> billToAddress.state.map(_.value).getOrElse(""),
      "billing_postcode" -> billToAddress.postcode.map(_.value).getOrElse(""),
      "billing_country" -> billToAddress.country.map(_.name).getOrElse(""),
      "delivery_address_line_1" -> soldToAddress.address1.map(_.value).getOrElse(""),
      "delivery_address_line_2" -> soldToAddress.address2.map(_.value).getOrElse(""),
      "delivery_address_town" -> soldToAddress.city.map(_.value).getOrElse(""),
      "delivery_county" -> soldToAddress.state.map(_.value).getOrElse(""),
      "delivery_postcode" -> soldToAddress.postcode.map(_.value).getOrElse(""),
      "delivery_country" -> soldToAddress.country.name,
    )
  }
}
