package com.gu.zuora.datalake.export

import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda._
import io.github.mkotsur.aws.handler.Lambda
import com.amazonaws.services.lambda.runtime.Context

case class Ping(inputMsg: String)
case class Pong(outputMsg: String)

class StartExportJob extends Lambda[Ping, Pong] {
  override def handle(ping: Ping, context: Context) = Right(Pong(ping.inputMsg.reverse))
}
