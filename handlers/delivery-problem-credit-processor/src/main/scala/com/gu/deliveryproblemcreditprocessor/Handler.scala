package com.gu.deliveryproblemcreditprocessor

import com.amazonaws.services.lambda.runtime.{Context, LambdaRuntime}
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import java.lang.{System => JavaSystem}

import java.io.{OutputStream, PrintStream}

object Handler extends Lambda[None.type, List[DeliveryCreditResult]] {

  private val runtime = zio.Runtime.default

  val printStream = new PrintStream(new OutputStream() {
    override def write(b: Int): Unit =
      LambdaRuntime.getLogger.log(Array(b.toByte))

    override def write(b: Array[Byte]): Unit =
      LambdaRuntime.getLogger.log(b)

    override def write(b: Array[Byte], off: Int, len: Int): Unit =
      LambdaRuntime.getLogger.log(b.slice(off, off + len))
  })

  override protected def handle(
      unused: None.type,
      context: Context,
  ): Either[Throwable, List[DeliveryCreditResult]] =
    runtime.unsafeRun {
      JavaSystem.setOut(printStream)
      JavaSystem.setErr(printStream)
      val program = DeliveryCreditProcessor.processAllProducts
      program.either
    }
}
