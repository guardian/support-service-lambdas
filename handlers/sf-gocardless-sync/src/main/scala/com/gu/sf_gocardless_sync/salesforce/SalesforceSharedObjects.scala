package com.gu.sf_gocardless_sync.salesforce

import play.api.libs.json.Json

object SalesforceSharedObjects {

  case class MandateSfId(value: String) extends AnyVal
  implicit val formatMandateSfID = Json.valueFormat[MandateSfId]

  case class MandateEventSfId(value: String) extends AnyVal
  implicit val formatMandateEventSfId = Json.valueFormat[MandateEventSfId]

  case class EventHappenedAt(value: String) extends AnyVal
  implicit val formatEventHappenedAt = Json.valueFormat[EventHappenedAt]

}
