package com.gu.productmove.endpoint.updateamount

import cats.data.NonEmptyList
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import zio.{IO, ZIO}

object ZIOExtension {

  def asSingle[A](list: List[A], itemDescription: String): IO[ErrorResponse, A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          InternalServerError(
            s"Subscription can't be updated as we didn't have a single $itemDescription: ${wrongNumber.length}: $wrongNumber",
          ),
        )
    }

  def asNonEmptyList[A](list: List[A], itemDescription: String): IO[ErrorResponse, NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(InternalServerError(s"Subscription can't be updated as the $itemDescription is empty"))
    }

}
