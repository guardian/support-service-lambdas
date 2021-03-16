package com.gu.soft_opt_in_consent_setter

object AssociatedSFSubscription {
  case class RootInterface(
    totalSize: Int,
    done: Boolean,
    records: Seq[Record]
  )

  case class Record(
    Product__c: String,
    IdentityID__c: String
  )

}
