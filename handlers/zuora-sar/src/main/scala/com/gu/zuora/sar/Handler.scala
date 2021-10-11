package com.gu.zuora.sar

import java.io.{InputStream, OutputStream}

import cats.effect.IO
import circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import io.circe.parser.decode
import io.circe.syntax._
import io.circe.{Decoder, Encoder, Printer}

import scala.io.Source

trait ZuoraHandler[Req, Res] {

  def handle(request: Req): IO[Res]

  val jsonPrinter: Printer = Printer.spaces2.copy(dropNullValues = true)

  def handleRequest(input: InputStream, output: OutputStream)(
    implicit
    decoder: Decoder[Req],
    encoder: Encoder[Res]
  ): Unit = {
    try {
      val response = for {
        request <- IO.fromEither(
          decode[Req](Source.fromInputStream(input).mkString)
        )
        response <- handle(request)
      } yield response
      output.write(response.unsafeRunSync().asJson.printWith(jsonPrinter).getBytes)
    } finally {
      output.close()
    }
  }
}

object Handler {

  def handleSar(input: InputStream, output: OutputStream): Either[ConfigFailure, Unit] = {
    val loadZuoraSarConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    loadZuoraSarConfig[ZuoraSarConfig].map(config => {
      val sarLambda = ZuoraSarHandler(S3Helper, config)
      sarLambda.handleRequest(input, output)
    })
  }

  def handlePerformSar(
    input: InputStream,
    output: OutputStream
  ): Either[ConfigFailure, Unit] = {
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
      zuoraHelper = ZuoraSarService(requests, downloadRequests, zuoraQuerier)
    } yield {
      val performSarLambda = ZuoraPerformSarHandler(zuoraHelper, S3Helper, zuoraSarConfig)
      performSarLambda.handleRequest(input, output)
    }
  }
}
