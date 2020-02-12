package com.gu.delivery_records_api

import java.time.LocalDate

case class SFApiDeliveryRecord(
  Id: String,
  Delivery_Date__c: Option[LocalDate],
  Delivery_Address__c: Option[String],
  Address_Line_1__c: Option[String],
  Address_Line_2__c: Option[String],
  Address_Line_3__c: Option[String],
  Address_Town__c: Option[String],
  Address_Country__c: Option[String],
  Address_Postcode__c: Option[String],
  Delivery_Instructions__c: Option[String],
  Has_Holiday_Stop__c: Option[Boolean],
  Case__r: Option[SFApiDeliveryProblemCase],
  Credit_Amount__c: Option[Double],
  Is_Actioned__c: Boolean,
  Invoice_Date__c: Option[LocalDate]
)
