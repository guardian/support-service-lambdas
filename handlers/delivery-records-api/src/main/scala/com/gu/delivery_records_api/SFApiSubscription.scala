package com.gu.delivery_records_api

import com.gu.salesforce.RecordsWrapperCaseClass

case class SFApiSubscription(
    Buyer__r: SFApiContactPhoneNumbers,
    Delivery_Records__r: Option[RecordsWrapperCaseClass[SFApiDeliveryRecord]],
)
