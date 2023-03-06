package com.gu.zuora.subscription

sealed trait ApiFailure {
  val reason: String
}
case class ZuoraApiFailure(reason: String) extends ApiFailure
case class SalesforceApiFailure(reason: String) extends ApiFailure
case class OverallFailure(reason: String) extends ApiFailure

/** FIXME: Current implementation is not atomic, so how should we handle inconsistent state cleanup? FIXME: Improve
  * error logging so we know which of the scenarios below is the case.
  */
object OverallFailure {
  def apply(
      zuoraFailures: List[ZuoraApiFailure],
      salesforceResult: SalesforceApiResponse[_],
  ): Option[OverallFailure] = {

    val zuoraError = zuoraFailures.headOption.map(e => OverallFailure(e.reason))
    val salesforceError = salesforceResult.left.toOption.map(e => OverallFailure(e.reason))
    salesforceError orElse zuoraError
  }
}
