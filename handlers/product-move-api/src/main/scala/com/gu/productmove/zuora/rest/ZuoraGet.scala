package com.gu.productmove.zuora.rest

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck
import sttp.client3.basicRequest
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, ULayer, URLayer, ZIO, ZLayer}

object ZuoraGetLive {
  val layer: URLayer[ZuoraClient, ZuoraGet] = ZLayer.fromFunction(ZuoraGetLive(_))
}

class ZuoraGetLive(zuoraClient: ZuoraClient) extends ZuoraGet {

  override def get[Response: JsonDecoder](
      relativeUrl: Uri,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response] =
    for {
      response <- zuoraClient.send(basicRequest.get(relativeUrl))
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[Response](response, zuoraSuccessCheck))
    } yield parsedBody

  override def post[Request: JsonEncoder, Response: JsonDecoder](
      relativeUrl: Uri,
      input: Request,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response] =
    for {
      _ <- ZIO.log(s"Sending POST to $relativeUrl with body ${input.toJson}")
      response <- zuoraClient.send(basicRequest.contentType("application/json").body(input.toJson).post(relativeUrl))
      _ <- ZIO.log(s"Response is $response")
      parsedBody <- ZIO.fromEither(ZuoraRestBody.parseIfSuccessful[Response](response, zuoraSuccessCheck))
    } yield parsedBody

  override def put[Request: JsonEncoder, Response: JsonDecoder](
      relativeUrl: Uri,
      input: Request,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response] =
    for {
      response <- zuoraClient.send(basicRequest.contentType("application/json").body(input.toJson).put(relativeUrl))
      parsedBody <- ZIO.fromEither(
        ZuoraRestBody.parseIfSuccessful[Response](response, zuoraSuccessCheck),
      )
    } yield parsedBody
}

trait ZuoraGet {
  def get[Response: JsonDecoder](
      relativeUrl: Uri,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response]
  def post[Request: JsonEncoder, Response: JsonDecoder](
      relativeUrl: Uri,
      input: Request,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response]
  def put[Request: JsonEncoder, Response: JsonDecoder](
      relativeUrl: Uri,
      input: Request,
      zuoraSuccessCheck: ZuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
  ): Task[Response]
}
