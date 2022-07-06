package com.gu.productmove

import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.logging
import sttp.client3.logging.{Logger, LoggingBackend}
import zio.{Task, ZEnvironment, ZIO}

object SttpClientLive {

  val layer = HttpClientZioBackend.layer().map(_.update(underlying =>
    LoggingBackend(
      delegate = underlying,
      logger = new SttpLogger(),
      logResponseBody = true,
      logResponseHeaders = true,
      logRequestBody = true,
      logRequestHeaders = true
    )))

  private class SttpLogger extends Logger[Task] {

    override def apply(level: logging.LogLevel, message: => String): Task[Unit] = ZIO.log("STTP Backend: " + message)

    override def apply(level: logging.LogLevel, message: => String, t: Throwable): Task[Unit] = ZIO.log("STTP Backend: " + message + t.toString)

  }

}
