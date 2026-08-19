package com.gu.productmove.framework

import com.amazonaws.services.lambda.runtime.Context
import zio.{FiberRef, Task, UIO, Unsafe}

import scala.concurrent.duration.{DurationInt, FiniteDuration}

/** Makes the Lambda context available to services without adding it to every Tapir endpoint signature.
  */
object LambdaRemainingTime {
  private val remainingTimeInMillis = Unsafe.unsafe { implicit unsafe => FiberRef.unsafe.make[() => Int](() => 0) }

  def withContext[A](context: Context)(effect: Task[A]): Task[A] =
    withRemainingTime(() => context.getRemainingTimeInMillis)(effect)

  def withRemainingTime[A](getRemainingTimeInMillis: () => Int)(effect: Task[A]): Task[A] =
    remainingTimeInMillis.locally(getRemainingTimeInMillis)(effect)

  def remaining: UIO[FiniteDuration] = remainingTimeInMillis.get.map(_.apply().millis)
}
