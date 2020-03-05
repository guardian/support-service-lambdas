package com.gu.digital_voucher_api

sealed trait DigitalVoucherServiceError

case class DigitalVoucherServiceFailure(message: String) extends DigitalVoucherServiceError

case class InvalidArgumentException(message: String) extends DigitalVoucherServiceError

case class ImovoOperationFailedException(message: String) extends DigitalVoucherServiceError
