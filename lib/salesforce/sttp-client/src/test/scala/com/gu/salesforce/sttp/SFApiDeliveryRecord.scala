package com.gu.salesforce.sttp

import java.time.LocalDate

case class SFApiDeliveryRecord(
  Delivery_Date__c: Option[LocalDate],
  Delivery_Address__c: Option[String],
  Delivery_Instructions__c: Option[String],
  Has_Holiday_Stop__c: Option[Boolean]
)
