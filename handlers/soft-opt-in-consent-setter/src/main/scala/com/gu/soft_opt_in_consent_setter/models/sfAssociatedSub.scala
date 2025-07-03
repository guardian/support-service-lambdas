package com.gu.soft_opt_in_consent_setter.models

import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder

case class SFAssociatedSubResponse(totalSize: Int, done: Boolean, records: Seq[SFAssociatedSubRecord])
object SFAssociatedSubResponse {
  implicit val decoderSFAssociatedSubRecord: Decoder[SFAssociatedSubRecord] = deriveDecoder
  implicit val decoder: Decoder[SFAssociatedSubResponse] = deriveDecoder
}

case class SFAssociatedSubRecord(Product__c: String, IdentityID__c: String)
