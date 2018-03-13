package com.gu.util.zuora.internal

import scalaz.{ EitherT, Reader, \/ }

object Types {

  type ClientFailableOp[A] = ClientFail \/ A
  // EitherT's first type parameter is a higher kinded type with single arity
  // unfortunately we want to stack a reader into it, which takes two type parameters
  // we can get around this by using a type lambda to define a new anonymous type constructor with 1 arity (the other parameter comes from outside)
  // it looks messy, but if you squint it works
  // for more reading see https://underscore.io/blog/posts/2016/12/05/type-lambdas.html
  type WithDepsClientFailableOp[I, A] = EitherT[({ type XReader[AA] = Reader[I, AA] })#XReader, ClientFail, A]

  // if we use a reader in our code, this lets us put the type massaging for the for comprehension right to the end of the line
  implicit class WithDepsReaderFailableOpOps[R, T](r: Reader[T, ClientFailableOp[R]]) {

    def toEitherT: WithDepsClientFailableOp[T, R] =
      EitherT.apply[({ type XReader[AA] = Reader[T, AA] })#XReader, ClientFail, R](r)

  }

}

case class ClientFail(statusCode: String, message: String)
object ClientFail extends Logging {

  //  val successfulExecution = ApiResponse("200", new Headers, "Success")
  //  def noActionRequired(reason: String) = ApiResponse("200", new Headers, s"Processing is not required: $reason")
  //
  //  val unauthorized = ApiResponse("401", new Headers, "Credentials are missing or invalid")
  //  val badRequest = ApiResponse("400", new Headers, "Failure to parse JSON successfully")
  def internalServerError(error: String) = ClientFail("500", error)

}