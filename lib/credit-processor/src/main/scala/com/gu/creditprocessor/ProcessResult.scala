package com.gu.creditprocessor

import com.gu.zuora.subscription.{CreditRequest, OverallFailure, ZuoraApiFailure}
import com.typesafe.scalalogging.LazyLogging

case class ProcessResult[ResultType <: ZuoraCreditAddResult](
    creditsToApply: List[CreditRequest],
    creditResults: List[Either[ZuoraApiFailure, ResultType]],
    resultsToExport: List[ResultType],
    overallFailure: Option[OverallFailure],
)

object ProcessResult extends LazyLogging {
  def log[ResultType <: ZuoraCreditAddResult](processResults: List[ProcessResult[ResultType]]): Unit = {
    processResults.foreach { pr =>
      logger.info(s"${pr.creditsToApply.size} credits to apply.")
      pr.resultsToExport.foreach(_.logDiscrepancies())
      pr.creditsToApply.foreach(request => logger.info(request.toString))
      pr.creditResults.foreach {
        case Left(failure) => logger.error(failure.reason)
        case Right(response) => logger.info(response.toString)
      }
    }
  }
}
