package com.gu.sf_contact_merge

import org.scalatest.{FlatSpec, Matchers}
import scalaz.-\/

class StopIfNoContactsToChangeTest extends FlatSpec with Matchers {

  it should "return no action needed if only one contact with the correct id" in {
    val actual = StopIfNoContactsToChange(1, List(1))
    actual.toDisjunction.leftMap(_.statusCode) should be(-\/("200"))
  }

  it should "return no action needed if several contacts all with the correct id" in {
    val actual = StopIfNoContactsToChange(1, List(1, 1, 1))
    actual.toDisjunction.leftMap(_.statusCode) should be(-\/("200"))
  }

  it should "return continue if there are differing contacts" in {
    val actual = StopIfNoContactsToChange(1, List(1, 2))
    actual.toDisjunction.isRight should be(true)
  }

}
