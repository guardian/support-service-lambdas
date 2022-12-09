package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItem

// This is mapped to Braze Template API Identifier by membership-workflow
// https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/services/BrazeTemplateLookupService.scala#L13
// FIXME: Yet another useless indirection.
object SalesforceToBrazeCampaignMapping {
  def apply(salesforceBatchItem: SalesforceBatchItem): String =
    (salesforceBatchItem.object_name, salesforceBatchItem.payload.email_stage) match {
      case ("Card_Expiry__c", _) => "expired-card" // SV_CCExpiry
      case ("DD_Mandate_Failure__c", "MF1") => "dd-mandate-failure-1" // SV_DirectDebit1
      case ("DD_Mandate_Failure__c", "MF2") => "dd-mandate-failure-2" // SV_DirectDebit2
      case ("DD_Mandate_Failure__c", "MF3") => "dd-mandate-failure-3" // SV_DirectDebit3
      case ("DD_Mandate_Failure__c", "MF4") => "dd-mandate-failure-4" // SV_DirectDebit4
      case ("DD_Mandate_Failure__c", "MF5") => "dd-mandate-failure-5" // SV_DirectDebit5
      case ("DD_Mandate_Failure__c", "MF6") => "dd-mandate-failure-6" // SV_DirectDebit6
      case ("DD_Mandate_Failure__c", "MF7") => "dd-mandate-failure-7" // SV_DirectDebit7
      case ("DD_Mandate_Failure__c", "MF8") => "dd-mandate-failure-8" // SV_DirectDebit8
      case ("Holiday_Stop_Request__c", "create") => "SV_HolidayStopConfirmation"
      case ("Holiday_Stop_Request__c", "amend") => "SV_HolidayStopAmend"
      case ("Holiday_Stop_Request__c", "withdraw") => "SV_HolidayStopWithdrawal"
      case ("Digital_Voucher__c", "create") => "SV_SC_BarcodeAccess_Day0_plus_15"
      case ("Digital_Voucher__c", "replace") => "SV_SC_LostItem"
      case ("Case", "Delivery issues") => "SV_DeliveryProblemConfirmation"
      case ("Contact", "Delivery address change") => "SV_DeliveryAddressChangeConfirmation"
      case (objectName, emailStage) =>
        throw new RuntimeException(
          s"Unrecognized (object_name, email_stage) = ($objectName, $emailStage). Please fix SF trigger.",
        )
    }
}
