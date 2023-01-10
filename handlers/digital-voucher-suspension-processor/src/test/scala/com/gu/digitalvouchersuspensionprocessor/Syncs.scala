package com.gu.digitalvouchersuspensionprocessor

import cats.effect.{ExitCase, Sync}
import cats.Id

/** The tests use the cats
  */
object Syncs {

  implicit val idSync: Sync[Id] = new Sync[Id] {
    def suspend[A](thunk: => Id[A]): Id[A] = thunk
    def bracketCase[A, B](acquire: Id[A])(use: A => Id[B])(release: (A, ExitCase[Throwable]) => Id[Unit]): Id[B] = use(
      acquire,
    )
    def flatMap[A, B](fa: Id[A])(f: A => Id[B]): Id[B] = f(fa)
    def tailRecM[A, B](a: A)(f: A => Id[Either[A, B]]): Id[B] = ???
    def raiseError[A](e: Throwable): Id[A] = ???
    def handleErrorWith[A](fa: Id[A])(f: Throwable => Id[A]): Id[A] = fa
    def pure[A](x: A): Id[A] = x
  }
}
