package com.gu.util.zuora

import com.gu.util.zuora.ZuoraModels._
import play.api.libs.json._

object ZuoraModels {

  sealed trait ZuoraResponse
  object ZuoraSuccess extends ZuoraResponse

  case class ErrorReason(code: Int, message: String)
  case class ZuoraErrorResponse(reasons: List[ErrorReason]) extends ZuoraResponse

}

object ZuoraReaders {

  implicit val errorReasonReads = Json.reads[ErrorReason]

  implicit val ZuoraResponseReads: Reads[ZuoraResponse] =
    // rest object api seems to use title case for success field....!!
    for {
      success <- (JsPath \ "success").read[Boolean].orElse((JsPath \ "Success").read[Boolean])
      errorReasons <- (JsPath \ "reasons").readNullable[List[ErrorReason]]
    } yield {
      if (success) ZuoraSuccess
      else {
        val reasons = errorReasons.getOrElse(Nil)
        ZuoraErrorResponse(reasons)
      }
    }

}
