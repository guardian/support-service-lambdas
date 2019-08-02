package com.gu.holidaystopprocessor

sealed trait HolidayError {
  val reason: String
}
case class ZuoraHolidayWriteError(reason: String) extends HolidayError
case class SalesforceHolidayWriteError(reason: String) extends HolidayError
case class OverallFailure(reason: String) extends HolidayError

/**
 * FIXME: Current implementation is not atomic, so how should we handle inconsistent state cleanup?
 * FIXME: Improve error logging so we know which of the scenarios below is the case.
 *
 * The error scenarios we need to consider are
 *   - Some writes to Zuora fail (but others succeed), and Salesforce write succeed
 *   - Some writes to Zuora fail (but others succeed), and Salesforce write fails
 *   - All writes to Zuora fail
 */
object OverallFailure {
  def apply(
    zuoraFailures: List[ZuoraHolidayWriteError],
    salesforceResult: Either[SalesforceHolidayWriteError, Unit]
  ): Option[OverallFailure] = {

    val zuoraError = zuoraFailures.headOption.map(e => OverallFailure(e.reason))
    val salesforceError = salesforceResult.left.toOption.map(e => OverallFailure(e.reason))
    salesforceError orElse zuoraError
  }
}
