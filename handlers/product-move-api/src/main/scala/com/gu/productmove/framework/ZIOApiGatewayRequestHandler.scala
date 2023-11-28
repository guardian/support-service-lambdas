package com.gu.productmove.framework

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.*
import com.gu.productmove
import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.serverless.aws.lambda.*
import sttp.tapir.serverless.aws.ziolambda.{AwsZioServerInterpreter, ZioLambdaHandler}
import sttp.tapir.swagger.bundle.SwaggerInterpreter
import sttp.tapir.ztapir.RIOMonadError
import zio.{IO, Runtime, Task, ZIO, *}

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}
import java.nio.charset.StandardCharsets
import scala.jdk.CollectionConverters.*

abstract class ZIOApiGatewayRequestHandler(val server: List[ServerEndpoint[Any, Task]]) extends RequestStreamHandler {

  private val allEndpoints: List[ServerEndpoint[Any, Task]] = {
    val swaggerEndpoints = SwaggerInterpreter().fromServerEndpoints[Task](server, "My App", "1.0")
    server ++ swaggerEndpoints
  }

  given RIOMonadError[Any] = new RIOMonadError[Any]

  private val handler = ZioLambdaHandler.default[Any](allEndpoints)

  given Decoder[AwsRequest] = deriveDecoder
  given Encoder[AwsResponse] = deriveEncoder

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(input: InputStream, output: OutputStream, context: Context): Unit = {
    val runtime = Runtime.default
    Unsafe.unsafe { implicit unsafe => // TODO log the input and output stream
      runtime.unsafe
        .run(
          (for {
            allBytes <- ZIO.attempt(input.readAllBytes())
            _ = input.close()
            str = new String(allBytes, StandardCharsets.UTF_8)
            _ <- ZIO.log("input: " + str)
            loggedOutputStream = new ByteArrayOutputStream()
            result <- handler.process[AwsRequest](new ByteArrayInputStream(allBytes), loggedOutputStream)
            _ <- ZIO.log("output: " + new String(loggedOutputStream.toByteArray, StandardCharsets.UTF_8))
            _ = output.write(loggedOutputStream.toByteArray)
            _ = output.close()
          } yield result)
            .provideLayer(Runtime.removeDefaultLoggers) // TODO these logger things still needed?
            .provideLayer(Runtime.addLogger(new AwsLambdaLogger(context.getLogger))),
        )
        .getOrThrowFiberFailure()
    }
  }

}

class AwsLambdaLogger(lambdaLogger: LambdaLogger) extends ZLogger[String, Unit] {
  override def apply(
      trace: Trace,
      fiberId: FiberId,
      logLevel: LogLevel,
      message: () => String,
      cause: Cause[Any],
      context: FiberRefs,
      spans: List[LogSpan],
      annotations: Map[String, String],
  ): Unit = lambdaLogger.log(message())
}
