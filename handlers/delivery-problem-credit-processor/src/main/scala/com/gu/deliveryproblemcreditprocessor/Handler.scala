package com.gu.deliveryproblemcreditprocessor

import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import io.github.mkotsur.aws.handler.Lambda

object Handler extends Lambda[Option[LocalDate], List[ZuoraDeliveryCreditAddResult]] {

  override protected def handle(
    i: Option[LocalDate],
    c: Context
  ): Either[Throwable, List[ZuoraHolidayCreditAddResult]] = super
    .handle(i, c)
}
