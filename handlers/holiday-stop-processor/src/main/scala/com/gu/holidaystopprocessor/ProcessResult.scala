package com.gu.holidaystopprocessor

import com.gu.holiday_stops.{CreditRequest, OverallFailure, ZuoraApiFailure}
import com.typesafe.scalalogging.LazyLogging

case class ProcessResult(
  creditsToApply: List[CreditRequest],
  creditResults: List[Either[ZuoraApiFailure, ZuoraCreditAddResult]],
  resultsToExport: List[ZuoraCreditAddResult],
  overallFailure: Option[OverallFailure]
)

object ProcessResult extends LazyLogging {
  def log(processResult: ProcessResult): Unit = {
    import processResult._
    logger.info(s"${creditsToApply.size} holiday stops to apply:")
    resultsToExport collect {
      case result: ZuoraHolidayCreditAddResult =>
        warnOnCreditDifference(result)
    }
    creditsToApply.foreach(request => logger.info(request.toString))
    creditResults foreach {
      case Left(failure) => logger.error(failure.reason)
      case Right(response) => logger.info(response.toString)
    }
  }

  // FIXME: Temporary logging to confirm the problem of incorrect credits is fixed. Change to hard crash once we are happy it should be impossible scenario.
  private def warnOnCreditDifference(zuoraHolidayWriteResult: ZuoraHolidayCreditAddResult): Unit = {
    import cats.implicits._
    (zuoraHolidayWriteResult.estimatedPrice, Some(zuoraHolidayWriteResult.actualPrice)).mapN { (estimated, actual) =>
      if (estimated.value != actual.value)
        logger.warn(
          s"""Difference between actual and estimated credit
           |in sub ${zuoraHolidayWriteResult.subscriptionName.value},
           |stop ${zuoraHolidayWriteResult.requestId.value}. Investigate ASAP!
           |estimated.value=${estimated.value}; actual.value=${actual.value}""".stripMargin
        )
      // throw new RuntimeException(s"Difference between actual and estimated credit. Investigate ASAP! estimated.value=${estimated.value}; actual.value=${actual.value}")
    }
  }
}
