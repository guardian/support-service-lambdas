package com.gu.zuora.rer

object BatonModels {

  sealed trait RerRequest

  case class RerInitiateRequest(subjectEmail: String) extends RerRequest

  case class RerStatusRequest(initiationReference: String) extends RerRequest

  case class PerformRerRequest(
    initiationReference: String,
    subjectEmail: String
  ) extends RerRequest

  sealed trait BatonTaskStatus

  case object Pending extends BatonTaskStatus

  case object Completed extends BatonTaskStatus

  case object Failed extends BatonTaskStatus

  sealed trait RerResponse

  case class RerInitiateResponse(initiationReference: String, message: String, status: BatonTaskStatus) extends RerResponse

  case class RerStatusResponse(
    initiationReference: String,
    message: String,
    status: BatonTaskStatus,
    resultLocations: Option[List[String]] = None
  ) extends RerResponse

  case class PerformRerResponse(
    initiationReference: String,
    message: String,
    status: BatonTaskStatus,
    subjectEmail: String
  ) extends RerResponse
}
