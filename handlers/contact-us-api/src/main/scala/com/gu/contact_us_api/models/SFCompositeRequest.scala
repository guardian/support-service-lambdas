package com.gu.contact_us_api.models

import io.circe.{Encoder, Json}
import io.circe.syntax._

case class SFCompositeRequest(requestItems: List[SFRequestItem])

object SFCompositeRequest {
  implicit val encodeSFCompositeRequest: Encoder[SFCompositeRequest] = new Encoder[SFCompositeRequest] {
    final def apply(a: SFCompositeRequest): Json = {
      val itemList: List[Json] = a.requestItems.map(i => i.asJson)

      Json.obj(
        ("allOrNone", Json.fromBoolean(true)),
        ("compositeRequest", Json.arr(itemList: _*)),
      )
    }
  }
}
