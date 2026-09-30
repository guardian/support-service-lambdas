package com.gu.soft_opt_in_consent_setter.models

import software.amazon.awssdk.services.dynamodb.model.AttributeValue

import java.time.LocalDate
import scala.util.Try

case class SecondarySubscription(primarySubscriptionName: String, termEndDate: LocalDate) {
  def isActiveOn(date: LocalDate): Boolean = !termEndDate.isBefore(date)
}

object SecondarySubscription {
  def from(
      identityId: String,
      item: java.util.Map[String, AttributeValue],
  ): Option[Either[SoftOptInError, SecondarySubscription]] =
    if (!item.containsKey("primarySubscriptionName")) None
    else {
      val subscriptionName = Option(item.get("primarySubscriptionName")).flatMap(value => Option(value.s()))
      val itemDescription =
        s"identityId $identityId, primarySubscriptionName ${subscriptionName.getOrElse("<missing>")}"

      Some(for {
        name <- subscriptionName.toRight(
          SoftOptInError(
            s"Secondary SupporterProductData item for identityId $identityId has invalid primarySubscriptionName",
          ),
        )
        rawEndDate <- Option(item.get("termEndDate"))
          .flatMap(value => Option(value.s()))
          .toRight(SoftOptInError(s"Secondary SupporterProductData item for $itemDescription has no termEndDate"))
        endDate <- Try(LocalDate.parse(rawEndDate)).toEither.left.map(error =>
          SoftOptInError(s"Secondary SupporterProductData item for $itemDescription has invalid termEndDate", error),
        )
      } yield SecondarySubscription(name, endDate))
    }
}
