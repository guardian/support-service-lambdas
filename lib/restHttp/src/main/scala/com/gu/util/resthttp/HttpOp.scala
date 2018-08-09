package com.gu.util.resthttp

import com.gu.util.resthttp.RestRequestMaker.httpIsSuccessful
import com.gu.util.resthttp.Types.ClientFailableOp
import okhttp3.{Request, Response}

case class HttpOp[PARAM](
  inputToRequest: PARAM => Request,
  effect: Request => Response,
  responseToOutput: Response => ClientFailableOp[Unit]
) {

  def runRequest(in: PARAM): ClientFailableOp[Unit] =
    responseToOutput(effect(inputToRequest(in)))

  def beforeRequest[UPDATEDPARAM](function: UPDATEDPARAM => PARAM): HttpOp[UPDATEDPARAM] =
    HttpOp(function.andThen(inputToRequest), effect, responseToOutput)

}

object HttpOp {

  def apply(getResponse: Request => Response): HttpOp[Request] =
    HttpOp[Request](identity, getResponse, httpIsSuccessful)

  // convenience, untuples for you
  implicit class HttpOpTuple2Ops[A1, A2](httpOpTuple2: HttpOp[(A1, A2)]) {
    def runRequestUntupled: (A1, A2) => ClientFailableOp[Unit] = Function.untupled(httpOpTuple2.runRequest)
  }

  // convenience, tuples for you
  implicit class HttpOpOps[IN](httpOpTuple2: HttpOp[IN]) {
    def beforeRequestTupled[A1, A2](function2: (A1, A2) => IN): HttpOp[(A1, A2)] =
      httpOpTuple2.beforeRequest(function2.tupled)
  }

}
