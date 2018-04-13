package com.gu.util.zuora

import play.api.libs.functional.syntax._
import play.api.libs.json.{JsPath, Reads}

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
