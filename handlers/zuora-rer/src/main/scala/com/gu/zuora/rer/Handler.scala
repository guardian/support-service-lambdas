package com.gu.zuora.rer

import java.io.{InputStream, OutputStream}
import cats.effect.IO
import circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestRequestMaker}
import com.gu.zuora.baton.BatonZuoraRestConfig
import com.gu.zuora.baton.BatonZuoraRestConfig._
import io.circe.parser.decode
import io.circe.syntax._
import io.circe.{Decoder, Encoder, Printer}

import scala.io.Source

trait ZuoraHandler[Req, Res] {

  def handle(request: Req): IO[Res]

  val jsonPrinter: Printer = Printer.spaces2.copy(dropNullValues = true)

  def handleRequest(input: InputStream, output: OutputStream)(implicit
      decoder: Decoder[Req],
      encoder: Encoder[Res],
  ): Unit = {
    try {
      val response = for {
        request <- IO.fromEither(
          decode[Req](Source.fromInputStream(input).mkString),
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

  def handleRer(input: InputStream, output: OutputStream): Either[ConfigFailure, Unit] = {
    val loadZuoraRerConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    loadZuoraRerConfig[ZuoraRerConfig].map(config => {
      val rerLambda = ZuoraRerHandler(S3Helper, config)
      rerLambda.handleRequest(input, output)
    })
  }

  def handlePerformRer(
      input: InputStream,
      output: OutputStream,
  ): Either[ConfigFailure, Unit] = {
    val loadZuoraRerConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val loadZuoraRestConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val response = RawEffects.response
    for {
      zuoraRerConfig <- loadZuoraRerConfig[ZuoraRerConfig]
      batonZuoraRestConfig <- loadZuoraRestConfig[BatonZuoraRestConfig]
      requests = ZuoraRestRequestMaker(response, toZuoraRestConfig(batonZuoraRestConfig))
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraRerService(requests, zuoraQuerier)
    } yield {
      val performRerLambda = ZuoraPerformRerHandler(zuoraHelper, S3Helper, zuoraRerConfig)
      performRerLambda.handleRequest(input, output)
    }
  }
}
