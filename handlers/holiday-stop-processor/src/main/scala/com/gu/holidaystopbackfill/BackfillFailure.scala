package com.gu.holidaystopbackfill

sealed trait BackfillFailure {
  def reason: String
}

case class ConfigFailure(reason: String) extends BackfillFailure

case class ZuoraFetchFailure(reason: String) extends BackfillFailure

case class SalesforceFetchFailure(reason: String) extends BackfillFailure

case class SalesforceUpdateFailure(reason: String) extends BackfillFailure
