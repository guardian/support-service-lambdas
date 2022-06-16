package com.gu.productmove

import zio.{Cause, FiberId, FiberRef, IO, LogLevel, LogSpan, Runtime, Trace, ZIO}

object LambdaEndpoint {

  // for testing
  def runTest[OUT](response: IO[Any, OUT]): Unit = {

    val result = Runtime.default.unsafeRun(
      response
        .tapError { error =>
          ZIO.log(error.toString)
        }
        .provideLayer(Runtime.removeDefaultLoggers)
        .provideLayer(Runtime.addLogger(
          (trace: Trace, fiberId: FiberId, logLevel: LogLevel, message: () => String, cause: Cause[Any], context: Map[FiberRef[_], Any], spans: List[LogSpan], annotations: Map[String, String]) => {
            val now = java.time.Instant.now().toString
            println(s"$now: ${message()}")
          }
        ))
    )

    println("response: " + result)
  }

}
