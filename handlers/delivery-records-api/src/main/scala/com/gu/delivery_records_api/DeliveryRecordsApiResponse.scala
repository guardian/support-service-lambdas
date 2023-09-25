package com.gu.delivery_records_api

case class DeliveryRecordsApiResponse(
    results: List[DeliveryRecord],
    deliveryProblemMap: Map[String, DeliveryProblemCase],
    contactPhoneNumbers: SFApiContactPhoneNumbers,
)
