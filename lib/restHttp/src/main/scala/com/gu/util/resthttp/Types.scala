package com.gu.util.resthttp
import cats.Monad
import cats.implicits._

// FIXME: STOP!
object Types {

  implicit def eitherMonad[Err]: Monad[Either[Err, ?]] =
    new Monad[Either[Err, ?]] {
      def flatMap[A, B](fa: Either[Err, A])(f: A => Either[Err, B]): Either[Err, B] =
        fa.flatMap(f)

      def pure[A](x: A): Either[Err, A] = Right(x)

      @annotation.tailrec
      def tailRecM[A, B](a: A)(f: A => Either[Err, Either[A, B]]): Either[Err, B] =
        f(a) match {
          case Right(Right(b)) => Right(b)
          case Right(Left(a)) => tailRecM(a)(f)
          case l @ Left(_) => l.rightCast[B] // Cast the right type parameter to avoid allocation
        }
    }

  sealed trait ClientFailure extends ClientFailableOp[Nothing] {
    override def toDisjunction: Either[ClientFailure, Nothing] = Left(this)

    val isFailure = true

    def message: String
  }

  case class NotFound(message: String) extends ClientFailure

  case class GenericError(message: String) extends ClientFailure

  case class CustomError(message: String) extends ClientFailure

  case class PaymentError(message: String) extends ClientFailure

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

      override def tailRecM[A, B](a: A)(f: A => ClientFailableOp[Either[A, B]]): ClientFailableOp[B] = ???

      override def pure[A](a: A): ClientFailableOp[A] = ClientSuccess(a)

    }
  }

}
