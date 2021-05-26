package com.gu.soft_opt_in_consent_setter.models

case class SFAssociatedSubResponse(totalSize: Int, done: Boolean, records: Seq[SFAssociatedSubRecord])

case class SFAssociatedSubRecord(Product__c: String, IdentityID__c: String)
