package com.gu.productmove

import sttp.capabilities
import sttp.capabilities.zio.ZioStreams
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient}
import sttp.client3.{SttpBackend, logging}
import sttp.client3.logging.{Logger, LoggingBackend}
import zio.{Task, ZIO, ZLayer}

object SttpClientLive {

  val layer: ZLayer[Any, Throwable, SttpClient] = HttpClientZioBackend
    .layer()
    .map(
      _.update(underlying =>
        LoggingBackend(
          delegate = underlying,
          logger = new SttpLogger(),
          logResponseBody = true,
          logResponseHeaders = true,
          logRequestBody = true,
          logRequestHeaders = true,
        ),
      ),
    )

  def impl: Task[SttpBackend[Task, ZioStreams & capabilities.WebSockets]] =
    HttpClientZioBackend()
      .map(underlying =>
        LoggingBackend(
          delegate = underlying,
          logger = new SttpLogger(),
          logResponseBody = true,
          logResponseHeaders = true,
          logRequestBody = true,
          logRequestHeaders = true,
        ),
      )

  private class SttpLogger extends Logger[Task] {

    override def apply(level: logging.LogLevel, message: => String): Task[Unit] =
      ZIO.logDebug("STTP Backend: " + message)

    override def apply(level: logging.LogLevel, message: => String, t: Throwable): Task[Unit] =
      ZIO.logDebug("STTP Backend: " + message + t.toString)

  }

}
