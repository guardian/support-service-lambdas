package com.gu.util.zuora

import okhttp3.{Request, Response}
import play.api.libs.functional.syntax._
import play.api.libs.json.{JsPath, Reads}

case class ZuoraDeps(response: Request => Response, config: ZuoraRestConfig)

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String
)

object ZuoraRestConfig {

  implicit val zuoraConfigReads: Reads[ZuoraRestConfig] = (
    (JsPath \ "baseUrl").read[String] and
    (JsPath \ "username").read[String] and
    (JsPath \ "password").read[String]
  )(ZuoraRestConfig.apply _)

}
