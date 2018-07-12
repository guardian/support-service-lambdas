package com.gu.zuora.fake

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, RequestsPUT}
import play.api.libs.json.{JsValue, Json, Reads, Writes}
import scalaz.-\/
import scalaz.syntax.std.either._

object FakeRequestsPut {
  def apply(expectedUrl: String, expectedInput: JsValue, response: JsValue): (() => List[JsValue], RequestsPUT) = {
    var requestsMade: List[JsValue] = List()
    val requestsPUT = new RequestsPUT() {
      override def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP] = {
        val actualJson = Json.toJson(req)
        requestsMade = actualJson :: requestsMade
        if (path == expectedUrl && actualJson == expectedInput)
          response.validate[RESP].asEither.disjunction.leftMap(err => GenericError(err.toString))
        else
          -\/(GenericError("not found a fake response for that"))
      }
    }
    (() => requestsMade, requestsPUT)
  }
}
