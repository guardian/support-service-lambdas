package com.gu.productmove

import ch.qos.logback.core.OutputStreamAppender
import com.amazonaws.services.lambda.runtime.LambdaRuntime

import java.io.OutputStream

/** this appender makes sure that multi line messages stay together in cloudwatch
  */
class LambdaAppender[E] extends OutputStreamAppender[E] {
  override def start(): Unit = {
    println("Starting appender " + this.getClass.getName)
    setOutputStream(new OutputStream() {

      override def write(b: Int): Unit =
        LambdaRuntime.getLogger.log(Array(b.toByte))

      override def write(b: Array[Byte]): Unit =
        LambdaRuntime.getLogger.log(b)

      override def write(b: Array[Byte], off: Int, len: Int): Unit =
        LambdaRuntime.getLogger.log(b.slice(off, off + len))

      override def flush(): Unit =
        System.out.flush()
    })
    super.start()
  }
}
