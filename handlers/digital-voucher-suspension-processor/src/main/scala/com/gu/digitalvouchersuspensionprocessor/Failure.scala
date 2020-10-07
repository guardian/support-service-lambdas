package com.gu.digitalvouchersuspensionprocessor

sealed trait Failure {
  def reason: String
}

case class ConfigFailure(reason: String) extends Failure

case class SalesforceFetchFailure(reason: String) extends Failure

case class SalesforceWriteFailure(reason: String) extends Failure

case class DigitalVoucherSuspendFailure(reason: String) extends Failure
