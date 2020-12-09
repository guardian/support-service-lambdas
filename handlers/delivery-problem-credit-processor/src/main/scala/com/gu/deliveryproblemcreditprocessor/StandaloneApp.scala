package com.gu.deliveryproblemcreditprocessor

import com.gu.deliveryproblemcreditprocessor.DeliveryCreditProcessor.processAllProducts
import zio._

// For functional testing locally
object StandaloneApp extends App {

  def run(args: List[String]): URIO[ZEnv, ExitCode] =
    processAllProducts
      .tapError(e => console.putStrLn(e.toString))
      .exitCode
}
