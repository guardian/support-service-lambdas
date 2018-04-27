package com.gu.catalogService

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.{JsValue, Json}

object ZuoraReadCatalog {

  def apply(requests: Requests): ClientFailableOp[String] =
    requests.get[JsValue]("catalog/products?pageSize=40").map(Json.stringify)

}
