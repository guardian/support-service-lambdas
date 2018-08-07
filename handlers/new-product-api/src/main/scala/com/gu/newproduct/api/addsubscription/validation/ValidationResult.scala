package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Conversion._
import scalaz.{-\/, \/, \/-}

sealed trait ValidationResult[+A] {
  def isPassed: Boolean
  def toDisjunction: Failed \/ A
  def flatMap[B](f: A => ValidationResult[B]): ValidationResult[B] =
    toDisjunction.flatMap(f.andThen(_.toDisjunction)).toValidationResult

  def map[B](f: A => B): ValidationResult[B] =
    toDisjunction.map(f).toValidationResult
}

case class Passed[A](value: A) extends ValidationResult[A] {
  val isPassed = true
  override def toDisjunction: Failed \/ A = \/-(value)
}

case class Failed(message: String) extends ValidationResult[Nothing] {
  val isPassed = false
  override def toDisjunction: Failed \/ Nothing = -\/(this)
}

object Conversion {

  implicit class UnderlyingOps[A](theEither: Failed \/ A) {

    def toValidationResult: ValidationResult[A] =
      theEither match {
        case scalaz.\/-(success) => Passed(success)
        case scalaz.-\/(failure) => failure
      }
  }

}
