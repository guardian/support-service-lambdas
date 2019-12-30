package com.gu.fulfilmentdates

import java.time.LocalDate

import cats.implicits._
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesFileLocation
import com.gu.fulfilmentdates.ZuoraProductTypes.ZuoraProductType
import com.gu.util.config.Stage
import io.circe.generic.auto._
import io.circe.parser._

import scala.util.Try
trait FulfilmentDatesFetcher {
  def getFulfilmentDates(
    zuoraProductType: ZuoraProductType,
    date: LocalDate
  ): Either[FulfilmentDatesFetcherError, Map[String, FulfilmentDates]]
}

case class FulfilmentDatesFetcherError(message: String)

object FulfilmentDatesFetcher {
  def apply(fetchFromS3: S3Location => Try[String], stage: Stage): FulfilmentDatesFetcher = new FulfilmentDatesFetcher {
    def getFulfilmentDates(
      zuoraProductType: ZuoraProductType,
      date: LocalDate
    ): Either[FulfilmentDatesFetcherError, Map[String, FulfilmentDates]] = {
      val fileLocation = fulfilmentDatesFileLocation(stage, zuoraProductType, date)
      for {
        fileContents <- getFulfilmentsFileFromS3(fetchFromS3, fileLocation)
        parsedDates <- parseFulfilmentDatesFile(fileContents, fileLocation)
      } yield parsedDates
    }
  }

  private def parseFulfilmentDatesFile(
    fileContents: String,
    s3Location: S3Location
  ): Either[FulfilmentDatesFetcherError, Map[String, FulfilmentDates]] = {
    decode[Map[String, FulfilmentDates]](fileContents)
      .leftMap(error => FulfilmentDatesFetcherError(
        s"Failed to parse fulfilment dates file $s3Location with content $fileContents: $error"
      ))
  }

  private def getFulfilmentsFileFromS3(
    fetchFromS3: S3Location => Try[String],
    s3Location: S3Location
  ): Either[FulfilmentDatesFetcherError, String] = {
    fetchFromS3(s3Location)
      .toEither
      .leftMap(t => FulfilmentDatesFetcherError(t.getMessage()))
  }
}
