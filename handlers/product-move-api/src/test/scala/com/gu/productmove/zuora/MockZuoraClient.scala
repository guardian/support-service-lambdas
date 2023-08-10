package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.rest.ZuoraClient
import sttp.client3.Request
import zio.{IO, ZIO}

import scala.collection.mutable

class MockZuoraClient(response: String) extends ZuoraClient {

  override def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String] =
    ZIO.succeed(response);
}
