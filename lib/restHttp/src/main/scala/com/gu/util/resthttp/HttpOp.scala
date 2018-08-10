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

  def setupRequest[UPDATEDPARAM](function: UPDATEDPARAM => PARAM): HttpOp[UPDATEDPARAM] =
    HttpOp(function.andThen(inputToRequest), effect, responseToOutput)

}

object HttpOp {

  def apply(getResponse: Request => Response): HttpOp[Request] =
    HttpOp[Request](identity, getResponse, httpIsSuccessful)

  // convenience, untuples for you
  implicit class HttpOpTuple2Ops[A1, A2](httpOp2Arg: HttpOp[(A1, A2)]) {
    def runRequestMultiArg: (A1, A2) => ClientFailableOp[Unit] = Function.untupled(httpOp2Arg.runRequest)
  }

  // convenience, tuples for you
  implicit class HttpOpOps[IN](httpOp: HttpOp[IN]) {
    def setupRequestMultiArg[A1, A2](function2Arg: (A1, A2) => IN): HttpOp[(A1, A2)] =
      httpOp.setupRequest(function2Arg.tupled)
  }

}
