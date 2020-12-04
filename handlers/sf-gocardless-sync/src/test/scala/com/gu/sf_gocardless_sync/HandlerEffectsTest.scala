package com.gu.sf_gocardless_sync

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.test.EffectsTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HandlerEffectsTest extends AnyFlatSpec with Matchers {

  it should "do everything" taggedAs EffectsTest in {

    val input = ""

    val testInputStream = new ByteArrayInputStream(input.getBytes)
    val testOutputStream = new ByteArrayOutputStream()

    Handler(testInputStream, testOutputStream, null)

  }

}
