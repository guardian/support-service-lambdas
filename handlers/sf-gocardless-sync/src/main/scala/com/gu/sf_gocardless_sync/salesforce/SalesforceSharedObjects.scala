package com.gu.sf_gocardless_sync.salesforce

import ai.x.play.json.Jsonx

object SalesforceSharedObjects {

  case class MandateSfId(value: String) extends AnyVal
  implicit val formatMandateSfID = Jsonx.formatInline[MandateSfId]

  case class MandateUpdateSfId(value: String) extends AnyVal
  implicit val formatMandateUpdateSfId = Jsonx.formatInline[MandateUpdateSfId]

  case class UpdateHappenedAt(value: String) extends AnyVal
  implicit val formatUpdateHappenedAt = Jsonx.formatInline[UpdateHappenedAt]

}
