package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesFileLocation
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import software.amazon.awssdk.services.s3.model.PutObjectResponse

class FulfilmentDateCalculator extends Lambda[Option[String], String] with LazyLogging {

  override def handle(todayOverride: Option[String], context: Context) = {

    val today = inputToDate(todayOverride)

    implicit val englishBankHolidays: BankHolidays = GovUkBankHolidays().`england-and-wales`

    val datesForYesterdayThroughToAFortnight = (-1 to 14).map(_.toLong).map(today.plusDays)

    datesForYesterdayThroughToAFortnight.foreach { date =>
      writeToBucket(GuardianWeekly, date, GuardianWeeklyFulfilmentDates(date).asJson.spaces2)

      writeToBucket(NewspaperHomeDelivery, date, HomeDeliveryFulfilmentDates(date).asJson.spaces2)

      writeToBucket(NewspaperVoucherBook, date, VoucherBookletFulfilmentDates(date).asJson.spaces2)

      writeToBucket(NewspaperDigitalVoucher, date, DigitalVoucherFulfilmentDates(date).asJson.spaces2)
    }

    Right(s"Generated Guardian Weekly, Home Delivery and Voucher dates for $datesForYesterdayThroughToAFortnight")
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  private def writeToBucket(product: ZuoraProductType, date: LocalDate, content: String): PutObjectResponse = {
    BucketHelpers.write(fulfilmentDatesFileLocation(Stage(), product, date), content)
  }

}
