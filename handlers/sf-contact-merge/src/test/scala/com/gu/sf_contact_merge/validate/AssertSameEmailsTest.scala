package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import org.scalatest.{FlatSpec, Matchers}

class AssertSameEmailsTest extends FlatSpec with Matchers {

  it should "be all ok with the same email addresses" in {
    val testData = List("hi", "hi").map(email => Some(EmailAddress(email)))

    AssertSame("").apply(testData).toDisjunction.isRight should be(true)

  }

  it should "complain with different email addresses" in {
    val testData = List("hi", "lo").map(email => Some(EmailAddress(email)))

    AssertSame("").apply(testData).toDisjunction.isRight should be(false)

  }

  it should "complain with no email address" in {
    val testData = List(Some("hi"), None).map(_.map(EmailAddress.apply))

    AssertSame("").apply(testData).toDisjunction.isRight should be(false)

  }

  it should "be happy that superficially different items are the same if they are transformed" in {
    val testData = List("JOHN", "john").map(LastName.apply)

    AssertSame.lastName.apply(testData).toDisjunction.isRight should be(true)

  }

  it should "be happy that actually different items are the still different if they are transformed" in {
    val testData = List("JOHN", "JOHNHI").map(LastName.apply)

    AssertSame.lastName.apply(testData).toDisjunction.isRight should be(false)

  }

}
