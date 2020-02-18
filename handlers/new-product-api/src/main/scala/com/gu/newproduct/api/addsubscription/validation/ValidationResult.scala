package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Conversion._

sealed trait ValidationResult[+A] {
  def toDisjunction: Either[Failed, A]
  def flatMap[B](f: A => ValidationResult[B]): ValidationResult[B] =
    toDisjunction.flatMap(f.andThen(_.toDisjunction)).toValidationResult

  def map[B](f: A => B): ValidationResult[B] =
    toDisjunction.map(f).toValidationResult
  def mapFailure(f: String => String): ValidationResult[A] =
    toDisjunction.left.map(old => Failed(f(old.message))).toValidationResult
}

case class Passed[A](value: A) extends ValidationResult[A] {
  override def toDisjunction: Either[Failed, A] = Right(value)
}

case class Failed(message: String) extends ValidationResult[Nothing] {
  override def toDisjunction: Either[Failed, Nothing] = Left(this)
}

object Conversion {

  implicit class UnderlyingOps[A](theEither: Either[Failed, A]) {

    def toValidationResult: ValidationResult[A] =
      theEither match {
        case Right(success) => Passed(success)
        case Left(failure) => failure
      }
  }

}
