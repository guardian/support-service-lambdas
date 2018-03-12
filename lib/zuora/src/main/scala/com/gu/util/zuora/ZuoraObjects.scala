package com.gu.util.zuora

import com.gu.util.zuora.ZuoraModels._
import play.api.libs.json._

object ZuoraModels {

  case class SubscriptionId(id: String) extends AnyVal

  case class ZuoraCommonFields(success: Boolean)

}

object ZuoraReaders {

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  implicit val zuoraCommonFieldsReads: Reads[ZuoraCommonFields] =
    (JsPath \ "success").read[Boolean]
      .orElse((JsPath \ "Success").read[Boolean]) // rest object api seems to use title case....!!
      .map {
        success => ZuoraCommonFields(success)
      }

}
