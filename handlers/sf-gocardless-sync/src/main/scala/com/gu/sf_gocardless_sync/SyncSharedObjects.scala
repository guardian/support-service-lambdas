package com.gu.sf_gocardless_sync

import ai.x.play.json.Jsonx

object SyncSharedObjects {

  case class GoCardlessMandateID(value: String) extends AnyVal
  implicit val formatMandateID = Jsonx.formatInline[GoCardlessMandateID]

  case class Reference(value: String) extends AnyVal
  implicit val formatReference = Jsonx.formatInline[Reference]

  case class GoCardlessMandateEventID(value: String) extends AnyVal
  implicit val formatMandateEventID = Jsonx.formatInline[GoCardlessMandateEventID]

  case class MandateCreatedAt(value: String) extends AnyVal
  implicit val formatMandateCreatedAt = Jsonx.formatInline[MandateCreatedAt]

  case class BankName(value: String) extends AnyVal
  implicit val formatBankName = Jsonx.formatInline[BankName]

  case class BankAccountNumberEnding(value: String) extends AnyVal
  implicit val formatBankAccountNumberEnding = Jsonx.formatInline[BankAccountNumberEnding]

  case class Status(value: String) extends AnyVal
  implicit val formatStatus = Jsonx.formatInline[Status]

  case class Cause(value: String) extends AnyVal
  implicit val formatCause = Jsonx.formatInline[Cause]

  case class Description(value: String) extends AnyVal
  implicit val formatDescription = Jsonx.formatInline[Description]

  case class ReasonCode(value: String) extends AnyVal
  implicit val formatReasonCode = Jsonx.formatInline[ReasonCode]

}
