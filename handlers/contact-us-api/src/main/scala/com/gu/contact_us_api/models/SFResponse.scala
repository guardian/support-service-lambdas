package com.gu.contact_us_api.models

import cats.syntax.functor._
import io.circe.generic.auto._
import io.circe.Decoder

sealed trait SFResponse {
  val httpStatusCode: Int
  val referenceId: String
  def isSuccess: Boolean
  def errorsAsString: Option[String]
}

case class SFErrorResponse(httpStatusCode: Int, referenceId: String, body: List[SFErrorDetails]) extends SFResponse {
  override def isSuccess: Boolean = false
  override def errorsAsString: Option[String] = Some(
    s"Status code for $referenceId: $httpStatusCode " + body.map(i => i.asString).mkString(", "),
  )
}

case class SFSuccessResponse(httpStatusCode: Int, referenceId: String) extends SFResponse {
  override def isSuccess: Boolean = true
  override def errorsAsString: Option[String] = None
}

object SFResponse {
  implicit val decodeSFResponse: Decoder[SFResponse] = {
    List[Decoder[SFResponse]](
      Decoder[SFErrorResponse].widen,
      Decoder[SFSuccessResponse].widen,
    ).reduceLeft(_ or _)
  }
}
