package com.gu.fulfilmentdates

import java.time.{DayOfWeek, LocalDate}
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesFileLocation
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import io.circe.KeyDecoder
import io.circe.generic.auto._
import io.circe.parser._

import scala.util.Try
trait FulfilmentDatesFetcher {
  def getFulfilmentDates(
      zuoraProductType: ZuoraProductType,
      date: LocalDate,
  ): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]]
}

case class FulfilmentDatesFetcherError(message: String)

object FulfilmentDatesFetcher {
  private implicit val keyDecoder: KeyDecoder[DayOfWeek] = new KeyDecoder[DayOfWeek] {
    override def apply(key: String): Option[DayOfWeek] = {
      Try(DayOfWeek.from(FulfilmentDates.dayOfWeekFormat.parse(key))).toOption
    }
  }

  def apply(fetchFromS3: S3Location => Try[String], stage: Stage): FulfilmentDatesFetcher = new FulfilmentDatesFetcher {
    def getFulfilmentDates(
        zuoraProductType: ZuoraProductType,
        date: LocalDate,
    ): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]] = {
      val fileLocation = fulfilmentDatesFileLocation(stage, zuoraProductType, date)
      for {
        fileContents <- getFulfilmentsFileFromS3(fetchFromS3, fileLocation)
        parsedDates <- parseFulfilmentDatesFile(fileContents, fileLocation)
      } yield parsedDates
    }
  }

  private def parseFulfilmentDatesFile(
      fileContents: String,
      s3Location: S3Location,
  ): Either[FulfilmentDatesFetcherError, Map[DayOfWeek, FulfilmentDates]] = {
    decode[Map[DayOfWeek, FulfilmentDates]](fileContents).left.map(error =>
      FulfilmentDatesFetcherError(
        s"Failed to parse fulfilment dates file $s3Location with content $fileContents: $error",
      ),
    )
  }

  private def getFulfilmentsFileFromS3(
      fetchFromS3: S3Location => Try[String],
      s3Location: S3Location,
  ): Either[FulfilmentDatesFetcherError, String] = {
    fetchFromS3(s3Location).toEither.left.map(t => FulfilmentDatesFetcherError(t.getMessage()))
  }
}
