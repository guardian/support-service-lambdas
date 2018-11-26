package com.gu.sf_gocardless_sync.salesforce

import ai.x.play.json.Jsonx

object SalesforceSharedObjects {

  case class MandateSfId(value: String) extends AnyVal
  implicit val formatMandateSfID = Jsonx.formatInline[MandateSfId]

  case class MandateEventSfId(value: String) extends AnyVal
  implicit val formatMandateEventSfId = Jsonx.formatInline[MandateEventSfId]

  case class EventHappenedAt(value: String) extends AnyVal
  implicit val formatEventHappenedAt = Jsonx.formatInline[EventHappenedAt]

}
