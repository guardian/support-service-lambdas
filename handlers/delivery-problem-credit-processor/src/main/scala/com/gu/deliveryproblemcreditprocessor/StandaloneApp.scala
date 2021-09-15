package com.gu.deliveryproblemcreditprocessor

import org.asynchttpclient.{AsyncHttpClient, DefaultAsyncHttpClient}
import zio.{ZEnv, ZIO, console}

import scala.util.{Failure, Success, Try}

// For functional testing locally
object StandaloneApp extends App {

  private val runtime = zio.Runtime.default

  def program(httpClient: AsyncHttpClient): ZIO[ZEnv, Throwable, List[DeliveryCreditResult]] = {
    new DeliveryCreditProcessor(httpClient).processAllProducts
      .tapError(e => console.putStrLn(e.toString))
  }

  val httpClient = new DefaultAsyncHttpClient()
  Try(runtime.unsafeRun {
    program(httpClient).either
  }) match {
    case Failure(exception) =>
      httpClient.close()
      throw exception
    case Success(_) =>
      httpClient.close()
  }
}
