package com.gu.zuora.sar

object BatonModels {

  sealed trait SarRequest

  case class SarInitiateRequest(subjectEmail: String) extends SarRequest

  case class SarStatusRequest(initiationReference: String) extends SarRequest

  case class PerformSarRequest(
      initiationReference: String,
      subjectEmail: String,
  ) extends SarRequest

  sealed trait BatonTaskStatus

  case object Pending extends BatonTaskStatus

  case object Completed extends BatonTaskStatus

  case object Failed extends BatonTaskStatus

  sealed trait SarResponse

  case class SarInitiateResponse(initiationReference: String) extends SarResponse

  case class SarStatusResponse(
      status: BatonTaskStatus,
      resultLocations: Option[List[String]] = None,
      message: Option[String] = None,
  ) extends SarResponse

  case class PerformSarResponse(
      status: BatonTaskStatus,
      initiationReference: String,
      subjectEmail: String,
      message: Option[String] = None,
  ) extends SarResponse
}
