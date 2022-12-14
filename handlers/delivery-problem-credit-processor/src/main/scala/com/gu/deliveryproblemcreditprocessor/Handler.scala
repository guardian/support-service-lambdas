package com.gu.deliveryproblemcreditprocessor

import com.amazonaws.services.lambda.runtime.Context
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[None.type, List[DeliveryCreditResult]] {

  private val runtime = zio.Runtime.default

  override protected def handle(
      unused: None.type,
      context: Context,
  ): Either[Throwable, List[DeliveryCreditResult]] =
    runtime.unsafeRun {
      val program = DeliveryCreditProcessor.processAllProducts
      program.either
    }
}
