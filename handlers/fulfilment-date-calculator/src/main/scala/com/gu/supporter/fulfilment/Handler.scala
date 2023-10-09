package com.gu.supporter.fulfilment

import java.time.LocalDate
import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesFileLocation
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import software.amazon.awssdk.services.s3.model.PutObjectResponse

object Handler {

  def main(args: Array[String]): Unit =
    println(new Handler().writeDates(LocalDate.now, Stage("DEV")))

}

class Handler extends Lambda[Option[String], String] with LazyLogging {

  override def handle(todayOverride: Option[String]): Either[Throwable, String] = {

    val today = inputToDate(todayOverride)

    Right(writeDates(today, Stage()))
  }

  private def writeDates(today: LocalDate, stage: Stage): String = {
    val englishBankHolidays: BankHolidays = GovUkBankHolidays().`england-and-wales`

    val datesForYesterdayThroughToAFortnight = (-1 to 14).map(_.toLong).map(today.plusDays)

    datesForYesterdayThroughToAFortnight.foreach { date =>
      val writeToBucket = new BucketWrite(date, stage).writeToBucket _

      writeToBucket(GuardianWeekly, GuardianWeeklyFulfilmentDates(date))

      writeToBucket(NewspaperHomeDelivery, HomeDeliveryFulfilmentDates(date, englishBankHolidays))

      writeToBucket(NewspaperVoucherBook, VoucherBookletFulfilmentDates(date))

      writeToBucket(NewspaperDigitalVoucher, DigitalVoucherFulfilmentDates(date))

      writeToBucket(NewspaperNationalDelivery, NationalDeliveryFulfilmentDates(date, englishBankHolidays))
    }

    s"Generated Guardian Weekly, Home Delivery and Voucher dates for $datesForYesterdayThroughToAFortnight"
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  class BucketWrite(date: LocalDate, stage: Stage) {
    def writeToBucket(product: ZuoraProductType, content: Map[String, FulfilmentDates]): PutObjectResponse = {
      BucketHelpers.write(fulfilmentDatesFileLocation(stage, product, date), content.asJson.spaces2)
    }
  }

}
