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
  def log[ResultType <: ZuoraCreditAddResult](processResult: ProcessResult[ResultType]): Unit = {
    import processResult._
    logger.info(s"${creditsToApply.size} credits to apply:")
    resultsToExport foreach (_.logDiscrepancies())
    creditsToApply.foreach(request => logger.info(request.toString))
    creditResults foreach {
      case Left(failure) => logger.error(failure.reason)
      case Right(response) => logger.info(response.toString)
    }
  }
}
