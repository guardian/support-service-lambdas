package com.gu.deliveryproblemcreditprocessor

import com.gu.deliveryproblemcreditprocessor.DeliveryCreditProcessor.processAllProducts
import zio.console.putStrLn
import zio.{App, ZEnv, ZIO}

// For functional testing locally
object StandaloneApp extends App {

  def run(args: List[String]): ZIO[ZEnv, Nothing, Int] = {
    for {
      results <- processAllProducts
      _ <- ZIO.foreach(results)(result => putStrLn(result.toString))
    } yield {
      ()
    }
  }.fold(_ => 1, _ => 0)
}
