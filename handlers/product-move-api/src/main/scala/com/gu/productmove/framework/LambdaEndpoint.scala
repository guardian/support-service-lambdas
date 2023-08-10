package com.gu.productmove.framework

import zio.*

object LambdaEndpoint {

  private val logLevel: LogLevel = LogLevel.Info
  private val includeInterruptedCause: Boolean = false

  // for testing
  def runTest[OUT](response: IO[Any, OUT]): Unit = {
    val result = Unsafe.unsafe { implicit u =>
      Runtime.default.unsafe.run(
        response
          .tapError { error =>
            ZIO.log(error.toString)
          }
          .provideLayer(Runtime.removeDefaultLoggers)
          .provideLayer(
            Runtime.addLogger(
              new ZLogger[String, Unit]() {
                def apply(
                    trace: Trace,
                    fiberId: FiberId,
                    logLevel: LogLevel,
                    message: () => String,
                    cause: Cause[Any],
                    context: FiberRefs,
                    spans: List[LogSpan],
                    annotations: Map[String, String],
                ): Unit = {
                  val now = java.time.Instant.now().toString
                  println(s"$now: ${message()}")
                }
              }.filterLogLevel(_ >= logLevel),
            ),
          ),
      )

    }
    result match
      case Exit.Success(value) =>
        println(s"program succeeded with: $value")
      case Exit.Failure(cause) =>
        println(s"program failed with error")
        val shortcause = cause.filter {
          case _: Cause.Interrupt => includeInterruptedCause
          case _ => true
        }
        println(shortcause.prettyPrint)
        println("(Cause filtered for clarity)")

    println("for more verbose logging change constants in LambdaEndpoint.scala")
  }

}
