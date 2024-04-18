package com.gu.productmove.endpoint.updateamount

import cats.data.NonEmptyList
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import zio.{IO, Task, ZIO}

object ZIOExtension {

  def asSingle[A](list: List[A], itemDescription: String): Task[A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          new Throwable(
            s"Subscription can't be updated as we didn't have a single $itemDescription: ${wrongNumber.length}: $wrongNumber",
          ),
        )
    }

  def asNonEmptyList[A](list: List[A], itemDescription: String): Task[NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(new Throwable(s"Subscription can't be updated as the $itemDescription is empty"))
    }

}
