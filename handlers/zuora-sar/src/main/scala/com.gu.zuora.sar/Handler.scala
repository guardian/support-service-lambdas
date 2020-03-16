package com.gu.zuora.sar

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import cats.effect.IO
import circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.ZuoraHelper
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
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

  def handleSar(input: InputStream, output: OutputStream, context: Context): Either[ConfigFailure, Unit] = {
    val loadZuoraSarConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    loadZuoraSarConfig[ZuoraSarConfig].map(config => {
      val sarLambda = ZuoraSarHandler(config)
      sarLambda.handleRequest(input, output, context)
    })
  }

  def handlePerformSar(input: InputStream,
                       output: OutputStream,
                       context: Context): Either[ConfigFailure, Unit] = {
    val loadZuoraSarConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val loadZuoraRestConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val response = RawEffects.response
    val downloadResponse = RawEffects.downloadResponse
    for {
      zuoraSarConfig <- loadZuoraSarConfig[ZuoraSarConfig]
      zuoraRestConfig <- loadZuoraRestConfig[ZuoraRestConfig]
      requests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      downloadRequests = ZuoraAquaRequestMaker(downloadResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraHelper(requests, downloadRequests, zuoraQuerier)
    } yield {
      val performSarLambda = ZuoraPerformSarHandler(zuoraHelper, zuoraSarConfig)
      performSarLambda.handleRequest(input, output, context)
    }
  }
}
