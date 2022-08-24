package com.gu.productmove.zuora.rest

import sttp.client3.basicRequest
import sttp.model.Uri
import zio.json.*
import zio.{IO, ULayer, URLayer, ZIO, ZLayer}

object ZuoraGetLive:
  val layer: URLayer[ZuoraClient, ZuoraGet] = ZLayer.fromFunction(ZuoraGetLive(_))

private class ZuoraGetLive(zuoraClient: ZuoraClient) extends ZuoraGet :
  override def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T] =
    for {
      response <- zuoraClient.send(basicRequest.get(relativeUrl))
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[T](response))
    } yield parsedBody

  override def post[Request: JsonEncoder, Response: JsonDecoder](relativeUrl: Uri, input: Request): IO[String, Response] =
    for {
      response <- zuoraClient.send(basicRequest.contentType("application/json").body(input.toJson).post(relativeUrl))
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[Response](response))
    } yield parsedBody

  override def put[Request: JsonEncoder, Response: JsonDecoder](relativeUrl: Uri, input: Request): IO[String, Response] =
    for {
      response <- zuoraClient.send(basicRequest.contentType("application/json").body(input.toJson).put(relativeUrl))
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[Response](response))
    } yield parsedBody

trait ZuoraGet:
  def get[T: JsonDecoder](relativeUrl: Uri): IO[String, T]
  def post[Request: JsonEncoder, Response: JsonDecoder](relativeUrl: Uri, input: Request): IO[String, Response]
  def put[Request: JsonEncoder, Response: JsonDecoder](relativeUrl: Uri, input: Request): IO[String, Response]

