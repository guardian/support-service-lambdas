package com.gu.util

import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import org.scalatest.{FlatSpec, Matchers}

class LazyClientFailableOpTest extends FlatSpec with Matchers {

  final class InvocationLog() {

    var count = 0

    def apply(): ClientFailableOp[Unit] = {
      count = count + 1
      ClientSuccess(())
    }

  }

  it should "not be called until we request it and then only once after that" in {
    val invocationLog = new InvocationLog

    val l = LazyClientFailableOp(() => invocationLog())

    invocationLog.count should be(0)

    l.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    l.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

  }

}
