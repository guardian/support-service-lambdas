package com.gu.productmove.framework

import zio.*

object LambdaEndpoint {

  // for testing
  def runTest[OUT](response: IO[Any, OUT]): Unit = {
    val result = Unsafe.unsafe {
      val result = Runtime.default.unsafe.run(
        response
          .tapError { error =>
            ZIO.log(error.toString)
          }
          .provideLayer(Runtime.removeDefaultLoggers)
          .provideLayer(Runtime.addLogger(
            new ZLogger[String, Unit]() {
              def apply(
                trace: Trace,
                fiberId: FiberId,
                logLevel: LogLevel,
                message: () => String,
                cause: Cause[Any],
                context: FiberRefs,
                spans: List[LogSpan],
                annotations: Map[String, String]
              ) = {
                val now = java.time.Instant.now().toString
                println(s"$now: ${message()}")
              }
            }
          ))
      )
      println("result1: " + result)
      result

    }
    println("result2: " + result)
  }

}
