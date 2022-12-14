package com.gu.sf_billing_account_remover

object BillingAccountsRecords {
  case class Records(
      Id: String,
      Zuora__Account__c: String,
      Zuora__External_Id__c: String,
      GDPR_Removal_Attempts__c: Int,
      ErrorMessage: Option[String] = None,
      ErrorCode: Option[String] = None,
  )
}
