package com.gu.identityBackfill.salesforce

import com.gu.util.resthttp.RestRequestMaker.httpIsSuccessful
import com.gu.util.resthttp.Types.ClientFailableOp
import okhttp3.{Request, Response}

case class HttpOp[IN](
  inputToRequest: IN => Request,
  effect: Request => Response,
  responseToOutput: Response => ClientFailableOp[Unit]
) {

  def run(in: IN): ClientFailableOp[Unit] =
    responseToOutput(effect(inputToRequest(in)))

  def prepend[NEWIN](function: NEWIN => IN): HttpOp[NEWIN] =
    HttpOp(function.andThen(inputToRequest), effect, responseToOutput)

}

object HttpOp {

  def apply(getResponse: Request => Response): HttpOp[Request] =
    HttpOp[Request](identity, getResponse, httpIsSuccessful)

  // convenience, untuples for you
  implicit class HttpOpTuple2Ops[A1, A2](httpOpTuple2: HttpOp[(A1, A2)]) {
    def run2(a1: A1, a2: A2): ClientFailableOp[Unit] = httpOpTuple2.run((a1, a2))
  }

  // convenience, tuples for you
  implicit class HttpOpOps[IN](httpOpTuple2: HttpOp[IN]) {
    import httpOpTuple2._

    def prepend2[A1, A2](prepend: (A1, A2) => IN): HttpOp[(A1, A2)] =
      HttpOp(prepend.tupled.andThen(inputToRequest), effect, responseToOutput)

  }

}
