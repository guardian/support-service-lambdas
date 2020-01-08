package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.Config
import com.softwaremill.sttp.HttpURLConnectionBackend
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[Option[LocalDate], List[ZuoraCreditAddResult]] {
  /**
   * @param processDateOverride
   *             The date for which relevant holiday stop requests will be processed.
   *             This is to facilitate testing.
   *             In normal use it will be missing and a default value will apply instead.
   */
  override def handle(processDateOverride: Option[LocalDate], context: Context): Either[Throwable, List[ZuoraCreditAddResult]] = {
    Config(GetFromS3.fetchString) match {
      case Left(msg) =>
        Left(new RuntimeException(s"Config failure: $msg"))

      case Right(config) =>
        val results = Processor.processAllProducts(config, processDateOverride, HttpURLConnectionBackend(), GetFromS3.fetchString)
        results.foreach(result => ProcessResult.log(result))
        results.flatMap(_.overallFailure.toList) match {
          case Nil =>
            val (_, successfulZuoraResponses) = results.flatMap(_.creditResults).separate
            Right(successfulZuoraResponses)
          case failures =>
            Left(new RuntimeException(failures.map(_.reason).mkString("; ")))

        }
    }
  }
}
