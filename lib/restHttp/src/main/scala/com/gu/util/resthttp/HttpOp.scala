package com.gu.util.resthttp

import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Reads}

case class HttpOp[PARAM, RESPONSE](
    inputToRequest: PARAM => Request,
    effect: Request => Response,
    responseToOutput: Response => ClientFailableOp[RESPONSE],
) {

  def map[NEWRESPONSE](toNewResponse: RESPONSE => NEWRESPONSE): HttpOp[PARAM, NEWRESPONSE] =
    HttpOp(inputToRequest, effect, responseToOutput.andThen(_.map(toNewResponse)))

  def flatMap[NEWRESPONSE](toNewResponse: RESPONSE => ClientFailableOp[NEWRESPONSE]): HttpOp[PARAM, NEWRESPONSE] =
    HttpOp(inputToRequest, effect, responseToOutput.andThen(_.flatMap(toNewResponse)))

  def wrapWith[UPDATEDPARAM, NEWRESPONSE](
      both: HttpOpWrapper[UPDATEDPARAM, PARAM, RESPONSE, NEWRESPONSE],
  ): HttpOp[UPDATEDPARAM, NEWRESPONSE] =
    setupRequest(both.fromNewParam).flatMap(both.toNewResponse)

  def runRequest(in: PARAM): ClientFailableOp[RESPONSE] =
    responseToOutput(effect(inputToRequest(in)))

  def runRequestLazy(in: PARAM): LazyClientFailableOp[RESPONSE] =
    LazyClientFailableOp(() => responseToOutput(effect(inputToRequest(in))))

  // this is effectively "contramap" so it is actually setting it up to run the given function before any previously setup functions
  // you can learn more about contravariant functors https://www.google.co.uk/search?q=contravariant+functor
  def setupRequest[UPDATEDPARAM](fromNewParam: UPDATEDPARAM => PARAM): HttpOp[UPDATEDPARAM, RESPONSE] =
    HttpOp(fromNewParam.andThen(inputToRequest), effect, responseToOutput)

}

object HttpOp {

  case class HttpOpWrapper[UPDATEDPARAM, PARAM, RESPONSE, NEWRESPONSE](
      fromNewParam: UPDATEDPARAM => PARAM,
      toNewResponse: RESPONSE => ClientFailableOp[NEWRESPONSE],
  ) {

    def wrapWith[MOREUPDATEDPARAM, MORENEWRESPONSE](
        wrapper: HttpOpWrapper[MOREUPDATEDPARAM, UPDATEDPARAM, NEWRESPONSE, MORENEWRESPONSE],
    ): HttpOpWrapper[MOREUPDATEDPARAM, PARAM, RESPONSE, MORENEWRESPONSE] =
      HttpOpWrapper(wrapper.fromNewParam.andThen(fromNewParam), toNewResponse.andThen(_.flatMap(wrapper.toNewResponse)))

  }

  def apply(getResponse: Request => Response): HttpOp[Request, Response] =
    new HttpOp(identity, getResponse, response => ClientSuccess(response))

  // convenience, untuples for you
  implicit class HttpOpTuple2Ops[A1, A2, RESPONSE](httpOp2Arg: HttpOp[(A1, A2), RESPONSE]) {
    def runRequestMultiArg: (A1, A2) => ClientFailableOp[RESPONSE] = Function.untupled(httpOp2Arg.runRequest)
  }

  // convenience, tuples for you
  implicit class HttpOpOps[IN, RESPONSE](httpOp: HttpOp[IN, RESPONSE]) {
    def setupRequestMultiArg[A1, A2](function2Arg: (A1, A2) => IN): HttpOp[(A1, A2), RESPONSE] =
      httpOp.setupRequest(function2Arg.tupled)
    def setupRequestMultiArg[A1, A2, A3](function2Arg: (A1, A2, A3) => IN): HttpOp[(A1, A2, A3), RESPONSE] =
      httpOp.setupRequest(function2Arg.tupled)
  }

  // convenience, untuples for you
  implicit class HttpOpTuple3Ops[A1, A2, A3, RESPONSE](httpOp3Arg: HttpOp[(A1, A2, A3), RESPONSE]) {
    def runRequestMultiArg: (A1, A2, A3) => ClientFailableOp[RESPONSE] = Function.untupled(httpOp3Arg.runRequest)
  }

}

// this is used for non effectful/expensive operations to call them at the last minute, if at all.
case class LazyClientFailableOp[+VALUE](underlying: () => ClientFailableOp[VALUE]) {
  lazy val value = underlying()

  def flatMap[OUT](function: VALUE => LazyClientFailableOp[OUT]): LazyClientFailableOp[OUT] =
    LazyClientFailableOp(() => value.flatMap(function(_).value))

  def map[OUT](function: VALUE => OUT): LazyClientFailableOp[OUT] =
    LazyClientFailableOp(() => value.map(function))

}

object RestOp {

  implicit class HttpOpParseOp[PARAM](httpOp: HttpOp[PARAM, JsValue]) {
    def parse[RESULT: Reads]: HttpOp[PARAM, RESULT] =
      httpOp.flatMap(a => RestRequestMaker.toResult(a))

  }

}
