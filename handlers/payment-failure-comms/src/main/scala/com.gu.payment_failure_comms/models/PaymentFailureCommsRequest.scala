package com.gu.payment_failure_comms.models

case class PaymentFailureCommsRequest(identityId: String, event: String, properties: EventProperties)
