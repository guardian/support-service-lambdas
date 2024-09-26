package com.gu.util.resthttp
import cats.Monad

import scala.annotation.tailrec

object Types {
  sealed trait ClientFailure extends ClientFailableOp[Nothing] {
    override def toDisjunction: Either[ClientFailure, Nothing] = Left(this)

    val isFailure = true

    def message: String

    def body: String
  }

  sealed trait Error4xx extends ClientFailure

  case class NotFound(message: String, body: String) extends Error4xx
  case class BadRequest(message: String, body: String) extends Error4xx
  case class Unauthorised(message: String, body: String) extends Error4xx

  // this case refers to deserialisation errors or issues with headers etc
  case class GenericError(message: String, body: String = "") extends ClientFailure

  case class PaymentError(message: String) extends ClientFailure {
    def body: String = ""
  }

  case class ClientSuccess[A](value: A) extends ClientFailableOp[A] {
    val isFailure = false
    override def toDisjunction: Either[ClientFailure, A] = Right(value)
  }

  sealed trait ClientFailableOp[+A] {

    def isFailure: Boolean

    def toDisjunction: Either[ClientFailure, A]

    def flatMap[B](f: A => ClientFailableOp[B]): ClientFailableOp[B] =
      toDisjunction.flatMap(f.andThen(_.toDisjunction)).toClientFailableOp

    def map[B](f: A => B): ClientFailableOp[B] =
      toDisjunction.map(f).toClientFailableOp

    def mapFailure(f: ClientFailure => ClientFailure): ClientFailableOp[A] =
      toDisjunction.left.map(f).toClientFailableOp

  }

  implicit class UnderlyingOps[A](theEither: Either[ClientFailure, A]) {

    def toClientFailableOp: ClientFailableOp[A] =
      theEither match {
        case Right(success) => ClientSuccess(success)
        case Left(failure) => failure
      }

  }

  implicit class BoolToOption(val self: Boolean) extends AnyVal {
    def toOption[A](value: => A): Option[A] =
      if (self) Some(value) else None
  }

  implicit val clientFailableOpM: Monad[ClientFailableOp] = {

    type ClientDisjunction[A] = Either[ClientFailure, A]

    val disjunctionMonad = implicitly[Monad[ClientDisjunction]]

    new Monad[ClientFailableOp] {

      override def flatMap[A, B](fa: ClientFailableOp[A])(f: A => ClientFailableOp[B]): ClientFailableOp[B] = {

        val originalAsDisjunction: ClientDisjunction[A] =
          fa.toDisjunction

        val functionWithResultAsDisjunction: A => ClientDisjunction[B] =
          f.andThen(_.toDisjunction)

        val boundAsDisjunction: ClientDisjunction[B] =
          disjunctionMonad.flatMap(originalAsDisjunction)(functionWithResultAsDisjunction)

        boundAsDisjunction.toClientFailableOp
      }

      @tailrec
      override def tailRecM[A, B](a: A)(f: A => ClientFailableOp[Either[A, B]]): ClientFailableOp[B] = {
        f(a) match {
          case ClientSuccess(Left(newA)) => this.tailRecM(newA)(f)
          case ClientSuccess(Right(newB)) => ClientSuccess[B](newB)
          case failed: ClientFailure => failed
        }
      }

      override def pure[A](a: A): ClientFailableOp[A] = ClientSuccess(a)

    }
  }

}
