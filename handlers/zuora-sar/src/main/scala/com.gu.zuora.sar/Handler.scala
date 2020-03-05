package com.gu.zuora.sar

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import cats.effect.IO
import circeCodecs._
import io.circe.parser.decode
import io.circe.syntax._

import io.circe.{Decoder, Encoder, Printer}

import scala.io.Source

trait ZuoraHandler[Req, Res] {

  def handle(request: Req, context: Context): IO[Res]

  val jsonPrinter = Printer.spaces2.copy(dropNullValues = true)

  def handleRequest(input: InputStream, output: OutputStream, context: Context)(
    implicit decoder: Decoder[Req],
    encoder: Encoder[Res]): Unit = {
    try {
      val response = for {
        request <- IO.fromEither(
          decode[Req](Source.fromInputStream(input).mkString))
        response <- handle(request, context)
      } yield response
      output.write(response.unsafeRunSync.asJson.pretty(jsonPrinter).getBytes)
    } finally {
      output.close()
    }
  }
}

object Handler {

  def handleSar(input: InputStream, output: OutputStream, context: Context): Unit = {
    val sarLambdaConfig = ConfigLoader.getSarLambdaConfigTemp
    val sarLambda = ZuoraSarHandler(sarLambdaConfig)
    sarLambda.handleRequest(input, output, context)
  }

  def handlePerformSar(input: InputStream,
                       output: OutputStream,
                       context: Context) = {
    val performSarConfig = ConfigLoader.getPerformSarConfigTemp
    val performSarLambda = ZuoraPerformSarHandler(performSarConfig)
    performSarLambda.handleRequest(input, output, context)
  }
}
