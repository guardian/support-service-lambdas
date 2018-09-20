package com.gu.util

import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class LazyClientFailableOpTest extends FlatSpec with Matchers {

  final class InvocationLog() {

    var count = 0

    def apply(): Unit = {
      count = count + 1
      ()
    }

  }

  it should "not be called until we request it and then only once after that" in {
    val invocationLog = new InvocationLog

    val l = LazyClientFailableOp(() => ClientSuccess(invocationLog()))

    invocationLog.count should be(0)

    l.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    l.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

  }

  it should "not be called until we request it after mapping and then only once after that" in {
    val invocationLog = new InvocationLog
    val invocationLogMap1 = new InvocationLog
    val invocationLogMap2 = new InvocationLog

    val original = LazyClientFailableOp(() => ClientSuccess(invocationLog()))

    val mapped1 = original.map(_ => invocationLogMap1())

    val mapped2 = original.map(_ => invocationLogMap2())

    invocationLog.count should be(0)
    original.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

    original.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

    invocationLogMap1.count should be(0)
    mapped1.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap1.count should be(1)

    mapped1.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap1.count should be(1)

    invocationLogMap2.count should be(0)
    mapped2.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap2.count should be(1)

    mapped2.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap2.count should be(1)

  }

  it should "not be called until we request it after flat mapping and then only once after that" in {
    val invocationLog = new InvocationLog
    val invocationLogMap1 = new InvocationLog
    val invocationLogMap2 = new InvocationLog

    val original = LazyClientFailableOp(() => ClientSuccess(invocationLog()))

    val mapped1 = original.flatMap(_ => LazyClientFailableOp(() => ClientSuccess(invocationLogMap1())))

    val mapped2 = original.flatMap(_ => LazyClientFailableOp(() => ClientSuccess(invocationLogMap2())))

    invocationLog.count should be(0)
    original.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

    original.value should be(ClientSuccess(()))
    invocationLog.count should be(1)

    invocationLogMap1.count should be(0)
    mapped1.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap1.count should be(1)

    mapped1.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap1.count should be(1)

    invocationLogMap2.count should be(0)
    mapped2.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap2.count should be(1)

    mapped2.value should be(ClientSuccess(()))
    invocationLog.count should be(1)
    invocationLogMap2.count should be(1)

  }

}
