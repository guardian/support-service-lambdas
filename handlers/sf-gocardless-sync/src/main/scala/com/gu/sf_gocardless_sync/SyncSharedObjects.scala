package com.gu.sf_gocardless_sync

import play.api.libs.json.Json

object SyncSharedObjects {

  case class GoCardlessMandateID(value: String) extends AnyVal
  implicit val formatMandateID = Json.valueFormat[GoCardlessMandateID]

  case class Reference(value: String) extends AnyVal
  implicit val formatReference = Json.valueFormat[Reference]

  case class GoCardlessMandateEventID(value: String) extends AnyVal
  implicit val formatMandateEventID = Json.valueFormat[GoCardlessMandateEventID]

  case class MandateCreatedAt(value: String) extends AnyVal
  implicit val formatMandateCreatedAt = Json.valueFormat[MandateCreatedAt]

  case class BankName(value: String) extends AnyVal
  implicit val formatBankName = Json.valueFormat[BankName]

  case class BankAccountNumberEnding(value: String) extends AnyVal
  implicit val formatBankAccountNumberEnding = Json.valueFormat[BankAccountNumberEnding]

  case class Status(value: String) extends AnyVal
  implicit val formatStatus = Json.valueFormat[Status]

  case class Cause(value: String) extends AnyVal
  implicit val formatCause = Json.valueFormat[Cause]

  case class Description(value: String) extends AnyVal
  implicit val formatDescription = Json.valueFormat[Description]

  case class ReasonCode(value: String) extends AnyVal
  implicit val formatReasonCode = Json.valueFormat[ReasonCode]

}
