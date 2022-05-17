package com.gu.productmove.zuora.rest

import sttp.client3.basicRequest
import sttp.model.Uri
import zio.json.JsonDecoder
import zio.{IO, ZIO, ZLayer}

object ZuoraGetLive {
  val layer: ZLayer[ZuoraClient, Nothing, ZuoraGet] =
    ZLayer.fromZIO(ZIO.service[ZuoraClient].map(zuoraClient => new ZuoraGet:
      override def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T] =
        for {
          response <- zuoraClient.send(basicRequest.get(relativeUrl))
          parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[T](response))
        } yield parsedBody
    ))
}

trait ZuoraGet {

  def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T]

}
object ZuoraGet {

  def get[T: JsonDecoder](relativeUrl: Uri): ZIO[ZuoraGet, String, T] =
    ZIO.serviceWithZIO[ZuoraGet](_.get[T](relativeUrl))

}
