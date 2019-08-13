package com.gu.holiday_stops

case class ZuoraStatusResponse(
  success: Boolean,
  subscriptionId: Option[String],
  reasons: Option[List[Reason]]
)

case class Reason(code: Long, message: String)
