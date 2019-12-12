package com.gu.supporter.fulfilment

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.PutObjectResult
import com.gu.fulfilmentdates.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

class FulfilmentDateCalculator extends Lambda[Option[String], String] with LazyLogging {

  override def handle(todayOverride: Option[String], context: Context) = {

    val today = inputToDate(todayOverride)

    implicit val englishBankHolidays: BankHolidays = GovUkBankHolidays().`england-and-wales`

    val datesForYesterdayThroughToAFortnight = (-1 to 14).map(_.toLong).map(today.plusDays)

    datesForYesterdayThroughToAFortnight.foreach { date =>

      writeToBucket(GuardianWeekly, date, GuardianWeeklyFulfilmentDates(date).asJson.spaces2)

      writeToBucket(NewspaperHomeDelivery, date, HomeDeliveryFulfilmentDates(date).asJson.spaces2)

    }

    Right(s"Generated Guardian Weekly and Home Delivery dates for $datesForYesterdayThroughToAFortnight")
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  private def writeToBucket(product: ZuoraProductType, date: LocalDate, content: String): PutObjectResult = {
    val today = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val filename = s"${product.name}/${today}_${product.name}.json"
    BucketHelpers.write(filename, content)
  }

}

