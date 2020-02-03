package com.gu.deliveryproblemcreditprocessor

import com.gu.deliveryproblemcreditprocessor.DeliveryCreditProcessor.processAllProducts
import zio.{App, ZEnv, ZIO, console}

// For functional testing locally
object StandaloneApp extends App {

  def run(args: List[String]): ZIO[ZEnv, Nothing, Int] =
    processAllProducts
      .tapError(e => console.putStrLn(e.toString))
      .fold(_ => 1, _ => 0)
}
