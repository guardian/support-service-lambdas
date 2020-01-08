package com.gu.delivery_records_api

case class SFApiDeliveryProblemCase(
  Id: String,
  Subject: Option[String],
  Description: Option[String],
  Case_Closure_Reason__c: Option[String] // this is actually the case sub-category (e.g. 'No Delivery', 'Damaged Delivery' etc.)
)
