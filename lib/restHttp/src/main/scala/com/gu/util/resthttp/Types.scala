package com.gu.util.resthttp

import scalaz.{-\/, Monad, \/, \/-}

object Types {

  sealed trait ClientFailure extends ClientFailableOp[Nothing] {
    override def toDisjunction: ClientFailure \/ Nothing = -\/(this)

    val isFailure = true

    def message: String
  }

  case class NotFound(message: String) extends ClientFailure

  case class GenericError(message: String) extends ClientFailure

  case class PaymentError(message: String) extends ClientFailure

  case class ClientSuccess[A](value: A) extends ClientFailableOp[A] {
    val isFailure = false
    override def toDisjunction: ClientFailure \/ A = \/-(value)
  }

  sealed trait ClientFailableOp[+A] {

    def isFailure: Boolean

    def toDisjunction: scalaz.\/[ClientFailure, A]

    def flatMap[B](f: A => ClientFailableOp[B]): ClientFailableOp[B] =
      toDisjunction.flatMap(f.andThen(_.toDisjunction)).toClientFailableOp

    def map[B](f: A => B): ClientFailableOp[B] =
      toDisjunction.map(f).toClientFailableOp

    def mapFailure(f: ClientFailure => ClientFailure): ClientFailableOp[A] =
      toDisjunction.leftMap(f).toClientFailableOp

  }

  implicit class UnderlyingOps[A](theEither: scalaz.\/[ClientFailure, A]) {

    def toClientFailableOp: ClientFailableOp[A] =
      theEither match {
        case scalaz.\/-(success) => ClientSuccess(success)
        case scalaz.-\/(failure) => failure
      }

  }

  implicit val clientFailableOpM: Monad[ClientFailableOp] = {

    type ClientDisjunction[A] = scalaz.\/[ClientFailure, A]

    val disjunctionMonad = implicitly[Monad[ClientDisjunction]]

    new Monad[ClientFailableOp] {

      override def bind[A, B](fa: ClientFailableOp[A])(f: A => ClientFailableOp[B]): ClientFailableOp[B] = {

        val originalAsDisjunction: ClientDisjunction[A] =
          fa.toDisjunction

        val functionWithResultAsDisjunction: A => ClientDisjunction[B] =
          f.andThen(_.toDisjunction)

        val boundAsDisjunction: ClientDisjunction[B] =
          disjunctionMonad.bind(originalAsDisjunction)(functionWithResultAsDisjunction)

        boundAsDisjunction.toClientFailableOp
      }

      override def point[A](a: => A): ClientFailableOp[A] = ClientSuccess(a)

    }
  }

}
