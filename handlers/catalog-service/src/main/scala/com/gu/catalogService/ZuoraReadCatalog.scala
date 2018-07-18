package com.gu.catalogService

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json}

object ZuoraReadCatalog {

  def apply(requests: Requests): ClientFailableOp[String] =
    requests.get[JsValue]("catalog/products?pageSize=40").map(Json.stringify)

}
