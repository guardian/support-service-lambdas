package com.gu.productmove.zuora.rest

import sttp.client3.basicRequest
import sttp.model.Uri
import zio.json.JsonDecoder
import zio.{IO, ULayer, URLayer, ZIO, ZLayer}

object ZuoraGetLive:
  val layer: URLayer[ZuoraClient, ZuoraGet] = ZLayer.fromFunction(ZuoraGetLive(_))

private class ZuoraGetLive(zuoraClient: ZuoraClient) extends ZuoraGet :
  override def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T] =
    for {
      response <- zuoraClient.send(basicRequest.get(relativeUrl))
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[T](response))
    } yield parsedBody

trait ZuoraGet:
  def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T]

