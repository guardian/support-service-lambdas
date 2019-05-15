package com.gu.zuoragwholidaystop

case class ZuoraStatusResponse(
  success: Boolean,
  subscriptionId: Option[String],
  reasons: Option[Seq[Reason]]
)

case class Reason(code: Long, message: String)
