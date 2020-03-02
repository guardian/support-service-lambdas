package com.gu.digital_voucher_api

case class DigitalVoucherApiException(cause: Exception) extends Exception(cause)

case class DigitalVoucherServiceException(message: String) extends Exception(message)

case class InvalidArgumentException(message: String) extends Exception(message)

case class ImovoClientException(message: String) extends Exception(message)

case class ImovoInvalidResponseException(message: String) extends Exception(message)
