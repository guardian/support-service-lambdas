package com.gu.supporter.fulfilment

import java.time.{DayOfWeek, LocalDate}
import DayOfWeek._

object HomeDeliveryFulfilmentDates {
  def apply(today: LocalDate, product: HomeDeliveryProduct): FulfilmentDates = {
    FulfilmentDates(
      today,
      acquisitionsStartDate = effectiveDayByProduct(product, today),
      deliveryAddressChangeEffectiveDate = effectiveDayByProduct(product, today),
      holidayStopFirstAvailableDate = effectiveDayByProduct(product, today),
      // finalFulfilmentFileGenerationDate = today, // TODO
      nextAffectablePublicationDateOnFrontCover = effectiveDayByProduct(product, today)
    )
  }
}

sealed trait HomeDeliveryProduct
case object Everyday extends HomeDeliveryProduct
case object Sixday extends HomeDeliveryProduct
case object Weekend extends HomeDeliveryProduct
case object Saturday extends HomeDeliveryProduct
case object Sunday extends HomeDeliveryProduct

// Acq, Holiday & Address Change on Day
// https://docs.google.com/spreadsheets/d/1aTQZPeCQHPbzcytS9Tdaci2ENI3eZBaIbSufeegWPe4/
object effectiveDayByProduct {
  def apply(product: HomeDeliveryProduct, today: LocalDate): LocalDate = {
    val day = today.getDayOfWeek

    (product, day) match {
      case (Everyday, MONDAY) => today plusDays 3
      case (Everyday, TUESDAY) => today plusDays 3
      case (Everyday, WEDNESDAY) => today plusDays 3
      case (Everyday, THURSDAY) => today plusDays 3
      case (Everyday, FRIDAY) => today plusDays 4
      case (Everyday, SATURDAY) => today plusDays 4
      case (Everyday, SUNDAY) => today plusDays 3

      case (Sixday, MONDAY) => today plusDays 3
      case (Sixday, TUESDAY) => today plusDays 3
      case (Sixday, WEDNESDAY) => today plusDays 3
      case (Sixday, THURSDAY) => today plusDays 4
      case (Sixday, FRIDAY) => today plusDays 4
      case (Sixday, SATURDAY) => today plusDays 4
      case (Sixday, SUNDAY) => today plusDays 3

      case (Weekend, MONDAY) => today plusDays 5
      case (Weekend, TUESDAY) => today plusDays 4
      case (Weekend, WEDNESDAY) => today plusDays 3
      case (Weekend, THURSDAY) => today plusDays 9
      case (Weekend, FRIDAY) => today plusDays 8
      case (Weekend, SATURDAY) => today plusDays 7
      case (Weekend, SUNDAY) => today plusDays 6

      case (Saturday, MONDAY) => today plusDays 5
      case (Saturday, TUESDAY) => today plusDays 4
      case (Saturday, WEDNESDAY) => today plusDays 3
      case (Saturday, THURSDAY) => today plusDays 9
      case (Saturday, FRIDAY) => today plusDays 8
      case (Saturday, SATURDAY) => today plusDays 7
      case (Saturday, SUNDAY) => today plusDays 6

      case (Sunday, MONDAY) => today plusDays 6
      case (Sunday, TUESDAY) => today plusDays 5
      case (Sunday, WEDNESDAY) => today plusDays 4
      case (Sunday, THURSDAY) => today plusDays 3
      case (Sunday, FRIDAY) => today plusDays 9
      case (Sunday, SATURDAY) => today plusDays 8
      case (Sunday, SUNDAY) => today plusDays 7
    }
  }
}

