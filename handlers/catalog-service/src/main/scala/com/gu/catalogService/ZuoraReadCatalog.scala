package com.gu.catalogService

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.JsValue

object ZuoraReadCatalog {

  def apply(requests: Requests): ClientFailableOp[JsValue] =
    requests.get[JsValue]("catalog/products?pageSize=40")

}
